# PmxBench reviewer portal

Reviewers open the GitHub Pages site, type their full name and recorded reply email, and review their assigned cases. No email link, code, email sender, or reviewer password is required. Supabase stores case packets, assignments, ratings, and source-linked comments. The coordinator uses a separate authenticated workspace to manage assignments and export results.

**Site:** https://m3lonbread.github.io/pmxbench-reviewer-portal/

The site is live with a Supabase Free backend and owner-approved name-and-email matching. The coordinator must activate a profile, record its reply email, and assign cases before reviewer access works. See [deployment status](DEPLOYMENT_STATUS.md) for verification and current readiness.

## Access model

Reviewers type their name and reply email; the server matches both against a private Verified profile with assigned cases. This checks knowledge of recorded details, not ownership of the email address. Anyone who knows a valid name/email pair could impersonate that reviewer. Use verified sign-in if that trust model is insufficient. New feedback records `name_email_match`; historical identity metadata is preserved.

There is no public reviewer directory or email list. Old reviewer IDs alone cannot open a review. The server issues a random eight-hour session token after a successful match, stores only its SHA-256 hash, and keeps the browser token in sessionStorage. Email addresses are not saved in browser identity storage. Each request rechecks profile activation, current email, and assignments. Sign-out revokes the token; expiration, an email change, or deactivation invalidates access. Matching attempts are limited to ten per normalized email in fifteen minutes; no attempt log stores the email itself.

Reviewers can receive up to three cases; the current matching plan targets two or three per interested expert. Complete prompts and grading rubrics are included, with material descriptions and source-paper PDFs. Datasets, other staged inputs, and summary cards are not provided. Quotations retain their exact case, subsection, passage, and source revision. General comments and five categorical ratings are supported. Historical Materials support answers remain stored but are no longer requested.

The reviewer service accepts only access, logout, session, assigned-case, assigned-paper, rating, and comment requests. It rejects coordinator endpoints and all preview parameters. Every matched profile must remain Verified and assigned before data is returned or saved. Direct database access is denied to browser clients, including the public key.

## Private initial data

`backend/private/` is ignored by Git and excluded from the Pages build. It contains the 53 official case packets and optional preliminary contact payload. Case packets, contacts, submissions, and backend keys must never be committed or placed in frontend imports, `public/`, or `VITE_*` values.

The application tables enable row-level security and deny direct anonymous/authenticated table access. The server checks case assignments and authoritative quote text before using its server-only database client. This protects coordinator data and request scope; matching a public email is still not verified identity authentication.

## Backend setup

Create a Supabase Free project owned by the host. Apply the SQL migrations in filename order:

1. `backend/supabase/migrations/202611100001_review_portal.sql`
2. `backend/supabase/migrations/202611100002_name_selection.sql`
3. `backend/supabase/migrations/202611100003_three_case_assignments.sql`
4. `backend/supabase/migrations/202611120004_reviewer_email_access.sql`
5. `backend/supabase/migrations/202611130005_archive_feedback.sql`
6. `backend/supabase/migrations/202611130006_source_literature.sql`
7. `backend/supabase/migrations/202611150007_case_material_guides.sql`
8. `backend/supabase/migrations/202611170008_edit_comments.sql`
9. `backend/supabase/migrations/202611180009_reviewer_email_aliases.sql`
10. `backend/supabase/migrations/202611190010_scoped_case_access.sql`

Alternate typed sign-in addresses can be configured explicitly in the private `pmx_experts.login_email_aliases` array. They use the same reviewer name, active profile, assignments, and saved reviews. Removing an alias ends sessions that used it; coordinator access is unchanged. Apply migration 202611180009 before deploying the updated functions.

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

Coordinator sign-in is separate from reviewer name-and-email access. The backend requires a confirmed account and checks the private owner allowlist or explicit case-admin membership for every request. Do not enable public coordinator signup or expose a backend key to provision accounts. The owner must enter and submit new passwords.

Coordinator sign-in uses a password only. The portal does not request coordinator sign-in emails. Reviewer name-and-email access also requires no email sender.

### Restricted case workspaces

An owner can prepare a private case group and members in `pmx_case_groups` and `pmx_case_group_members` after applying migration `202611190010_scoped_case_access.sql`. These tables have no browser REST access. An inactive group grants no access. Group members are separate from faculty assignments and excluded from benchmark exports.

The owner's **Restricted case access** form displays the prepared people and cases. The owner enters and submits the new admin password; the backend creates confirmed Supabase Auth accounts without sending email, then activates the group. Passwords are forwarded only to Auth and never written to application tables or returned in responses. The form does not reset existing passwords. A partial failure leaves the group inactive; retry with the same password to retain already-created accounts.

Case admins use `?coordinator=1`, their own email, and the configured password. They receive explicit case grants, never the full coordinator allowlist. They can view/export only in-scope ratings and comments whose quotations all belong to their scope. Mixed-source comments and general feedback without a case anchor are omitted, including in reviewer previews. Contact details, global notes, other cases, access setup, and profile editing are unavailable. Optional assignment management changes only in-scope allocations for the scoped roster, preserves all outside assignments, and retains the ordinary three-case faculty limit. A case viewer uses the regular name/email entry and can read only the group's materials. Name/email matching never elevates a member to admin. Case-group materials are read-only and do not submit faculty ratings or comments.

The setup supports live packets or isolated copies of the current real packets. Test copies remain excluded from benchmark exports. The authenticated owner retains full access. Revoking a group or deactivating its member blocks subsequent requests even with an existing session.

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

Test profiles use `source: Website test fixture`. Test packets use `isTest: true`; copies of real packets also record their source case/revision. Test feedback is available in that reviewer’s workspace and individual export, but excluded from coordinator benchmark CSV/JSON exports and benchmark totals. Copies retain complete official scientific text and descriptions without staged files. Reviewer-facing copies use clean case titles and no test-case banners; internal test flags still exclude their responses from benchmark results. Archived packets and comments are hidden from active workspaces while historical feedback stays stored. Apply all SQL migrations, including `202611130005_archive_feedback.sql`, when provisioning a backend. Keep fixture SQL, contact addresses, and copied packets in ignored `backend/private/`.


## Key source literature and material descriptions

The Key source literature section lists curator-designated primary reference-model papers from `mechanistic_pkpd_benchmark/case_summary_cards_source/manifest.json`, matched to the official cases. The full participant background archives are described in the material guide. Summary-card PNGs and raw staged inputs are not served. Historical paper references remain resolvable when opening saved feedback.

The PDF.js reader supports previews, page navigation, zoom, selectable text, new-tab reading, and downloads. Selecting a paper title attaches its source reference to feedback. Text selection inside the PDF reader does not attach excerpts automatically.

PDFs and case-specific descriptions remain private backend content. `pmx_literature` and `pmx_material_guides` deny direct browser access. The server checks current case assignment before listing papers or issuing five-minute signed read/download links. Test copies resolve to their original case's primary papers and descriptions. Keep the `pmxbench-literature` Storage bucket private, with no public SELECT policies.

After applying all migrations and the main case seed, run `python3 scripts/prepare-literature.py` in a Python environment with `pypdf`. It verifies the curator manifest hashes and prepares ignored `backend/private/key-literature-seed.sql`, `key-literature-manifest.json`, and `key-literature-pdfs/`. Apply the seed and upload those PDFs to the private bucket. Re-running the seed preserves background source records and marks the designated primary sources; it does not delete old PDFs or feedback.

Run `python3 scripts/prepare-material-guides.py` against the owner-supplied current `three_tier` inputs. It creates descriptive profiles for all staged files: row/column counts, roles, endpoints and units, observation granularity, time domains, event handling, required artifacts, missingness, and field definitions. It emits no participant-level observation rows, executable model files, or raw input downloads. Apply the six ignored `backend/private/material-guides-part-*.sql` files in order.

The current concise descriptions and case goals are supplied through the owner-maintained private `pmx_material_guides.payload.review` overlay (`revision`, `goal`, and filename-keyed `materials`). Apply the owner-supplied overlay import after preparing the detailed guides; the detailed generator alone does not create the current review briefs. Never include these private payloads in the static build. Goal statements are supplied separately in `pmx_material_guides.payload.goalStatement` (`text` and `revision`) and exposed as `reviewGoal`. The earlier question-style goals remain addressable for historical quotations.

Descriptions are overlays on the stored scientific packets. Original prompt/rubric text, legacy material source blocks, and saved quotations stay intact. New description blocks carry a separate content revision, verified by the server when a comment is submitted. Source navigation expands collapsed field guides before highlighting the cited passage. Store all generated case data and PDFs outside Git and the public build. Revised dictionary descriptions omit missing-value-rule guidance. Prior material-guide revisions are retained privately in `payload.history` so existing quotations continue to resolve exactly.


Reviewer orientation and rubric presentation:

The ten-step guided Review guide opens automatically for each new reviewer login. Dismissing it is remembered for that login in sessionStorage, so refreshing does not reopen it. Reviewers can reopen it with Review guide; coordinators and read-only previews do not receive the automatic prompt. Immediately after assigned-case navigation, it highlights Review instructions and explains the expert's role in evaluating each case and rubric. The guide also covers comparison and literature, quick ratings, source-linked/general comments, and saving/completion.

Reviewer rubrics display all scored criteria and required pass/fail gates, while supplementary notes after the criteria, the Threshold provenance and Evidence and execution introductions, and redundant date/dimensions/points subtitles are omitted. The original stored packet, block identifiers, and saved quotations remain unchanged. A historical quotation of an omitted appendix opens the current rubric with an explanation.


Streamlined reviewer interface:

Review instructions appear once above the case list, explaining the benchmark goal and requested expert assessment. Each case begins with a one-sentence Case goal statement before the participant prompt. Material descriptions are grouped into Operational (definitions, model construction rules, prediction targets) and Data (observations, treatment events, context, and literature), with concise, case-specific descriptions and no row or column counts. A previously saved source link can still reveal its cited passage. The top-level tabs are Materials and Side by Side Tool; case ratings and key source papers remain available within each case.

The Cases and Review assistant controls collapse either side panel independently and let the reading area use the available width. Panels stay mounted while hidden, preserving drafts, attached quotations, comment edits, and panel state. Adding a passage comment reopens the assistant; the walkthrough opens the panel needed for its current step. Tablet and mobile drawers retain their responsive controls.

Selecting a passage now shows an Add comment popup. Highlighting alone does not change the chat. Choosing Add comment attaches the selected text and its case/subsection source, then focuses the comment field. General feedback remains available without a quotation. The tutorial describes this opt-in flow.


Guided walkthrough and comment revisions:

Review guide now opens a welcome dialog, then walks through the actual workspace: assigned cases, prompt, supporting files/papers, rubric, side-by-side comparison, ratings, source-linked feedback, general feedback/editing, and completion. It highlights each tool and supports Back, Next, minimize, and exit. Starting the tour navigates the interface without submitting feedback, selecting ratings, or marking a case reviewed. The prompt step expands and highlights the case goal and participant prompt together. Finish tour returns to the top of the current case with the case goal open. It opens automatically for reviewer logins and can be reopened from Review guide or Start guided walkthrough within the instructions.

Reviewers can Edit a sent comment, then Save changes or Cancel. Updates preserve quotations, source revisions, reviewer identity, and original creation time. An Edited label indicates saved revisions. Server checks enforce ownership, current source visibility, and the expected edit version; stale edits return a non-retryable PT409 conflict. Private revision history is stored in pmx_comment_edits, inaccessible to anonymous/authenticated direct clients. Coordinator JSON exports include the latest text and edit metadata; test-review exclusions are unchanged. Deploy both Edge Functions after applying migration 202611170008.
