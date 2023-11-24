import {Client} from "@microsoft/microsoft-graph-client"
import Logger from "./logger"
import ToDoSettings from "lib/model/ToDoSettings";
import ToDoTaskList from "lib/model/ToDoTaskList";
import ToDoTask from "lib/model/ToDoTask";
import MicrosoftGraphResponse from "lib/model/MicrosoftGraphResponse";

const logger = new Logger("GraphClient");
export default class GraphClient {
  client;

  constructor(msalClient, userId, settings: ToDoSettings) {
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

  async getUserTasksLists(): Promise<MicrosoftGraphResponse<ToDoTaskList[]>> {
    const lists = await this.client
      .api('/me/todo/lists')
      .get();
    
    return lists;
  }

  async postUserTaskList(taskListObj: ToDoTaskList): Promise<MicrosoftGraphResponse<ToDoTaskList>> {
    const list = await this.client
      .api(`/me/todo/lists`)
      .post(taskListObj);
    return list;
  }
  
  async patchUserTaskList(taskListObj: ToDoTaskList): Promise<MicrosoftGraphResponse<ToDoTaskList>> {
    const list = await this.client
      .api(`/me/todo/lists/${taskListObj.id}`)
      .patch(taskListObj);
    return list;
  }

  async deleteUserTaskList(listId: string) {
    const successful = await this.client
      .api(`/me/todo/lists/${listId}`)
      .delete();
    return successful;
  }
  
  async getUserTaskListItems(listId: string): Promise<MicrosoftGraphResponse<ToDoTask[]>> {
    const tasks = await this.client
      .api(`/me/todo/lists/${listId}/tasks/`)
      .get();
    return tasks;
  }

  async postUserTaskListItem(listId: string, taskObj: ToDoTask): Promise<MicrosoftGraphResponse<ToDoTask>> {
    const task = await this.client
      .api(`/me/todo/lists/${listId}/tasks`)
      .post(taskObj);
    return task;
  }
  
  async patchUserTaskListItem(listId: string, taskObj: ToDoTask): Promise<MicrosoftGraphResponse<ToDoTask>> {
    const task = await this.client
      .api(`/me/todo/lists/${listId}/tasks/${taskObj.id}`)
      .patch(taskObj);
    return task;
  }

  async deleteUserTaskListItem(listId: string, taskId: string) {
    const successful = await this.client
      .api(`/me/todo/lists//${listId}/tasks/${taskId}`)
      .delete();
    return successful;
  }

};