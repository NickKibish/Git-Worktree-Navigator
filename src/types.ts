export interface Project {
  path: string;
  name: string | undefined;
  favoriteWorktree: Worktree | undefined;
  favorite: boolean;
}

export interface Worktree {
  path: string;
  project: Project;
  favorite: boolean;
}

export enum WorktreeType {
  feature = "feature",
  bugfix = "bugfix",
  release = "release",
  hotfix = "hotfix",
}
