import { useState } from "react";
import { ActionPanel, Action, List } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { Project } from "./types"
import { EmptyView } from "./components/EmptyView";
import { WorktreeList } from "./components/WorktreeList";
import { AddProjectAction } from "./components/OpenProject";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { value: projects, setValue: setProjects, isLoading } = useLocalStorage<Project[]>("projects", []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search projects by name..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      <EmptyView
        projects={projects ?? []}
        searchText={searchText}
        onOpenProject={(project) => {
          const newProjects = [...(projects ?? []), project];
          setProjects(newProjects);
        }}
      />
      {(projects ?? []).map((project, index) => (
        <List.Item
          key={project.path}
          title={project.name ?? project.path}
          icon="📂"
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title="View Project"
                  target={
                    <WorktreeList
                      project={project}
                    />
                  }
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <AddProjectAction 
                  onCreate={(project) => {
                    const newProjects = [...(projects ?? []), project];
                    setProjects(newProjects);
                  }}
                />
                <Action
                  icon="🗑"
                  title="Remove Project"
                  style={Action.Style.Destructive}
                  onAction={() => {
                    const newProjects = (projects ?? []).filter((p) => p.path !== project.path);
                    setProjects(newProjects);
                  }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}