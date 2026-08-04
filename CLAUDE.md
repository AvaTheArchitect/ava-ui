# Maestro Doctrine — Claude Code Entrypoint

Claude, Claude Code, or Claude accessed through any IDE plugin or agent SDK
working in this repository: read [AGENTS.md](./AGENTS.md) in full before
doing anything else. AGENTS.md is the canonical source of truth for agent
behavior in this repository — authorization boundaries, evidence standards,
human responsibility, and cross-repository governance all live there.
CLAUDE.md is not the canonical source when AGENTS.md governs; it is a
concise, Claude-specific entrypoint and routing table.

This file carries doctrine and routing only — never board state, active
ticket queues, current dirty-file lists, probe counts, commit queues, or
temporary lane assignments. Cipher owns the active board and operational
docket in chat. If a rule below references a ticket family as an example,
that is a stable naming convention, not proof the ticket is currently open.

---

## Non-negotiable highlights

- **No state-changing operation without current-turn authorization**, and
  authorization only activates an operation — it never waives a security,
  truthfulness, evidence, file-integrity, or external-submission
  requirement. See
  [AGENTS.md §B](./AGENTS.md#b-precedence) and
  [AGENTS.md §D](./AGENTS.md#d-write-and-state-change-boundaries), which
  includes `git fetch` as its own separately authorized operation.
- **One change objective per turn.** Do not combine unrelated product
  behavior, unrelated refactoring, unrelated ticket scopes, or unrelated
  documentation in one turn. An explicitly authorized lifecycle turn may
  bundle the preflight/validation/cleanup/staging/commit/push steps for
  one approved objective, but only with every state-changing operation
  individually named — commit and push authorization stay separate even
  inside such a turn.
- **Direct, current evidence outranks memory, theory, and stale handoffs.**
  Re-check live state before any state-sensitive operation. See
  [AGENTS.md §H](./AGENTS.md#h-evidence-integrity) and
  [validation-and-evidence.md](.claude/rules/validation-and-evidence.md)
  for the canonical evidence taxonomy — do not describe a result using the
  old confirmed/likely/needs-verification vocabulary.
- **Local backup files are never source of truth.** Patterns like
  `*.Backup-*`, `*.bak`, `*.LOCKED*`, `*.old`, `*.tmp`, `*.copy` — do not
  read, modify, stage, commit, or compare against them unless Brett
  explicitly asks. See [AGENTS.md §D](./AGENTS.md#d-write-and-state-change-boundaries).
- **Never stage broadly.** No `git add .`, `git add -A`, `git add -u`, or
  directory staging — exact path only, explicitly authorized. Full
  procedure in [staging.md](.claude/rules/staging.md), including the
  explicit authorization `git fetch` itself now requires.
- **A full-file claim requires a full-file read** — for edits to existing
  files and for genuinely new files alike. Never imply a complete read,
  reconstruction, or semantic review occurred unless it did. See
  [full-file-integrity.md](.claude/rules/full-file-integrity.md).
- **Browser automation and probe activation don't start or stop silently.**
  Starting/stopping Playwright, Chromium, or a device simulator; flipping a
  probe's runtime activation flag; and creating or deleting a browser
  context, storageState, trace, screenshot, or video are each their own
  authorized operation, distinct from server start/stop and from editing
  probe source. See [AGENTS.md §D](./AGENTS.md#d-write-and-state-change-boundaries).
- **alphaTab upstream work follows alphaTab's own live rules**, verified
  fresh each time, alongside — not instead of — Maestro's own
  authorization and evidence requirements. See
  [AGENTS.md §I](./AGENTS.md#i-external-repository-governance) and
  [alphatab-upstream-contributions.md](.claude/rules/alphatab-upstream-contributions.md).

## Persistent dirty-file trigger

If a dirty file survives from one ticket into a second ticket, it must be
classified and reported, not just re-noted as `M path/to/file`. Full
procedure — classification categories, semantic-diff-summary and
reporting-format requirements, external forensic preservation, and
targeted-vs-whole-file recovery — lives in
[dirty-files.md](.claude/rules/dirty-files.md). This paragraph is a
trigger reminder, not the procedure itself.

## Detailed procedure — see `.claude/rules/`

This file states the trigger. The linked rule file states the full
procedure.

- [staging.md](.claude/rules/staging.md) — scratch-index construction,
  hash-object/update-index procedure, exact staging, candidate tree
  comparison, commit verification, `git fetch` authorization, push-state
  synchronization, `.LOCKED` backup convention.
- [probes.md](.claude/rules/probes.md) — probe carry rules, tag separation,
  baseline derivation, grep-scoped removal, probe cleanup.
- [loop-semantics.md](.claude/rules/loop-semantics.md) — loop tick-domain
  semantics, two-gate wall doctrine, stable handle layer, case-exact grep
  rules, loop-specific isolation boundaries.
- [playwright.md](.claude/rules/playwright.md) — shared Playwright harness,
  browser availability, poll-not-sleep, external reference measurement,
  authentication safety, browser proof requirements.
- [validation.md](.claude/rules/validation.md) — targeted validation,
  desktop/emulator/LAN/installed-PWA sequencing, validation attribution,
  required proof artifacts, release-validation matrices.
- [dirty-files.md](.claude/rules/dirty-files.md) — persistent dirty-file
  classification and reporting, protected-file handling, external forensic
  diff preservation, historical partial-revert analysis, targeted recovery
  procedure.
- [runtime.md](.claude/rules/runtime.md) — authoritative dev-server
  ownership, PID/cwd verification, port normalization, duplicate-server
  cleanup, runtime identity reporting, cold-load/song-context checks.
- [security.md](.claude/rules/security.md) — credential hygiene,
  scratch-artifact safety, authenticated browser-state handling,
  secret-safe reporting.
- [test-methodology.md](.claude/rules/test-methodology.md) — test-mechanism
  fidelity to the real product interaction path, positive/negative
  controls, environment fidelity; evidence classification itself is
  `validation-and-evidence.md`'s domain.
- [full-file-integrity.md](.claude/rules/full-file-integrity.md) — full-file
  workflow, new-file workflow, case-specific extraordinary verification and
  its scope, zero-truncation and line-count-integrity requirements,
  interaction-audit procedure, completion attestation.
- [validation-and-evidence.md](.claude/rules/validation-and-evidence.md) —
  canonical evidence taxonomy, required proof and allowed ticket
  consequence per term, prohibited overstatements, validation reporting
  format.
- [alphatab-upstream-contributions.md](.claude/rules/alphatab-upstream-contributions.md)
  — alphaTab live-rule verification, disclosure scope, issue/PR discipline,
  internal-vs-public record separation.
- [source-header-versioning.md](.claude/rules/source-header-versioning.md)
  — what a source-header date means, when it does and does not change,
  authoritative records for validation/commit/deploy/release events.

## Quick-reference trigger table

| If the turn involves... | Read... |
|---|---|
| Staging, committing, or push preparation | `staging.md` |
| `git fetch` or other remote synchronization, or push authorization | `staging.md`, [AGENTS.md §D](./AGENTS.md#d-write-and-state-change-boundaries) |
| A file containing `[...-PROBE]` tags | `probes.md` |
| A probe tuple or probe cleanup | `probes.md` |
| Loop range, tick math, drag walls, or handle rendering | `loop-semantics.md` |
| DOM, screenshot, geometry, browser, or device verification | `playwright.md` |
| Deciding whether a change is validated or release-ready | `validation.md` |
| A protected or persistent dirty file | `dirty-files.md` |
| A restore, partial revert, or recovery investigation | `dirty-files.md` |
| Any local dev-server, port, LAN, or process question | `runtime.md` |
| Credentials, storageState, cookies, sessions, or scratch auth scripts | `security.md` |
| Choosing or defending a test/verification mechanism as valid proof | `test-methodology.md` |
| Editing an existing file, or drafting a genuinely new file, especially production source or a governance file | `full-file-integrity.md` |
| Any test, validation, or evidence claim | `validation-and-evidence.md` |
| Drafting or submitting an alphaTab issue, PR, comment, or review | `alphatab-upstream-contributions.md` |
| Changing or evaluating a source-header date/version field | `source-header-versioning.md` |

When uncertain whether a rule applies, stop and ask. The absence of a rule
does not imply the absence of risk.

## Conflict-stop rule

If CLAUDE.md, AGENTS.md, or a rule file conflict, appear stale, or describe
incompatible procedures: stop before acting, report the exact conflict, do
not choose whichever interpretation is more convenient, and wait for
Brett's clarification or authorization. A rule file may expand a doctrine
rule but may not weaken, bypass, or contradict AGENTS.md or CLAUDE.md.
