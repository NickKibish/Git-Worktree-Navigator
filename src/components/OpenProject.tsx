import { Action, Icon, Form, ActionPanel, useNavigation } from "@raycast/api";
import { Project } from "../types";

type OnProjectSelected = (projectName: string, projectPath: string) => void;

export function AddProjectForm(props: { onProjectAdded: OnProjectSelected }) {
    const { pop } = useNavigation();

    return <Form 
        actions={
            <ActionPanel>
                <Action.SubmitForm
                    title="Add Project"
                    onSubmit={(values: { project: string, directory: string }) => {
                        // Add project to the list
                        props.onProjectAdded(values.project, values.directory);
                        pop();
                    }}
                />
            </ActionPanel>
        }
    >
        <Form.TextField
            id="project"
            title="Project"
            placeholder="Project Name"
        />
        <Form.FilePicker
            id="directory"
            title="Directory"
            allowMultipleSelection={false}
            canChooseFiles={false}
            canChooseDirectories={true}

            ></Form.FilePicker>
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