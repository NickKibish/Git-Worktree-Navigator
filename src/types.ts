export interface Project {
    path: string;
    name: string | undefined;
    favoriteWorktree: Worktree | undefined;
}

export interface Worktree {
    path: string;
    project: Project;
}