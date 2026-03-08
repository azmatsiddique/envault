import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { EnvSecrets } from './vaultManager';

export class InjectionEngine {
    constructor() { }

    /**
     * Inject secrets into multiple files.
     */
    async inject(secrets: EnvSecrets, filePaths: string[]): Promise<void> {
        for (const filePath of filePaths) {
            const absolutePath = this.getAbsolutePath(filePath);
            if (!fs.existsSync(absolutePath)) {
                console.warn(`File not found: ${absolutePath}`);
                continue;
            }

            // Create backup
            await this.createBackup(absolutePath);

            const ext = path.extname(absolutePath);
            const fileName = path.basename(absolutePath);

            if (fileName === '.env') {
                await this.injectDotEnv(absolutePath, secrets);
            } else if (ext === '.yml' || ext === '.yaml') {
                await this.injectYaml(absolutePath, secrets);
            } else if (fileName === 'spark-defaults.conf') {
                await this.injectSparkConf(absolutePath, secrets);
            } else {
                console.warn(`Unsupported file type: ${absolutePath}`);
            }
        }
    }

    /**
     * Get absolute path relative to workspace root.
     */
    private getAbsolutePath(filePath: string): string {
        if (path.isAbsolute(filePath)) {
            return filePath;
        }
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            throw new Error('No workspace folder open');
        }
        return path.join(workspaceFolders[0].uri.fsPath, filePath);
    }

    /**
     * Create a backup of the file.
     */
    private async createBackup(filePath: string): Promise<void> {
        const backupPath = `${filePath}.envvault.bak`;
        await fs.promises.copyFile(filePath, backupPath);
    }

    /**
     * Inject into .env file preserving comments and order.
     */
    private async injectDotEnv(filePath: string, secrets: EnvSecrets): Promise<void> {
        const content = await fs.promises.readFile(filePath, 'utf8');
        const lines = content.split('\n');
        const updatedLines: string[] = [];
        const seenKeys = new Set<string>();

        const secretsToInject = { ...secrets };

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    if (secretsToInject[key] !== undefined) {
                        updatedLines.push(`${key}=${secretsToInject[key]}`);
                        delete secretsToInject[key];
                        seenKeys.add(key);
                        continue;
                    }
                }
            }
            updatedLines.push(line);
        }

        // Add remaining secrets at the end
        for (const [key, value] of Object.entries(secretsToInject)) {
            if (!seenKeys.has(key)) {
                updatedLines.push(`${key}=${value}`);
            }
        }

        await fs.promises.writeFile(filePath, updatedLines.join('\n'), 'utf8');
    }

    /**
     * Inject into YAML file. Supports profiles.yml and generic config.yaml.
     */
    private async injectYaml(filePath: string, secrets: EnvSecrets): Promise<void> {
        const content = await fs.promises.readFile(filePath, 'utf8');
        let data: any;
        try {
            data = yaml.load(content);
        } catch (e) {
            console.error(`Failed to parse YAML: ${filePath}`, e);
            return;
        }

        if (path.basename(filePath) === 'profiles.yml') {
            this.patchDbtProfiles(data, secrets);
        } else {
            this.patchGenericYaml(data, secrets);
        }

        const updatedContent = yaml.dump(data, { indent: 2 });
        await fs.promises.writeFile(filePath, updatedContent, 'utf8');
    }

    /**
     * Patch dbt profiles.yml.
     */
    private patchDbtProfiles(data: any, secrets: EnvSecrets): void {
        // dbt profiles usually have: profile_name -> outputs -> target_name -> [connection settings]
        // This is a simplified version. A more robust one would need to know WHICH profile/target to patch.
        // For MVP, we'll look for keys in secrets that match common dbt keys (user, password, host, etc.)
        // and try to find where they fit, or expect secrets to have full paths like "my_profile.outputs.dev.user"
        this.patchGenericYaml(data, secrets);
    }

    /**
     * Patch generic YAML using dot notation for keys in secrets.
     */
    private patchGenericYaml(data: any, secrets: EnvSecrets): void {
        for (const [keyPath, value] of Object.entries(secrets)) {
            const parts = keyPath.split('.');
            let current = data;
            for (let i = 0; i < parts.length - 1; i++) {
                if (!current[parts[i]]) {
                    current[parts[i]] = {};
                }
                current = current[parts[i]];
            }
            current[parts[parts.length - 1]] = value;
        }
    }

    /**
     * Inject into spark-defaults.conf.
     */
    private async injectSparkConf(filePath: string, secrets: EnvSecrets): Promise<void> {
        const content = await fs.promises.readFile(filePath, 'utf8');
        const lines = content.split('\n');
        const updatedLines: string[] = [];
        const seenKeys = new Set<string>();
        const secretsToInject = { ...secrets };

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const parts = trimmedLine.split(/\s+/);
                if (parts.length >= 2) {
                    const key = parts[0];
                    if (secretsToInject[key] !== undefined) {
                        updatedLines.push(`${key} ${secretsToInject[key]}`);
                        delete secretsToInject[key];
                        seenKeys.add(key);
                        continue;
                    }
                }
            }
            updatedLines.push(line);
        }

        for (const [key, value] of Object.entries(secretsToInject)) {
            if (!seenKeys.has(key)) {
                updatedLines.push(`${key} ${value}`);
            }
        }

        await fs.promises.writeFile(filePath, updatedLines.join('\n'), 'utf8');
    }
}
