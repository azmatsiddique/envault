import * as vscode from 'vscode';
import { VaultManager, EnvMetadata } from './vaultManager';
import { InjectionEngine } from './injectionEngine';
import { StatusBarManager } from './statusBarManager';
import { EnvironmentProvider } from './environmentProvider';

let vaultManager: VaultManager;
let injectionEngine: InjectionEngine;
let statusBarManager: StatusBarManager;
let environmentProvider: EnvironmentProvider;

export async function activate(context: vscode.ExtensionContext) {
    console.log('EnvVault is now active!');

    vaultManager = new VaultManager(context.secrets);
    injectionEngine = new InjectionEngine();
    statusBarManager = new StatusBarManager();
    environmentProvider = new EnvironmentProvider(vaultManager);

    // Register sidebar
    vscode.window.registerTreeDataProvider('envvault-environments', environmentProvider);

    // Command: Switch Environment
    const switchEnvCmd = vscode.commands.registerCommand('envvault.switchEnvironment', async (arg?: string | any) => {
        const envs = await vaultManager.getEnvironments();
        if (envs.length === 0) {
            const action = await vscode.window.showInformationMessage('No environments found. Add one?', 'Add Environment');
            if (action === 'Add Environment') {
                vscode.commands.executeCommand('envvault.addEnvironment');
            }
            return;
        }

        let selectedEnvName: string | undefined;

        // Handle arguments from different sources
        if (typeof arg === 'string') {
            selectedEnvName = arg;
        } else if (arg && typeof arg === 'object') {
            // Probably a TreeItem (sidebar item)
            if (typeof arg.label === 'string') {
                selectedEnvName = arg.label;
            } else if (arg.label && typeof arg.label.label === 'string') {
                selectedEnvName = arg.label.label;
            }
        }

        if (!selectedEnvName) {
            const items = envs.map(e => ({
                label: e.name,
                description: e.tag,
                detail: e.isProduction ? '⚠️ PRODUCTION' : undefined,
                env: e
            }));
            const selection = await vscode.window.showQuickPick(items, { placeHolder: 'Select an environment to activate' });
            if (!selection) { return; }
            selectedEnvName = selection.label;
        }

        const env = envs.find(e => e.name === selectedEnvName);
        if (!env) {
            vscode.window.showErrorMessage(`EnvVault: Environment "${selectedEnvName}" not found.`);
            return;
        }

        // Production Guard
        if (env.isProduction || env.tag === 'prod') {
            const confirmed = await statusBarManager.showProductionGuard(env.name);
            if (!confirmed) {
                vscode.window.showInformationMessage('Switch to production cancelled.');
                return;
            }
        }

        // Perform Injection
        const secrets = await vaultManager.getSecrets(env.name);
        const config = vscode.workspace.getConfiguration('envvault');
        const filePaths = config.get<string[]>('injectionFiles') || ['.env', 'profiles.yml', 'config.yaml'];

        try {
            await injectionEngine.inject(secrets, filePaths);
            statusBarManager.update(env);
            vscode.window.showInformationMessage(`EnvVault: Activated ${env.name}`);
        } catch (e: any) {
            vscode.window.showErrorMessage(`EnvVault: Failed to inject secrets: ${e.message}`);
        }
    });

    // Command: Add Environment (Simple version for MVP)
    const addEnvCmd = vscode.commands.registerCommand('envvault.addEnvironment', async () => {
        const name = await vscode.window.showInputBox({ prompt: 'Environment Name (e.g. dev, prod)' });
        if (!name) { return; }

        const tagSelection = await vscode.window.showQuickPick(['dev', 'staging', 'prod', 'custom'], { placeHolder: 'Select a tag' });
        if (!tagSelection) { return; }

        const secretsJson = await vscode.window.showInputBox({
            prompt: 'Enter secrets as JSON (e.g. {"KEY": "VALUE"})',
            placeHolder: '{"DB_HOST": "localhost"}'
        });
        if (!secretsJson) { return; }

        try {
            const secrets = JSON.parse(secretsJson);
            const metadata: EnvMetadata = {
                name,
                tag: tagSelection as any,
                isProduction: tagSelection === 'prod'
            };
            await vaultManager.saveEnvironment(metadata, secrets);
            environmentProvider.refresh();
            vscode.window.showInformationMessage(`EnvVault: Added environment ${name}`);
        } catch (e: any) {
            vscode.window.showErrorMessage(`Failed to add environment: Invalid JSON`);
        }
    });

    // Command: Edit Environment
    const editEnvCmd = vscode.commands.registerCommand('envvault.editEnvironment', async (arg?: any) => {
        let envName: string | undefined;
        if (typeof arg === 'string') {
            envName = arg;
        } else if (arg && arg.label) {
            envName = typeof arg.label === 'string' ? arg.label : arg.label.label;
        }

        if (!envName) {
            const envs = await vaultManager.getEnvironments();
            const selection = await vscode.window.showQuickPick(envs.map(e => e.name), { placeHolder: 'Select an environment to edit' });
            if (!selection) { return; }
            envName = selection;
        }

        const envs = await vaultManager.getEnvironments();
        const env = envs.find(e => e.name === envName);
        if (!env) { return; }

        const secrets = await vaultManager.getSecrets(envName);

        const newName = await vscode.window.showInputBox({ prompt: 'Environment Name', value: env.name });
        if (!newName) { return; }

        const tagSelection = await vscode.window.showQuickPick(['dev', 'staging', 'prod', 'custom'], {
            placeHolder: 'Select a tag',
            canPickMany: false
        });
        // VS Code quickpick doesn't have a simple way to "pre-select" but we can show it in description
        if (!tagSelection) { return; }

        const secretsJson = await vscode.window.showInputBox({
            prompt: 'Edit secrets as JSON',
            value: JSON.stringify(secrets)
        });
        if (!secretsJson) { return; }

        try {
            const newSecrets = JSON.parse(secretsJson);
            const newMetadata: EnvMetadata = {
                name: newName,
                tag: tagSelection as any,
                isProduction: tagSelection === 'prod'
            };

            if (newName !== envName) {
                await vaultManager.deleteEnvironment(envName);
            }
            await vaultManager.saveEnvironment(newMetadata, newSecrets);
            environmentProvider.refresh();
            vscode.window.showInformationMessage(`EnvVault: Updated environment ${newName}`);
        } catch (e: any) {
            vscode.window.showErrorMessage(`Failed to update environment: Invalid JSON`);
        }
    });

    // Command: Delete Environment
    const deleteEnvCmd = vscode.commands.registerCommand('envvault.deleteEnvironment', async (arg?: any) => {
        let envName: string | undefined;
        if (typeof arg === 'string') {
            envName = arg;
        } else if (arg && arg.label) {
            envName = typeof arg.label === 'string' ? arg.label : arg.label.label;
        }

        if (!envName) {
            const envs = await vaultManager.getEnvironments();
            const selection = await vscode.window.showQuickPick(envs.map(e => e.name), { placeHolder: 'Select an environment to delete' });
            if (!selection) { return; }
            envName = selection;
        }

        const confirmed = await vscode.window.showWarningMessage(
            `Are you sure you want to delete the environment "${envName}"? This cannot be undone.`,
            { modal: true },
            'Delete'
        );

        if (confirmed === 'Delete') {
            await vaultManager.deleteEnvironment(envName);
            environmentProvider.refresh();
            vscode.window.showInformationMessage(`EnvVault: Deleted environment ${envName}`);
        }
    });

    // Command: Refresh
    const refreshCmd = vscode.commands.registerCommand('envvault.refreshEntry', () => {
        environmentProvider.refresh();
    });

    context.subscriptions.push(switchEnvCmd, addEnvCmd, editEnvCmd, deleteEnvCmd, refreshCmd, statusBarManager);
}

export function deactivate() { }
