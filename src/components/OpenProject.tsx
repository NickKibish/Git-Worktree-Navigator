import { Action, Icon, Form, ActionPanel, useNavigation } from "@raycast/api";
import { Project } from "../types";
import { useState } from "react";
import { basename } from "path";

type OnProjectSelected = (projectName: string, projectPath: string) => void;

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
                    if (!values.project || values.project.length === 0) {
                        setProjectNameError("Project name is required");
                    }

                    if (!values.directory || values.directory.length === 0) {
                        setProjectPathError("Directory is required");
                    }

                    if (!values.project || values.project.length === 0 || !values.directory || values.directory.length === 0) {
                        return;
                    }
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
                }
            }}
            error={projectPathError}
        />
        
    </Form>
}

export function AddProjectAction(props: { onCreate: OnProjectSelected }) {
    return <Action.Push
        title="Add Project"
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "n" }}
        target={
            <AddProjectForm
                onProjectAdded={props.onCreate} />
        }
    />
}