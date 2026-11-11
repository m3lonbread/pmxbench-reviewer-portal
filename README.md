# PmxBench on GitHub Pages

This deployment splits the full portal into:

- A static React frontend on GitHub Pages.
- A private Supabase PostgreSQL database, Supabase Auth, and the authenticated `pmxbench` Edge Function.

The existing coordinator/reviewer interface is preserved. Experts receive one or two assigned cases, complete prompts and rubrics, materials descriptions, source-linked comments, general feedback, six ratings, and account-based saving. Coordinator roster/assignment controls remain coordinator-only. The two-case reviewer preview remains read-only.

**Status:** the code is prepared locally. Target repository: `m3lonbread/pmxbench-reviewer-portal`. A new Supabase Free project is being configured. No GitHub Pages URL has been published by this project yet.

## Private data

`backend/private/` is ignored by Git and must never be uploaded to a public repository or the Pages artifact. It holds the 53 official case packets and the optional preliminary contact payload. No case packets, contact records, submissions, or backend service keys belong in `public`, frontend imports, or `VITE_*` variables. The static frontend receives case content only through authenticated backend calls.

All application tables enable row-level security and deny direct access to anonymous and authenticated browser clients. The Edge Function independently validates the user JWT with Supabase Auth, requires a verified email, derives coordinator/reviewer roles from private database records, checks assignments for every case, and verifies quotation text against the authoritative source. Its service key remains server-side. Private database helper RPCs are executable only by the service role.

## 1. Backend project

Create or select a Supabase project owned by the intended host. In a new project, apply `backend/supabase/migrations/202611100001_review_portal.sql` through the SQL editor or your normal migration process. This creates the private tables and atomic review/assignment operations. It does not add real users, data, or coordinator emails.

Prepare private initial data locally:

```sh
npm ci
npm run seed:prepare -- --coordinator-email THE_ACTUAL_COORDINATOR_EMAIL
```

Add `--include-contacts` only when the 66 preliminary contacts should be imported. Run the generated `backend/private/seed.sql` in the selected project's SQL editor. It includes all 53 cases and 1,038 rubric criteria. Contacts import as Preliminary, with no assignments or linked auth identities. It sends no invitations. The initial payload files are intentionally kept outside source control; obtain them separately from the site owner if cloning the public repository.

Deploy the Edge Function from the `backend` directory using the Supabase CLI or dashboard:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy pmxbench
supabase secrets set PMXBENCH_FRONTEND_ORIGIN=https://YOUR_GITHUB_ACCOUNT.github.io
```

Keep `verify_jwt = true` in `backend/supabase/config.toml`. The function also authenticates the caller with `auth.getUser`. Supabase supplies its project URL and server service-role key to the function; these values never go to the frontend. Never expose `SUPABASE_SERVICE_ROLE_KEY` or a secret key in GitHub repository variables or browser code.

## 2. Reviewer sign-in

Enable email authentication with email confirmation. Set the Supabase Auth Site URL and redirect allowlist to the exact Pages URL, including the repository path and trailing slash.

This interface uses email sign-in links and PKCE. A working custom SMTP sender must be configured before external faculty use email login: Supabase's default sender only supports pre-authorized project-team addresses and is not the production sender. No verification or invitation emails are sent during code preparation. Configure the sender in the project's Auth settings; keep its credentials in Supabase, never this repository.

You can later configure an institutional/social sign-in provider if preferred, with a matching frontend button and a verified identity claim. Do not bypass email ownership verification.

## 3. GitHub Pages repository

Use the target repository's root for this project. Do not copy `backend/private`, `.env` files, `node_modules`, or local runtime data into Git. Configure these **public** repository variables:

- `VITE_SUPABASE_URL`: the project's HTTPS origin.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: its browser publishable key, or legacy public anon key.

Never use the service-role key here. The build checks for missing settings and refuses recognizable server keys.

In repository Settings → Pages, choose **GitHub Actions**. Push to `main` or run `.github/workflows/pages.yml`. The workflow installs, runs PostgreSQL/security checks, type-checks the backend, builds only the static frontend, and deploys `dist` using the official Pages actions. It automatically supports both a project URL (`/repository/`) and an account-level `username.github.io` repository (`/`).

GitHub Pages can publish the interface publicly while the backend continues to require authenticated, authorized access. No private scientific content or faculty data is included in its build artifact. Private Pages availability depends on the host's GitHub plan; do not assume a private source repository makes the Pages URL private.

## Development and validation

```sh
npm ci
npm test
npm run typecheck:backend
```

For local frontend development, copy `.env.example` to `.env.local`, set the public project values, and run `npm run dev`. Set the matching local origin on a development backend and configure its redirect allowlist. Use a separate test project for real authentication tests.

An unconfigured local rendering/build can be checked with:

```sh
ALLOW_UNCONFIGURED_BUILD=1 npm run build
```

That override is rejected by the deployment workflow's CI environment. It does not create a functioning backend or authorize publishing a placeholder site.

The database tests run real PostgreSQL in PGlite and check direct-data denial, privileged RPC protection, one/two-case limits, atomic status/assignment changes, granular rating merges, missing-value clearing, and separate reviewer records. Source tests verify exact UTF-16 quotation offsets and canonical source context. Live authentication, SMTP delivery, and end-to-end hosted behavior still require the selected project and accounts.

## Migration from the existing Site

The source/initial case payloads are available locally. Existing production review records are not automatically moved by this port. Export coordinator **Complete JSON** and plan an explicit identity/review migration if those records need to be transferred. Do not reuse original Site user bindings as Supabase auth identities.

## Primary documentation

- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Custom Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Supabase authenticated Edge Functions](https://supabase.com/docs/guides/functions/auth)
- [Supabase getUser verification](https://supabase.com/docs/reference/javascript/auth-getuser)
- [Public and secret keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Production email sender](https://supabase.com/docs/guides/auth/auth-smtp)
