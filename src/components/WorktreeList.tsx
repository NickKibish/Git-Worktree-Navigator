import { List } from "@raycast/api";
import { Project, Worktree } from "../types";
import * as fs from "fs/promises";
import * as fsSync from "fs";
import { usePromise } from "@raycast/utils";

export function WorktreeList(props: { project: Project }) {
    const { isLoading, data, pagination } = usePromise(
        async (project: Project) => {
            return await findWorktrees(project);
        },
        [props.project]
    )

    return (
        <List
            isLoading={isLoading}
            searchBarPlaceholder="Search projects by name...">
            {(data ?? []).map((worktree, index) => (
                <List.Item
                    key={worktree.path}
                    title={worktree.path}
                    icon="📂"
                />
            ))}
        </List>
    );
}

async function findWorktrees(project: Project): Promise<Worktree[]> {
    const projectPath = project.path;
    const worktreeDir = `${projectPath}/.git/worktrees`;

    try {
        // Check if the worktrees directory exists
        if (!fsSync.existsSync(worktreeDir)) {
            return new Promise((resolve, reject) => {
                resolve([]);
            });
        }

        await fs.access(worktreeDir);

        var worktrees: Worktree[] = [];
        for await (const item of await fs.opendir(worktreeDir)) {
            // TODO: set correct path for worktree
            const worktree: Worktree = {
                path: `${worktreeDir}/${item.name}`,
                project: project
            };
            worktrees.push(worktree);
        }

        return worktrees;
    } catch (error) {
        console.error(`Error reading worktrees: ${error}`);
        return new Promise((resolve, reject) => {
            reject(error);
        });
    }
}