# Maestro Doctrine

This file is guidance and context for Claude Code, not an enforcement mechanism.
A rule appearing below is not proof that it was followed on any given turn.
Compliance is proven only by: command output, grep proof, cached diff proof,
byte-compare proof, validation reports, and explicit user authorization —
never by "the rule is written down."

This file is the constitution: short, trigger-level rules and an index into
`.claude/rules/` for procedure. It does not track board state, ticket queues,
or lane assignments — see Scope Hygiene below.

## 1. Authorization rule

No patch, stage, commit, push, or write operation happens without explicit
turn-by-turn authorization for that specific turn. Authorization on one turn
does not carry forward to the next.

Push is a separate authorization from commit. A commit handoff does not
imply a push handoff. Push requires its own explicit handoff.

## 2. Scope hygiene

This file contains doctrine only:

- No current board state.
- No active ticket queue.
- No temporary lane assignments.
- No investigation-specific detail (ticket numbers, probe tags in flight,
  which file is currently dirty).

Cipher owns the active board/docket in chat, not this file. If a rule below
references a ticket family (e.g. LOOP-004) as an example, that is a stable
naming convention, not a claim that ticket is currently open.

## 3. One behavioral variable

A single turn changes one kind of thing. Do not combine:

- Audit-only turns (read-only, no writes)
- Probe-only turns (diagnostic logging added/removed, no behavior change)
- Structural-only turns (files/scaffolding, no logic change)
- Behavior patches (the actual fix/feature)
- Docs-only turns (this doctrine, comments, README)
- Cleanup turns (probe removal, dead code removal)

If a turn's request would mix two of these, flag the mixing before acting.

## 4. Detailed procedure — see `.claude/rules/`

This file states the trigger; the linked file states the procedure.

- [.claude/rules/staging.md](.claude/rules/staging.md) — scratch-build from
  HEAD, hash-object/update-index staging, byte-compare, header reconciliation,
  commit-then-push-handoff, `.LOCKED` backup convention.
- [.claude/rules/probes.md](.claude/rules/probes.md) — probe carry rules,
  tag separation, grep-scoped removal.
- [.claude/rules/loop-semantics.md](.claude/rules/loop-semantics.md) —
  LOOP tick-domain semantics, two-gate wall doctrine, stable handle layer,
  case-exact grep rule.
- [.claude/rules/playwright.md](.claude/rules/playwright.md) — Playwright
  verification harness, poll-not-sleep, external reference measurement.
- [.claude/rules/validation.md](.claude/rules/validation.md) — validation
  sequencing (desktop → emulator → device) and required proof artifacts.

## 5. Quick-reference trigger table

| If the turn involves...                          | Read...                          |
|----------------------------------------------------|-----------------------------------|
| Staging/committing any scratch or patched file      | staging.md                        |
| A file that currently carries `[...-PROBE]` tags    | probes.md                         |
| Loop range, tick math, drag walls, handle rendering | loop-semantics.md                 |
| Any DOM/screenshot/device verification              | playwright.md                     |
| Deciding whether a fix is validated/ready            | validation.md                     |

When in doubt about whether a rule applies, ask rather than assume the
absence of a rule means the absence of risk.

## 6. Browser / Playwright availability

Claude Code may not have a built-in browser tool in every session. That does
not automatically make DOM, screenshot, or interaction validation impossible.

For any turn involving live UI, DOM geometry, screenshots, panel behavior,
cursor behavior, drag behavior, or mobile/emulator validation:

1. First check whether terminal-based Playwright validation is available.
2. Check the repo rules in `.claude/rules/playwright.md`.
3. Check the shared Playwright harness location if referenced there.
4. Report the active validation method, active directory, commit, port, local
   URL, and LAN URL before claiming live validation coverage.

Do not silently downgrade a requested live validation to static-only analysis
just because no built-in browser tool is present.

If Playwright or browser validation is truly unavailable after checking, state
that limitation explicitly and ask whether to proceed with static audit only
or pause for a validation-capable session.

## 7. Local Backup Files

The repo may contain local backup files created by Brett or prior Claude
Code sessions.

Files matching patterns like:

- `*.Backup-*`
- `*.backup`
- `*.bak`
- `*.LOCKED*`
- `*.old`
- `*.tmp`
- `*.copy`

are local safety artifacts only.

They must not be treated as source of truth.

Rules:

- Do not read backup files unless Brett explicitly asks.
- Do not modify backup files.
- Do not stage backup files.
- Do not commit backup files.
- Do not delete, reset, or clean backup files.
- Do not compare against backup files unless Brett explicitly asks.
- Use only live source files and HEAD/origin/main as source of truth.

### Staging rule

Never use:

```
git add .
git add -A
git add <directory>
```

Stage only explicit approved files by exact path.
