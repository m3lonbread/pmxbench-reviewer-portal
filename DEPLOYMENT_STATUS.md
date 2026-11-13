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

Deployment is complete. To begin real reviews, the coordinator assigns one or two cases and marks the corresponding expert Verified; that name then appears in the reviewer picker. No experts were automatically activated or assigned. Coordinator password sign-in and authorized roster access are verified live. Email-link delivery and an assigned reviewer’s live write flow remain untested; database saves and reviewer separation passed the local PostgreSQL checks. The existing private Site remains unchanged.

Branding and coordinator update, 10 November 2026:

- Main branding changed to `#a9d9d6`, with darker teal text, matching favicon, and a more visible Coordinator access button.
- GitHub Pages deployment 42957609012 succeeded for commit 962fe95. CI checks, the build, and static data audit passed. Live computed button background verified as `rgb(169, 217, 214)`.
- Supabase primary account email refreshed to the owner's current verified GitHub primary email. The private portal coordinator allowlist and ignored bootstrap seed were corrected to that address; the previous coordinator email was removed. Personal email values remain outside public source.
- Coordinator entry is available at `https://m3lonbread.github.io/pmxbench-reviewer-portal/?coordinator=1`. Sign-in email delivery still requires the owner to request and open their link.

Coordinator password sign-in, 10 November 2026:

- Added password sign-in as the default coordinator method, with email links retained as an optional fallback for existing accounts.
- Password attempts never send email automatically. Email limit errors now explain the restriction and pause repeated requests. Passwords stay in the password field’s memory until submission and are not written to app storage, source, logs, or exports. Supabase manages credential verification and session storage.
- Ten local checks pass, including password/email dispatch separation and email quota handling; frontend build and static privacy audit pass.
- The owner set their coordinator password privately through Supabase and successfully signed into the deployed portal. Browser verification confirmed the coordinator workspace and all 66 preliminary profiles loaded.
- Deployment 42958290201 for commit 64fa27c passed all ten checks, backend type-check, frontend build, static audit, and Pages publishing. Email delivery remains optional and subject to the provider quota.

Tracker response synchronization, 10 November 2026:

- Extended assignment limits to three cases in the coordinator UI, server validation, and atomic database helper. Migration 202611100003 was applied. Eleven checks pass, including allowing three assignments and rolling back a four-case attempt.
- Read the response CSV at its real header row (row 9) using its Windows-1252 encoding. Detailed responses were used rather than the stale summary counters. Private data, source links, matching rationales, and the pre-change roster snapshot stay in ignored backend/private/.
- Archived five declined profiles from the current roster, prepared 36 draft case assignments across 14 profiles, and verified all seven OOO records remained byte-for-byte unchanged in their saved profile timestamps. No review data was deleted.
- The 10 clearly interested reviewers have two or three cases each (28 assignments); four requesting more information have two tentative draft cases each (8 assignments). Public reviewer activation is a separate final action.

Completed response activation:

- The coordinator approved activation of the 10 explicitly interested reviewers. All 28 assignments are live across 28 distinct cases; eight reviewers have three cases and two have two cases.
- Five declined profiles remain inactive, four information-requesting profiles retain two draft cases each, and all seven OOO profiles were left untouched. Other blank-response profiles were unchanged.
- Live API checks matched all 10 reviewer sessions to their exact planned case IDs, verified the minimal public directory, blocked unassigned cases and coordinator routes, and blocked all four draft identities. Prompt/rubric delivery and absence of staged-file access were verified.
- Browser checks confirmed the coordinator totals (61 current profiles, 10 activated, 14 with plans, 28/53 cases active) and a three-case reviewer view without assignment controls. No review submissions or invitations were created.
- Both Edge Functions were updated, and Pages deployment 42961265688 for commit a50c70c passed all 11 checks, backend type-check, frontend build, and the static privacy audit.
- Matching is a coordinator inference from the tracker’s modeling/research fields and linked institutional/conference/publication sources. The rationale is stored per profile. Individual reviewers have not yet confirmed their case preferences. The conditional epidemiology/outcomes-to-QSP match is explicitly marked tentative in the corresponding draft notes.

Website test workflow, 10 November 2026:

- Added support for explicitly labeled fictional test packets (`isTest: true`) and test profiles (`source: Website test fixture`). Test records remain manageable in the coordinator workspace, while benchmark totals and sample previews exclude them.
- Coordinator benchmark CSV/JSON exports exclude test profiles, assignments, ratings, and comments. General test comments are excluded by profile identity; mixed-source comments containing any test quotation are also excluded. The JSON export reports excluded record counts. Individual reviewer exports retain test data for testing and label test cases.
- Prepared one synthetic case 0 with a full prompt, a material description, and four complete criteria totaling 100 points. Its fixture/SQL and profile details stay in ignored backend/private/. The 53 official packets are unchanged.
- Local database checks confirmed idempotent fixture creation, preserved official cases, and exact source normalization. Live checks confirmed the test identity has only its one fictional case, cannot access official cases or coordinator routes, and can persist general feedback, source-linked feedback, and all six rating categories after reopening a session.
- Both Edge Functions were updated and Pages deployment 42963459605 for commit 301a107 completed successfully, with all 12 checks, backend type-check, frontend build, and static privacy audit passing.
- Browser verification confirmed the test name in the picker, the labeled case 0, four complete rubric criteria in Compare, saved ratings/comments, and quotation navigation reopening subsection 0.2 and highlighting the exact passage. The test workspace is left open for the owner.

Updated tracker and confirmed reviewer activation, 12 November 2026:

- Compared the new response CSV with the prior detailed rows, then matched changed entries to their existing private profiles. The CSV summary counters were stale; the 66 detailed records contain 13 Interested, 5 Interested Need More Info, 9 Not interested, 6 OOO, and 33 blank responses.
- Updated 11 changed profiles: prepared seven case assignments across three newly confirmed reviewers, added eight tentative assignments across four newly information-requesting reviewers, and archived four new declines. Existing draft plans for the two newly confirmed reviewers were retained. All six remaining OOO profiles, other existing reviewers, official packets, and saved feedback were preserved.
- Filled missing expertise context using identity-matched institutional, conference, and publication sources. Matching rationales and source links stay in coordinator notes and ignored backend/private/. Clinical/outcomes expertise is distinguished from unverified mechanistic-modeling expertise.
- After the owner explicitly approved activation, the three new confirmed profiles were marked Verified. The live picker now has 13 confirmed benchmark reviewers plus the separate website test profile. Confirmed benchmark reviewers have 35 assignments across 31 of 53 official cases; the five information-requesting profiles retain 10 draft assignments.
- The database dry run verified atomic changes and stale-import rejection. Live checks confirmed all seven newly activated case assignments, blocked unassigned cases and coordinator routes, and kept tentative/declined identities unavailable in the public picker. No feedback was submitted during verification.
- Post-activation snapshots verified that all 64 other profiles, all assignments, all case packets, and existing comments/ratings remained unchanged during activation. Source CSVs, SQL imports, snapshots, and checks are ignored private files. No frontend or Edge Function changes were required.

Typed reviewer name/email access and real-case test copies, 12 November 2026:

- Replaced the public name picker with typed full-name and reply-email fields. The owner approved the latest tracker addresses and supplied the two test-profile emails privately. All 13 active benchmark profiles matched the approved normalized tracker emails. Honorifics, recorded nicknames, and parenthesized-name variants are handled without public lookup hints.
- The server now matches both details against an active assigned profile and issues a random eight-hour session token. Only token hashes are stored server-side, browser identity storage uses sessionStorage without the email, and each request checks current activation, email, and assignments. Logout revokes the session. Ten matching attempts per normalized email are allowed per fifteen-minute window. This matches recorded details; it does not verify email ownership.
- Removed the public reviewer directory and disabled the legacy name-only setting. Old reviewer IDs alone no longer grant access. Migration 202611120004 was applied, both Edge Functions were deployed, and coordinator access remains separately authenticated. Existing comments retain their historical identity method; new feedback records name_email_match.
- Sonya’s existing test profile now accepts her coordinator-provided email. Added a separate test profile for Dr. Liang Zhao. After the coordinator selected and approved the cases, activated test-only copies of official Case 3 (CAR-T), Case 4 (7E3 FcRn), and Case 2 (single-dose warfarin). They appear as test cases 56–58, preserve the full scientific prompt/rubric/material descriptions, and retain original-case references. The initial unselected test copies remain unassigned in private storage; no feedback was deleted.
- Test identities and packets remain excluded from benchmark totals and coordinator benchmark CSV/JSON exports. All original assignments and scientific packets remain unchanged. Test fixture scripts, contact emails, snapshots, and sample feedback are outside Git in backend/private/.
- Sixteen checks passed, including actual handler enforcement, token binding/revocation/expiry, generic mismatch errors, private table/RPC permissions, and rate-window behavior. Backend type-check, frontend build, and static privacy audit passed. Pages deployment 43293728187 for commit 99f0c62 succeeded.
- Live verification matched all 13 active benchmark reviewers to their exact prior assignments; confirmed old ID-only and directory access are blocked; verified Sonya’s saved feedback; and opened only Dr. Zhao’s three selected copies. General/quoted comments and six sample ratings were saved only to the test profile and survived reopening. No real reviewer feedback was written. Final snapshots preserved all 66 other profiles, all 54 prior packets, all prior comments/ratings, and all 46 prior assignments.
- Browser verification confirmed typed entry, successful Dr. Zhao access, three assigned test copies, saved ratings/comments after reload, and explicit exclusion labels. The test workspace is left open for the coordinator.

Password-only coordinator entry, 12 November 2026:

- Removed the Email link tab, OTP dispatch, resend timer, and email-delivery messages from coordinator entry. Coordinator access now uses the existing email/password flow only; reviewer name/email matching and saved data are unchanged.
- Updated the existing authentication checks and README. All 16 checks, the frontend build, and the static privacy audit pass. Local browser inspection confirms only the email/password form and Sign in control are present.


Single real-case reviewer workspaces, 13 November 2026:

- Activated the coordinator-requested test profiles for Yaxin Liu and Wei Wang, and updated Sonya Chen. Each has exactly one copied official packet: Atazanavir Oral Absorption, Rheumatoid Arthritis Multitherapy, and Remifentanil Anesthesia PKPD respectively. These differ from Dr. Zhao's assigned copies. Unselected prepared copies remain private and unassigned.
- Retired Sonya's fictional case 0 from the active catalog and assignments. Removed reviewer-facing test-copy title prefixes, banners, and the TEST navigation filter. Source references use the clean title and matching presentation revision; stored scientific packets and historical quotation records remain intact.
- Archived Sonya's three earlier dummy-workflow comments using the recoverable archived_at field (migration 202611130005); active workspaces hide archived comments. The old ratings and case packet stay stored. Internal test profile/case markers remain, so all these reviewers' responses continue to be excluded from benchmark totals and exports.
- All 16 checks and backend type-check pass, including hiding retired packets and archived general feedback. The frontend build and static privacy audit passed; Pages deployment 43497679735 for e375a8d succeeded. Both Supabase functions were updated. Live checks verified exactly one matching real case per reviewer, complete source materials, blocked cross-reviewer/original/coordinator access, and session revocation. No new feedback was submitted during these checks.
- Private before/after audits preserved all 59 prior packet contents, both prior rating rows, five prior comment contents, 67 unrelated profiles, and all other assignments. Contact addresses, fixture SQL, and snapshots remain excluded from Git and Pages artifacts.
