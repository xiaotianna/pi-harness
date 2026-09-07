# GitHub

Connect a GitHub account and give the Agent focused, read-only GitHub skills.

## OAuth configuration

Create a GitHub OAuth App, set its callback URL to
`http://127.0.0.1:4310/api/skill-connections/github/oauth/callback`, then write its `clientId` and
`clientSecret` into this plugin's `manifest.yaml`.

The configured manifest contains a credential and must not be published or shared.

## Logo

The GitHub logo is provided by [LobeHub Icons](https://lobehub.com/zh/icons/github) under the MIT license.
