import { List, Action, ActionPanel, Icon } from "@raycast/api";
import { Worktree, Project } from "../types";
import { usePromise } from "@raycast/utils";
import { useState } from "react";

import {
  getProjectWorktrees,
  worktreeType,
  worktreeName,
  jiraIssue,
  iconForType,
  getCurrentBranch,
} from "../utils/gitUtil";
import { WorktreeActionPanel } from "./WorktreeActions";

export function WorktreeList(props: { project: Project }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { isLoading, data } = usePromise(
    async (project: Project) => {
      return await // zip currentBranch(project) with getProjectWorktrees(project)
      await Promise.all([getCurrentBranch(project), getProjectWorktrees(project)]);
    },
    [props.project, refreshTrigger],
  );

  const refreshData = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <List
      isLoading={isLoading}
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
        actions={<WorktreeActionPanel project={props.project} onRefresh={refreshData} />}
      />
      {(data?.[1] ?? []).map((worktree, index) => (
        <WorktreeListItem key={index} worktree={worktree} onRefresh={refreshData} />
      ))}
    </List>
  );
}

function WorktreeListItem(props: { worktree: Worktree; onRefresh: () => void }) {
  const worktree = props.worktree;
  const type = worktreeType(worktree.path);
  const name = worktreeName(worktree.path);
  const issue = jiraIssue(worktree.path);

  return (
    <List.Item
      key={worktree.path}
      title={name}
      subtitle={issue}
      accessories={[{ text: type }]}
      icon={type ? iconForType(type) : "📂"}
      actions={<WorktreeActionPanel project={worktree.project} worktree={worktree} onRefresh={props.onRefresh} />}
    />
  );
}
