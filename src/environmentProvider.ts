import * as vscode from 'vscode';
import { VaultManager } from './vaultManager';

export class EnvironmentProvider implements vscode.TreeDataProvider<EnvItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<EnvItem | undefined | void> = new vscode.EventEmitter<EnvItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<EnvItem | undefined | void> = this._onDidChangeTreeData.event;

    constructor(private vaultManager: VaultManager) { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: EnvItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: EnvItem): Promise<EnvItem[]> {
        if (element) {
            return []; // No nested items for now
        }

        const envs = await this.vaultManager.getEnvironments();
        return envs.map(env => new EnvItem(
            env.name,
            env.tag,
            env.isProduction ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.None,
            {
                command: 'envvault.switchEnvironment',
                title: 'Switch Environment',
                arguments: [env.name]
            }
        ));
    }
}

class EnvItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly tag: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label} (${this.tag})`;
        this.description = this.tag;

        if (this.tag === 'prod') {
            this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('errorForeground'));
        } else {
            this.iconPath = new vscode.ThemeIcon('shield');
        }

        this.contextValue = 'environment';
    }
}
