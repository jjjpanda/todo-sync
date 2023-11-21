import {Client} from "@microsoft/microsoft-graph-client"
import Logger from "./logger"

const logger = new Logger("GraphClient");
export default class GraphClient {
  client;

  constructor(msalClient, userId, settings) {
    if (!msalClient || !userId) {
      throw new Error(
        `Invalid MSAL state. Client: ${msalClient ? 'present' : 'missing'}, User ID: ${userId ? 'present' : 'missing'}`
      );
    }
  
    // Initialize Graph client
    this.client = Client.init({
      // Implement an auth provider that gets a token
      // from the app's MSAL instance
      authProvider: async (done) => {
        try {
          // Get the user's account
          const account = await msalClient
            .getTokenCache()
            .getAccountByHomeId(userId);
  
          if (account) {
            // Attempt to get the token silently
            // This method uses the token cache and
            // refreshes expired tokens as needed
            const scopes = settings.OAUTH_SCOPES || 'https://graph.microsoft.com/.default';
            const response = await msalClient.acquireTokenSilent({
              scopes: scopes.split(','),
              redirectUri: settings.OAUTH_REDIRECT_URI,
              account: account
            });
  
            // First param to callback is the error,
            // Set to null in success case
            done(null, response.accessToken);
          }
        } catch (err) {
          logger.log(JSON.stringify(err, Object.getOwnPropertyNames(err)));
          done(err, null);
        }
      }
    });
  }

  async getUserDetails() {
    const user = await this.client
      .api('/me')
      .select('displayName,mail,mailboxSettings,userPrincipalName')
      .get();
    return user;
  }

  async getUserTasksList() {
    const user = await this.client
      .api('/me/todo/lists')
      .get();
    return user;
  }
  
  async getUserTaskListItems(listId) {
    const user = await this.client
      .api(`/me/todo/lists/${listId}/tasks/`)
      .get();
    return user;
  }

  async postUserTaskList(taskObj) {
    const user = await this.client
      .api(`/me/todo/lists`)
      .post(taskObj);
    return user;
  }

  async patchUserTaskList(taskObj) {
    const user = await this.client
      .api(`/me/todo/lists`)
      .post(taskObj);
    return user;
  }

  async test(){
    const user = await this.client.api("/me/todo/lists").post({id: "hi", displayName: "name"})
  }

};