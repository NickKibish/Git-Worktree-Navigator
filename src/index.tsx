import { useState, useEffect } from "react";
import { ActionPanel, Action, List } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { Project } from "./types";
import { EmptyView } from "./components/EmptyView";
import { WorktreeList } from "./components/WorktreeList";
import { AddProjectAction } from "./components/OpenProject";
import { List as LinkedList, Item } from "linked-list";

class ProjectItem extends Item {
  constructor(public project: Project) {
    super();
  }
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { value: projects, setValue: setProjects, isLoading } = useLocalStorage<Project[]>("projects", []);
  const [projectList] = useState(() => new LinkedList());
  const [favoriteList] = useState(() => new LinkedList());
  const [projectItems] = useState(() => new Map<string, ProjectItem>());
  const [initialized, setInitialized] = useState(false);

  // Initialize the linked lists from stored projects
  useEffect(() => {
    if (!initialized && !isLoading) {
      projectList.head = null;
      favoriteList.head = null;
      projectItems.clear();
      projects?.forEach((project) => {
        const item = new ProjectItem(project);
        if (project.favorite) {
          favoriteList.append(item);
        } else {
          projectList.append(item);
        }
        projectItems.set(project.path, item);
      });
      setInitialized(true);
    }
  }, [projects, isLoading]);

  const getProjectsFromList = (list: LinkedList): Project[] => {
    const result: Project[] = [];
    let current = list.head;
    while (current) {
      if (current instanceof ProjectItem) {
        result.push(current.project);
      }
      current = current.next;
    }
    return result;
  };

  const toggleFavorite = (project: Project) => {
    const item = projectItems.get(project.path);
    if (!item) return;

    const newProject = { ...project, favorite: !project.favorite };
    item.project = newProject;

    // Remove from current list
    item.detach();

    // Add to appropriate list
    if (newProject.favorite) {
      favoriteList.append(item);
    } else {
      projectList.append(item);
    }

    setProjects([...getProjectsFromList(favoriteList), ...getProjectsFromList(projectList)]);
  };

  const moveProject = (project: Project, direction: "up" | "down", list: LinkedList) => {
    const item = projectItems.get(project.path);
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

    setProjects([...getProjectsFromList(favoriteList), ...getProjectsFromList(projectList)]);
  };

  const filteredFavorites = getProjectsFromList(favoriteList).filter((project) => {
    const projectName = project.name ?? project.path;
    return projectName.toLowerCase().includes(searchText.toLowerCase());
  });

  const filteredProjects = getProjectsFromList(projectList).filter((project) => {
    const projectName = project.name ?? project.path;
    return projectName.toLowerCase().includes(searchText.toLowerCase());
  });

  return (
    <List
      isLoading={isLoading || !initialized}
      searchBarPlaceholder="Search projects by name..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      <EmptyView
        projects={[...filteredFavorites, ...filteredProjects]}
        searchText={searchText}
        onOpenProject={(project) => {
          const item = new ProjectItem({ ...project, favorite: false });
          projectList.append(item);
          projectItems.set(project.path, item);
          setProjects([...getProjectsFromList(favoriteList), ...getProjectsFromList(projectList)]);
        }}
      />
      {filteredFavorites.length > 0 && (
        <List.Section title="Favorites">
          {filteredFavorites.map((project) => (
            <List.Item
              key={project.path}
              title={project.name ?? project.path}
              icon="⭐️"
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push title="View Project" target={<WorktreeList project={project} />} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      icon="⭐️"
                      title="Remove from Favorites"
                      onAction={() => toggleFavorite(project)}
                    />
                    <Action
                      icon="⬆️"
                      title="Move Up"
                      shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                      onAction={() => moveProject(project, "up", favoriteList)}
                    />
                    <Action
                      icon="⬇️"
                      title="Move Down"
                      shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                      onAction={() => moveProject(project, "down", favoriteList)}
                    />
                    <AddProjectAction
                      onCreate={(project) => {
                        const item = new ProjectItem({ ...project, favorite: false });
                        projectList.append(item);
                        projectItems.set(project.path, item);
                        setProjects([...getProjectsFromList(favoriteList), ...getProjectsFromList(projectList)]);
                      }}
                    />
                    <Action
                      icon="🗑"
                      title="Remove Project"
                      style={Action.Style.Destructive}
                      onAction={() => {
                        const item = projectItems.get(project.path);
                        if (item) {
                          item.detach();
                          projectItems.delete(project.path);
                          setProjects([...getProjectsFromList(favoriteList), ...getProjectsFromList(projectList)]);
                        }
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {filteredProjects.length > 0 && (
        <List.Section title="Projects">
          {filteredProjects.map((project) => (
            <List.Item
              key={project.path}
              title={project.name ?? project.path}
              icon="📂"
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push title="View Project" target={<WorktreeList project={project} />} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    <Action
                      icon="⭐️"
                      title="Add to Favorites"
                      onAction={() => toggleFavorite(project)}
                    />
                    <Action
                      icon="⬆️"
                      title="Move Up"
                      shortcut={{ modifiers: ["cmd", "opt"], key: "arrowUp" }}
                      onAction={() => moveProject(project, "up", projectList)}
                    />
                    <Action
                      icon="⬇️"
                      title="Move Down"
                      shortcut={{ modifiers: ["cmd", "opt"], key: "arrowDown" }}
                      onAction={() => moveProject(project, "down", projectList)}
                    />
                    <AddProjectAction
                      onCreate={(project) => {
                        const item = new ProjectItem({ ...project, favorite: false });
                        projectList.append(item);
                        projectItems.set(project.path, item);
                        setProjects([...getProjectsFromList(favoriteList), ...getProjectsFromList(projectList)]);
                      }}
                    />
                    <Action
                      icon="🗑"
                      title="Remove Project"
                      style={Action.Style.Destructive}
                      onAction={() => {
                        const item = projectItems.get(project.path);
                        if (item) {
                          item.detach();
                          projectItems.delete(project.path);
                          setProjects([...getProjectsFromList(favoriteList), ...getProjectsFromList(projectList)]);
                        }
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
