# PmxBench reviewer portal

Reviewers open the GitHub Pages site, select their name, and review their assigned cases. No reviewer account, email sign-in, or email service is required. Supabase stores case packets, assignments, ratings, and source-linked comments. The coordinator uses a separate authenticated workspace to manage assignments and export results.

**Status:** source is public at `m3lonbread/pmxbench-reviewer-portal`; Pages and the new Supabase Free project are being configured. See [deployment status](DEPLOYMENT_STATUS.md) for verified progress.

## Access model

Name selection is self-reported identity. Anyone with the portal link can choose any activated reviewer, access that reviewer's assigned cases and saved answers, and submit under that name. The portal is suitable only when that trust model is acceptable. Submitted reviews record `self_selected_name` in their identity metadata. Selecting a name does not verify the person.

The picker lists only Verified reviewers with assigned cases. Preliminary and Inactive profiles stay out of the picker. Its public directory includes only ID, name, affiliation, and assigned-case count. Contact emails, coordinator notes, the complete roster, assignment editing, and aggregate exports remain coordinator-only.

Each reviewer receives one or two cases. Complete prompts and grading rubrics are included, with materials descriptions only. Staged files and summary cards are not provided. Quotations retain their exact case, subsection, passage, and source revision. General comments and six categorical ratings are supported.

The name-selection service accepts only directory, session, assigned-case, rating, and comment requests. It rejects coordinator endpoints and all preview parameters. Every selected profile must remain Verified and assigned before data is returned or saved. Direct database access is denied to browser clients, including the public key.

## Private initial data

`backend/private/` is ignored by Git and excluded from the Pages build. It contains the 53 official case packets and optional preliminary contact payload. Case packets, contacts, submissions, and backend keys must never be committed or placed in frontend imports, `public/`, or `VITE_*` values.

The application tables enable row-level security and deny direct anonymous/authenticated table access. The server checks case assignments and authoritative quote text before using its server-only database client. This protects coordinator data and request scope; it does not turn name selection into identity authentication.

## Backend setup

Create a Supabase Free project owned by the host. Apply the SQL migrations in filename order:

1. `backend/supabase/migrations/202611100001_review_portal.sql`
2. `backend/supabase/migrations/202611100002_name_selection.sql`

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

The config keeps JWT verification enabled for `pmxbench` (coordinator) and disabled for `pmxbench-reviewer` (the limited public name-selection handler). The coordinator handler also validates the user through Supabase Auth and checks the private coordinator allowlist. Never expose a service-role or secret key to the frontend or GitHub variables.

For dashboard deployment, `node scripts/bundle-dashboard.mjs` produces single-file equivalents in ignored `backend/.deploy/`. Paste each bundle into the Supabase function editor using its matching function name. Check the JWT verification setting for each function against `backend/supabase/config.toml`.

Name selection starts disabled. After the owner accepts the access model above, enable it with:

```sql
update public.pmx_settings set value='true'::jsonb where key='name_selection_enabled';
```

Disable it with the same statement using `false`. This stops public directory, case, and review access without deleting saved data.

## Coordinator access

Open the portal with `?coordinator=1`. Coordinator sign-in is separate from the reviewer name picker. Enable email authentication with confirmation; set Supabase's Site URL and redirect allowlist to the exact Pages URL and to that URL with `?coordinator=1`.

Supabase's built-in email sender can serve project-team addresses for initial coordinator access. The owner can use that account without configuring an email provider for reviewers. If additional coordinators outside the Supabase team later need email sign-in, configure a suitable sender or another authenticated provider. Do not disable email ownership verification for coordinators.

After sign-in, confirm expert details, choose one or two cases, and set the profile to Verified to list it in the picker. Contact email is optional and does not control reviewer access. No real experts are automatically activated or assigned by the seed.

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
