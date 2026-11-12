# PmxBench reviewer portal

Reviewers open the GitHub Pages site, type their full name and recorded reply email, and review their assigned cases. No email link, code, email sender, or reviewer password is required. Supabase stores case packets, assignments, ratings, and source-linked comments. The coordinator uses a separate authenticated workspace to manage assignments and export results.

**Site:** https://m3lonbread.github.io/pmxbench-reviewer-portal/

The site is live with a Supabase Free backend and owner-approved name-and-email matching. The coordinator must activate a profile, record its reply email, and assign cases before reviewer access works. See [deployment status](DEPLOYMENT_STATUS.md) for verification and current readiness.

## Access model

Reviewers type their name and reply email; the server matches both against a private Verified profile with assigned cases. This checks knowledge of recorded details, not ownership of the email address. Anyone who knows a valid name/email pair could impersonate that reviewer. Use verified sign-in if that trust model is insufficient. New feedback records `name_email_match`; historical identity metadata is preserved.

There is no public reviewer directory or email list. Old reviewer IDs alone cannot open a review. The server issues a random eight-hour session token after a successful match, stores only its SHA-256 hash, and keeps the browser token in sessionStorage. Email addresses are not saved in browser identity storage. Each request rechecks profile activation, current email, and assignments. Sign-out revokes the token; expiration, an email change, or deactivation invalidates access. Matching attempts are limited to ten per normalized email in fifteen minutes; no attempt log stores the email itself.

Reviewers can receive up to three cases; the current matching plan targets two or three per interested expert. Complete prompts and grading rubrics are included, with materials descriptions only. Staged files and summary cards are not provided. Quotations retain their exact case, subsection, passage, and source revision. General comments and six categorical ratings are supported.

The reviewer service accepts only access, logout, session, assigned-case, rating, and comment requests. It rejects coordinator endpoints and all preview parameters. Every matched profile must remain Verified and assigned before data is returned or saved. Direct database access is denied to browser clients, including the public key.

## Private initial data

`backend/private/` is ignored by Git and excluded from the Pages build. It contains the 53 official case packets and optional preliminary contact payload. Case packets, contacts, submissions, and backend keys must never be committed or placed in frontend imports, `public/`, or `VITE_*` values.

The application tables enable row-level security and deny direct anonymous/authenticated table access. The server checks case assignments and authoritative quote text before using its server-only database client. This protects coordinator data and request scope; matching a public email is still not verified identity authentication.

## Backend setup

Create a Supabase Free project owned by the host. Apply the SQL migrations in filename order:

1. `backend/supabase/migrations/202611100001_review_portal.sql`
2. `backend/supabase/migrations/202611100002_name_selection.sql`
3. `backend/supabase/migrations/202611100003_three_case_assignments.sql`
4. `backend/supabase/migrations/202611120004_reviewer_email_access.sql`

Prepare private initial data locally:

```sh
npm ci
npm run seed:prepare -- --coordinator-email THE_ACTUAL_COORDINATOR_EMAIL
```

Add `--include-contacts` when the 66 preliminary contacts should be imported. Run `backend/private/seed.sql` in the database. The seed contains 53 cases and 1,038 rubric criteria. Contacts import as Preliminary with no assignments, activated access, or linked identities. No invitations are sent. These initial payload files must be obtained separately from the owner when cloning the public repository.

Deploy both Edge Functions from the `backend` directory:

```sh
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy pmxbench
supabase functions deploy pmxbench-reviewer
supabase secrets set PMXBENCH_FRONTEND_ORIGIN=https://YOUR_GITHUB_ACCOUNT.github.io
```

The config keeps JWT verification enabled for `pmxbench` (coordinator) and disabled for `pmxbench-reviewer` (the limited reviewer-access handler). The coordinator handler also validates the user through Supabase Auth and checks the private coordinator allowlist. Never expose a service-role or secret key to the frontend or GitHub variables.

For dashboard deployment, `node scripts/bundle-dashboard.mjs` produces single-file equivalents in ignored `backend/.deploy/`. Paste each bundle into the Supabase function editor using its matching function name. Check the JWT verification setting for each function against `backend/supabase/config.toml`.

Reviewer access starts disabled on a fresh installation. Migration 004 transfers the existing enabled setting when upgrading and disables the legacy name-only flag. After the owner accepts the access model above, enable it with:

```sql
update public.pmx_settings set value='true'::jsonb where key='reviewer_access_enabled';
```

Disable it with the same statement using `false`. This stops reviewer case and review access without deleting saved data.

## Coordinator access

Open the portal with `?coordinator=1`. **Password** is the default coordinator sign-in method and does not send an email. The owner creates the coordinator account and its password through Supabase Authentication → Users, using the email in the private coordinator allowlist. Use a password for this portal; it may differ from the host’s GitHub or Supabase dashboard credentials.

Coordinator sign-in is separate from reviewer name-and-email access. The backend still requires a confirmed account and checks the private coordinator allowlist for every request. Do not enable public coordinator signup or expose a backend key to provision accounts. The owner must enter, save, and submit their own password.

Coordinator sign-in uses a password only. The portal does not request coordinator sign-in emails. Reviewer name-and-email access also requires no email sender.

After sign-in, confirm expert details, choose up to three cases, and set the profile to Verified to enable access. The recorded reviewer email is required for access and should match the address used in their reply. A preliminary profile may omit it until confirmed. No real experts are automatically activated or assigned by the seed.

## GitHub Pages deployment

Set two **public** repository variables:

- `VITE_SUPABASE_URL`: the project's HTTPS origin.
- `VITE_SUPABASE_PUBLISHABLE_KEY`: its browser publishable key, or legacy public anon key.

The build rejects recognizable server keys and missing settings. In Settings → Pages, choose **GitHub Actions**, then push to `main` or run `.github/workflows/pages.yml`. The workflow installs dependencies, runs PostgreSQL/access/source checks, type-checks the backend, builds the frontend, audits the static artifact, and deploys `dist` with the official Pages actions. Repository-path asset URLs are configured automatically.

The source and interface are public. Scientific packets and contact records are absent from the static artifact; active assigned case/review data is available through the deliberately public name-selection flow described above.

## Development and validation

```sh
npm ci
npm test
npm run typecheck:backend
```

For local frontend development, copy `.env.example` to `.env.local`, set the public project values, and run `npm run dev`. Use a separate development backend and matching origin/redirect configuration for live writes.

An unconfigured local rendering can be built with `ALLOW_UNCONFIGURED_BUILD=1 npm run build`. The deployment workflow rejects that override. It does not create a working backend or authorize publishing a placeholder.

Tests use real PostgreSQL in PGlite to check direct-data denial, privileged RPC protection, assignment limits, atomic changes, optional contact emails, granular rating merges, missing-value clearing, and reviewer separation. Source checks verify canonical quotations and UTF-16 offsets. Name-picker checks verify the minimal public directory and rejection of coordinator/preview routes.

## Existing Site

The existing private Site is unchanged. Historical production reviews are not automatically copied. Export its Complete JSON and plan an explicit migration if those records need to move. Do not treat old authentication bindings as Supabase identities.

## Primary documentation

- [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions/auth)
- [Public and secret keys](https://supabase.com/docs/guides/getting-started/api-keys)

## Website tests

Test profiles use `source: Website test fixture`. Test packets use `isTest: true`; copies of real packets also record their source case/revision. Test feedback is available in that reviewer’s workspace and individual export, but excluded from coordinator benchmark CSV/JSON exports and benchmark totals. Copies retain complete official scientific text and descriptions without staged files. Keep fixture SQL, contact addresses, and copied packets in ignored `backend/private/`.
