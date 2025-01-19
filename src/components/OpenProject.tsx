import { Action, Icon, Form, ActionPanel, useNavigation } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { Project } from "../types";
import { useState } from "react";
import { basename } from "path";
import { existsSync } from "fs";

type OnProjectSelected = (projectName: string, projectPath: string) => void;
type OnProjectAdded = (project: Project) => void;

export function AddProjectForm(props: { onProjectAdded: OnProjectSelected }) {
    const { pop } = useNavigation();
    const [projectName, setProjectName] = useState<string>("");
    const [projectPath, setProjectPath] = useState<string>("");

    const [projectPathError, setProjectPathError] = useState<string | undefined>(undefined);
    const [projectNameError, setProjectNameError] = useState<string | undefined>(undefined);
    
    return <Form actions={
        <ActionPanel>
            <Action.SubmitForm
                title="Add Project"
                onSubmit={(values: { project: string, directory: string }) => {
                    var hasError = false;
                    if (!values.project || values.project.length === 0) {
                        setProjectNameError("Project name is required");
                        hasError = true;
                    }

                    if (!values.directory || values.directory.length === 0) {
                        setProjectPathError("Directory is required");
                        hasError = true;
                    }

                    if (hasError) {
                        return;
                    }

                    console.log(`Adding project ${values.project} at ${values.directory}`);

                    // Add project to the list
                    props.onProjectAdded(values.project, values.directory);
                    pop();
                }}
            />
        </ActionPanel>}>

        <Form.TextField
            id="project"
            title="Project"
            placeholder="Project Name"
            value={projectName}
            onChange={(value) => {
                setProjectName(value);
                if (projectNameError) {
                    setProjectNameError(undefined);
                }
            }}
            error={projectNameError}
        />
        
        <Form.FilePicker
            id="directory"
            title="Directory"
            allowMultipleSelection={false}
            canChooseFiles={false}
            canChooseDirectories={true}
            onChange={(selectedPaths) => {
                if (projectPathError) {
                    setProjectPathError(undefined);
                    setProjectNameError(undefined);
                }
                if (selectedPaths && selectedPaths.length > 0) {
                    const selectedPath = selectedPaths[0];
                    setProjectPath(selectedPath);
                    if (!projectName || projectName.length === 0) {
                        setProjectName(basename(selectedPath));
                    }

                    const gitPath = `${selectedPath}/.git`;
                    if (!existsSync(gitPath)) {
                        setProjectPathError("The selected directory is not a git repository");
                    }
                } else {
                    setProjectPath("");
                }
            }}
            error={projectPathError}
        />
        
    </Form>
}

export function AddProjectAction(props: { onCreate: OnProjectAdded }) {
    return <Action.Push
        title="Add Project"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={
            <AddProjectForm
                onProjectAdded={
                    (projectName: string, projectPath: string) => {
                        const newProject: Project = {
                            path: projectPath,
                            name: projectName,
                            favoriteWorktree: undefined
                        };

                        props.onCreate(newProject);
                    }} />
        }
    />
}