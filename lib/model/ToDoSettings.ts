export default interface ToDoSettings {
	OAUTH_CLIENT_ID: string;
	OAUTH_CLIENT_SECRET: string;
	OAUTH_REDIRECT_URI: string;
	OAUTH_SCOPES: string;
	OAUTH_AUTHORITY: string;
	PORT: string;
	TASK_FOLDER: string;
	NEW_CARD_TEMPLATE: string;
	FETCH_RATE: string;
	SYNC_ENABLED: boolean;
}

export const DEFAULT_SETTINGS: ToDoSettings = {
	OAUTH_CLIENT_ID: "",
	OAUTH_CLIENT_SECRET: "",
	OAUTH_REDIRECT_URI: "http://localhost:3000/auth/callback",
	OAUTH_SCOPES: "email,openid,profile,tasks.read,tasks.read.shared,tasks.readwrite,tasks.readwrite.shared,user.read",
	OAUTH_AUTHORITY: "https://login.microsoftonline.com/common/",
	PORT: "3000",
	TASK_FOLDER: "/",
	NEW_CARD_TEMPLATE: "",
	FETCH_RATE: "60000",
	SYNC_ENABLED: true
};