# Playwright / Verification Harness Doctrine

## Shared Playwright harness path

A missing built-in browser tool is not proof that browser validation is
unavailable.

Before downgrading any UI, DOM, screenshot, geometry, cursor, panel, drag, or
mobile/emulator validation to static-only analysis, Claude Code must check the
shared local Playwright harness:

```bash
/private/tmp/maestro-playwright-shared/
```

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

## Runtime identity before evidence

Before any Playwright result is presented as evidence, report the browser
used, target URL, port, dev-server PID and cwd, current HEAD commit, and
current dirty-file status of the code under test. See
[runtime.md](runtime.md) for how that identity is established and
verified — this file does not duplicate that procedure.

A Playwright result gathered against an unidentified, stale, or wrong-repo
server is not valid evidence of anything.

## Credential and session safety

Do not create, persist, or reuse authenticated storageState, cookies, or
session tokens in the shared harness directory, this repo, or any scratch
script. See [security.md](security.md) for full credential-handling
doctrine — this file does not duplicate that procedure.

## Test-mechanism fidelity

A Playwright interaction is not automatically equivalent to the real
product interaction path. Event model (touch vs. mouse), coordinate
validity, and timing must match before a result is treated as proof of
product behavior. See [test-methodology.md](test-methodology.md).

## Validation attribution

A Playwright pass satisfies, at most, the emulator/Playwright stage of the
validation sequence — never the full sequence by itself. State explicitly
which stage(s) in [validation.md](validation.md) a given Playwright run
actually satisfies.
