import ToDoSettings from './model/ToDoSettings';
import GraphClient from "./util/graphClient"
import Logger from "./util/logger"
import { Workspace, Platform } from 'obsidian';

let ConfidentialClientApplication, LogLevel, express, Server;
if(Platform.isDesktop){
	import("@azure/msal-node").then(module => {
		ConfidentialClientApplication = module.ConfidentialClientApplication
		LogLevel = module.LogLevel
	})
	import("express").then(module => {
		express = module.default
	})
	import("http").then(module => {
		Server = module.Server
	})
}

const logger = new Logger("MSAuthServer")
export default class MSAuthServer {
	private _app;
	private _port = 3000;
	private _server;
	private _settings: ToDoSettings;
	private session: {userId: string, loggedIn: boolean};
	private msalConfig: {}
	private graphClient: GraphClient
	private msalClient
	private users: {}

	constructor(settings: ToDoSettings) {
		this._settings = settings;
		const numPort = Number(settings.PORT);
		this._port = isNaN(numPort) ? 3000 : numPort;
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
				  if (!containsPii) {
					logger.debug(loglevel, message)
				  };
				},
				piiLoggingEnabled: true,
				logLevel: LogLevel.Warning,
			  }
			}
		  };
		this.msalClient = new ConfidentialClientApplication(this.msalConfig)
	}

	getGraphClient(){
		if(this.session.loggedIn){
			return this.graphClient
		}
		else{
			return null
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

	async signIn(workspace: Workspace) {
		const scopes = this._settings.OAUTH_SCOPES || 'https://graph.microsoft.com/.default';
		const urlParameters = {
			scopes: scopes.split(','),
			redirectUri: this._settings.OAUTH_REDIRECT_URI
		};

		try {
			logger.info("trying to get microsoft callback url")
			const authUrl = await this.msalClient.getAuthCodeUrl(urlParameters);
		
			workspace.onLayoutReady(() => {
				logger.info("opening microsoft login screen")
				window.open(authUrl, "_blank")
			})
		}
		catch (error) {
			logger.info("failed to get microsoft callback url and sign in")
			throw error
    	}
	}

	start() {
		this._app.get('/', async (req, res) => {
			res.send(`
				<body>
					Please close this webpage
					<script>document.addEventListener("onunload", () => window.open("obsidian://open", "_blank"))</script>
				</body>
			`);
		});

		this._app.use('/auth/callback', async (req, res) => {
			logger.info("ENTERING CALLBACK POST MS LOGIN")
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
				};
				document.dispatchEvent(new MSLoginEvent("change"))
			} catch(error) {
				logger.error(JSON.stringify(error, Object.getOwnPropertyNames(error)), error)
			}
		
			res.redirect("/");
		});

		this._app.use("/auth/signout", async (req, res) => {
			logger.info("ENTERING SIGN OUT MS FLOW")
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

		return new Promise<void>((resolve, reject) => {
			this._server = this._app
				.listen(this._port, '127.0.0.1', () => {
					logger.info(`server started at http://localhost:${this._port}`);
					resolve()
				})
				.on('error', err => {
					logger.error(`Port ${this._port} already used!`)
					reject()
				});
		})
		
	}

	stop() {
		if(this._server){
			this._server.close();
			logger.info(`server stopped`);
		}
		else{
			logger.warn("no server to stop")
		}
	}
}

export class MSLoginEvent extends Event{
    constructor(type){
        super(type)
    }
}