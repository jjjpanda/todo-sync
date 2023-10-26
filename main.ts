import ToDoSettings, { DEFAULT_SETTINGS } from 'lib/ToDoSettings';
import MSAuthServer from 'lib/MSAuthServer';
import { Plugin } from 'obsidian';
import { ObsidianUtils } from 'lib/obsidianUtils';
import SettingsTab from 'lib/SettingsTab';
import CardManager from './lib/CardManager'
import { MSLoginEvent } from 'lib/MSLoginEvent';
import {TaskExtracter} from "./lib/TaskExtracter"
import {ToDoExtracter} from "./lib/ToDoExtracter"
import TaskDelta from "./lib/TaskDelta"
import ToDoUploader from "./lib/ToDoUploader"

export default class ToDoPlugin extends Plugin {
	settings: ToDoSettings;
	private server: MSAuthServer;
	private obsidianUtils: ObsidianUtils;
	private synchronizer: CardManager;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new SettingsTab(this.app, this));
		if(!this.settings.OAUTH_CLIENT_SECRET){
			console.error("no client secret")
			return
		}
		if(!this.settings.OAUTH_CLIENT_ID){
			console.error("no client id")
			return
		}

		this.server = new MSAuthServer(this.settings)
		this.server.start()






		this.obsidianUtils = new ObsidianUtils(this.app);

		
		try{
			const callbackUrl = await this.server.signIn()

			this.app.workspace.onLayoutReady(() => {
				const popup = window.open(callbackUrl, "_blank")
				if(popup){
					this.server.setPopUpInstance(popup)
				}
				else{
					console.log("popup is", popup, "| wasn't given to server")
				}
			})
		} catch(error){
			console.error(error)
		}

		const statusBarNameFromMS = this.addStatusBarItem();
		statusBarNameFromMS.setText("Loading...")


		this.synchronizer = new CardManager(this.app, this.settings.TASK_FOLDER)
		
		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, "change", (evt: MSLoginEvent) => {
			const session = this.server.getSession()
			console.log("MICROSOFT LOGIN EVENT", session, evt)

			if(!session.loggedIn){
				return
			}

			const user = this.server.getUsers(session.userId)
			statusBarNameFromMS.setText(user.displayName);
			this.registerInterval(
				window.setInterval(
					async () => {
						const taskLists = await TaskExtracter.parseTasks(this.app, this.synchronizer.kanbanCards)
						const todoLists = await ToDoExtracter.getToDoTasks(this.server)

						console.log(taskLists, todoLists)

						//compare the two lists
						const missingFromCloud = TaskDelta.getTaskDelta(taskLists, todoLists)
						const missingFromLocal = TaskDelta.getTaskDelta(todoLists, taskLists)
						console.log("missing from cloud", missingFromCloud, "missing from local", missingFromLocal)


						//upload to cloud
						ToDoUploader.upload(this.server, missingFromCloud)

					}, 
					Number(this.settings.SYNC_RATE)
				)
			);

			this.synchronizer.syncKanbanCards()
			this.registerEvent(this.app.vault.on('create', async (file) => {
				console.log('created', file)
				await this.synchronizer.syncKanbanCards();
			}))
			this.registerEvent(this.app.vault.on('rename', async (file, oldPath) => {
				console.log('renamed', file, "from", oldPath)
				await this.synchronizer.syncKanbanCards();
			}))
			this.registerEvent(this.app.vault.on('delete', async (file) => {
				console.log('deleted', file)
				await this.synchronizer.syncKanbanCards();
			}))

			this.registerEvent(this.app.vault.on('modify', async (file) => {
				const cardIndex = this.synchronizer.findKanbanCard(file)
				if(cardIndex != -1){
					console.log(file)
				}
			}));
		
			
		})
		
	}

	onunload() {
		this.server.stop();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


