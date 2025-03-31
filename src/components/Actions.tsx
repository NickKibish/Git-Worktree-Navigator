import { Action, ActionPanel } from "@raycast/api";
import fs from "fs";
import path from "path";

export function OpenActionPanel(props: { path: string }) {
    return (
        <ActionPanel>
            <OpenInIDEAction path={props.path} />
            <OpenInFinderAction path={props.path} />
            <OpenInTerminalAction path={props.path} />
        </ActionPanel>
    );
}

export function OpenInFinderAction(props: { path: string }) {
    return (
        <Action.Open
            title="Open in Finder"
            target={"file://" + props.path}
        />
    );
}

export function OpenInTerminalAction(props: { path: string }) {
    return (
        <Action.Open
            title="Open in Terminal"
            target={"file://" + props.path}
            application="kitty"
        />
    );
}

export function OpenInIDEAction(props: { path: string }) {
    const projectType = determineProjectType(props.path);

    if (projectType.type === ProjectType.Xcode) {
        return <OpenInXcode path={props.path} />;
    } else {
        return <Action.Open title={projectType.title} target={props.path} application="code" />;
    }
}

function OpenInXcode(props: { path: string }) {
    let xcodeProps: XcodeProps | null = null;

    const swiftPackagePath = path.join(props.path, "Package.swift");
    const workspacePaths = fs.readdirSync(props.path).filter(file => file.endsWith(".xcworkspace"));
    const projectPaths = fs.readdirSync(props.path).filter(file => file.endsWith(".xcodeproj"));

    if (fs.existsSync(swiftPackagePath)) {
        xcodeProps = {
            projectPath: swiftPackagePath,
            type: XcodeProjectType.swiftPackage,
        };
    } else if (workspacePaths.length > 0) {
        xcodeProps = {
            projectPath: path.join(props.path, workspacePaths[0]),
            type: XcodeProjectType.workspace,
        };
    } else if (projectPaths.length > 0) {
        xcodeProps = {
            projectPath: path.join(props.path, projectPaths[0]),
            type: XcodeProjectType.project,
        };
    }

    // If no Xcode project found, return null or handle it as needed
    if (!xcodeProps) {
        return <Action title="No Xcode Project Found" />;
    }

    return (
        <Action.Open
            title={`Open ${xcodeProps.type} in Xcode`}
            target={xcodeProps.projectPath}
            application="Xcode"
        />
    );
}

function determineProjectType(projectPath: string): OpenInIDEProps  {
    const entries = fs.readdirSync(projectPath);

    // Check for iOS project
    if (entries.some(entry => entry.endsWith('.xcodeproj') || entry.endsWith('.xcworkspace') || entry === 'Package.swift')) {
        return {
            type: ProjectType.Xcode,
            title: 'Open in Xcode',
            icon: '📱'
        };
    }

    // Check for Android project
    if (entries.some(entry => entry === 'build.gradle' || entry === 'build.gradle.kts' || entry === 'AndroidManifest.xml' || entry === 'settings.gradle' || entry === 'settings.gradle.kts')) {
        return {
            type: ProjectType.Android,
            title: 'Open in Android Studio',
            icon: '🤖'
        }
    }

    // Check for Java project
    if (entries.includes('.idea') || entries.includes('pom.xml') || entries.some(entry => entry === 'build.gradle' || entry === 'build.gradle.kts')) {
        return {
            type: ProjectType.IntelliJIDEA,
            title: 'Open in IntelliJ IDEA',
            icon: '🚀'
        }
    }

    // Default to VS Code
    return {
        type: ProjectType.VisualStudioCode,
        title: 'Open in Visual Studio Code',
        icon: '💻'
    };
}

enum ProjectType {
    Xcode,
    VisualStudioCode,
    IntelliJIDEA,
    Android
}

interface OpenInIDEProps {
    type: ProjectType;
    title: string;
    icon: string;
}

enum XcodeProjectType {
    project,
    workspace,
    swiftPackage
}

interface XcodeProps {
    projectPath: string;
    type: XcodeProjectType;
}