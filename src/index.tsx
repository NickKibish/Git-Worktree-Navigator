import { useState } from "react";
import { List } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { Project } from "./types"
import { EmptyView } from "./components/EmptyView";

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
      <EmptyView projects={projects ?? []} searchText={searchText} />
    </List>
  );
}