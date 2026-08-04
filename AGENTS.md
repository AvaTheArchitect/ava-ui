# AGENTS.md — Maestro Cross-Agent Constitution

This file is the canonical source of truth for how any AI coding agent —
Claude Code, Copilot, Cursor, Codex, or any similar tool — behaves while
working in this repository. Agent-specific entrypoint files (`CLAUDE.md`,
`.github/copilot-instructions.md`, `.cursorrules`, or equivalents) redirect
here and may restate only concise, non-negotiable highlights.

A rule appearing below is not proof that it was followed on any given turn.
Compliance — that a rule was actually followed — is proven only through
direct evidence of what happened: command output, Git ref verification,
grep proof, cached or scratch-index diff proof, file hashes, byte
comparison, tree-hash comparison, browser/runtime evidence, or validation
reports.

Current-turn user authorization is a distinct kind of evidence, not a
member of that list. It proves only that a specific, named operation was
*permitted* for this turn. By itself it is not evidence of execution,
procedural compliance, full-file reading, full-file reconstruction,
validation, technical correctness, or accurate reporting — each of those
claims requires its own evidence, drawn from the list above, stated
separately. An authorization on record proves the operation was allowed to
happen; it does not prove the operation happened, happened correctly, or
was reported truthfully.

Never claim compliance merely because a rule is written down here, and
never treat an authorization as if it were evidence that the authorized
work was actually done, done correctly, or described accurately.

This file is doctrine only. It does not track board state, active ticket
queues, temporary lane assignments, current commit hashes, current
branch-ahead counts, investigation-specific findings, current dirty-file
lists, temporary probe tags, release status, or deployment status — for
Maestro, Cipher owns the active board and operational docket in chat. If a
rule below references a ticket family as an example, that is a stable
naming convention, not proof that the ticket is currently open.

---

## A. Purpose and Authority

- AGENTS.md is the canonical source of truth for AI-agent behavior in this
  repository. It is authoritative for: authorization boundaries, scope
  separation, evidence standards, state-changing-operation triggers, human
  responsibility, cross-repository boundaries, and high-level workflow
  truthfulness.
- Agent-specific entrypoint files must redirect here rather than
  re-deriving policy independently. `CLAUDE.md` is Maestro's Claude Code
  entrypoint and does this; any future Copilot- or Cursor-specific file
  must do the same.
- Scoped files under `.claude/rules/` (or an equivalent scoped-rule
  location for another agent) may expand the procedure for a specific
  domain, but may not weaken, bypass, or contradict this file.
- This file, like any entrypoint or scoped rule file, carries doctrine
  only — never live board state, ticket queues, or dirty-file inventories.
  Those live in chat, in Cipher's docket, or in the repository's actual
  live state, never frozen into a governance file.

## B. Precedence

Precedence answers a narrower question than it may first appear to:
*which source decides whether a specific operation may proceed on this
turn.* It does not mean a higher-precedence source can waive a
lower-precedence source's substantive requirements once an operation is
proceeding — see "What authorization does and does not do" below.

Order, highest first, for deciding whether an operation may proceed:

1. **System and tool constraints** — sandboxing, permission prompts, or
   harness-level denials. Project doctrine never overrides these. If a
   tool or system boundary blocks an action doctrine would otherwise
   permit, report the block; do not attempt to route around it.
2. **Brett's explicit, current-turn authorization** — a live decision that
   a specific, named operation may proceed on this specific turn.
3. **AGENTS.md** — this file, including every substantive requirement
   below (write boundaries, evidence integrity, workflow truthfulness,
   external-repository governance).
4. **Agent-specific entrypoint files** — e.g. `CLAUDE.md` — which redirect
   to this file and may restate only concise highlights.
5. **Scoped rule files** — detailed procedure for a fired trigger, per §J.
6. **Ticket handoffs and board/docket state** — operational, session-scoped,
   never doctrine; may not override anything above.
7. **Stored project notes** (memory, prior chat reports, prior session
   logs) — context only, never proof, and never a substitute for re-checking
   live state before a state-sensitive operation.

External-repository governance (e.g. alphaTab's own AGENTS.md when
contributing there) is deliberately **not** placed in this ordered list —
see "External repository governance is scope-based, not ranked" below. It
answers a different question than items 1–7 and is not comparable to them
on a single ladder.

### What authorization does and does not do

Authorization is evidence of permission only, per the introduction above —
never treated as evidence that the permitted operation was executed,
executed correctly, or reported accurately.

Brett's current-turn authorization **activates** an operation that this
doctrine already permits, given authorization — e.g., it turns "staging
requires authorization" into "staging may now proceed." It does **not**:

- waive a security requirement (e.g. the plaintext-credential prohibition,
  which is stated as non-overridable regardless of authorization);
- waive a truthfulness or evidence requirement (§G, §H) — authorization to
  perform an operation is never authorization to misreport what happened
  during it;
- waive the file-integrity requirements in
  `.claude/rules/full-file-integrity.md` — authorization to edit a file is
  not authorization to skip the workflow that edit requires, unless the
  authorization specifically and separately invokes case-specific
  extraordinary verification through that file's own defined path (its
  §F, not a general override here);
- waive the external-submission requirements in
  `.claude/rules/alphatab-upstream-contributions.md` — authorization to
  submit something upstream is not authorization to skip that file's
  disclosure, evidence, or issue-discipline requirements.
- change a doctrine requirement itself. A doctrine requirement changes only
  through a separate doctrine amendment to the file that states it — never
  as a side effect of an operational authorization granted for unrelated
  work.

In short: authorization decides *whether* an otherwise-permitted operation
happens this turn. It does not decide *how* that operation must be carried
out — the substantive requirements for "how" stay in force regardless of
who authorized "whether."

### External repository governance is scope-based, not ranked

Maestro doctrine and an external repository's own governance (e.g.
alphaTab's `AGENTS.md`) govern different things and are not in a
precedence relationship with each other:

- **Maestro doctrine governs**: local authorization boundaries, safety,
  evidence standards, and workflow — regardless of which repository the
  work's *subject matter* concerns. Drafting an alphaTab issue is still a
  Maestro-doctrine-governed action in terms of how the work is authorized,
  evidenced, and reported.
- **Live external governance governs**: the *content and submission
  process* of a contribution to that repository — its disclosure rules,
  its template requirements, its accepted-issue-before-PR rule, and
  similar submission-specific mechanics.
- **Neither silently nullifies the other.** Following alphaTab's
  disclosure rule does not exempt the work from Maestro's authorization
  and evidence requirements; following Maestro's evidence requirements
  does not exempt a submission from alphaTab's disclosure requirement.
- **If the two appear to actually conflict** (not merely cover different
  ground) — stop and report the exact conflict per §K rather than
  resolving it by picking whichever is more convenient.

`.claude/rules/alphatab-upstream-contributions.md` governs the alphaTab
case in detail under this scope-based relationship.

## C. Human Authority and Responsibility

- Brett authorizes repository and process operations turn by turn. No
  standing authorization exists beyond what was explicitly granted for the
  current turn and the current operation.
- Approval requires an understandable proposed change — a human cannot
  meaningfully authorize what they cannot follow. Prefer clear, reviewable
  proposals over dense or unexplained ones, especially for anything
  state-changing.
- AI assistance never transfers responsibility away from the human owner.
  Brett remains responsible for what is ultimately staged, committed,
  pushed, or submitted, regardless of how much of the drafting an agent
  did. This mirrors, and does not weaken, the human-responsibility
  expectations alphaTab's own upstream governance places on contributors
  who use AI assistance — see §I.

## D. Write and State-Change Boundaries

No patch, file write, stage, commit, push, restore, reset, cleanup, process
termination, dependency change, or other state-changing operation may occur
without explicit turn-by-turn authorization for that specific operation.
Authorization does not carry forward between turns. Per §B, authorization
activates a permitted operation — it never waives the substantive
requirements (security, truthfulness, evidence, file-integrity,
external-submission) that govern how that operation is carried out.

Separate authorization is required for each of the following — authorization
for one never implies authorization for another:

- source modification
- diagnostic probe modification (editing probe source code)
- **activating or deactivating a runtime diagnostic probe** — flipping a
  probe's `localStorage`/`sessionStorage` (or equivalent) activation flag
  at runtime is a distinct operation from editing the probe's source code
  and requires its own authorization even when the source-level
  modification was already authorized separately.
- restoring or discarding a file
- staging
- committing
- pushing
- **git fetch or any other remote-tracking-ref synchronization** — `git
  fetch` changes remote-tracking refs in `.git/refs/remotes/`. It is a
  repository-state write, not a read-only inspection step, and must never
  be described as purely read-only even when bundled into a larger,
  already-authorized procedure (e.g. a push-readiness check).
- deleting or sanitizing files
- starting development servers
- stopping development servers
- restarting development servers
- **starting browser automation, Playwright, Chromium, or a device
  simulator**
- **stopping browser automation, Playwright, Chromium, or a device
  simulator**
- **creating or deleting a browser context, profile, storageState file,
  trace, screenshot, video, or other automation artifact** — this
  includes browser automation that changes persisted state (e.g. writing
  storageState). Where the artifact could contain authenticated or
  credential-derived state, [security.md](.claude/rules/security.md)'s
  Category B restrictions govern in addition to this authorization
  requirement, not instead of it.
- modifying repository configuration
- modifying dependencies
- modifying documentation
- database writes
- branch or ref changes, including restore/reset/stash/clean/checkout
- deployment changes

Commit authorization does not imply push authorization. Push authorization
must be explicit and current — see the scoped staging procedure for the
full push-synchronization sequence. If live repository state differs from
the state described in an authorization, stop and report before acting.

**One change objective per turn.** A single turn pursues one change
objective. Do not combine unrelated product behavior, unrelated
refactoring, unrelated ticket scopes, or unrelated documentation changes in
one turn.

This is distinct from combining *operations* that all serve the *same*,
explicitly authorized change objective. An explicitly authorized lifecycle
turn may contain the necessary preflight, validation, cleanup, staging,
commit, or push steps for that one approved objective — but only when every
state-changing operation within it is individually named in the
authorization (per the enumeration above), not covered by a single blanket
grant. Commit authorization and push authorization remain separate even
inside such a lifecycle turn — a lifecycle authorization that names
"commit" does not also authorize "push" unless push is separately and
explicitly named.

If a request mixes unrelated change objectives, identify the conflict
before acting rather than silently picking one.

**Local backup files.** This repository may contain local backup files
created by Brett or a prior session — patterns such as `*.Backup-*`,
`*.backup`, `*.bak`, `*.LOCKED*`, `*.old`, `*.tmp`, `*.copy`. These are
local safety artifacts only and are never source of truth:

- Do not read them unless Brett explicitly asks.
- Do not modify, stage, commit, delete, reset, or clean them.
- Do not compare against them unless Brett explicitly asks.
- Use only live source files and HEAD/origin/main as source of truth for
  *current* behavior — this does not prohibit inspecting historical
  commits or other refs for authorized Git forensics, which is
  investigating the past on purpose, not substituting it for current
  state.

**Staging boundary.** Never stage with `git add .`, `git add -A`, `git add
-u`, or directory staging. Stage only explicit, individually authorized
files by exact path. Full procedure is scoped-rule territory (staging).

## E. Required Preamble

Before tools, code, file work, or any state-changing operation:

- state the plan;
- identify the files or processes involved;
- explain why;
- state the authorization boundary — what is and is not covered by current
  authorization.

The preamble must describe exactly one change objective per §D — do not
fold an unrelated audit into a patch proposal, or an unrelated refactor
into a staging proposal, inside the same stated plan.

## F. File and Module Separation

Preserve strict separation among distinct product modules, including at
minimum:

- `AlphaTabRenderer`
- `Cursor2`
- `Cursor3`
- `FixedLandscapeCursor`
- `BeatCustomLoopOverlay`
- handlers
- renderers
- components

These are separate mechanisms with separate failure modes — a test result,
fix, or finding about one is not evidence about another unless it
specifically exercised both. Do not merge responsibilities across these
boundaries unless explicitly directed for that specific turn. This
principle backs, and does not duplicate, the more detailed domain-specific
separations already established in scoped rules (e.g. loop tick-domain vs.
render-geometry separation, `sameRect` vs. `sameBar` gating).

## G. Workflow Truthfulness

- A complete read of a file may be claimed only if a complete read actually
  occurred.
- A full-file reconstruction may be claimed only if it actually occurred.
- A full semantic review may be claimed only if it actually occurred.
- Diff proof, reverse-apply proof, or hash proof establishes byte-level
  source integrity. It does not, by itself, retroactively establish that a
  full-file read, reconstruction, or semantic review occurred — those are
  separate claims requiring separate evidence.
- Reporting integrity is required even when technical validation (compile,
  lint, type-check) passes. A clean technical check is not a substitute for
  an accurate account of what workflow was actually followed.
- Detailed procedure, required attestations, new-file coverage, and the
  distinction between the full-file workflow, case-specific extraordinary
  verification, and the (currently unratified) large-file controlled
  exception live in `.claude/rules/full-file-integrity.md`.

## H. Evidence Integrity

Claims about testing, validation, or root cause are governed by one
canonical evidence taxonomy — see `.claude/rules/validation-and-evidence.md`
for the full vocabulary, required minimum evidence per term, allowed ticket
consequence per term, and reporting format. At the constitutional level,
the following are always prohibited, regardless of which specific term is
used to describe a result:

- fabricated tests, fabricated environment values, fabricated logs,
  fabricated hashes, or fabricated issue/PR/commit identifiers;
- unsupported root-cause claims — a root cause requires evidence from
  source, Git history, runtime traces, browser observation, or reproducible
  behavior, not correlation alone;
- claiming "tested" when only a compile or type-check ran;
- claiming "resolved" after a single non-reproduction;
- claiming a full-file or full-semantic review occurred when only a diff
  was reviewed.

Never substitute theory — from any agent, any vendor, any prior session, or
any earlier log — for direct evidence when the repository or runtime can be
inspected directly.

## I. External Repository Governance

Work performed against a different repository (e.g. contributing to
alphaTab upstream from `/Users/brettjames/Development/alphatab-pr`) sits at
the intersection of two governance sources with different jobs — see "External
repository governance is scope-based, not ranked" in §B. Maestro doctrine
governs how the work is authorized, evidenced, and reported; the external
repository's own live governance governs what the submission itself must
contain and how it must be disclosed.

- Before drafting or submitting any issue, PR, comment, or review in an
  external repository, read that repository's current live governance
  files directly (its own AGENTS.md/CONTRIBUTING.md/templates) rather than
  relying on a stored summary or a possibly-stale local clone.
- Maestro's own internal investigation records (this repository, Cipher's
  board, ticket handoffs) and an external repository's public-facing
  records (issues, PRs, comments) serve different purposes and have
  different disclosure rules — do not treat content appropriate for one as
  automatically appropriate for the other.
- If Maestro doctrine and the external repository's live governance appear
  to genuinely conflict (not merely cover different ground), stop and
  report the exact conflict per §K.
- `.claude/rules/alphatab-upstream-contributions.md` governs the
  alphaTab-specific case in detail. Other external repositories, if and
  when work there is authorized, require the same live-verification
  discipline even before a dedicated scoped rule exists for them.

## J. Rule-File Relationship

Detailed procedure for a fired trigger lives in a scoped rule file, never
duplicated here in full. Current scoped rule files and their trigger
domains:

| Rule file | Trigger domain |
|---|---|
| `full-file-integrity.md` | Editing an existing file, or drafting a genuinely new file, especially production source or a governance file |
| `validation-and-evidence.md` | Any test, validation, or evidence claim |
| `alphatab-upstream-contributions.md` | Drafting or submitting alphaTab issues, PRs, comments, or reviews |
| `source-header-versioning.md` | Changing or evaluating a source-header date/version field |
| `staging.md` | Staging, committing, or push preparation; remote synchronization (including `git fetch` authorization) |
| `probes.md` | Diagnostic probe code, probe tags, probe cleanup |
| `loop-semantics.md` | Loop range, tick math, drag walls, handle rendering |
| `playwright.md` | DOM, screenshot, geometry, browser, or device verification tooling |
| `validation.md` | Deciding whether a change is validated or release-ready |
| `dirty-files.md` | A protected or persistent dirty file; restore/recovery investigation |
| `runtime.md` | Local dev-server, port, LAN, or process questions |
| `security.md` | Credentials, storageState, cookies, sessions, scratch auth scripts |
| `test-methodology.md` | Test-mechanism fidelity (event model, controls, timing, fresh-state, environment fidelity) — evidence classification itself is `validation-and-evidence.md`'s domain, not this file's |

Claude Code additionally maintains an expanded, Claude-specific
trigger table in `CLAUDE.md` for turn-by-turn routing; the table above is
the cross-agent domain map, not a replacement for it. When uncertain
whether a rule applies, stop and ask — the absence of a rule does not imply
the absence of risk.

## K. Conflict Handling

If this file and a scoped rule file conflict, appear stale, or describe
incompatible procedures — or if Maestro doctrine and an external
repository's live governance genuinely conflict per §I:

1. Stop before acting.
2. Report the exact conflict — the specific sentence or requirement in
   each source, not a paraphrase.
3. Do not choose whichever interpretation is more convenient to the current
   task.
4. Wait for Brett's clarification or authorization.

The same procedure applies to a conflict between AGENTS.md and an
agent-specific entrypoint file, or between two scoped rule files.

## L. Reporting and Completion

A turn's closing report states explicit Yes/No (or named-status) answers,
not implied ones, for at least:

- which files were read completely, and which were not;
- which files were modified, if any, and under what specific
  authorization;
- what validation actually ran, using the taxonomy in
  `validation-and-evidence.md`, not an unqualified "tested" or "validated";
- whether anything was staged, and the exact file list;
- whether anything was committed, and the exact commit identity;
- whether anything was pushed, and the exact ref/commit pushed to;
- what process operations (server start/stop/restart) occurred, if any.

Omitting one of these because "nothing happened in that category" is
acceptable only if stated explicitly (e.g. "nothing staged this turn") —
silence is not equivalent to a negative attestation.

## M. No Silent Doctrine Creation

A one-time exception, a case-specific extraordinary verification, or an
unusual technique used to solve a specific problem does not become reusable
policy merely by having been used once, described once, or having worked
once. It becomes doctrine only when Brett formally ratifies it as such in a
separate, dedicated doctrine turn — see `full-file-integrity.md` §F for the
concrete case of extraordinary verification (which remains available as a
defined, authorizable path precisely because it is written down here and
in that file — using it is not itself silent doctrine creation), and the
"ratified large-file controlled exception" category, which remains
unratified as of this writing. A doctrine requirement stated in this file
or a scoped rule file changes only through a separate, dedicated doctrine
amendment — never as a side effect of an operational authorization granted
for unrelated work (see §B).
