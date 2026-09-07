---
title: Enable Row Level Security for Multi-Tenant Data
impact: CRITICAL
impactDescription: Database-enforced tenant isolation, prevent data leaks
tags: rls, row-level-security, multi-tenant, security
---

## Enable Row Level Security for Multi-Tenant Data

Row Level Security (RLS) enforces data access at the database level, ensuring users only see their own data.

**Incorrect (application-level filtering only):**

```sql
-- Relying only on application to filter
select * from orders where user_id = $current_user_id;

-- Bug or bypass means all data is exposed!
select * from orders;  -- Returns ALL orders
```

**Correct (Supabase ownership policy):**

```sql
alter table public.orders enable row level security;
create policy orders_read_own on public.orders
  for select to authenticated
  using ((select auth.uid()) = user_id);
```

Grant only the required table privileges separately. Test with actual user JWTs and both owned/unowned rows. Do not use a client-settable custom session variable as proof of identity. For a trusted server-only Postgres connection, any session-based identity must be established by that trusted server and protected from caller-controlled SQL. Superusers and BYPASSRLS roles are not constrained by ordinary RLS; FORCE ROW LEVEL SECURITY affects table owners, not those privileged roles.

Reference: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
