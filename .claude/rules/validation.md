# Validation Doctrine

## Validation sequence

Validate in this order, and do not skip ahead:

1. **Desktop/local validation first** — the change works in a local dev
   browser session.
2. **Chrome Emulator / Playwright validation second**, when useful — see
   [playwright.md](playwright.md) for the DOM-measurement-first discipline
   this step should follow.
3. **iPhone PWA only after push/Vercel deploy** — real-device PWA testing
   requires an actual deployed build; it is not a step available before
   that point.

## PWA failures before deploy/build refresh are not valid regressions

If the iPhone PWA is showing failing/stale behavior but the fix has not yet
been pushed and deployed (or the PWA install hasn't picked up a refreshed
build), that failure is not evidence the fix is wrong. Confirm deploy state
and build freshness before treating a PWA-observed failure as a regression
to investigate.

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
- **Validation matrix results** — which of desktop / emulator / device
  steps above were actually run, and their outcome, not just "should work."

A rule being written in this doctrine is not itself proof of anything —
only the artifacts above, plus explicit user authorization for any
patch/stage/commit/push step, constitute proof.
