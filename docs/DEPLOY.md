# Deploy (Vercel + Supabase)

## 1. Deploy the app (Vercel)

Vercel deploys automatically when you push to the production branch (usually `main`).

```bash
# From project root
git add -A
git commit -m "Your commit message"
git push origin main
```

- **First time / new project:** Connect the repo in [Vercel](https://vercel.com) and set the production branch to `main`.
- **Redeploy without push:** Vercel → your project → **Deployments** → **Redeploy** → **Use latest commit**.
- After push, check **Deployments** to confirm the new build succeeded.

## 2. Run Supabase migrations (database)

App code and database must stay in sync. After adding or changing migrations (e.g. `supabase/migrations/*.sql`), apply them to your Supabase project.

**Option A – Supabase CLI (if you use it)**

```bash
npx supabase db push
```

Requires the project linked (`supabase link`).

**Option B – Supabase Dashboard (no CLI)**

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. **SQL Editor** → **New query**.
3. Paste the contents of the migration file(s) you added (e.g. `supabase/migrations/20250302100000_user_roles_admin_insert_update.sql`).
4. Run the query.

For the **user_roles RLS fix**, run the migration `20250302100000_user_roles_admin_insert_update.sql` so admins can change team roles.

## 3. Environment and redirects

- **Env vars:** Set in Vercel → **Settings** → **Environment Variables**. Redeploy after changing them.
- **Auth redirects:** In Supabase → **Auth** → **URL Configuration**, add `https://themomops.com/auth/callback` to **Redirect URLs** (see `docs/supabase-auth-urls.md`).
