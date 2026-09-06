---
name: aws-s3-inspection
description: List emulated S3 buckets and inspect object metadata and contents.
---

# S3 检查

Use `web_fetch` with `{skillGatewayUrl}/api/skill-gateway/aws` followed by an AWS S3-compatible read path:

- `/` to list buckets.
- `/{bucket}?prefix=...&delimiter=...&max-keys=...` to list objects.
- `/{bucket}/{key}` to read an object when its content is explicitly requested.

The gateway authenticates to the local emulator with its seeded Bearer token. URL-encode bucket keys and keep listings bounded. Do not create, copy, upload, or delete buckets or objects.
