# Deployment status

Prepared locally on 10 November 2026.

Implemented:

- GitHub Pages-compatible static frontend with project-path asset support.
- Existing reviewer and coordinator workflows, with the roster restricted to coordinators.
- Supabase authentication integration and authenticated Edge Function API.
- Private PostgreSQL schema, denied direct browser-table access, server-only helper RPCs, and atomic review/assignment updates.
- Private initial-data generator for 53 official cases, 1,038 rubric criteria, and 66 optional preliminary contacts.
- GitHub Actions deployment workflow, frontend configuration checks, and static artifact privacy audit.

Verified locally:

- Frontend TypeScript check and static build.
- Backend TypeScript check.
- Six database/source/configuration checks passed.
- Full private seed executed successfully in an isolated PostgreSQL runtime: 53 cases, 66 preliminary experts, zero activated/linked profiles, zero assignments.
- Static artifact contains no case packets, faculty contacts, or server credentials.

Not deployed yet:

1. Target repository: https://github.com/m3lonbread/pmxbench-reviewer-portal. Browser sign-in is available. Pages will be enabled after the backend project and public frontend configuration are ready.
2. A new Supabase Free project is authorized. Supabase account sign-in is pending; project setup uses browser/CLI access because the plugin is disabled in this workspace.
3. The selected backend must be configured for reviewer sign-in, including an email sender or an alternative approved provider.

No Pages URL has been published, and no private data has been uploaded to the new backend yet. Live sign-in, email delivery, and end-to-end hosted behavior remain unverified until those accounts are connected. The existing private Site was not changed.
