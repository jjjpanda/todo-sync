import { readFileSync } from 'fs-extra';
import { App, FileSystemAdapter } from 'obsidian';
import path from 'path';

export default class ObsidianUtils {
	private app: App;
	private fileSystem: FileSystemAdapter;

	private yamlRegex = /^---.*?---\n(.*?)($|---)/s;

	constructor(app: App) {
		this.app = app;
		this.fileSystem = this.app.vault.adapter as FileSystemAdapter;
	}

	getVaultName(): string {
		return this.app.vault.getName();
	}

	getVaultDirectory(): string {
		return this.fileSystem.getBasePath();
	}

	getPluginDirectory(): string {
		return path.join(this.getVaultDirectory(), this.app.vault.configDir, 'plugins/todo-sync/');
	}
}