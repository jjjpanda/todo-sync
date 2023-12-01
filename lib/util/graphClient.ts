import {Client} from "@microsoft/microsoft-graph-client"
import Logger from "./logger"
import ToDoSettings from "lib/model/ToDoSettings";
import ToDoTaskList from "lib/model/ToDoTaskList";
import ToDoTask from "lib/model/ToDoTask";
import MicrosoftGraphResponseCollection from "lib/model/MicrosoftGraphResponseCollection";
import Throttler from "./Throttler"

const logger = new Logger("GraphClient");
export default class GraphClient {
  client;
  throttler = new Throttler(3);

  constructor(msalClient, userId, settings: ToDoSettings) {
    if (!msalClient || !userId) {
      throw new Error(
        `Invalid MSAL state. Client: ${msalClient ? 'present' : 'missing'}, User ID: ${userId ? 'present' : 'missing'}`
      );
    }
  
    // Initialize Graph client
    this.client = Client.init({
      authProvider: async (done) => {
        try {
          const account = await msalClient
            .getTokenCache()
            .getAccountByHomeId(userId);
  
          if (account) {
            const scopes = settings.OAUTH_SCOPES || 'https://graph.microsoft.com/.default';
            logger.debug("SCOPES", scopes.split(","))
            const response = await msalClient.acquireTokenSilent({
              scopes: scopes.split(','),
              redirectUri: settings.OAUTH_REDIRECT_URI,
              account: account
            });

            logger.debug("TOKEN", response)

            done(null, response.accessToken);
          }
        } catch (err) {
          logger.info(JSON.stringify(err, Object.getOwnPropertyNames(err)));
          done(err, null);
        }
      }
    });
  }

  async getUserDetails() {
    await this.throttler.safeToCall();
    const user = await this.client
      .api('/me')
      .select('displayName,mail,userPrincipalName')
      .get();
    logger.warn(user)
    return user;
  }

  async getUserTasksLists(): Promise<MicrosoftGraphResponseCollection<ToDoTaskList[]>> {
    let result = {
      value: [] as ToDoTaskList[]
    } as MicrosoftGraphResponseCollection<ToDoTaskList[]>

    let roundCount = 0;
    let lists = {
      "@odata.nextLink": "/me/todo/lists/delta"
    } as MicrosoftGraphResponseCollection<ToDoTaskList[]>

    while(!!lists["@odata.nextLink"]){
      await this.throttler.safeToCall();
      lists = await this.client
        .api(lists["@odata.nextLink"])
        .get() as MicrosoftGraphResponseCollection<ToDoTaskList[]>;

      if(lists.value.length === 0){
        break;
      }
      result.value = [...result.value, ...lists.value] 
      roundCount++
    } 

    logger.warn("lists", result, "after rounds:", roundCount)
    
    return result;
  }

  async postUserTaskList(taskListObj: ToDoTaskList): Promise<ToDoTaskList> {
    await this.throttler.safeToCall();
    const list = await this.client
      .api(`/me/todo/lists`)
      .post(taskListObj);
    return list;
  }
  
  async patchUserTaskList(taskListObj: ToDoTaskList): Promise<ToDoTaskList> {
    await this.throttler.safeToCall();
    const list = await this.client
      .api(`/me/todo/lists/${taskListObj.id}`)
      .patch(taskListObj);
    return list;
  }

  async deleteUserTaskList(listId: string) {
    await this.throttler.safeToCall();
    const successful = await this.client
      .api(`/me/todo/lists/${listId}`)
      .delete();
    return successful;
  }
  
  async getUserTaskListItems(listId: string): Promise<MicrosoftGraphResponseCollection<ToDoTask[]>> {
    let result = {
      value: [] as ToDoTask[]
    } as MicrosoftGraphResponseCollection<ToDoTask[]>

    let roundCount = 0;
    let tasks = {
      "@odata.nextLink": `/me/todo/lists/${listId}/tasks/delta`
    } as MicrosoftGraphResponseCollection<ToDoTask[]>

    while(!!tasks["@odata.nextLink"]){
      await this.throttler.safeToCall();
      tasks = await this.client
        .api(tasks["@odata.nextLink"])
        .get() as MicrosoftGraphResponseCollection<ToDoTask[]>;
      if(tasks.value.length === 0){
        break;
      }
      result.value = [...result.value, ...tasks.value] 
      roundCount++
    } 

    logger.warn("tasks", result, "after rounds:", roundCount)

    return result;
  }

  async postUserTaskListItem(listId: string, taskObj: ToDoTask): Promise<ToDoTask> {
    await this.throttler.safeToCall();
    const task = await this.client
      .api(`/me/todo/lists/${listId}/tasks`)
      .post(taskObj);
    return task;
  }
  
  async patchUserTaskListItem(listId: string, taskObj: ToDoTask): Promise<ToDoTask> {
    await this.throttler.safeToCall();
    const task = await this.client
      .api(`/me/todo/lists/${listId}/tasks/${taskObj.id}`)
      .patch(taskObj);
    return task;
  }

  async deleteUserTaskListItem(listId: string, taskId: string) {
    await this.throttler.safeToCall();
    const successful = await this.client
      .api(`/me/todo/lists/${listId}/tasks/${taskId}`)
      .delete();
    return successful;
  }

};