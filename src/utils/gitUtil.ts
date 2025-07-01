import { Worktree, Project, WorktreeType } from "../types";

import * as fs from "fs/promises";
import * as fsSync from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

export enum ProjectType {
  Xcode = "xcode",
  Android = "android",
  PHP = "php",
  Other = "other",
}

export async function detectProjectType(projectPath: string): Promise<ProjectType> {
  try {
    console.log(`Detecting project type for: ${projectPath}`);
    
    // Check for Xcode projects
    const xcodeFiles = await Promise.all([
      fs.readdir(projectPath).then(files => {
        const hasXcworkspace = files.some(f => f.endsWith('.xcworkspace'));
        console.log(`Has .xcworkspace: ${hasXcworkspace}`);
        return hasXcworkspace;
      }).catch(() => false),
      fs.readdir(projectPath).then(files => {
        const hasXcodeproj = files.some(f => f.endsWith('.xcodeproj'));
        console.log(`Has .xcodeproj: ${hasXcodeproj}`);
        return hasXcodeproj;
      }).catch(() => false),
      fs.access(path.join(projectPath, "Package.swift")).then(() => {
        console.log('Has Package.swift');
        return true;
      }).catch(() => false),
    ]);
    if (xcodeFiles.some(exists => exists)) {
      console.log('Detected Xcode project');
      return ProjectType.Xcode;
    }

    // Check for Android projects
    const androidFiles = await Promise.all([
      fs.access(path.join(projectPath, "build.gradle")).then(() => {
        console.log('Has build.gradle');
        return true;
      }).catch(() => false),
      fs.access(path.join(projectPath, "settings.gradle")).then(() => {
        console.log('Has settings.gradle');
        return true;
      }).catch(() => false),
      fs.access(path.join(projectPath, "app")).then(() => {
        console.log('Has app directory');
        return true;
      }).catch(() => false),
    ]);
    if (androidFiles.some(exists => exists)) {
      console.log('Detected Android project');
      return ProjectType.Android;
    }

    // Check for PHP projects
    const phpFiles = await Promise.all([
      fs.access(path.join(projectPath, "composer.json")).then(() => {
        console.log('Has composer.json');
        return true;
      }).catch(() => false),
      fs.readdir(projectPath).then(files => {
        const hasPhp = files.some(f => f.endsWith('.php'));
        console.log(`Has .php files: ${hasPhp}`);
        return hasPhp;
      }).catch(() => false),
    ]);
    if (phpFiles.some(exists => exists)) {
      console.log('Detected PHP project');
      return ProjectType.PHP;
    }

    console.log('No specific project type detected');
    return ProjectType.Other;
  } catch (error) {
    console.error(`Error detecting project type: ${error}`);
    return ProjectType.Other;
  }
}

export function getIDEForProjectType(projectType: ProjectType): { name: string; bundleId: string } {
  switch (projectType) {
    case ProjectType.Xcode:
      return { name: "Xcode", bundleId: "com.apple.dt.Xcode" };
    case ProjectType.Android:
      return { name: "Android Studio", bundleId: "com.google.android.studio" };
    case ProjectType.PHP:
      return { name: "PhpStorm", bundleId: "com.jetbrains.PhpStorm" };
    default:
      return { name: "Visual Studio Code", bundleId: "com.microsoft.VSCode" };
  }
}

export async function getProjectWorktrees(project: Project): Promise<Worktree[]> {
  const projectPath = project.path;
  const worktreeDir = `${projectPath}/.git/worktrees`;

  try {
    // Check if the worktrees directory exists
    if (!fsSync.existsSync(worktreeDir)) {
      return new Promise((resolve) => {
        resolve([]);
      });
    }

    await fs.access(worktreeDir);

    const worktrees: Worktree[] = [];
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
    project: project,
    favorite: false,
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

/**
 * Add a new worktree for the given project
 * @param project The git project
 * @param type The worktree type (feature, bugfix, hotfix, release)
 * @param jiraCode The JIRA issue code (e.g. PROJ-101)
 * @param name The name of the worktree
 * @returns The created worktree
 */
export async function addWorktree(
  project: Project,
  type: WorktreeType,
  jiraCode: string,
  name: string,
): Promise<Worktree> {
  try {
    const projectPath = project.path;
    const branchName = `${type}/${jiraCode}/${name}`;
    const worktreePath = path.resolve(projectPath, "..", type, jiraCode, name);

    // Step 1: Create the branch using git flow
    await execAsync(`cd "${projectPath}" && git flow ${type} start ${name}`, { maxBuffer: 1024 * 1024 });

    // Step 2: Checkout develop branch
    await execAsync(`cd "${projectPath}" && git checkout develop`, { maxBuffer: 1024 * 1024 });

    // Step 3: Add the worktree
    await execAsync(`cd "${projectPath}" && git worktree add "${worktreePath}" ${branchName}`, {
      maxBuffer: 1024 * 1024,
    });

    // Create worktree object
    const worktree: Worktree = {
      path: worktreePath,
      project: project,
      favorite: false,
    };

    return worktree;
  } catch (error) {
    console.error(`Error adding worktree: ${error}`);
    throw error;
  }
}

/**
 * Check if a worktree has uncommitted changes
 * @param worktreePath The path to the worktree
 * @returns True if the worktree has uncommitted changes
 */
export async function hasUncommittedChanges(worktreePath: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`cd "${worktreePath}" && git status --porcelain`, { maxBuffer: 1024 * 1024 });
    return stdout.trim().length > 0;
  } catch (error) {
    console.error(`Error checking uncommitted changes: ${error}`);
    throw error;
  }
}

/**
 * Remove a worktree
 * @param worktree The worktree to remove
 * @returns True if the worktree was successfully removed
 */
export async function removeWorktree(worktree: Worktree): Promise<boolean> {
  try {
    const projectPath = worktree.project.path;
    const worktreePath = worktree.path;

    // Check for uncommitted changes first
    const hasChanges = await hasUncommittedChanges(worktreePath);
    if (hasChanges) {
      throw new Error("Cannot remove worktree with uncommitted changes");
    }

    // Extract branch name from worktree path
    const branchName = getBranchNameFromWorktreePath(worktreePath);

    // Remove the worktree
    await execAsync(`cd "${projectPath}" && git worktree remove "${worktreePath}"`, { maxBuffer: 1024 * 1024 });

    // Delete the branch if it exists
    try {
      await execAsync(`cd "${projectPath}" && git branch -D ${branchName}`, { maxBuffer: 1024 * 1024 });
    } catch (error) {
      // Branch might already be gone, continue
      console.warn(`Could not delete branch ${branchName}: ${error}`);
    }

    return true;
  } catch (error) {
    console.error(`Error removing worktree: ${error}`);
    throw error;
  }
}

/**
 * Extract the branch name from a worktree path
 * @param worktreePath The path to the worktree
 * @returns The branch name
 */
function getBranchNameFromWorktreePath(worktreePath: string): string {
  const parts = worktreePath.split("/");
  const type = parts[parts.length - 3];
  const jiraCode = parts[parts.length - 2];
  const name = parts[parts.length - 1];

  return `${type}/${jiraCode}/${name}`;
}
