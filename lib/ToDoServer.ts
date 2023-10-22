import express from 'express';
import { Server } from 'http';
import { Notice } from 'obsidian';
import { ObsidianUtils } from './obsidianUtils';
import { ToDoSettings } from './ToDoSettings';
import {GraphClient} from "./graphClient"
import {ConfidentialClientApplication, LogLevel} from "@azure/msal-node"
import {MSLoginEvent} from "./MSLoginEvent"

export class TodoServer {
	private _app: express.Application;
	private _port = 3000;
	private _server: Server;
	private _settings: ToDoSettings;
    private _baseDirectory: string;
	private _pluginDirectory: string;
	private session: {userId: string, loggedIn: boolean};
	private msalConfig: {}
	private graphClient: GraphClient
	private popupInstance: Window;
	private msalClient: ConfidentialClientApplication
	private users: {}

	constructor(utils: ObsidianUtils, settings: ToDoSettings) {
		this._settings = settings;
		const numPort = Number(settings.PORT);
		this._port = isNaN(numPort) ? 3000 : numPort;
		this._baseDirectory = utils.getVaultDirectory();
		this._pluginDirectory = utils.getPluginDirectory();
		this._app = express();
		this.users = {}
		this.session = {userId: "", loggedIn: false}
		this.msalConfig = {
			auth: {
			  clientId: settings.OAUTH_CLIENT_ID || '',
			  authority: settings.OAUTH_AUTHORITY,
			  clientSecret: settings.OAUTH_CLIENT_SECRET
			},
			system: {
			  loggerOptions: {
				loggerCallback: (loglevel, message, containsPii) => {
				  if (!containsPii) console.log(message);
				},
				piiLoggingEnabled: false,
				logLevel: LogLevel.Verbose,
			  }
			}
		  };
		this.msalClient = new ConfidentialClientApplication(this.msalConfig)
	}

	setPopUpInstance(popup: Window){
		console.log("server now holds popup instance")
		this.popupInstance = popup;
	}

	async getTasks () {
		if(this.session.loggedIn){
			return await this.graphClient.getUserTasksList()
		}
	}

	async getTaskItems (id) {
		if(this.session.loggedIn){
			return await this.graphClient.getUserTaskListItems(id)
		}
	}

	async addTaskItems (id){
		if(this.session.loggedIn){
			return await this.graphClient.upsertUserTaskListItems(id)
		}
	}

	getUrl(): URL {
		return new URL(`http://localhost:${this._port}`);
	}

	getSession(){
		return this.session;
	}

	getUsers(id){
		return this.users[id]
	}

	async signIn() {
		const scopes = this._settings.OAUTH_SCOPES || 'https://graph.microsoft.com/.default';
		const urlParameters = {
			scopes: scopes.split(','),
			redirectUri: this._settings.OAUTH_REDIRECT_URI
		};

		try {
			const authUrl = await this.msalClient.getAuthCodeUrl(urlParameters);
			return authUrl
		}
		catch (error) {
			throw error
    	}
	}

	start() {
		this._app.get('/', async (req, res) => {
			if(this.popupInstance){
				this.popupInstance.close()
			}
			res.send(`
			<body>
				Please close this webpage
				<script>document.addEventListener("onunload", () => window.open("obsidian://open", "_blank"))</script>
			</body>
			`);
		});

		this._app.use('/auth/callback', async (req, res) => {
			console.log("ENTERING CALLBACK POST MS LOGIN")
			const scopes = this._settings.OAUTH_SCOPES || 'https://graph.microsoft.com/.default';
			const tokenRequest = {
				code: req.query.code,
				scopes: scopes.split(','),
				redirectUri: this._settings.OAUTH_REDIRECT_URI
			};
		
			try {
				const response = await this.msalClient.acquireTokenByCode(tokenRequest);
	
				this.session.userId = response.account.homeAccountId;
				this.session.loggedIn = true;
		
				this.graphClient = new GraphClient(
					this.msalClient,
					this.session.userId,
					this._settings
				)

				const user = await this.graphClient.getUserDetails();
		
				// Add the user to user storage
				this.users[this.session.userId] = {
					displayName: user.displayName,
					email: user.mail || user.userPrincipalName,
					timeZone: user.mailboxSettings.timeZone
				};
				document.dispatchEvent(new MSLoginEvent("change"))
			} catch(error) {
				console.error(JSON.stringify(error, Object.getOwnPropertyNames(error)), error)
			}
		
			res.redirect("/");
		});

		this._app.use("/auth/signout", async (req, res) => {
			console.log("ENTERING SIGN OUT MS FLOW")
			// Sign out
			if (this.session.userId) {
			  // Look up the user's account in the cache
			  const accounts = await this.msalClient
				.getTokenCache()
				.getAllAccounts();
		
			  const userAccount = accounts.find(a => a.homeAccountId === this.session.userId);
		
			  // Remove the account
			  if (userAccount) {
				this.msalClient
				  .getTokenCache()
				  .removeAccount(userAccount);
			  }
			}
		
			// Destroy the user's session
			this.session = {userId: "", loggedIn: false}
		})

		this._server = this._app
			.listen(this._port, '127.0.0.1', () => {
				// tslint:disable-next-line:no-console
				console.log(`server started at http://localhost:${this._port}`);
			})
			.on('error', err => {
				new Notice(`Port ${this._port} already used!`);
			});
	}

	stop() {
		this._server.close();
		console.log(`server stopped`);
	}
}