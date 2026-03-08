import * as vscode from 'vscode';

export interface EnvMetadata {
    name: string;
    tag: 'dev' | 'staging' | 'prod' | 'custom';
    color?: string;
    isProduction?: boolean;
}

export interface EnvSecrets {
    [key: string]: string;
}

export interface Environment {
    metadata: EnvMetadata;
    secrets: EnvSecrets;
}

export class VaultManager {
    private static readonly ENV_LIST_KEY = 'envvault.environments';
    private static readonly SECRET_PREFIX = 'envvault.secrets.';

    constructor(private readonly secretStorage: vscode.SecretStorage) { }

    /**
     * Get all environment metadata.
     */
    async getEnvironments(): Promise<EnvMetadata[]> {
        const data = await this.secretStorage.get(VaultManager.ENV_LIST_KEY);
        if (!data) {
            return [];
        }
        try {
            return JSON.parse(data) as EnvMetadata[];
        } catch (e) {
            console.error('Failed to parse environment list', e);
            return [];
        }
    }

    /**
     * Get secrets for a specific environment.
     */
    async getSecrets(envName: string): Promise<EnvSecrets> {
        const data = await this.secretStorage.get(`${VaultManager.SECRET_PREFIX}${envName}`);
        if (!data) {
            return {};
        }
        try {
            return JSON.parse(data) as EnvSecrets;
        } catch (e) {
            console.error(`Failed to parse secrets for ${envName}`, e);
            return {};
        }
    }

    /**
     * Save an environment (metadata and secrets).
     */
    async saveEnvironment(metadata: EnvMetadata, secrets: EnvSecrets): Promise<void> {
        const envs = await this.getEnvironments();
        const index = envs.findIndex(e => e.name === metadata.name);

        if (index >= 0) {
            envs[index] = metadata;
        } else {
            envs.push(metadata);
        }

        await this.secretStorage.store(VaultManager.ENV_LIST_KEY, JSON.stringify(envs));
        await this.secretStorage.store(`${VaultManager.SECRET_PREFIX}${metadata.name}`, JSON.stringify(secrets));
    }

    /**
     * Delete an environment.
     */
    async deleteEnvironment(envName: string): Promise<void> {
        const envs = await this.getEnvironments();
        const filtered = envs.filter(e => e.name !== envName);

        await this.secretStorage.store(VaultManager.ENV_LIST_KEY, JSON.stringify(filtered));
        await this.secretStorage.delete(`${VaultManager.SECRET_PREFIX}${envName}`);
    }

    /**
     * Rename an environment.
     */
    async renameEnvironment(oldName: string, newName: string): Promise<void> {
        const envs = await this.getEnvironments();
        const envIndex = envs.findIndex(e => e.name === oldName);
        if (envIndex === -1) {
            throw new Error(`Environment ${oldName} not found`);
        }

        const secrets = await this.getSecrets(oldName);

        envs[envIndex].name = newName;

        await this.secretStorage.store(VaultManager.ENV_LIST_KEY, JSON.stringify(envs));
        await this.secretStorage.store(`${VaultManager.SECRET_PREFIX}${newName}`, JSON.stringify(secrets));
        await this.secretStorage.delete(`${VaultManager.SECRET_PREFIX}${oldName}`);
    }
}
