# Gmail

Connect a Google account and give the Agent focused, read-only Gmail skills.

## OAuth configuration

Create a Google OAuth web client, register
`http://127.0.0.1:4310/api/skill-connections/gmail/oauth/callback` as an authorized redirect URI,
then write its credentials to `oauth.clientId` and `oauth.clientSecret` in `manifest.yaml`.

Enable the Gmail API in the same Google Cloud project.

## Logo

The Gmail logo is provided by the Iconify Logos collection.
