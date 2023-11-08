import { Plugin, Notice } from 'obsidian';

import ToDoSettings, { DEFAULT_SETTINGS } from 'lib/ToDoSettings';
import SettingsTab from 'lib/SettingsTab';

import {MSLoginEvent} from 'lib/MSAuthServer';
import TaskSync from './lib/TaskSync'
import TaskOpenerModal from "./lib/TaskOpenerModal"
import Logger from "./lib/logger"
const logger: Logger = new Logger("Plugin");
export default class ToDoPlugin extends Plugin {
	settings: ToDoSettings;
	private taskSync: TaskSync
	

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new SettingsTab(this.app, this));

		this.taskSync = new TaskSync(this.app, this.settings);
		await this.taskSync.syncCards()
		this.taskSync.server.start()

		const taskFileSelector = this.addRibbonIcon(
			'checkmark', 
			'Task Files', 
			(evt: MouseEvent) => {	
				new TaskOpenerModal(
					this.app, 
					this.taskSync.getCards()
				).open()
			}
		);
		
		try{
			const callbackUrl = await this.taskSync.server.signIn()

			this.app.workspace.onLayoutReady(() => {
				window.open(callbackUrl, "_blank")
			})
		} catch(error){
			this.throwErrorAndQuit(new Error("sign in failed"), "error with logging in")
		}

		const statusBarNameFromMS = this.addStatusBarItem();
		statusBarNameFromMS.setText("Loading...")

		this.registerDomEvent(document, "change", async (evt: MSLoginEvent) => {
			const session = this.taskSync.server.getSession()
			logger.log("MICROSOFT LOGIN EVENT", session, evt)

			if(!session.loggedIn){
				this.throwErrorAndQuit(new Error("not logged in"), "error with logging in")
			}

			const user = this.taskSync.server.getUsers(session.userId)
			statusBarNameFromMS.setText(user.displayName);

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
				logger.log('created', file)
				this.taskSync.queueAdditionToRemote()
				await this.taskSync.syncCards()
			}))
			this.registerEvent(this.app.vault.on('rename', async (file, oldPath) => {
				logger.log('renamed', file, "from", oldPath)
				this.taskSync.queueModificationToRemote()
				await this.taskSync.syncCards()
			}))
			this.registerEvent(this.app.vault.on('delete', async (file) => {
				logger.log('deleted', file)
				this.taskSync.queueDeletionToRemote()
				await this.taskSync.syncCards()
			}))

			this.registerEvent(this.app.vault.on('modify', async (file) => {
				const cardIndex = this.taskSync.taskManager.findKanbanCard(file)
				if(cardIndex != -1){
					logger.log(file)
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
		logger.log("loaded settings", this.settings)
		if(!this.settings.OAUTH_CLIENT_SECRET || !this.settings.OAUTH_CLIENT_ID){
			this.throwErrorAndQuit(new Error("settings invalid"), "no client secret/id")
		}
	}

	throwErrorAndQuit(error: Error, msg: string){
		new Notice(msg)
		logger.error(error)
		throw error
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


