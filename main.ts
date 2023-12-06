import { Plugin, Notice, MarkdownView, Editor } from 'obsidian';

import ToDoSettings, { DEFAULT_SETTINGS } from 'lib/model/ToDoSettings';
import SettingsTab from 'lib/view/SettingsTab';

import {MSLoginEvent} from 'lib/MSAuthServer';
import TaskSync from './lib/TaskSync'
import TaskOpenerModal from "./lib/view/TaskOpenerModal"
import Logger from "./lib/util/logger"
import { reorderCheckboxes } from 'lib/util/TaskReorderingUtil';
const logger: Logger = new Logger("PluginClass");
export default class ToDoPlugin extends Plugin {
	settings: ToDoSettings;
	taskFileSelector: HTMLElement;
	taskReorderButton: HTMLElement;
	taskSyncStatus: HTMLElement;
	taskSyncButton: HTMLElement;
	private taskSync: TaskSync
	
	async onload() {
		try{
			await this.loadSettings();
		} catch(e){
			logger.error(e)
			return
		}

		this.taskSync = new TaskSync(this.app, this.settings);
		
		try{
			await this.taskSync.server.stop()
			await this.taskSync.server.start()
		} catch (err){
			this.throwErrorAndQuit(new Error(err), `Server didn't start`)
		}		
		
		const statusBarNameFromMS = this.addStatusBarItem();
		statusBarNameFromMS.setText("Loading...")

		const syncButtonOnStatusBar = this.addStatusBarItem();
		syncButtonOnStatusBar.createEl("div", {attr: {id: "syncButtonOnStatusBar"}})
		const possibleTaskSyncButton = document.getElementById("syncButtonOnStatusBar") 
		if(possibleTaskSyncButton === null){
			this.throwErrorAndQuit(new Error("Set Up Error"), "No Sync Button on Status Bar")
		}
		else{
			this.taskSyncStatus = possibleTaskSyncButton
		}
		
		try{
			await this.taskSync.server.signIn(this.app.workspace)
		} catch(error){
			this.throwErrorAndQuit(new Error("sign in failed"), "error with logging in")
		}
		
		this.registerDomEvent(document, "change", async (evt: MSLoginEvent) => {
			const session = this.taskSync.server.getSession()
			logger.info("login event", session, evt)

			if(!session.loggedIn){
				this.throwErrorAndQuit(new Error("not logged in"), "error with logging in")
			}

			const user = this.taskSync.server.getUsers(session.userId)
			statusBarNameFromMS.setText(user.displayName);
			this.taskSyncStatus.innerHTML = "⟳ fetching..."

			const graphClient = this.taskSync.server.getGraphClient();
			if(!graphClient){
				this.throwErrorAndQuit(new Error("no graph client available"), "no graph client to get microsoft to-do list")
			}
			this.taskSync.setGraphClient(graphClient);

			this.app.workspace.onLayoutReady(async () => {
				logger.debug('MS LOGINEVENT AND LAYOUT READY')

				if(!this.taskSync.getCards() || this.taskSync.getCards().length === 0){
					await this.taskSync.syncCards()
				}
				
				this.setUpTaskFileSelectorRibbon();
				this.setUpReorderTasksRibbon();
				this.setUpReorderTasksCommand();

				this.setUpVaultEventListeners();
				this.taskSyncStatus.innerHTML = await this.taskSync.fetchDelta()
				this.setUpTaskSyncCommand();
				this.setUpTaskSyncRibbon();

				this.registerInterval(
					window.setInterval(
						async () => {
							this.taskSyncStatus.innerHTML = await this.taskSync.fetchDelta()
						}, 
						Number(this.settings.FETCH_RATE) * 1000
					)
				)
			})
			
		})
	}

	private setUpTaskSyncRibbon() {
		this.taskSyncButton = this.addRibbonIcon(
			'refresh-ccw',
			"Sync Tasks",
			async (evt) => {
				this.taskSyncStatus.innerHTML = await this.taskSync.syncTaskListsAndTasks();
			}
		);
	}

	private setUpTaskSyncCommand() {
		this.addCommand({
			id: "sync-lists-and-tasks-command",
			name: "Sync Tasks",
			callback: async () => {
				this.taskSyncStatus.innerHTML = await this.taskSync.syncTaskListsAndTasks();
			}
		});
	}

	private setUpVaultEventListeners() {
		this.registerEvent(this.app.vault.on('create', async (file) => {
			this.taskSyncStatus.innerHTML = await this.taskSync.queueAdditionToRemote(file);
		}));
		this.registerEvent(this.app.vault.on('rename', async (file, oldPath) => {
			this.taskSyncStatus.innerHTML = await this.taskSync.queueAbstractModificationFromRename(file, oldPath);
		}));
		this.registerEvent(this.app.vault.on('delete', async (file) => {
			this.taskSyncStatus.innerHTML = await this.taskSync.queueDeletionToRemote(file);
		}));
		this.registerEvent(this.app.vault.on('modify', async (file) => {
			this.taskSyncStatus.innerHTML = await this.taskSync.queueModificationToRemoteFromWrite(file);
		}));
	}

	private setUpReorderTasksCommand() {
		this.addCommand({
			id: 'reorder-tasks-on-page',
			name: 'Reorder Tasks',
			editorCallback(editor: Editor, ctx) {
				reorderCheckboxes("source", editor);
			},
		});
	}

	private setUpReorderTasksRibbon() {
		this.taskReorderButton = this.addRibbonIcon(
			'arrow-up-down',
			"Reorder Tasks",
			(evt: MouseEvent) => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) {
					return;
				}
				const editor = view.editor;
				if (editor) {
					reorderCheckboxes(view.getMode(), editor, this.app.vault, view.file);
				}
			}
		);
	}

	private setUpTaskFileSelectorRibbon() {
		this.taskFileSelector = this.addRibbonIcon(
			'checkmark',
			'Task Files',
			(evt: MouseEvent) => {
				new TaskOpenerModal(
					this.app,
					this.taskSync
				).open();
			}
		);
	}

	onunload() {
		this.taskSync.server.stop();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
		logger.info("loaded settings", this.settings)
		this.addSettingTab(new SettingsTab(this.app, this));
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
		await this.unload()
		await this.onload()
	}
}


