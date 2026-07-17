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
