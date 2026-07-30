# Validation Doctrine

## Validation sequence

Validate in this order, and do not skip ahead:

1. **Targeted local/desktop validation** — the change works in a local dev
   browser session, exercising the specific behavior changed plus its
   immediate neighbors.
2. **Chrome Emulator / Playwright validation**, when useful — see
   [playwright.md](playwright.md) for the DOM-measurement-first discipline
   this step should follow, and [test-methodology.md](test-methodology.md)
   for when an automated interaction is trustworthy evidence at all.
3. **Safari LAN on a physical iPhone**, when the change affects touch
   interaction, mobile layout, or mobile-only behavior — emulation is not a
   substitute for this step when touch/mobile fidelity is in question.
4. **Commit and push gates** — see [staging.md](staging.md) for the
   synchronization checks required before a push is authorized.
5. **Vercel deployment verification** — confirm the deployed build actually
   contains the pushed commit before treating deployment as validated.
6. **Installed-PWA smoke** — real-device PWA testing only after the steps
   above; it is not a step available before a fresh deployed build exists.

## PWA failures before deploy/build refresh are not valid regressions

If the iPhone PWA is showing failing/stale behavior but the fix has not yet
been pushed and deployed (or the PWA install hasn't picked up a refreshed
build), that failure is not evidence the fix is wrong. Confirm deploy state
and build freshness before treating a PWA-observed failure as a regression
to investigate.

## Validation attribution

Every validation claim states what it validated and its exact candidate
identity — the form of that identity depends on what's being validated:

- **Committed candidate**: the exact commit hash.
- **Uncommitted WIP**: current HEAD, plus the exact dirty-file list, plus a
  source/diff hash (or equivalent candidate identity) sufficient to
  reproduce exactly what was tested — not just "current working tree."
- **Deployed/PWA candidate**: the exact deployed commit/build, where that's
  observable (e.g. a build/version marker); state explicitly when it isn't
  observable.

A valid pre-commit validation pass does not require an already-existing
commit — uncommitted WIP is a legitimate, common validation target, and it
is identified via the second form above, not skipped or waved through for
lack of a commit hash.

"Validated" without stating which stage above produced it and the
candidate identity above is not a validation claim — it is an assertion.

## Validation performer attribution

Every validation report identifies two independent things: candidate
identity (above) and performer/environment attribution — who or what
actually ran the check, and in what environment. Use explicit labels, e.g.:

- `Claude Code — Playwright Chromium`
- `Brett — Chrome Mobile Emulator`
- `Brett — Safari LAN physical iPhone`
- `Brett — installed PWA`

Claude Code may not claim Safari LAN, physical-device, or installed-PWA
validation that it did not itself execute and directly observe. If Brett
reports having done one of those checks, attribute it to Brett explicitly
— it is his observation, not Claude Code's, and the two are not
interchangeable evidence.

## Runtime identity

Desktop, emulator, and LAN validation all require the runtime-identity
report described in [runtime.md](runtime.md) — server PID, cwd, port, HEAD,
and dirty-file state — before their result is trusted. Visible behavior in
a browser tab is not proof of which server or which commit produced it.

## Fresh versus hydrated state

State explicitly whether a validation pass ran against a hard-refreshed /
new browser context or a session that was already hydrated (existing
service worker, cached bundle, existing app state). These are different
tests and can produce different results for the same change — do not
conflate them. See [test-methodology.md](test-methodology.md) for the full
set of fresh-state categories, since "fresh" is not one condition.

## Cold route versus selected-song state

State explicitly whether validation exercised the cold-load route (no
track/song context yet established) or a state with a song already
selected. A pass in one is not evidence for the other — see
[runtime.md](runtime.md) for the cold-load / No Track / Track 1 of 0
diagnosis this distinction feeds.

## Targeted versus expanded smoke matrices

Default to a targeted matrix: the changed behavior plus its immediate
neighbors, across the stages that are actually relevant to what changed.
Run an expanded matrix (broader feature surface, all stages) only when the
user asks for a release-validation pass or when the change plausibly has
cross-cutting blast radius.

## No console/page errors

A validation pass that produces new console errors, unhandled rejections,
or page-level errors is not a clean pass, even if the targeted behavior
appears to work. Report console/page error state explicitly, not just the
targeted assertion.

## Positive and negative controls

Where practical, pair a validation check with a negative control — a case
that should NOT trigger the new/changed behavior — so a passing positive
result cannot be mistaken for "always true" or "selector matched something
unrelated." See [test-methodology.md](test-methodology.md).

## Explicit environment limitations

If a stage in the sequence above cannot be run this turn (no physical
device available, no deploy yet, no browser tool), state that limitation
explicitly rather than silently skipping the stage or implying it passed.

## Required proof artifacts

A change is not reported as validated without the artifacts that actually
demonstrate it, not a description of them:

- **Command output** — the literal output of the command run, not a
  paraphrase of what it should show.
- **Grep proof** — for probe-free claims, tag-removal claims, or
  state/setter audits (see [probes.md](probes.md), [loop-semantics.md](loop-semantics.md)).
- **Cached diff proof** — `git diff --cached` output showing exactly what
  is staged, per [staging.md](staging.md).
- **Byte-compare proof** — an empty diff between staged content and the
  reviewed scratch file, per [staging.md](staging.md).
- **Runtime identity proof** — server PID/cwd/port/HEAD/dirty-state, per
  [runtime.md](runtime.md).
- **Validation matrix results** — which of the six stages above were
  actually run, against which candidate identity (exact commit; HEAD plus
  dirty-file list and source/diff hashes; or exact deployed build/commit
  where observable — see "Validation attribution" above), and their
  outcome, not just "should work."

A rule being written in this doctrine is not itself proof of anything —
only the artifacts above, plus explicit user authorization for any
patch/stage/commit/push step, constitute proof.

Proof reporting is subordinate to [security.md](security.md). "Command
output — the literal output of the command run" above never means
printing a secret value to satisfy this requirement. If a command's
natural output would expose a credential, token, or session material,
redesign the command to emit only safe status or classification output
(e.g. "auth check: 200 OK" instead of dumping a session cookie) — the
literal-output requirement is satisfied by that redesigned output, not
overridden by it.
