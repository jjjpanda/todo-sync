import { App, PluginSettingTab, Setting, TFile, TFolder } from 'obsidian';
import ToDoPlugin from 'main';
import Logger from "../util/logger";

const logger = new Logger("SettingsTab")

export default class SettingsTab extends PluginSettingTab {
	plugin: ToDoPlugin;

	constructor(app: App, plugin: ToDoPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
            .setName('Folder Selection')
            .setDesc('Select a folder from the vault that has task folders')
            .addDropdown(dropdown => {
                // Get the list of all markdown files in the vault
                let abstractFiles = this.app.vault.getAllLoadedFiles();

                // Create an object with folder paths as keys and display names as values
                let options = {};
				
                abstractFiles.forEach(fileOrFolder => {
                    if(!("extension" in (fileOrFolder as TFile))){
						options[fileOrFolder.path] = fileOrFolder.path;
					}
                });

                dropdown
					.addOptions(options)
					.onChange(async (value) => {
						this.plugin.settings.TASK_FOLDER = value;
						await this.plugin.saveSettings();
					})
					.setValue(this.plugin.settings.TASK_FOLDER);
            });

		new Setting(containerEl)
			.setName('Auth Server Port')
			.setDesc('Authentication Daemon Port')
			.addText(text => text
				.setPlaceholder('3000')
				.setValue(this.plugin.settings.PORT)
				.onChange(async (value) => {
					this.plugin.settings.PORT = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Sync Rate')
			.setDesc('How often you want tasks to be synced with Microsoft To-Do (in milliseconds)')
			.addText(text => text
				.setPlaceholder('10000')
				.setValue(this.plugin.settings.SYNC_RATE)
				.onChange(async (value) => {
					this.plugin.settings.SYNC_RATE = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Application Client ID')
			.setDesc('Microsoft Azure App Registration Client ID')
			.addText(text => text
				.setPlaceholder('Enter the id')
				.setValue(this.plugin.settings.OAUTH_CLIENT_ID)
				.onChange(async (value) => {
					this.plugin.settings.OAUTH_CLIENT_ID = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Client Secret Value')
			.setDesc('Microsoft Azure App Registration Client Secret (generated in Certificates & secrets section)')
			.addText(text => text
				.setPlaceholder('Enter the secret')
				.setValue(this.plugin.settings.OAUTH_CLIENT_SECRET)
				.onChange(async (value) => {
					this.plugin.settings.OAUTH_CLIENT_SECRET = value;
					await this.plugin.saveSettings();
				}));
	}
}
