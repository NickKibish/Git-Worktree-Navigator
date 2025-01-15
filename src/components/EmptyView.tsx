import { List, ActionPanel, Action, showToast, Toast, Form } from "@raycast/api";
import { Project } from "../types";
import { exec } from "child_process";
import { useEffect } from "react";
import { AddProjectAction } from "./OpenProject";

type OnOpenProject = (project: Project) => void;

function openProject(props: { onOpenProject: OnOpenProject }) {
    return <ActionPanel>
        <AddProjectAction
            onCreate={(project) => {
                props.onOpenProject(project);
            }}
        />
    </ActionPanel>
}

export function EmptyView(props: {
    projects: Project[];
    searchText: string;
    onOpenProject: OnOpenProject;
}) {
    if (props.projects.length === 0) {
        return (
            <List.EmptyView
                icon="📝"
                title="Add your first project"
                description="Add a new git repository to start tracking your projects."
                actions={
                    openProject(props)
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
                actions={
                    openProject(props)
                }
            />
        )
    }
}