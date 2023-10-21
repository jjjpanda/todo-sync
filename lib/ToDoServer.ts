import express from 'express';
import { Server } from 'http';
import { Notice } from 'obsidian';
import { ObsidianUtils } from './obsidianUtils';
import { ToDoSettings } from './ToDoSettings';
import {graphClient} from "./graph"
import {ConfidentialClientApplication, LogLevel} from "@azure/msal-node"

export class TodoServer {
	private _app: express.Application;
	private _port = 3000;
	private _server: Server;
	private _settings: ToDoSettings;
    private _baseDirectory: string;
	private _pluginDirectory: string;
	private session: {userId: string};
	private msalConfig: {}
	private msalClient: ConfidentialClientApplication
	private users: {}[]

	constructor(utils: ObsidianUtils, settings: ToDoSettings) {
		this._settings = settings;
		const numPort = Number(settings.PORT);
		this._port = isNaN(numPort) ? 3000 : numPort;
		this._baseDirectory = utils.getVaultDirectory();
		this._pluginDirectory = utils.getPluginDirectory();
		this._app = express();
		this.users = []
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

	getUrl(): URL {
		return new URL(`http://localhost:${this._port}`);
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
			//iframe with postmessage to parent???/
			res.send("<body>bruh</body");
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
		
				const user = await graphClient.getUserDetails(
					this.msalClient,
					this.session.userId,
					this._settings
				);
		
				// Add the user to user storage
				this.users[this.session.userId] = {
				displayName: user.displayName,
				email: user.mail || user.userPrincipalName,
				timeZone: user.mailboxSettings.timeZone
				};
			} catch(error) {
				console.error(JSON.stringify(error, Object.getOwnPropertyNames(error)), error)
			}
		
			res.redirect('/');
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
			this.session = {userId: ""}
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