import { ToDoSettings } from 'lib/ToDoSettings';

export const DEFAULT_SETTINGS: ToDoSettings = {
	OAUTH_CLIENT_ID: "",
	OAUTH_CLIENT_SECRET: "",
	OAUTH_REDIRECT_URI: "http://localhost:3000/auth/callback",
	OAUTH_SCOPES: "user.read,tasks.read,tasks.read.shared,tasks.readwrite,tasks.readwrite.shared",
	OAUTH_AUTHORITY: "https://login.microsoftonline.com/common/",
	PORT: "3000",
	TASK_FOLDER: "/",
	SYNC_RATE: "10000"
};
