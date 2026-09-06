---
name: aws-account-and-queues
description: Inspect emulated SQS queues, IAM identities, and the current STS caller.
---

# AWS 账户与队列

Use `web_fetch` with `{skillGatewayUrl}/api/skill-gateway/aws` and pass AWS query-protocol parameters in the URL. The gateway converts them to form-encoded upstream requests:

- `/sqs/?Action=ListQueues` to list queues.
- `/sqs/?Action=GetQueueUrl&QueueName=...` and `/sqs/?Action=GetQueueAttributes&QueueUrl=...` for queue details.
- `/iam/?Action=ListUsers` or `/iam/?Action=ListRoles` for identities.
- `/sts/?Action=GetCallerIdentity` for the active caller.

Do not create credentials, assume roles, consume messages, or mutate resources.
