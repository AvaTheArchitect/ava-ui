# Security Doctrine

Governs credentials, session material, and authenticated state anywhere in
or near this repo, including scratch/investigation artifacts.

## Authentication Is a Human Gate

Authentication into any Maestro.ai authenticated route or session is
performed exclusively by Brett, directly, in the browser. This is a
categorical exclusion, not an authorizable Claude operation — no
authorization, however explicit or turn-specific, activates it, per
[../../AGENTS.md §B](../../AGENTS.md#b-precedence).

Claude must never:

- request Brett's login credentials, in chat or otherwise;
- receive a login credential Brett offers, whether pasted, typed, or set
  as an environment variable;
- pass a login credential into a command, script, tool call, or browser
  automation step;
- store a login credential in any file, variable, or persisted state;
- script, template, or pre-fill a login credential into any file Claude
  writes;
- infer, guess, reconstruct, or reuse a login credential from prior
  sessions, memory, scratch files, or any other source;
- otherwise handle a login credential in any form.

This applies regardless of how the operation is framed — a "quick" login
script, a diagnostic tool, a one-off command, an already-authorized
session — and regardless of who is asking. If a task requires an
authenticated Maestro.ai route or behavior, stop and ask Brett to log into
the same browser context Claude will then use for read-only observation or
testing. Do not attempt a workaround instead of asking.

This section supersedes any prior framing in this file that treated
Claude receiving a credential via a pasted value or an ephemeral
environment variable as acceptable — it is not, under any authorization.

## Prohibited Authentication-Bypass Techniques

Claude must never attempt to establish, simulate, or extend an
authenticated state by technical means, including but not limited to:

- Supabase anon, service-role, or other elevated API keys used to
  fabricate or elevate a session;
- signed URLs used to skip normal authentication;
- direct cookie, `localStorage`, or `sessionStorage` injection or
  manipulation to simulate a logged-in state;
- middleware changes intended to relax or route around an auth check;
- alternate, undocumented, or debug routes that bypass the normal
  authenticated path;
- synthetic or fabricated session objects/tokens of any kind;
- a generated `storageState` file that did not originate from Brett
  performing the login himself (see "Derived authenticated browser state"
  below for the one narrow case where a `storageState` file is permitted
  at all).

Finding a plausible-looking technical shortcut around authentication is
never sufficient justification to use it — the answer is always to stop
and ask Brett to authenticate himself, per "Authentication Is a Human
Gate" above.

## A. Test credential values

Credentials used only to exercise the product during testing/validation
(e.g. a test-account password or token). Per "Authentication Is a Human
Gate" above, Claude never receives, handles, or stores one in any form —
plaintext or otherwise. In addition, plaintext test credential values are
never written to disk, anywhere, under any authorization:

- never in repository files, tracked or untracked,
- never in scratch scripts, anywhere,
- never in the shared Playwright harness,
- never in Markdown files, including this doctrine and any report,
- never in reusable scripts intended to run more than once,
- never in persistent `.env` files,
- never in an external session directory — Section B below governs
  *derived* authenticated state, not the raw credential,
- never written into a `storageState` file directly as a value,
- never cached, incidentally or otherwise, in a Claude Code
  permission/allowlist file (e.g. `.claude/settings.local.json`) — see
  "Harness-Generated Artifacts Can Persist a Credential" below for why
  this is a live risk even when the rest of this section is followed.

Brett authenticates test sessions himself, directly in the browser, the
same as any other authentication. Nothing in this section authorizes
Claude to receive, echo, log, print, or repeat a credential value — not in
a later message, not in a script, not in a report — under any
circumstance.

## B. Derived authenticated browser state

Only *derived* authenticated state — a `storageState` file, cookie jar, or
other session material produced by Brett using his own credential to log
in himself, not the credential itself, and not a session Claude produced
or scripted — may be temporarily persisted, and only when explicitly
authorized for that specific purpose. Claude may capture or reuse such
already-established state for read-only observation, but never originates
the authentication that produced it. When authorized, it must:

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
strings, etc.) — distinct from, and unrelated to, Brett's personal login
credentials governed above:

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
- This category is never a loophole around "Authentication Is a Human
  Gate" above — an application secret is not a substitute for, and must
  never be repurposed as, a way to establish an authenticated user
  session.

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

## Harness-Generated Artifacts Can Persist a Credential

Claude Code's own tooling — not just Claude's own actions — can persist a
credential to disk. In particular, the local permission/allowlist file
(`.claude/settings.local.json`) can cache the literal text of a previously
approved Bash command, including any inline credential that command
contained (e.g. an environment variable assignment on the same line as the
command). This is a structural risk independent of whether Claude
"printed" or "logged" anything — the harness's own allowlist caching can
do it silently.

"Authentication Is a Human Gate" above is the primary control: if Claude
never runs a credentialed command, there is nothing for the allowlist to
cache. If a legacy allowlist entry (or any other file) is found to contain
a credential-shaped value:

- report the file path and a classification only (e.g. "an inline
  password appears in a cached command string"), never the value itself,
  per "Report classifications, not matches" below;
- do not modify, sanitize, or delete the entry without separate,
  turn-specific authorization for that specific file, per
  [../../AGENTS.md §D](../../AGENTS.md#d-write-and-state-change-boundaries);
- treat the underlying credential as compromised and recommend rotation,
  independent of whether the file itself is ever edited.

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
[../../AGENTS.md §D](../../AGENTS.md#d-write-and-state-change-boundaries).

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
authorization rule in
[../../AGENTS.md §D](../../AGENTS.md#d-write-and-state-change-boundaries)
like any other patch.
