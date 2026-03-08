import * as vscode from 'vscode';
import { EnvMetadata } from './vaultManager';

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = 'envvault.switchEnvironment';
        this.statusBarItem.show();
        this.update(undefined);
    }

    /**
     * Update the status bar item with the active environment.
     */
    update(env?: EnvMetadata) {
        if (!env) {
            this.statusBarItem.text = '$(lock) [ No Env ]';
            this.statusBarItem.backgroundColor = undefined;
            this.statusBarItem.tooltip = 'Click to select environment';
            return;
        }

        const tag = env.tag.toUpperCase();
        this.statusBarItem.text = `$(shield) [ ${env.name} ]`;
        this.statusBarItem.tooltip = `Active Environment: ${env.name} (${tag})`;

        if (env.isProduction || env.tag === 'prod') {
            this.statusBarItem.text = `$(warning) [ ${env.name} ]`;
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        } else if (env.tag === 'staging') {
            this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        } else {
            this.statusBarItem.backgroundColor = undefined;
        }
    }

    /**
     * Show production guard modal with countdown.
     */
    async showProductionGuard(envName: string): Promise<boolean> {
        return new Promise((resolve) => {
            // Delay showing the modal for 3 seconds to act as a "guard"
            setTimeout(async () => {
                const selection = await vscode.window.showWarningMessage(
                    `ACTIVATE PRODUCTION: ${envName}?`,
                    { modal: true },
                    'Yes, Switch to Production',
                    'Cancel'
                );
                resolve(selection === 'Yes, Switch to Production');
            }, 3000);
        });
    }

    dispose() {
        this.statusBarItem.dispose();
    }
}
