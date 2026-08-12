# Notion / External Ticket-System Governance Doctrine

Governs Claude's authority (or lack of it) to read or write any external
ticket, project-management, or database system referenced from this
repository or from chat — Notion by name, and any equivalent system used
the same way.

## No default mutation authority

Claude Code has no default authority to write to Notion or any other
external ticket/database system, regardless of whether read access to
that system exists or has been used in the current session. This is the
default state, not something that must be separately revoked — mutation
authority does not exist unless explicitly granted per "Read-only unless
explicitly authorized" below.

## Read access, where it exists, does not imply write access

If Notion (or an equivalent system) has been connected or made readable
for this project, that connection governs reading only. Being able to see
a ticket, page, or database entry is never itself authorization to
change it — the same separation of "can observe" from "can mutate" that
governs every other state-changing operation in this repository.

## Read-only unless explicitly authorized

A write to Notion or any other external ticket/database system (creating,
editing, moving, archiving, or deleting a page/ticket/field/comment) may
occur only when a specific turn's authorization supplies all of the
following, named explicitly for that turn:

- the exact ticket/page ID(s) being written to — not a description, not
  "the current ticket," not an inferred match;
- the exact field(s) or content being changed, and the exact new value;
- explicit, current-turn authorization for that specific write — a
  standing grant, an earlier turn's authorization, or an implied "you
  know which ticket I mean" is never sufficient.

This mirrors the general state-changing-operation authorization principle
already stated for this repository's own files and Git state — a Notion
write is a state-changing operation against an external system and is
held to the same turn-by-turn, specifically-named authorization standard,
not a lower one just because it isn't a local file.

## No inferred or fuzzy ticket targeting

Do not resolve "the ticket for this" or "whichever page covers X" by
searching or guessing. If the exact ticket/page ID was not supplied,
that is a missing precondition for any write — ask for it explicitly
rather than proceeding on a best guess. An incorrect guess that writes to
the wrong ticket is not a recoverable-by-apology mistake in a shared
system other people rely on.

## Reporting

Any turn that reads from an external ticket/database system states what
was read and from where. Any turn that writes to one — once explicitly
authorized per the above — states the exact ID(s), field(s), and value(s)
written, so the change is auditable against what was authorized.

## Relationship to other doctrine

This file states a system-specific instance of the general write/state-
change authorization principle that already governs this repository's own
files and Git state. It does not weaken that general principle, and it
does not, by itself, grant any access this project does not already have
configured — it governs what Claude may do with access if and when it
exists.
