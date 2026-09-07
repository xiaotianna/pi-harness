# Google

Connect a Google account and give the Agent read-only Drive and Calendar skills.

## OAuth configuration

Create a Google OAuth web client, register
`http://127.0.0.1:4310/api/skill-connections/google/oauth/callback` as an authorized redirect URI,
then write its credentials to `oauth.clientId` and `oauth.clientSecret` in `manifest.yaml`.

Enable the Google Drive API and Google Calendar API in the same Google Cloud project.

## Icons

The Google logo is provided by [LobeHub Icons](https://lobehub.com/zh/icons/google) under the MIT license.
The Google Drive and Google Calendar icons are provided by the Iconify Logos collection.
