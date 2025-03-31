import { Action, Icon, ActionPanel, Form, useNavigation, showToast, Toast } from "@raycast/api";
import { Worktree, Project, WorktreeType } from "../types";
import { useState } from "react";
import { addWorktree, removeWorktree, hasUncommittedChanges } from "../utils/gitUtil";

type OnWorktreeAdded = (worktree: Worktree) => void;
type OnWorktreeRemoved = (worktree: Worktree) => void;

export function AddWorktreeForm(props: { project: Project; onWorktreeAdded: OnWorktreeAdded }) {
  const { pop } = useNavigation();
  const [name, setName] = useState<string>("");
  const [jiraCode, setJiraCode] = useState<string>("");
  const [type, setType] = useState<WorktreeType>(WorktreeType.feature);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Form validation
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [jiraCodeError, setJiraCodeError] = useState<string | undefined>(undefined);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Worktree"
            onSubmit={async (values) => {
              // Reset any previous errors
              setNameError(undefined);
              setJiraCodeError(undefined);

              // Validate inputs
              let hasError = false;

              if (!values.name || values.name.length === 0) {
                setNameError("Name is required");
                hasError = true;
              }

              if (!values.jiraCode || values.jiraCode.length === 0) {
                setJiraCodeError("JIRA code is required");
                hasError = true;
              } else if (!/^[A-Z]+-\d+$/.test(values.jiraCode)) {
                setJiraCodeError("JIRA code must be in format PROJ-101");
                hasError = true;
              }

              if (hasError) {
                return;
              }

              // Start adding worktree
              setIsLoading(true);

              try {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: "Creating worktree...",
                });

                const worktree = await addWorktree(
                  props.project,
                  values.type as WorktreeType,
                  values.jiraCode,
                  values.name,
                );

                await toast.hide();
                await showToast({
                  style: Toast.Style.Success,
                  title: "Worktree created successfully",
                });

                props.onWorktreeAdded(worktree);
                pop();
              } catch (error) {
                console.error(`Error creating worktree: ${error}`);
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to create worktree",
                  message: String(error),
                });
                setIsLoading(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Name"
        placeholder="add-button"
        info="Descriptive name for the worktree"
        value={name}
        onChange={(value) => {
          setName(value);
          if (nameError) {
            setNameError(undefined);
          }
        }}
        error={nameError}
      />

      <Form.TextField
        id="jiraCode"
        title="JIRA Code"
        placeholder="PROJ-101"
        info="JIRA issue number (e.g., PROJ-101)"
        value={jiraCode}
        onChange={(value) => {
          setJiraCode(value);
          if (jiraCodeError) {
            setJiraCodeError(undefined);
          }
        }}
        error={jiraCodeError}
      />

      <Form.Dropdown
        id="type"
        title="Type"
        info="Type of worktree to create"
        value={type}
        onChange={(value) => setType(value as WorktreeType)}
      >
        <Form.Dropdown.Item value={WorktreeType.feature} title="Feature" icon="🔧" />
        <Form.Dropdown.Item value={WorktreeType.bugfix} title="Bugfix" icon="🐞" />
        <Form.Dropdown.Item value={WorktreeType.hotfix} title="Hotfix" icon="🔥" />
        <Form.Dropdown.Item value={WorktreeType.release} title="Release" icon="🚀" />
      </Form.Dropdown>
    </Form>
  );
}

export function AddWorktreeAction(props: { project: Project; onWorktreeAdded: OnWorktreeAdded }) {
  return (
    <Action.Push
      icon={Icon.Plus}
      title="Add Worktree"
      shortcut={{ modifiers: ["cmd"], key: "n" }}
      target={<AddWorktreeForm project={props.project} onWorktreeAdded={props.onWorktreeAdded} />}
    />
  );
}

export function RemoveWorktreeAction(props: { worktree: Worktree; onWorktreeRemoved: OnWorktreeRemoved }) {
  return (
    <Action
      icon={Icon.Trash}
      title="Remove Worktree"
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
      onAction={async () => {
        try {
          // Check for uncommitted changes first
          const hasChanges = await hasUncommittedChanges(props.worktree.path);
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

          await removeWorktree(props.worktree);

          await toast.hide();
          await showToast({
            style: Toast.Style.Success,
            title: "Worktree removed successfully",
          });

          props.onWorktreeRemoved(props.worktree);
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
  );
}

export function WorktreeActionPanel(props: { project: Project; worktree?: Worktree; onRefresh: () => void }) {
  return (
    <ActionPanel>
      {props.worktree ? (
        <>
          {/* Actions for an existing worktree */}
          <ActionPanel.Section>
            <Action.Open title="Open in Finder" target={"file://" + props.worktree.path} icon={Icon.Finder} />
            <Action.Open
              title="Open in Terminal"
              target={"file://" + props.worktree.path}
              application="kitty"
              icon={Icon.Terminal}
            />
            <Action.Open
              title="Open in Visual Studio Code"
              target={props.worktree.path}
              application="code"
              icon={Icon.Code}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <RemoveWorktreeAction worktree={props.worktree} onWorktreeRemoved={() => props.onRefresh()} />
          </ActionPanel.Section>
        </>
      ) : (
        <>
          {/* Actions for the project */}
          <ActionPanel.Section>
            <Action.Open title="Open in Finder" target={"file://" + props.project.path} icon={Icon.Finder} />
            <Action.Open
              title="Open in Terminal"
              target={"file://" + props.project.path}
              application="kitty"
              icon={Icon.Terminal}
            />
            <Action.Open
              title="Open in Visual Studio Code"
              target={props.project.path}
              application="code"
              icon={Icon.Code}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <AddWorktreeAction project={props.project} onWorktreeAdded={() => props.onRefresh()} />
          </ActionPanel.Section>
        </>
      )}
    </ActionPanel>
  );
}
