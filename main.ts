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
	taskReorderButton: HTMLElement
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
			await this.taskSync.server.start()
		} catch (err){
			this.throwErrorAndQuit(new Error(err), `Server didn't start`)
		}		
		
		const statusBarNameFromMS = this.addStatusBarItem();
		statusBarNameFromMS.setText("Loading...")
		
		try{
			await this.taskSync.server.signIn(this.app.workspace)
		} catch(error){
			this.throwErrorAndQuit(new Error("sign in failed"), "error with logging in")
		}

		this.app.workspace.onLayoutReady(async () => {
			await this.taskSync.syncCards()
			
			this.taskFileSelector = this.addRibbonIcon(
				'checkmark', 
				'Task Files', 
				(evt: MouseEvent) => {	
					new TaskOpenerModal(
						this.app, 
						this.taskSync
					).open()
				}
			);

			this.taskReorderButton = this.addRibbonIcon(
				'arrow-up-down',
				"Reorder Tasks",
				(evt: MouseEvent) => {
					const view = this.app.workspace.getActiveViewOfType(MarkdownView);
					if(!view){
						return
					}
					const editor = view.editor
					if(editor){
						reorderCheckboxes(view.getMode(), editor, this.app.vault, view.file);
					}
				}
			)

			this.addCommand({
				id: 'reorder-tasks-on-page',
				name: 'Reorder Tasks',
				editorCallback(editor: Editor, ctx) {
					reorderCheckboxes("source", editor);
				},
				
			});
		})

		
		this.registerDomEvent(document, "change", async (evt: MSLoginEvent) => {
			const session = this.taskSync.server.getSession()
			logger.info("login event", session, evt)

			if(!session.loggedIn){
				this.throwErrorAndQuit(new Error("not logged in"), "error with logging in")
			}

			const user = this.taskSync.server.getUsers(session.userId)
			statusBarNameFromMS.setText(user.displayName);

			const graphClient = this.taskSync.server.getGraphClient();
			if(!graphClient){
				this.throwErrorAndQuit(new Error("no graph client available"), "no graph client to get microsoft to-do list")
			}
			this.taskSync.setGraphClient(graphClient);

			this.app.workspace.onLayoutReady(async () => {
				
				await this.taskSync.initialResolution()

				//COMMENTS FROM HERE
				this.registerInterval(
					window.setInterval(
						async () => {
							await this.taskSync.periodicResolution()
						}, 
						Number(this.settings.SYNC_RATE)
					)
				)

				this.registerEvent(this.app.vault.on('create', async (file) => {
					logger.info('created', file)
					this.taskSync.queueAdditionToRemote(file)
					await this.taskSync.syncCards()
				}))
				this.registerEvent(this.app.vault.on('rename', async (file, oldPath) => {
					logger.info('renamed', file, "from", oldPath)
					this.taskSync.queueModificationToRemote(file, oldPath)
					await this.taskSync.syncCards()
				}))
				this.registerEvent(this.app.vault.on('delete', async (file) => {
					logger.info('deleted', file)
					this.taskSync.queueDeletionToRemote(file)
					await this.taskSync.syncCards()
				}))

				this.registerEvent(this.app.vault.on('modify', async (file) => {
					const cardIndex = this.taskSync.taskManager.findKanbanCard(file)
					if(cardIndex != -1){
						logger.info(file)
						this.taskSync.queueModificationToRemote(file, file.path)
					}
				}));
				
			})
			
		})
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
		await this.onload()
	}
}


