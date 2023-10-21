import { DEFAULT_SETTINGS } from 'lib/DEFAULT_SETTINGS';
import { ToDoSettings } from 'lib/ToDoSettings';
import { TodoServer } from 'lib/ToDoServer';
import { WorkspaceLeaf, MarkdownView, Notice, Plugin } from 'obsidian';
import { ObsidianUtils } from 'lib/obsidianUtils';
import { MicrosoftPermissionsView, VIEW_TYPE_MSPERM } from 'lib/MicrosoftPermissionsView';
import { SampleModal } from 'lib/SampleModal';
import { SettingsTab } from 'lib/SettingsTab';
export default class ToDoPlugin extends Plugin {
	settings: ToDoSettings;
	private server: TodoServer;
	private obsidianUtils: ObsidianUtils;

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

		const keyRibbonButton = this.addRibbonIcon('key', '----hover text---', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('this is where msft login happens');
		});


		//login into msft
		try{
			const callbackUrl = await this.server.signIn()
			this.registerView(
				VIEW_TYPE_MSPERM,
				(leaf) => new MicrosoftPermissionsView(leaf, callbackUrl)
			);
			this.app.workspace.onLayoutReady(() => {
				this.activateMSPermView();
			})
		} catch(error){
			console.error(error)
		}

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('----------------------add name from microsoft here--------------------------------');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
	

		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		
		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
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

	async activateMSPermView() {
		let { workspace }  = this.app;

		let leaf: WorkspaceLeaf | null = null;
		let leaves = workspace.getLeavesOfType(VIEW_TYPE_MSPERM);
	
		if (leaves.length > 0) {
			// A leaf with our view already exists, use that
			leaf = leaves[0];
		} else {
			// Our view could not be found in the workspace, create a new leaf
			// in the right sidebar for it
			let leaf = workspace.getRightLeaf(false);
			await leaf.setViewState({ type: VIEW_TYPE_MSPERM, active: true });
		}
	
		// "Reveal" the leaf in case it is in a collapsed sidebar
		workspace.revealLeaf(leaf);
	  }
}


