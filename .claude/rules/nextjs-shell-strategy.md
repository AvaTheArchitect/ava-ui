# Next.js Shell Strategy Doctrine

Governs the architectural approach for player-shell work touching a
player route's top-level structure — specifically the choice between
modifying that route's own, route-owned `page.tsx` in place and migrating
structure into a shared `src/app/layout.tsx`.

This repository has many route-owned `page.tsx` files (one per route under
`src/app/`, e.g. `src/app/synth-player/page.tsx` for the synth-player
route). This file governs work on whichever `page.tsx` is the *active,
route-owned* file for the player surface being worked on. It never means
the root `src/app/page.tsx` specifically — the root file is not
necessarily, and is not assumed to be, the player owner. Confirm the
correct route-owned `page.tsx` for the current task before applying this
doctrine.

## Preferred strategy: route-owned page.tsx hoisting/flattening

For player-shell work, hoisting or flattening structure within the active
route-owned `page.tsx` — for example `src/app/synth-player/page.tsx` when
that is the current synth-player route owner — is the preferred,
lower-risk strategy. It keeps the change scoped to that route's own file,
avoids altering behavior shared across other routes, and keeps the blast
radius contained to the component(s) actually being worked on —
consistent with
[../../AGENTS.md §D](../../AGENTS.md#d-write-and-state-change-boundaries)'s
one-change-objective-per-turn rule and
[../../AGENTS.md §F](../../AGENTS.md#f-file-and-module-separation)'s
module-separation principle.

Default to this strategy whenever player-shell work can be accomplished
without touching `layout.tsx`.

## layout.tsx migration is fallback only

Migrating structure into `layout.tsx` is a fallback, used only when
route-owned-`page.tsx`-scoped hoisting/flattening genuinely cannot achieve
the required result. Because `layout.tsx` affects every route that shares
it, not just the player route, this is a higher-blast-radius change and
requires explicit, turn-specific architecture authorization before any
work begins — not just ordinary edit authorization for the file. State,
before starting:

- why route-owned-`page.tsx`-scoped hoisting/flattening was insufficient;
- exactly which other routes share the affected `layout.tsx` and how they
  are expected to be affected, if at all;
- the specific architecture authorization being relied on, distinct from
  ordinary source-modification authorization under
  [../../AGENTS.md §D](../../AGENTS.md#d-write-and-state-change-boundaries).

## Relationship to other doctrine

This file states a strategy preference for a specific architectural
choice; it does not change the authorization, evidence, or validation
requirements that already govern any source edit — those remain governed
by [../../AGENTS.md §D](../../AGENTS.md#d-write-and-state-change-boundaries),
[full-file-integrity.md](full-file-integrity.md), and
[validation.md](validation.md) exactly as for any other change.
