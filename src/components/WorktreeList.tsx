import { List, Action, ActionPanel, Icon, showToast, Toast } from "@raycast/api";
import { Worktree, Project } from "../types";
import { usePromise, useLocalStorage } from "@raycast/utils";
import { useState, useEffect } from "react";
import { List as LinkedList, Item } from "linked-list";

import {
  getProjectWorktrees,
  worktreeType,
  worktreeName,
  jiraIssue,
  iconForType,
  getCurrentBranch,
  hasUncommittedChanges,
  removeWorktree,
  detectProjectType,
  getIDEForProjectType,
  ProjectType,
} from "../utils/gitUtil";
import { WorktreeActionPanel } from "./WorktreeActions";

class WorktreeItem extends Item {
  constructor(public worktree: Worktree) {
    super();
  }
}

export function WorktreeList(props: { project: Project }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [worktreeList] = useState(() => new LinkedList());
  const [favoriteList] = useState(() => new LinkedList());
  const [worktreeItems] = useState(() => new Map<string, WorktreeItem>());
  const [initialized, setInitialized] = useState(false);
  const [projectType, setProjectType] = useState<ProjectType | null>(null);
  const { value: storedFavoritePaths, setValue: setStoredFavoritePaths } = useLocalStorage<string[]>(
    `favorite-worktrees-${props.project.path}`,
    []
  );

  useEffect(() => {
    console.log('Detecting project type for main project...');
    detectProjectType(props.project.path).then(type => {
      console.log(`Detected project type: ${type}`);
      setProjectType(type);
    });
  }, [props.project.path]);

  const ide = projectType ? getIDEForProjectType(projectType) : null;
  console.log(`IDE for project: ${ide?.name ?? 'None'}`);

  const { isLoading, data } = usePromise(
    async (project: Project) => {
      const [currentBranch, worktrees] = await Promise.all([
        getCurrentBranch(project),
        getProjectWorktrees(project),
      ]);
      return [currentBranch, worktrees] as [string, Worktree[]];
    },
    [props.project],
  );

  // Initialize the linked lists from worktrees
  useEffect(() => {
    if (!isLoading && data) {
      worktreeList.head = null;
      favoriteList.head = null;
      worktreeItems.clear();

      data[1].forEach((worktree: Worktree) => {
        const item = new WorktreeItem({
          ...worktree,
          favorite: storedFavoritePaths?.includes(worktree.path) ?? false,
        });
        if (item.worktree.favorite) {
          favoriteList.append(item);
        } else {
          worktreeList.append(item);
        }
        worktreeItems.set(worktree.path, item);
      });
      setInitialized(true);
    }
  }, [data, isLoading, storedFavoritePaths]);

  const getWorktreesFromList = (list: LinkedList): Worktree[] => {
    const result: Worktree[] = [];
    let current = list.head;
    while (current) {
      if (current instanceof WorktreeItem) {
        result.push(current.worktree);
      }
      current = current.next;
    }
    return result;
  };

  const toggleFavorite = (worktree: Worktree) => {
    const item = worktreeItems.get(worktree.path);
    if (!item) return;

    const newWorktree = { ...worktree, favorite: !worktree.favorite };
    item.worktree = newWorktree;

    // Update storage
    if (newWorktree.favorite) {
      setStoredFavoritePaths([...(storedFavoritePaths ?? []), worktree.path]);
    } else {
      setStoredFavoritePaths((storedFavoritePaths ?? []).filter((path) => path !== worktree.path));
    }

    // Remove from current list
    item.detach();

    // Add to appropriate list
    if (newWorktree.favorite) {
      favoriteList.append(item);
    } else {
      worktreeList.append(item);
    }

    setRefreshTrigger((prev) => prev + 1);
  };

  const moveWorktree = (worktree: Worktree, direction: "up" | "down", list: LinkedList) => {
    const item = worktreeItems.get(worktree.path);
    if (!item) return;

    if (direction === "up") {
      const prev = item.prev;
      if (prev) {
        item.detach();
        prev.prepend(item);
      }
    } else {
      const next = item.next;
      if (next) {
        item.detach();
        next.append(item);
      }
    }

    setRefreshTrigger((prev) => prev + 1);
  };

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const favoriteWorktrees = getWorktreesFromList(favoriteList);
  const regularWorktrees = getWorktreesFromList(worktreeList);

  return (
    <List
      isLoading={isLoading || !initialized}
      searchBarPlaceholder="Search worktrees..."
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={refreshData}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      <List.Item
        key={props.project.path}
        title={props.project.name ?? props.project.path}
        subtitle={data?.[0] ?? "No branch"}
        icon="📁"
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action.Open title="Open in Finder" target={"file://" + props.project.path} icon={Icon.Finder} />
              <Action.Open
                title="Open in Terminal"
                target={"file://" + props.project.path}
                application="com.googlecode.iterm2"
                icon={Icon.Terminal}
              />
              {ide && ide.bundleId !== "com.microsoft.VSCode" && (
                <Action.Open
                  title={`Open in ${ide.name}`}
                  target={props.project.path}
                  application={ide.bundleId}
                  icon={Icon.Code}
                />
              )}
              <Action.Open
                title="Open in Visual Studio Code"
                target={props.project.path}
                application="com.microsoft.VSCode"
                icon={Icon.Code}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
      {favoriteWorktrees.length > 0 && (
        <List.Section title="Favorite Worktrees">
          {favoriteWorktrees.map((worktree) => (
            <WorktreeListItem
              key={worktree.path}
              worktree={worktree}
              onRefresh={refreshData}
              onToggleFavorite={() => toggleFavorite(worktree)}
              onMove={(direction) => moveWorktree(worktree, direction, favoriteList)}
              isFavorite={true}
            />
          ))}
        </List.Section>
      )}
      {regularWorktrees.length > 0 && (
        <List.Section title="Worktrees">
          {regularWorktrees.map((worktree) => (
            <WorktreeListItem
              key={worktree.path}
              worktree={worktree}
              onRefresh={refreshData}
              onToggleFavorite={() => toggleFavorite(worktree)}
              onMove={(direction) => moveWorktree(worktree, direction, worktreeList)}
              isFavorite={false}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function WorktreeListItem(props: {
  worktree: Worktree;
  onRefresh: () => void;
  onToggleFavorite: () => void;
  onMove: (direction: "up" | "down") => void;
  isFavorite: boolean;
}) {
  const worktree = props.worktree;
  const type = worktreeType(worktree.path);
  const name = worktreeName(worktree.path);
  const issue = jiraIssue(worktree.path);
  const [projectType, setProjectType] = useState<ProjectType | null>(null);

  useEffect(() => {
    detectProjectType(worktree.path).then(setProjectType);
  }, [worktree.path]);

  const ide = projectType ? getIDEForProjectType(projectType) : null;

  return (
    <List.Item
      key={worktree.path}
      title={name}
      subtitle={issue}
      accessories={[{ text: type }]}
      icon={type ? iconForType(type) : "📂"}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Open title="Open in Finder" target={"file://" + worktree.path} icon={Icon.Finder} />
            <Action.Open
              title="Open in Terminal"
              target={"file://" + worktree.path}
              application="com.googlecode.iterm2"
              icon={Icon.Terminal}
            />
            {ide && ide.bundleId !== "com.microsoft.VSCode" && (
              <Action.Open
                title={`Open in ${ide.name}`}
                target={worktree.path}
                application={ide.bundleId}
                icon={Icon.Code}
              />
            )}
            <Action.Open
              title="Open in Visual Studio Code"
              target={worktree.path}
              application="com.microsoft.VSCode"
              icon={Icon.Code}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              icon={props.isFavorite ? "⭐️" : "⭐️"}
              title={props.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              onAction={props.onToggleFavorite}
            />
            <Action
              icon="⬆️"
              title="Move Up"
              shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
              onAction={() => props.onMove("up")}
            />
            <Action
              icon="⬇️"
              title="Move Down"
              shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
              onAction={() => props.onMove("down")}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              icon={Icon.Trash}
              title="Remove Worktree"
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
              onAction={async () => {
                try {
                  const hasChanges = await hasUncommittedChanges(worktree.path);
                  if (hasChanges) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Cannot remove worktree",
                      message: "The worktree has uncommitted changes",
                    });
                    return;
                  }

                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: "Removing worktree...",
                  });

                  await removeWorktree(worktree);

                  await toast.hide();
                  await showToast({
                    style: Toast.Style.Success,
                    title: "Worktree removed successfully",
                  });

                  props.onRefresh();
                } catch (error) {
                  console.error(`Error removing worktree: ${error}`);
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to remove worktree",
                    message: String(error),
                  });
                }
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
