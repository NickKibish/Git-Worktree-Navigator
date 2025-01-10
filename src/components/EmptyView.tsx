import { List, ActionPanel, Action, showToast, Toast, Form } from "@raycast/api";
import { Project } from "../types";
import { exec } from "child_process";
import { useEffect } from "react";
import { AddProjectAction } from "./OpenProject";


export function EmptyView(props: {
    projects: Project[];
    searchText: string;
}) {
    if (props.projects.length === 0) {
        return (
            <List.EmptyView
                icon="📝"
                title="Add your first project"
                description="Add a new git repository to start tracking your projects."
                actions={
                    <ActionPanel>
                        <AddProjectAction
                            onCreate={(projectName: string, projectPath: string) => {
                            }}
                        />
                    </ActionPanel>
                }
            />
        )
    }
    if (props.projects.length > 0) {
        return (
            <List.EmptyView
                icon="🔍"
                title="No Matching Projects"
                description={'No projects match your search query.\nAdd a new git repository to see it here.'}
            />
        )
    }
}