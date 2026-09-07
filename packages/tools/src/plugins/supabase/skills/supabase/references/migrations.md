# Local schema changes and migrations

Read the workspace's existing migration conventions and confirm the target is local or disposable before iterating. Discover the installed CLI's flags through `supabase --help` and command-specific help. Do not assume an example from another CLI release exists locally.

For a new migration, use `supabase migration new <descriptive-name>` to obtain the expected filename, then edit the generated SQL. Alternatively, when the existing workflow starts from local schema edits, use the installed CLI's documented diff workflow to generate a migration. Choose one flow to avoid duplicate history entries. Never use a remote production database as an unrecorded schema scratchpad.

Inspect the resulting SQL for destructive operations, data conversion, privileges, RLS, views and definer functions. Apply and verify on the intended local database using its supported migration commands. A database reset destroys local data; use it only when a disposable reset is authorized. Check migration history and query the resulting schema/data. Use the installed CLI's advisors or lint capabilities when available; otherwise run focused catalog and role checks.

For remote application, verify the target and deployment authorization separately from preparing the migration. Keep remote credentials in their existing secure store and out of generated SQL, logs and chat output. Never automatically commit migration files or run dev/build commands unless the user requested those actions.

Reference: [Database migrations](https://supabase.com/docs/guides/local-development/database-migrations).
