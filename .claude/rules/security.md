# Security Doctrine

Governs credentials, session material, and authenticated state anywhere in
or near this repo, including scratch/investigation artifacts.

## A. Test credential values

Credentials used only to exercise the product during testing/validation
(e.g. a test-account password or token used for Playwright auth). Plaintext
test credential values are never written to disk, anywhere, under any
authorization:

- never in repository files, tracked or untracked,
- never in scratch scripts, anywhere,
- never in the shared Playwright harness,
- never in Markdown files, including this doctrine and any report,
- never in reusable scripts intended to run more than once,
- never in persistent `.env` files,
- never in an external session directory — Section B below governs
  *derived* authenticated state, not the raw credential,
- never written into a `storageState` file directly as a value.

A test credential may only:

- be supplied directly by Brett for the active, authorized session, or
- be exposed to exactly one command via an ephemeral environment variable,
  for that command's authorized use.

Either way it must never be echoed, logged, printed, or repeated by Claude
— not in a later message, not in a script, not in a report.

## B. Derived authenticated browser state

Only *derived* authenticated state — a `storageState` file, cookie jar, or
other session material produced by using a credential, not the credential
itself — may be temporarily persisted, and only when explicitly authorized
for that specific purpose. When authorized, it must:

- live outside the repository,
- live outside `/private/tmp/maestro-playwright-shared/`,
- live in a dedicated external session directory created for this
  purpose,
- have an explicit lifetime stated at creation (a specific expiry or an
  explicit re-authorization checkpoint),
- be deleted after the audit/validation it was created for is done.

Its existence and location may be reported; its contents are never
reported.

## C. Approved application environment secrets

Real application secrets the product needs to run (API keys, DB connection
strings, etc.):

- may exist only in authorized, git-ignored environment files (e.g.
  `.env.local`) — never in a tracked file.
- plaintext test credentials and derived test-session artifacts (Sections
  A and B above) must never exist in these files or any other repository
  file, tracked or untracked — Category C governs real application
  secrets only, not test material.
- application secret values must never be staged or committed.
- Claude must not read, print, copy, modify, or stage these files without
  explicit, turn-specific authorization, even though they are "just
  sitting in an ignored file." Ignored is not the same as
  approved-for-Claude-to-touch.

This replaces any blanket "no credentials in the repository" framing that
would conflate test credentials (Category A — never on disk at all) with
approved application secrets (Category C — may exist in an authorized
ignored file). The two are governed differently and should not be stated
as one undifferentiated rule.

## D. Secret-safe commands

Do not assume a credential can always be redacted from a command's output
after the fact. Instead:

- do not run a command expected to print a secret in the first place,
- disable shell tracing (e.g. `set -x`) around anything credential-
  adjacent, since tracing echoes command arguments including any inline
  secret,
- design commands to emit status or classification output only (e.g.
  "auth check: 200 OK" instead of dumping a session cookie or token),
- if accidental exposure happens anyway, do not reproduce the value
  anywhere, not even to confirm what leaked — report the exposure
  category (e.g. "a bearer token was printed to the terminal") and
  request the appropriate containment action (e.g. credential rotation)
  instead.

## Credential input during a session

When Brett needs to supply a credential for active, authorized work:

- he may paste/provide it directly for that session's authorized use
  (Category A), or
- set it as an ephemeral environment variable for that session
  (Category A).

Either way, Claude must not echo it back, log it, persist it to any file,
or repeat it in a later message, command, or report. It is used in place,
for the authorized operation, and then it does not reappear in anything
Claude writes.

## No plaintext credentials in output

Never write, echo, print, or persist a plaintext credential — password, API
key, token, secret — into a file, a command's visible output, a chat
message, or a report. See "Secret-safe commands" above for how to design
commands so this doesn't come up in the first place.

## No credentials in the shared Playwright harness

The shared harness at `/private/tmp/maestro-playwright-shared/` (see
[playwright.md](playwright.md)) is not a credential store. No authenticated
storageState, cookie jar, or session artifact lives there — even
temporarily, even mid-session. See Category B above for where derived
authenticated state is allowed to live instead.

## Scratch credential discovery is scope-restricted

If a scan or audit turn needs to check for accidentally-committed or
accidentally-scratched credentials, restrict the search to explicitly
approved roots (e.g. the repo, a named scratch directory) — never a broad
filesystem-wide secret scan initiated on your own initiative.

## Report classifications, not matches

When reporting on found credential-shaped material, report the file path
and a classification ("looks like an API key pattern," "looks like a
session cookie") — never the matching line or the secret value itself, even
redacted-looking, in the report.

## Deletion or sanitization requires authorization

Finding a credential-shaped artifact does not authorize deleting or
sanitizing it. Report it and its classification; wait for explicit
authorization for that specific deletion/sanitization, per
[../../CLAUDE.md](../../CLAUDE.md) §1.

## Old scratch artifacts are contaminated until classified

A pre-existing scratch file discovered during unrelated work (old
storageState dump, old `.env` copy, old auth script) is treated as
potentially contaminated until it has been classified per the rules above —
do not read its contents into a report, and do not assume it's stale/safe
just because it's old.

## Nothing sensitive in reports

No tokens, cookies, `localStorage`/`sessionStorage` values, Supabase session
objects, or `Authorization` headers appear in any report, chat message, or
saved artifact — not even truncated or partially redacted, since partial
redaction of secrets is not reliably safe.

## No unauthorized tracked-source changes

Nothing in this file authorizes a source change. If closing a security
finding requires a code change, that change follows the normal
authorization rule in [../../CLAUDE.md](../../CLAUDE.md) §1 like any other
patch.
