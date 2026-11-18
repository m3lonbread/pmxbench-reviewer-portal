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


Private source literature, 13 November 2026:

- Added Source literature navigation and an optional-reading tab to every case. Reviewers can open paper PDFs, download them, and retain their current review. Paper titles support source-linked quotations and return navigation to subsection 6. Existing prompt, rubric, and rating section numbers remain unchanged. The session metadata remains compatible with older clients; the updated frontend adds the literature navigation.
- Imported 449 case-to-paper references for all 53 official cases into private pmx_literature storage. Validated and deduplicated the PDFs to 382 files (553,398,637 bytes). The private bucket contains only PDFs; every catalog reference resolves to a stored file. Non-PDF archive entries and datasets were excluded. Copied cases resolve to their original literature without duplicating storage or joining benchmark feedback.
- Applied migration 202611130006 and deployed both Supabase handlers. Paper listing and signed read/download links require a current assigned-case scope; links expire after five minutes. Anonymous direct catalog and public object access are blocked. Backend data, PDFs, contact information, and secrets are absent from the public repository and static build.
- Added a lazy-loaded PDF.js reader with page navigation, fit-width zoom, selectable text, and download/new-tab alternatives after the in-app browser showed a blank native PDF iframe. Public assets contain PDF.js support code, fonts, and its license, with no scientific PDFs. Updated the compatible Vite dependency; dependency audit reports no vulnerabilities.
- All 16 checks, backend type-check, production build, and static artifact audit passed. Live checks matched the three test reviewers' 30 paper listings, downloaded and hashed a sample PDF for each, verified attachment headers and paper-title source references, and blocked unassigned/non-PDF requests. No review feedback was written during verification.
- GitHub Pages deployment 43534405547 for commit 3b3babd succeeded. Live browser verification rendered the PDF page and selectable text, exercised next/previous page and zoom controls, confirmed paper-title quotation/return navigation, and returned to the literature tab without submitting feedback. The reviewer tab is left open. The owned local preview server was stopped.

Case-specific material guides and designated primary papers, 15 November 2026:

- Replaced the material section's generic-only presentation with detailed descriptions for all 361 staged files across the 53 official cases. Descriptions are derived from the current tables, contracts, and 19 dictionary schema variants: row/column counts, observation granularity, endpoints/units, analytical roles, time ranges with numeric-row denominators, event rules, output arrays, required artifacts, missingness, and 4,657 field entries. Raw observation rows, raw file downloads, executable inputs, and summary-card PNGs remain unavailable.
- Added private pmx_material_guides overlays and separate description-source revisions through migration 202611150007. All source-file hashes and 6,421 new quotation blocks were verified locally. Original case packets and their legacy material blocks remain intact. Source navigation now expands nested field/review details before highlighting a quotation.
- Corrected the literature selection to the curator-designated SOURCE_FILE PDFs in case_summary_cards_source/manifest.json: 62 case-to-paper references, 60 distinct primary PDFs, with 57 new stored objects. All primary source hashes and exact case mappings match the curator manifest. The default list contains the key papers; older background references remain available only when revisiting their saved quotations. No earlier paper objects or feedback were deleted.
- Applied the source/guide imports and updated both Supabase handlers. Live database checks confirm 53 guides, 361 file profiles, 62 designated references across 53 cases, zero missing primary PDFs, a private storage bucket, and denied direct anonymous/authenticated guide access. Four test reviewers' six assigned copies passed guide-content, source-revision, PDF hash/download, and access-boundary checks; no feedback was submitted.
- All 16 automated checks, backend type-check, frontend production build, and static privacy audit passed. GitHub Pages deployment 43751918029 for b669607 succeeded. Browser verification showed the detailed Remifentanil observations, quotation attachment and exact return highlighting, the single designated Minto primary paper, and its rendered scanned PDF. Proof images are stored in the workspace outputs directory.


Reviewer orientation, rubric presentation, and final allocations, 16 November 2026:

- Added a five-step tutorial that opens on each reviewer login, stays dismissed on refresh within that login, and can be reopened with Review guide. Covers navigation, comparison/literature, six ratings, quoted/general comments, and saving/completion. Keyboard dismissal/focus, all five steps, manual replay, desktop preview, and the live narrow-screen layout were checked. Coordinators and read-only previews do not auto-open the tutorial.
- Removed supplementary appendix material after scoring criteria from warfarin, CAR-T, and 7E3 in the reviewer presentation. All 53 packets retain their 1,038 original scored criteria and 159 pass/fail gates; the other 50 rubric displays are unchanged. Original packet data, source IDs, and historical quotations remain stored. Older appendix quotations return to the current rubric with an explanation.
- Pages deployment 44038388119 for commit 29992b0 succeeded. All 18 tests, backend type-check, frontend build, and static privacy audit passed. Browser verification confirmed login auto-opening, refresh dismissal, manual replay, CAR-T criteria/gates, and the absence of the supplementary appendix. No review feedback was written.
- Read the updated tracker’s 66 detailed rows rather than its summary counters: 22 Interested, one conditionally interested, 18 declines, two OOO, and 22 without a response. The coordinator explicitly approved activating the conditional reviewer and treating the remaining information-requesting reviewer as not participating. Authorship discussion status is retained separately.
- Finalized and activated 65 assignments across 23 benchmark reviewers, each with two or three cases, covering all 53 official cases. Ten profiles were newly activated; ten were inactivated, including the coordinator-excluded reviewer. OOO and unanswered profiles were preserved. Allocations include recorded rationales and distinguish model-method matches, clinical/endpoints contributions, and independently established specialties. Some overlapping assignments were redistributed for full coverage; most established case matches were retained.
- Applied the private import atomically after a live backup and local PostgreSQL dry run, including rejection of a stale repeat import. All 23 active reviewer sign-ins returned the exact case lists; all ten newly inactive identities were blocked. The 66 stored packets, four saved rating/review rows, ten comments, 37 unaffected profiles, and all test-profile assignments were unchanged. No invitations or other messages were sent.
- Contact rows, final allocation manifest, matching sources, SQL, snapshots, and audit scripts remain in ignored backend/private/. A private human-readable allocation report, including all case coverage and matching rationales, is saved outside the public repository in the workspace outputs directory. No assignment/contact data was added to the public frontend.


Streamlined reviewer interface, 17 November 2026:

- Replaced the Case overview presentation with Review instructions: the benchmark goal across PopPK/PBPK/QSP and the requested scientific, clarity, and alignment assessment. Case navigation and comparison selectors use the new label. Scientific packets and historical source identifiers remain unchanged.
- Reduced materials to short file summaries, removing the column catalog, long analytical blocks, and repeated scope descriptions from the normal view. All 361 summaries across 53 official cases are verbatim source prefixes with verified quotation offsets. All 6,782 existing material-source blocks remain resolvable; an older source link can reveal its one previously cited passage without restoring the full catalog.
- The top-level review tabs are Materials and Side by Side Tool. Removed the Key literature and Quick ratings tabs; case ratings and key paper access remain in their case sections and existing actions. Updated the tutorial and chat instructions to match.
- Highlighting now opens an optional Add comment popup while leaving the chat unchanged. Choosing it attaches the selected text and exact source and focuses the comment field. General feedback remains available. Popup positioning stays within the viewport and is dismissed by Escape, scrolling, invalid selections, or modal entry.
- All 19 checks, backend type-check, frontend build, and static privacy audit pass. Pages deployment 44210446084 for 823159b succeeded. Browser checks verified the instructions/tabs, concise summaries, comparison selectors, normal highlighting without attachment, explicit quotation attachment with case/subsection context, and return highlighting. The narrow live portal layout was checked with the existing test reviewer; the temporary quotation was removed and no feedback was submitted.
- Backend data, assignments, reviewer access, scoring criteria, pass/fail gates, and saved submissions were not edited. Preview fixtures, detailed source audits, and browser verification records remain in ignored backend/private/; proof images are in the workspace outputs directory.


Guided review and editable comments, 17 November 2026:

- Replaced the short orientation with a welcome screen and a nine-step walkthrough of the actual workspace: assigned cases, participant prompt, materials/optional source papers, rubric/gates, Side by Side Tool, ratings, source-linked comments, general feedback/comment editing, and finishing/exporting. The guide opens the relevant section or view, highlights its tool, and supports Back, Next, overview, minimize, exit, and replay. Starting or finishing the walkthrough does not save ratings, send comments, or mark a case reviewed. The updated version opens on reviewer login, remains dismissed on refresh within that login, and can be reopened from Review guide or the instructions.
- Added Edit, Save changes, and Cancel to reviewers’ own sent comments. The editor is separate from the new-comment draft. Updates retain quotations, exact source revisions/offsets, original creation time, identity, and reviewer ownership. Edited labels show saved revisions; coordinator JSON exports return the current text and edit metadata. Private revision history is retained.
- Applied migration 202611170008 and deployed both Supabase handlers. Anonymous/authenticated direct access to revision history and the privileged edit function is denied. Server checks enforce current reviewer ownership, archived/source visibility, text limits, and optimistic edit versions. A live stale-edit test exposed PostgREST’s retry behavior for serialization errors; the final implementation uses a non-retryable PT409 response, verified live and in handler/PostgreSQL tests. Reference: https://supabase.com/kb/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b
- All 21 checks, backend type-check, frontend build, and static privacy audit passed. Pages deployment 44213386375 published e6deef9; final small-screen control layout deployment 44214138860 for 7e4058d also succeeded. Browser verification covered all nine live steps, tool navigation, automatic entry, minimize/replay, refresh dismissal, and always-visible Start/Skip controls on the narrow portal viewport.
- Live API checks confirmed quoted and general comment revisions, immutable source/creation context, stale-version conflict rejection, invalid-context rejection, cross-reviewer denial, and persistence after reopening. A labeled test comment was edited through the browser and retained its exact source. Cancel kept the saved wording unchanged in the local preview. Six test-only verification comments, including interrupted attempts, were archived after checking; they remain recoverable and excluded from benchmark results.
- Before/after audits preserved all ten pre-existing comments, 66 case packets, 70 expert profiles, four review/rating rows, and all assignments. No real reviewer feedback, ratings, or completion state was changed by verification. Private backups, test fixtures, SQL corrections, and audits remain ignored; proof images are stored in workspace outputs. The owned preview server and deployment tabs were closed; the live walkthrough is left open.


Global instructions and case-specific review briefs, 17 November 2026:

- Moved Review instructions above the cases, below Expert review. Each case now begins with its own one-sentence modeling question before the participant prompt. Updated the optional source-literature wording in the case section and guided walkthrough.
- Grouped material descriptions into Operational and Data. Added concise, case-specific explanations for all 361 staged files across the 53 official cases, without row or column counts. These descriptions and 53 case goals are private revisioned overlays; raw staged files remain unavailable.
- Removed Materials support from the active rating form, completion counts, guidance, and active CSV columns. The five remaining categories are scientific soundness, writing clarity, task/rubric alignment, difficulty, and modeling expertise. Previously saved Materials support answers remain stored.
- Imported the private overlays and deployed both Supabase handlers. Verified 414 new quotation blocks and preservation of all 13,619 legacy blocks. Before/after hashes confirmed unchanged underlying guides, all 66 packets, 70 profiles, 16 stored comments, four review/rating rows, and all assignments.
- All 22 checks, backend type-check, frontend build, and static privacy audit passed. All 414 private brief strings were absent from static assets. Pages deployment 44220136121 for 41e84f5 succeeded. Read-only live checks covered four test reviewers and six case copies, including all 46 new source blocks in those copies and denied direct anonymous overlay access.
- Browser verification confirmed global instructions, the real case question, requested file groups, count-free descriptions, five rating fields, and optional paper wording on the live desktop/narrow layouts. No feedback, ratings, or completion state was submitted. Proof images are in workspace outputs; private imports, backups, and audits remain ignored. Verification sessions/tabs were closed and the existing live portal remains open.


Statement-style case goals, 17 November 2026:

- Reframed all 53 case goals as construction statements, using the coordinator's exact CAR-T sentence. The instructions now explicitly ask reviewers to read the prompt, material descriptions, and rubric before giving ratings or comments.
- Stored the goal statements as a separate private revisioned overlay and added distinct quotation sources. All 14,033 existing source blocks remain unchanged and previously quoted goals can still be opened. Before/after hashes confirmed no changes to prior guide content, case packets, expert profiles, comments, reviews, or assignments.
- Both Supabase handlers were deployed. All 23 automated checks, backend type-check, frontend build, and static privacy audit passed. All 53 private goal statements were absent from static assets. Read-only live checks verified new and historical goal sources across four test reviewers and six case copies; no feedback was submitted.
- Pages deployment 44221525735 for ae9521d succeeded. The live CAR-T case displays the requested statement and the updated instruction sentence. Proof is saved in workspace outputs/pmxbench-goal-statements-20261117.png; verification sessions and owned tabs were closed.


Neutral dictionary descriptions and rubric subtitles, 17 November 2026:

- Removed missing-value/missingness-rule wording from the current dictionary descriptions and descriptive guide summaries for all 53 official cases. The website now describes identifiers, field meanings, units, and coding. The three_tier source-file cleanup was handled in the separate user-requested chat; this portal update changed only website descriptions and presentation.
- Retained prior private guide revisions and added revision-aware quotation lookup and source navigation. All 14,086 prior source blocks remain resolvable. Before/after checks preserved all other guide content, case packets, expert profiles, comments, review/rating rows, assignments, and case-goal statements. Read-only live checks covered four test reviewers, six copies, and 24 old/new source references; no feedback was submitted.
- Removed the redundant date/Five dimensions/100 points subtitle from all 53 rubric displays. Every other previously visible rubric block, including all scoring criteria and pass/fail gates, is unchanged. Original packet text and historical quotation references remain stored.
- Both Supabase handlers were updated. All 24 tests, backend type-check, frontend build, and static privacy audit passed. Pages deployment 44223664411 for 304e18b and final subtitle deployment 44224351530 for e42ce75 succeeded.
- Browser verification showed the neutral dictionary description beside the rubric with no redundant subtitle. A proof image is stored in workspace outputs/pmxbench-neutral-dictionary-description-20261117.png. Private imports, snapshots, source audits, and live verification reports remain ignored.


Review-instructions walkthrough step, 17 November 2026:

- Added Review instructions as step 2, immediately after assigned cases. The guide returns to the document view, closes the case drawer, scrolls to and highlights the global instructions, and explains that experts assess each case and rubric for scientific soundness, clarity, and alignment. The next step remains the participant prompt.
- The walkthrough now contains ten steps and its welcome count follows the step list automatically. Login/dismissal behavior is unchanged. No backend, assignment, case content, or saved review data was modified.
- All 24 tests, frontend build, and static privacy audit passed. Pages deployment 44225784071 for 475c313 succeeded. Live browser checks verified assigned cases → instructions → prompt, Back restoring the instruction spotlight, and exactly one highlighted target. The test reviewer walkthrough is left open at step 2; no feedback, ratings, or completion state was submitted. Proof is saved in workspace outputs/pmxbench-walkthrough-review-instructions-20261117.png.


Contract and prediction-target wording, 17 November 2026:

- Updated both material descriptions in all 53 official cases and their test copies. The model construction contract now outlines expected input files, output artifacts, and analysis requirements. Prediction targets uses the coordinator's revised reporting/scenario/role wording, without the endpoint-example list.
- Applied 106 private description changes with archived prior revisions. All 20,921 existing source-version entries remained resolvable in validation. Before/after hashes preserved every other guide field, case packet, expert profile, comment, review/rating row, and assignment. The private generation template was updated; no frontend or backend-function deployment was required.
- Live browser verification confirmed both exact descriptions. No feedback or ratings were submitted, and the verification session/tabs were closed. Private imports, snapshots, and audits remain ignored; proof is stored in workspace outputs/pmxbench-material-role-descriptions-20261117.png.


Walkthrough focus, rubric introductions, and reviewer email aliases, 18 November 2026:

- The participant-prompt walkthrough step now expands and highlights the case goal and prompt together. Moving on clears both outlines; Back restores them. Finish tour dismisses the guide and returns to the top of the current case with its goal open. Closing/skipping the guide retains its existing behavior.
- Removed Threshold provenance and Evidence and execution sections wherever present across the full case library, including copies. The 53-case audit removed 56 sections/114 display blocks and preserved every other previously visible block, including scoring criteria and pass/fail gates. Stored source text, IDs, and historical quotation handling remain unchanged.
- Pages deployment 44394728342 for 69d8de3 succeeded. Live checks verified two expanded spotlights after starting with a collapsed goal, cleanup and Back navigation, hidden rubric introductions with required gates retained, and Finish returning the case heading to the top of the reading area. No review data was submitted. Proof images are in workspace outputs/pmxbench-goal-prompt-walkthrough-20261118.png and pmxbench-tour-return-case-top-20261118.png.
- Added private, explicit alternate reviewer email addresses through migration 202611180009 and deployed both Supabase functions. Aliases require the same reviewer name, verified profile, and current assignments. Sessions are rechecked against allowed addresses; removed aliases, inactive profiles, wrong names, and unlisted addresses remain blocked. Coordinator access and route restrictions are unchanged.
- Configured one coordinator-requested alternate address on the existing profile. The original primary address, all 69 other profiles, case packets, reviews, comments, assignments, and settings were preserved. Live checks confirmed both addresses open the same reviewer, three assigned cases, and identical saved reviews; all verification sessions were revoked afterward. No messages were sent and no feedback was written. Contact details, import SQL, and backups remain private.
- All 26 tests, backend type-check, frontend build, and static privacy checks passed. Pages deployment 44396678143 for f47a30d succeeded. The deployment tab was closed and the verified test case overview remains open.
