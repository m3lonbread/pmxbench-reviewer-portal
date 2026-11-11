# Deployment status

Updated 10 November 2026.

The owner requested a simpler reviewer flow: select a name, with no email sign-in. Resend setup has been stopped. Coordinator administration remains authenticated and separate.

Verified hosting progress:

- Code pushed to the owner-approved public repository: https://github.com/m3lonbread/pmxbench-reviewer-portal.
- GitHub Pages deployed successfully through GitHub Actions at https://m3lonbread.github.io/pmxbench-reviewer-portal/.
- Hosted entry screen and separate coordinator sign-in verified in the browser.
- Deployment run 42955013491 passed build, all eight checks, backend type-check, static privacy audit, and Pages publishing.
- Supabase Free organization PmxBench and project `pmxbench-reviewer-portal` created by the owner in West US (Oregon).
- Both database migrations applied successfully.
- All 53 official cases, 1,038 rubric criteria, and 66 Preliminary contacts imported into Supabase. Zero assignments or activated experts.
- Eight live API checks pass: name directory works without sign-in (200); coordinator results and preview routes rejected by the reviewer service (403); unknown/inactive reviewer access rejected (403); coordinator requires sign-in (401); direct database case access denied (401); unapproved origins blocked (403); browser preflight succeeds (204).
- Both Edge Functions deployed; Pages origin and coordinator callback URL configured.
- Public Supabase URL and publishable key set as GitHub repository variables.
- Owner explicitly approved name-only access on 10 November 2026. The limited reviewer function's gateway JWT check is off and `name_selection_enabled` is true. The authenticated coordinator function remains protected.
- Hosted entry screen now shows ‘Reviews are being assigned’ because the approved name directory currently has zero activated reviewers.

Implemented and checked locally:

- Default reviewer name picker, independent of coordinator authentication.
- Limited public reviewer service; coordinator and preview routes rejected.
- Exact source validation, assigned-case checks, atomic saves, and self-reported identity metadata.
- Optional contact email for expert profiles; no reviewer email setup.
- Eight PostgreSQL/source/configuration checks pass. Frontend build and backend type-check pass.
- Static artifact privacy audit passes: no case packets, faculty contacts, or server credentials.

Deployment is complete. To begin real reviews, the coordinator assigns one or two cases and marks the corresponding expert Verified; that name then appears in the reviewer picker. No experts were automatically activated or assigned. Coordinator email delivery and an assigned reviewer’s live write flow remain untested; database saves and reviewer separation passed the local PostgreSQL checks. The existing private Site remains unchanged.

Branding and coordinator update, 10 November 2026:

- Main branding changed to `#a9d9d6`, with darker teal text, matching favicon, and a more visible Coordinator access button.
- GitHub Pages deployment 42957609012 succeeded for commit 962fe95. CI checks, the build, and static data audit passed. Live computed button background verified as `rgb(169, 217, 214)`.
- Supabase primary account email refreshed to the owner's current verified GitHub primary email. The private portal coordinator allowlist and ignored bootstrap seed were corrected to that address; the previous coordinator email was removed. Personal email values remain outside public source.
- Coordinator entry is available at `https://m3lonbread.github.io/pmxbench-reviewer-portal/?coordinator=1`. Sign-in email delivery still requires the owner to request and open their link.
