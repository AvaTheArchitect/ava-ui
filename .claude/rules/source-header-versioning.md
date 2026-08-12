# Source-Header Versioning Doctrine

## A. Purpose

Source headers (a version and/or date marker at the top of a production
source file, where present) are a human convenience for skimming a file's
recency — not a substitute for Git history, and not authoritative for
anything Git or another system-of-record already answers definitively.
This file defines what a header's fields mean so they stop drifting
against the events people informally associate them with.

## B. Version Field

A source-header version field, where a file already carries one, changes
only when Brett authorizes a version bump for that file, following
whatever versioning convention that specific file already uses. Do not
invent a new version-numbering format for a file that doesn't already have
one — if a file has no existing version-header convention, do not add one
speculatively; that is a documentation change requiring its own
authorization per [../../AGENTS.md §D](../../AGENTS.md#d-write-and-state-change-boundaries).

## C. Date Field

A source-header date means exactly one thing:

**The date the production source content was last intentionally modified.**

## D. Date Does Not Change For

Do not update a source-header date solely because of:

- validation (running tests or a manual check against the file);
- staging (adding the file to the index);
- commit creation;
- push;
- deployment;
- release;
- ticket closure;
- documentation changes outside the production file itself.

Each of these has its own authoritative record (§F) — none of them is a
modification to the production source content, so none of them moves this
date.

## E. Date Does Change For

- an authorized production-source modification to the file's actual
  content;
- a correction to the production file itself (a bug fix, a behavior
  change, a rewritten function);
- an authorized correction to the source header when the header itself was
  found to be wrong (e.g. it was never updated for a real prior change) —
  this is itself a source modification and requires the same
  turn-specific authorization as any other patch.

## F. Authoritative Records

Do not let a source header substitute for, or be treated as more
authoritative than, the actual record for a given kind of event:

- **Git** remains authoritative for commit identity, authoring history,
  diff content, and commit timestamp — use `git log` / `git blame` /
  `git show`, not a header date, when the question is "what changed and
  when was it committed."
- **Validation records** (this turn's report, or a stored validation
  artifact) remain authoritative for testing date, validation environment,
  and pass/fail result — see
  [validation-and-evidence.md](validation-and-evidence.md).
- **Deployment records** (Vercel build identity, deployed commit) remain
  authoritative for deployment date and deployed commit — see
  [validation.md](validation.md)'s deployment-verification step.
- **Ticket records** (Cipher's board, chat history) remain authoritative
  for investigation status, closure date, and residual open issues.

A source-header date answering "when was this file's content last
intentionally touched" is a different, narrower question than any of the
above, and should not be read as answering them.

## G. Mismatch Handling

Do not silently change a source-header date during a commit or push
operation just because the operation is happening. If a header's date
appears stale, wrong, or ambiguous relative to what the file's content
actually shows:

1. Report the apparent mismatch.
2. Determine whether the production source was actually modified (check
   `git log`/`git diff` for the file, not just the header's own claim).
3. Request authorization before changing the header — a stale header is a
   latent inaccuracy, not an emergency that justifies an unauthorized
   correction.

## H. History Discipline

Do not alter unrelated historical header entries while touching a file for
an unrelated reason. Do not rewrite historical dates to match the current
date — a header correction (§E) fixes a specific wrong date to the date
that content actually last changed; it never means "set every date in this
file's history to today."

## I. Header Value Under Review

Given that Git already answers every question in §F authoritatively and
without manual-maintenance drift risk, hand-maintained source headers may
later be simplified or removed under a separate, explicitly authorized
doctrine or refactor ticket. Until that ticket happens, headers where they
already exist remain in force under §C–§H above — this file does not
itself authorize removing or simplifying any header.

## J. Evidence Standard for a Header Date

- Do not invent a historical source-modification date. If the exact date a
  file's production content was last intentionally modified is not known,
  do not fill the header with a plausible-looking guess.
- A correction to a header date (§E) requires supporting evidence — Git
  history for the file (`git log -- <path>`) or a ticket record that
  establishes when the content actually changed — not a visual guess at
  what "looks about right."
- If the exact date cannot be established from Git or ticket evidence,
  report the uncertainty explicitly and leave the header unchanged pending
  Brett's decision, rather than writing an unverified date to close the
  question.

## K. Scope — Governance Files Carry No Header

This file's date-field doctrine (§C–§J) governs source headers in
production source files — files that already carry, or could carry, a
hand-maintained version/date marker at the top of the file. It does not
require, and does not apply to, `AGENTS.md`, `CLAUDE.md`, or any
`.claude/rules/*.md` governance file.

Governance files intentionally carry no version or date header field.
`git log -- <path>` and `git blame -- <path>` are the system of record for
when a governance file's content last changed, who changed it, and what
changed — the same authoritative-records principle §F already applies to
production source, extended here explicitly to governance files so the
absence of a header on those files is not mistaken for an oversight.

If a future doctrine turn decides governance files should carry a
lightweight human-readable marker for skimmability (distinct from, and
never a substitute for, the Git record above), that is itself a doctrine
change requiring the same authorization as any other amendment to this
file — it is not authorized by this section.
