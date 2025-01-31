import { Worktree, Project, WorktreeType } from "../types";

import * as fs from "fs/promises";
import * as fsSync from "fs";

export async function getProjectWorktrees(project: Project): Promise<Worktree[]> {
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
            const worktreePath = `${worktreeDir}/${item.name}`;
            const worktree: Worktree = await createWorktree(worktreePath, project);
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


async function createWorktree(path: string, project: Project): Promise<Worktree> {
    // read 'gitdir' file 
    const gitDirPath = `${path}/gitdir`;
    let gitDir = await fs.readFile(gitDirPath, "utf-8"); 

    // remove newline characters
    gitDir = gitDir.replace(/(\r\n|\n|\r)/gm, "");
    // remove .git suffix
    if (gitDir.endsWith(".git")) {
        gitDir = gitDir.slice(0, -4);
    }

    const worktree: Worktree = {
        path: gitDir,
        project: project
    };

    return worktree;
}


export function iconForType(type: WorktreeType): string {
    switch (type) {
        case WorktreeType.feature:
            return "🔧";
        case WorktreeType.bugfix:
            return "🐞";
        case WorktreeType.hotfix:
            return "🔥";
        case WorktreeType.release:
            return "🚀";
        default:
            return "📂";
    }
}

export function worktreeType(worktreePath: string): WorktreeType | undefined {
    console.log(worktreePath);

    const parts = worktreePath.split("/");
    const t1 = parts[parts.length - 4];
    const t2 = parts[parts.length - 3];
    if (Object.values(WorktreeType).includes(t1 as WorktreeType)) {
        const type = t1 as WorktreeType;
        console.log("t1 type: " + type);
        return type;
    } else if (Object.values(WorktreeType).includes(t2 as WorktreeType)) {
        const type = t2 as WorktreeType;
        console.log("t2 type: " + type);
        return type;
    } else {
        console.log("no type");
        return undefined;
    }
}

export function worktreeName(worktreePath: string): string {
    const parts = worktreePath.split("/");
    const name = parts[parts.length - 2];

    console.log("name: " + name);

    return name;
}

export function jiraIssue(worktreePath: string): string | undefined {
    const parts = worktreePath.split("/");
    const code = parts[parts.length - 3];

    console.log("code: " + code);

    const match = code.match(/([A-Z]+-\d+)/);
    if (match) {
        return match[0];
    }

    return undefined;
}

export async function getCurrentBranch(project: Project): Promise<string> {
    const headPath = `${project.path}/.git/HEAD`;
    try {
        const head = await fs.readFile(headPath, "utf-8");
        const branch = head.split("/").splice(0, 2).join("/");
        return branch;
    } catch (error) {
        console.error(`Error reading HEAD file: ${error}`);
        throw error;
    }
}