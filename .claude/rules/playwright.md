# Playwright / Verification Harness Doctrine

## Playwright verification harness rule

Claude Code may use Playwright for reproducible DOM/screenshot measurement
of AlphaTab rendering, loop overlay geometry, and related UI behavior. This
is a measurement tool, not a substitute for the validation sequence in
[validation.md](validation.md).

Order of confidence, low to high:

1. **DOM measurement first** — query actual rendered geometry
   (bounding rects, computed styles, attribute values) rather than assuming
   from source.
2. **Screenshot confirmation second** — visual confirmation once DOM
   measurement establishes the numbers are what's expected.
3. **Real-device validation final** — see below; nothing before this step
   is a substitute for it.

## Poll-not-sleep rule

Around AlphaTab render, song load, loop toggles, orientation changes,
strip/page relayout, and viewport transitions, use polled waits for a
readiness condition (e.g. poll for an expected attribute/rect/class to
appear or stabilize), not a fixed `sleep`/timeout.

A fixed sleep that happens to work on one machine/run is not a reliable
readiness gate — these operations have variable timing (font load, layout
engine passes, audio engine init) that a fixed delay cannot account for.

## External reference measurement rule

Scans of external references (e.g. Songsterr) are read-only measurement
only, and only when explicitly authorized for that turn:

- No bypassing paywalls or access controls.
- No scraping or copying protected content.
- No deriving implementation rules from inferred or approximate
  measurements — if a number wasn't directly and reliably measured, it
  does not get encoded as a constant or threshold in this codebase.

## Emulation never replaces iPhone PWA final testing

Chrome DevTools device emulation and Playwright's viewport emulation are
useful for fast iteration but do not reproduce actual iOS Safari/PWA
rendering, viewport quirks, or touch behavior. A change is not considered
device-validated until it has been checked on an actual iPhone PWA install,
per the sequencing in [validation.md](validation.md).
