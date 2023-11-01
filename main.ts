import { Plugin, Notice } from 'obsidian';

import ToDoSettings, { DEFAULT_SETTINGS } from 'lib/ToDoSettings';
import SettingsTab from 'lib/SettingsTab';

import {MSLoginEvent} from 'lib/MSAuthServer';
import TaskSync from './lib/TaskSync'

export default class ToDoPlugin extends Plugin {
	settings: ToDoSettings;
	private taskSync: TaskSync

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SettingsTab(this.app, this));
		if(!this.settings.OAUTH_CLIENT_SECRET || !this.settings.OAUTH_CLIENT_ID){
			new Notice("no client secret/id")
			return
		}

		this.taskSync = new TaskSync(this.app, this.settings)
		this.taskSync.server.start()

		try{
			const callbackUrl = await this.taskSync.server.signIn()

			this.app.workspace.onLayoutReady(() => {
				const popup = window.open(callbackUrl, "_blank")
				if(popup){
					this.taskSync.server.setPopUpInstance(popup)
				}
				else{
					console.log("popup is", popup, "| wasn't given to server")
				}
			})
		} catch(error){
			console.error(error)
			new Notice("error with logging in")
			return
		}

		const statusBarNameFromMS = this.addStatusBarItem();
		statusBarNameFromMS.setText("Loading...")

		this.registerDomEvent(document, "change", async (evt: MSLoginEvent) => {
			const session = this.taskSync.server.getSession()
			console.log("MICROSOFT LOGIN EVENT", session, evt)

			if(!session.loggedIn){
				new Notice("error with logging in")
				return
			}

			const user = this.taskSync.server.getUsers(session.userId)
			statusBarNameFromMS.setText(user.displayName);

			await this.taskSync.syncCards()
			await this.taskSync.initialResolution()

			this.registerInterval(
				window.setInterval(
					async () => {
						await this.taskSync.periodicResolution(this.app, this.taskSync.taskManager, this.server)
					}, 
					Number(this.settings.SYNC_RATE)
				)
			)

			this.registerEvent(this.app.vault.on('create', async (file) => {
				console.log('created', file)
				this.taskSync.queueAdditionToRemote()
				await this.taskSync.syncCards()
			}))
			this.registerEvent(this.app.vault.on('rename', async (file, oldPath) => {
				console.log('renamed', file, "from", oldPath)
				this.taskSync.queueModificationToRemote()
				await this.taskSync.syncCards()
			}))
			this.registerEvent(this.app.vault.on('delete', async (file) => {
				console.log('deleted', file)
				this.taskSync.queueDeletionToRemote()
				await this.taskSync.syncCards()
			}))

			this.registerEvent(this.app.vault.on('modify', async (file) => {
				const cardIndex = this.taskSync.taskManager.findKanbanCard(file)
				if(cardIndex != -1){
					console.log(file)
					this.taskSync.queueModificationToRemote()
				}
			}));
		})
	}

	onunload() {
		this.taskSync.server.stop();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


