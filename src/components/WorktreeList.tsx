import { List, Action, ActionPanel, Application } from "@raycast/api";
import { Worktree, Project, WorktreeType } from "../types";
import { usePromise } from "@raycast/utils";

import { getProjectWorktrees, worktreeType, worktreeName, jiraIssue, iconForType, getCurrentBranch } from "../utils/gitUtil";
import { isStringObject } from "util/types";

type WorktreesAndBranch = {
    worktrees: Worktree[];
    branch: string;
};

export function WorktreeList(props: { project: Project }) {
    const { isLoading, data, pagination } = usePromise(
        async (project: Project) => {
            return await (
                // zip currentBranch(project) with getProjectWorktrees(project)
                await Promise.all([
                    getCurrentBranch(project),
                    getProjectWorktrees(project)
                ])
            );
        },
        [props.project]
    )

    return (
        <List
            isLoading={isLoading}
            searchBarPlaceholder="Search projects by name...">
            <List.Item
                key={props.project.path}
                title={props.project.name ?? props.project.path}
                subtitle={data?.[0] ?? "No branch"}
                icon="📁"
                actions={
                    <ActionPanel>
                        <Action.Open
                            title="Open in Finder"
                            target={"file://" + props.project.path}
                        />
                        <Action.Open
                            title="Open in Terminal"
                            target={"file://" + props.project.path}
                            application="kitty"
                        />
                    </ActionPanel>
                }
            />
            {(data?.[1] ?? []).map((worktree, index) => (
                <WorktreeListItem key={index} worktree={worktree} />
            ))}
        </List>
    );
}

function WorktreeListItem(props: { worktree: Worktree }) {
    const worktree = props.worktree;
    const type = worktreeType(worktree.path);
    const name = worktreeName(worktree.path);
    const issue = jiraIssue(worktree.path);

    return (
        <List.Item
            key={worktree.path}
            title={name}
            subtitle={issue}
            accessories={[
                { text: type }
            ]}
            icon={type ? iconForType(type) : "📂"}
        />
    );
}
