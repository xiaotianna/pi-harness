# Auth and access review

Review only the areas affected by the task, using current product documentation when behavior is version-dependent.

- Keep secret/service-role credentials on the server. Public client environment variables are exposed to users; use the appropriate publishable client key.
- User metadata is editable by the user, so it cannot establish authorization. Server-managed claims still have refresh/staleness implications.
- Deleting a user is not immediate revocation of every issued access token. Match session revocation and token expiry to the application's requirements.
- Table privileges control available operations; RLS controls accessible rows. Inspect both, including default grants, for exposed schemas. Use ownership/tenant predicates that match the real data model.
- For UPDATE, check row visibility and new-row ownership. Explicit `USING` and `WITH CHECK` make intent clear; when omitted, PostgreSQL can reuse `USING` for `WITH CHECK`, so omission alone does not prove a bypass.
- An authenticated role alone does not identify the owner of a row. Also distinguish anonymous sign-ins from ordinary signed-in accounts when the app requires it.
- Inspect view execution privileges. Use an appropriate invoker view on supported PostgreSQL versions or restrict access to the view.
- Prefer invoker functions. A definer function uses its owner's privileges; any RLS bypass depends on that owner. Use a fixed search_path, qualified names and minimum execute permissions. A function used in a policy must be callable by the role evaluating it; revoking all such access can break the policy.
- Storage replacement/upsert may require select and update policies as well as insert; validate bucket/path ownership for each operation.

Verify positive and negative access cases as actual client roles; a superuser result cannot validate RLS. Never resolve a permission error by silently disabling RLS or promoting the client to a privileged key.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [product security](https://supabase.com/docs/guides/security/product-security.md).
