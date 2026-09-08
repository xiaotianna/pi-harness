# Google

Connect a Google account and give the Agent read-only Drive, comments, Docs, Sheets, and Slides workflows.

## OAuth configuration

Create a Google OAuth web client, register
`http://127.0.0.1:4310/api/skill-connections/google/oauth/callback` as an authorized redirect URI,
then write its credentials to `oauth.clientId` and `oauth.clientSecret` in `manifest.yaml`.

Enable the Google Drive API and Google Calendar API in the same Google Cloud project.

## Icons

The Google logo is provided by [LobeHub Icons](https://lobehub.com/zh/icons/google) under the MIT license.
The Google Drive and Google Calendar icons are provided by the Iconify Logos collection.

## Connection and execution

The explicit callbackUrl in manifest.yaml must exactly match the registered OAuth web-client redirect URI (including host and port). clientId and clientSecret must be supplied together by the account owner; they are not bundled. Configure the OAuth consent screen and permitted test users as applicable. API enablement, account consent and actual shared-file permissions are all required for live requests.

Gateway operations remain read-only. Drafts and document edit proposals are local artifacts; this setup does not enable mail sending or cloud document mutation.
