import { App, PluginSettingTab, Setting } from 'obsidian';
import ToDoPlugin from 'main';

export class SettingsTab extends PluginSettingTab {
	plugin: ToDoPlugin;

	constructor(app: App, plugin: ToDoPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

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
