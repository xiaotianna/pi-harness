---
name: supabase-postgres-best-practices
description: Review and optimize Postgres queries, schemas, indexes, connection pooling and row-level security using task-specific rules and SQL examples.
license: MIT
---

# Postgres best practices

Use for SQL/schema reviews, slow queries, connection issues, RLS and database diagnostics. Read only the relevant rules below. These are examples, not commands to execute automatically: adapt table names, roles, data types and workload to the actual project. Example speedups and plans are illustrative, not measurements of the user's database. Verify version-dependent behavior against current PostgreSQL/Supabase documentation.

Use PI Harness read-only gateway capabilities for connected project inspection. SQL execution requires an available, configured local Supabase CLI or psql through `run_command`, with current approvals and the correct target. Reading a rule does not authorize a migration, privilege change, statistics reset or database maintenance. `EXPLAIN ANALYZE` actually executes its statement; choose bounded read queries and avoid executing writes merely to inspect their plan.

## Rule index

### Query performance

- [Create Composite Indexes for Multi-Column Queries](references/query-composite-indexes.md)
- [Use Covering Indexes to Avoid Table Lookups](references/query-covering-indexes.md)
- [Choose the Right Index Type for Your Data](references/query-index-types.md)
- [Add Indexes on WHERE and JOIN Columns](references/query-missing-indexes.md)
- [Use Partial Indexes for Filtered Queries](references/query-partial-indexes.md)

### Connection management

- [Configure Idle Connection Timeouts](references/conn-idle-timeout.md)
- [Set Appropriate Connection Limits](references/conn-limits.md)
- [Use Connection Pooling for All Applications](references/conn-pooling.md)
- [Use Prepared Statements Correctly with Pooling](references/conn-prepared-statements.md)

### Security and RLS

- [Apply Principle of Least Privilege](references/security-privileges.md)
- [Enable Row Level Security for Multi-Tenant Data](references/security-rls-basics.md)
- [Optimize RLS Policies for Performance](references/security-rls-performance.md)

### Schema design

- [Add Constraints Safely in Migrations](references/schema-constraints.md)
- [Choose Appropriate Data Types](references/schema-data-types.md)
- [Index Foreign Key Columns](references/schema-foreign-key-indexes.md)
- [Use Lowercase Identifiers for Compatibility](references/schema-lowercase-identifiers.md)
- [Partition Large Tables for Better Performance](references/schema-partitioning.md)
- [Select Optimal Primary Key Strategy](references/schema-primary-keys.md)

### Concurrency and locking

- [Use Advisory Locks for Application-Level Locking](references/lock-advisory.md)
- [Prevent Deadlocks with Consistent Lock Ordering](references/lock-deadlock-prevention.md)
- [Keep Transactions Short to Reduce Lock Contention](references/lock-short-transactions.md)
- [Use SKIP LOCKED for Non-Blocking Queue Processing](references/lock-skip-locked.md)

### Data access

- [Batch INSERT Statements for Bulk Data](references/data-batch-inserts.md)
- [Eliminate N+1 Queries with Batch Loading](references/data-n-plus-one.md)
- [Use Cursor-Based Pagination Instead of OFFSET](references/data-pagination.md)
- [Use UPSERT for Insert-or-Update Operations](references/data-upsert.md)

### Monitoring

- [Use EXPLAIN ANALYZE to Diagnose Slow Queries](references/monitor-explain-analyze.md)
- [Enable pg_stat_statements for Query Analysis](references/monitor-pg-stat-statements.md)
- [Maintain Table Statistics with VACUUM and ANALYZE](references/monitor-vacuum-analyze.md)

### Advanced features

- [Use tsvector for Full-Text Search](references/advanced-full-text-search.md)
- [Index JSONB Columns for Efficient Querying](references/advanced-jsonb-indexing.md)

## Verification

Compare plans and timings on representative data, check index/write overhead and connection limits, and verify allowed and denied RLS cases under actual client roles. A superuser query is not an RLS test. Preserve supplied schemas and generate migrations only for authorized changes. For hosted services, check which configuration operations are supported before using administrative SQL examples.

## License

Rules are adapted from Supabase under the [MIT license](LICENSE).
