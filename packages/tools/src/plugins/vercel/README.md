# Vercel

Connect a Vercel account and give the Agent focused, read-only Vercel skills.

## OAuth configuration

Create a Vercel App, set its callback URL to
`http://127.0.0.1:4310/api/skill-connections/vercel/oauth/callback`, then write its `clientId` and
`clientSecret` into this plugin's `manifest.yaml`.

The configured manifest contains a credential and must not be published or shared.

`prompt: consent` forces Vercel to show the consent page on every connection attempt.

## Logo

The Vercel logo is provided by [LobeHub Icons](https://lobehub.com/zh/icons/vercel) under the MIT license.
