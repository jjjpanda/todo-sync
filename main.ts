import { DEFAULT_SETTINGS } from 'lib/DEFAULT_SETTINGS';
import { ToDoSettings } from 'lib/ToDoSettings';
import { TodoServer } from 'lib/ToDoServer';
import { WorkspaceLeaf, MarkdownView, Notice, Plugin, TFile} from 'obsidian';
import { ObsidianUtils } from 'lib/obsidianUtils';
import { SampleModal } from 'lib/SampleModal';
import { SettingsTab } from 'lib/SettingsTab';
import {CardManager} from './lib/CardManager'
import { MSLoginEvent } from 'lib/MSLoginEvent';
export default class ToDoPlugin extends Plugin {
	settings: ToDoSettings;
	private server: TodoServer;
	private obsidianUtils: ObsidianUtils;
	private synchronizer: CardManager;

	async onload() {
		await this.loadSettings();
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingsTab(this.app, this));

		if(!this.settings.OAUTH_CLIENT_SECRET){
			console.error("no client secret")
			return
		}
		if(!this.settings.OAUTH_CLIENT_ID){
			console.error("no client id")
			return
		}

		this.obsidianUtils = new ObsidianUtils(this.app);
		this.server = new TodoServer(this.obsidianUtils, this.settings)
		this.server.start()

		// const keyRibbonButton = this.addRibbonIcon('key', '----hover text---', (evt: MouseEvent) => {
		// 	// Called when the user clicks the icon.
		// 	new Notice('this is where msft login happens');
		// });

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
						// const promisedTasks = this.server.getTasks();
						
						// promisedTasks
						// 	.then(tasks => Promise.all(tasks.value.map(list => this.server.getTaskItems(list.id))))
						// 	.then(taskItems => taskItems.map(items => items.value))
						// 	.then(taskItems => console.debug(taskItems))

						//syncing
						
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

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		
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


