# Google

Connect a Google account and give the Agent Drive, comments, Docs, Sheets, Slides, and Calendar workflows.

The plugin includes the official Google Workspace MCP Apps for Drive, Docs, Sheets, Slides, and Calendar. They share the plugin OAuth credential and remain disabled until the user enables each App.

## OAuth configuration

Create a Google OAuth web client, register
`http://127.0.0.1:4310/api/skill-connections/google/oauth/callback` as an authorized redirect URI,
then write its credentials to `oauth.clientId` and `oauth.clientSecret` in `manifest.yaml`.

Join the Google Workspace Developer Preview Program, then enable these APIs in the same Google Cloud project:

- Google Drive API
- Google Docs API
- Google Sheets API
- Google Slides API
- Google Calendar API

Also enable the matching MCP services: `drivemcp.googleapis.com`, `docsmcp.googleapis.com`, `sheetsmcp.googleapis.com`, `slidesmcp.googleapis.com`, and `calendarmcp.googleapis.com`.

Add every scope declared in `manifest.yaml` to the OAuth consent screen. After this plugin gains new scopes, disconnect and authorize Google again so the stored credential includes them.

See Google's [Workspace MCP configuration guide](https://developers.google.com/workspace/guides/configure-mcp-servers) for the current preview enrollment and Cloud setup requirements.

## Icons

The Google logo is provided by [LobeHub Icons](https://lobehub.com/zh/icons/google) under the MIT license.
The Google Drive and Google Calendar icons are provided by the Iconify Logos collection.

## Connection and execution

The explicit callbackUrl in manifest.yaml must exactly match the registered OAuth web-client redirect URI (including host and port). clientId and clientSecret must be supplied together by the account owner; they are not bundled. Configure the OAuth consent screen and permitted test users as applicable. API enablement, account consent and actual shared-file permissions are all required for live requests.

Gateway operations remain read-only. Enabled MCP Apps can modify Google Workspace data with the user's OAuth permissions; those calls continue through the normal MCP Policy and approval flow. Gmail, Chat, and People are not included because this plugin does not currently provide corresponding workflows.
