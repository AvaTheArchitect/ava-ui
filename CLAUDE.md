# Maestro Doctrine

This file is guidance and context for Claude Code, not an enforcement
mechanism.

A rule appearing below is not proof that it was followed on any given turn.

Compliance is proven only through direct evidence such as:

- command output
- Git ref verification
- grep proof
- cached or scratch-index diff proof
- file hashes
- byte comparison
- tree-hash comparison
- browser/runtime evidence
- validation reports
- explicit current-turn user authorization

Never claim compliance merely because the rule is written down.

This file is the Maestro constitution: short trigger-level rules and an index
into `.claude/rules/` for detailed procedure.

It does not track board state, active tickets, current dirty files, probe
counts, commit queues, or temporary lane assignments.

---

## 1. Authorization rule

No patch, file write, stage, commit, push, restore, reset, cleanup, process
termination, or other state-changing operation may occur without explicit
turn-by-turn authorization for that specific operation.

Authorization does not carry forward between turns.

Separate authorization is required for:

- source modification
- diagnostic probe modification
- restoring or discarding a file
- staging
- committing
- pushing
- deleting or sanitizing files
- starting development servers
- stopping development servers
- restarting development servers
- modifying repository configuration
- modifying dependencies
- modifying documentation

Commit authorization does not imply push authorization.

Push authorization must be explicit and current.

If live repository state differs from the state described in the
authorization, stop and report before acting.

---

## 2. Scope hygiene

This file contains doctrine only.

Do not place the following in `CLAUDE.md`:

- current board state
- active ticket queues
- temporary lane assignments
- current commit hashes
- current branch-ahead counts
- investigation-specific findings
- current dirty-file lists
- temporary probe tags or probe tuples
- release status
- deployment status

Cipher owns the active board and operational docket in chat.

If a rule references a ticket family as an example, that is a stable naming
convention and not proof that the ticket is currently open.

---

## 3. Doctrine hierarchy

`CLAUDE.md` is authoritative for:

- authorization boundaries
- scope separation
- evidence standards
- state-changing-operation triggers
- which procedural rule file must be read

Files under `.claude/rules/` are authoritative for the detailed execution
procedure after the relevant trigger fires.

A rule file may expand a doctrine rule, but it may not weaken, bypass, or
contradict `CLAUDE.md`.

If `CLAUDE.md` and a rule file conflict, appear stale, or describe
incompatible procedures:

1. Stop before acting.
2. Report the exact conflict.
3. Do not choose whichever interpretation is more convenient.
4. Wait for Brett's clarification or authorization.

Do not duplicate full procedures in both locations. `CLAUDE.md` should retain
only enough detail to identify the risk and trigger the correct rule file.

---

## 4. One behavioral variable

A single turn changes one kind of thing.

Do not combine:

- audit-only work
- probe-only work
- structural-only work
- behavior patches
- documentation-only work
- cleanup work
- recovery or restoration work
- staging or commit work
- push or deployment work

Definitions:

- Audit-only: read-only investigation; no writes.
- Probe-only: diagnostic logging or measurement; no behavior change.
- Structural-only: files or scaffolding; no product behavior change.
- Behavior patch: feature or bug fix.
- Documentation-only: doctrine, comments, manuals, or README changes.
- Cleanup-only: probe removal, dead-code removal, or artifact cleanup.
- Recovery-only: targeted restoration of known-good state.
- Commit-only: staging and committing an already reviewed candidate.
- Push-only: publishing an already reviewed commit stack.

If a request mixes these categories, identify the conflict before acting.

---

## 5. Evidence and live-state rule

Prior chat reports and earlier command output are context, not current proof.

Before any state-sensitive operation, re-check the live state directly.

Direct, current evidence outranks memory, theory, and stale handoffs. That is
not the same as a fixed ranking between evidence *types*:

- Source bytes, Git object/tree state, runtime/process state, and
  browser/device observation each answer a different question. Weight them
  by the specific claim being tested, not a universal order — a claim about
  what's committed is not best settled by a browser screenshot, and a claim
  about rendered behavior is not best settled by reading source alone.
- Evidence is only as good as the mechanism that produced it. Command
  output from the wrong server, or a browser interaction whose event model
  or coordinates were never verified, is not valid evidence just because it
  is "current." See
  [.claude/rules/test-methodology.md](.claude/rules/test-methodology.md)
  for mechanism-fidelity requirements before any evidence — automated or
  manual — is treated as proof.

Never substitute theory from Claude, Sonnet, Gemini, Fable, Google AI, prior
Cipher sessions, or earlier logs for direct evidence when the repository or
runtime can be inspected.

Separate findings into:

- confirmed
- likely
- needs verification

Do not declare a root cause without evidence from source, Git history,
runtime traces, browser observations, or reproducible behavior.

---

## 6. Local backup files

The repo may contain local backup files created by Brett or prior sessions —
patterns such as `*.Backup-*`, `*.backup`, `*.bak`, `*.LOCKED*`, `*.old`,
`*.tmp`, `*.copy`.

These are local safety artifacts only. They are never source of truth.

- Do not read them unless Brett explicitly asks.
- Do not modify, stage, commit, delete, reset, or clean them.
- Do not compare against them unless Brett explicitly asks.
- Use only live source files and HEAD/origin/main as source of truth.

See [.claude/rules/staging.md](.claude/rules/staging.md) for the `.LOCKED`
snapshot convention.

Live source and current Git state (HEAD/origin/main) are the source of
truth for *current* behavior. This does not prohibit inspecting historical
commits or other refs when explicitly required for authorized Git
forensics (e.g. the partial-revert fingerprinting in
[.claude/rules/dirty-files.md](.claude/rules/dirty-files.md)) — that is
investigating the past on purpose, not substituting it for current state.

### Staging boundary

Never stage with `git add .`, `git add -A`, `git add -u`, or directory
staging. Stage only explicit, individually authorized files by exact path.
See [.claude/rules/staging.md](.claude/rules/staging.md) for the full
procedure.

---

## 7. Detailed procedure — see `.claude/rules/`

This file states the trigger.

The linked rule file states the full procedure.

- [.claude/rules/staging.md](.claude/rules/staging.md)
  - scratch-index construction
  - hash-object/update-index procedure
  - exact staging
  - candidate tree comparison
  - commit verification
  - asynchronous push-state synchronization
  - `.LOCKED` backup convention

- [.claude/rules/probes.md](.claude/rules/probes.md)
  - probe carry rules
  - tag separation
  - baseline derivation
  - grep-scoped removal
  - probe cleanup

- [.claude/rules/loop-semantics.md](.claude/rules/loop-semantics.md)
  - Loop tick-domain semantics
  - two-gate wall doctrine
  - stable handle layer
  - case-exact grep rules
  - Loop-specific isolation boundaries

- [.claude/rules/playwright.md](.claude/rules/playwright.md)
  - shared Playwright harness
  - browser availability
  - poll-not-sleep
  - external reference measurement
  - authentication safety
  - browser proof requirements

- [.claude/rules/validation.md](.claude/rules/validation.md)
  - targeted validation
  - desktop, emulator, LAN, and installed-PWA sequencing
  - validation attribution
  - required proof artifacts
  - release-validation matrices

- [.claude/rules/dirty-files.md](.claude/rules/dirty-files.md)
  - persistent dirty-file classification
  - protected-file handling
  - external forensic diff preservation
  - historical partial-revert analysis
  - targeted recovery procedure

- [.claude/rules/runtime.md](.claude/rules/runtime.md)
  - authoritative dev-server ownership
  - PID and working-directory verification
  - port normalization
  - duplicate-server cleanup
  - runtime identity reporting
  - cold-load and song-context checks

- [.claude/rules/security.md](.claude/rules/security.md)
  - credential hygiene
  - scratch-artifact safety
  - authenticated browser-state handling
  - secret-safe reporting

- [.claude/rules/test-methodology.md](.claude/rules/test-methodology.md)
  - test-mechanism fidelity to the real product interaction path
  - positive/negative controls
  - environment fidelity (emulator vs. physical device)
  - result classification

---

## 8. Quick-reference trigger table

| If the turn involves...                                               | Read...               |
| ------------------------------------------------------------------------ | ------------------------ |
| Staging, committing, or push preparation                               | `staging.md`           |
| Remote synchronization or push authorization                           | `staging.md`           |
| A file containing `[...-PROBE]` tags                                   | `probes.md`            |
| A probe tuple or probe cleanup                                         | `probes.md`            |
| Loop range, tick math, drag walls, or handle rendering                 | `loop-semantics.md`    |
| DOM, screenshot, geometry, browser, or device verification             | `playwright.md`        |
| Deciding whether a change is validated or release-ready                | `validation.md`        |
| A protected or persistent dirty file                                   | `dirty-files.md`       |
| A restore, partial revert, or recovery investigation                   | `dirty-files.md`       |
| Any local dev-server, port, LAN, or process question                   | `runtime.md`           |
| Credentials, storageState, cookies, sessions, or scratch auth scripts  | `security.md`          |
| Choosing or defending a test/verification mechanism as valid proof     | `test-methodology.md`  |

When uncertain whether a rule applies, stop and ask.

The absence of a rule does not imply the absence of risk.

---

## 9. Persistent dirty-file trigger

A protected dirty file may not remain semantically unknown across multiple
tickets.

If a dirty file survives into a second ticket:

1. Inspect its diff read-only, only when the current task permits that
   inspection and no stronger Local Backup File or security restriction
   forbids it.
2. Summarize the major behavior it changes.
3. Determine whether it shadows committed runtime behavior.
4. Classify it as:
   - known intentional work
   - unknown local experiment
   - obsolete or regressive work
   - required protected WIP
   - mixed historical reversion and new WIP
5. If a restoration decision might follow, an external forensic copy is
   created before that decision — but only after separate authorization
   for that specific external write; classification and audit do not by
   themselves authorize it.
6. Record the external path, hash, and line count once one is authorized
   and created.
7. Do not restore, discard, stage, or commit it without separate
   authorization.

Do not report only:

```text
M path/to/file
```

At minimum, also report:

- what the dirty diff changes semantically, not just which lines moved,
- whether it shadows currently committed runtime behavior,
- that detailed procedure lives in
  [.claude/rules/dirty-files.md](.claude/rules/dirty-files.md), not here.

Historical probe inventories and tag tuples quoted in a prior report or
handoff are evidence of what existed at that point in time — never a
current baseline. Current probe state is derived from HEAD and the live,
authorized working tree at the time it's needed, per
[.claude/rules/probes.md](.claude/rules/probes.md).
