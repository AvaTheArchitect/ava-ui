# Test-Methodology Doctrine

Governs when an automated or manual test/verification mechanism is valid
evidence of real product behavior, as opposed to an artifact of the test
mechanism itself.

## Test mechanism must match the product path

A test proves something about the product only to the extent it exercises
the same path a real user would. Before trusting a result, state explicitly
what mechanism produced it and how closely it matches the real interaction:
same event model, same DOM path, same timing characteristics, or an
approximation — and if an approximation, what the approximation might be
masking or fabricating.

## Event-model fidelity

### Touch versus mouse

Touch and mouse are different event models (`touchstart`/`touchmove`/
`touchend` vs. `mousedown`/`mousemove`/`mouseup`, plus pointer events).
Simulating one when the product only handles the other is not a valid test
of touch (or mouse) behavior. State which model a given automated
interaction used.

### Actual event order

Synthetic event dispatch can fire events in an order or grouping a real
device never produces (e.g. missing intermediate `move` events, or firing
`up` before layout has settled). If a result seems to depend on event
timing/order, verify the synthetic sequence matches a real sequence before
trusting it.

### Valid coordinate controls

A synthetic click/tap at a coordinate is only meaningful if that coordinate
is actually inside the intended target at the moment of dispatch. Verify
the coordinate against current DOM geometry (per
[playwright.md](playwright.md)'s DOM-measurement-first discipline) rather
than an assumed or stale layout.

## Positive and negative controls

Pair a test with:

- a **positive control**: a case expected to trigger the behavior, to prove
  the mechanism can detect it at all.
- a **negative control**: a case expected NOT to trigger the behavior, to
  prove a passing positive result isn't just the mechanism matching
  something unrelated (e.g. a selector that matches the whole page).

A result without both is weaker evidence and should be reported as such.

## Beat/target verification

When a test claims interaction with a specific beat, handle, or element,
verify identity independently of the interaction itself (e.g. a
distinguishing attribute or logged identifier read back from the DOM before
and after) — do not infer identity solely from the fact that "some element
responded." See [loop-semantics.md](loop-semantics.md) for the concrete
case-exact grep and stable-handle-layer doctrine this section backs in the
loop/handle domain.

## Hit-testing and event-routing limitations

- `document.elementFromPoint()` returns the topmost hit-test-eligible
  element at a point — it skips elements with `pointer-events: none` and
  can see straight through a layer that is visually present but not
  hit-test-eligible. A hit-test result alone does not prove which element
  a real click would have landed on.
- Combine a hit-test result with: `event.target` and
  `event.composedPath()` from an actual dispatched event, the element's
  *computed* `pointer-events` value (not just its stylesheet rule), which
  handler/listener actually owns the interaction, the portal/overlay
  location the element actually renders into, and its current bounding
  rect — before treating a hit-test claim as settled. Critically,
  `event.target`/`composedPath()` must come from a genuine
  browser-generated input event (a real `click`/`pointerdown`/etc. the
  browser itself dispatched from actual input). Manually calling
  `element.dispatchEvent(...)` on a preselected element does not prove
  coordinate hit ownership and does not reproduce native browser
  targeting — it only proves the element *can* receive that event type
  when told to, which is a different and much weaker claim.
- Portal/overlay/hit-zone elements (modals, tooltips, custom loop handles)
  can sit outside the DOM subtree a naive selector search expects — verify
  the actual render location, not the expected one.

## Fresh-state categories

"Fresh" is not one condition. State explicitly which of these a test
actually used — they are not interchangeable and can produce different
results for the same change:

- **normal reload** — same context, same caches, same service worker.
- **hard refresh** — bypasses the HTTP cache for the navigation request,
  but does **not** guarantee a clean service-worker or cache-storage
  state; an already-registered service worker can still serve cached
  assets through a hard refresh. Do not claim a hard refresh guarantees a
  clean service-worker/cache state.
- **new browser context** — a fresh Playwright context/profile with no
  prior storage, but distinct from explicitly clearing storage in an
  existing context.
- **cleared storage** — `localStorage`/`sessionStorage`/IndexedDB
  explicitly cleared, independent of service-worker state.
- **cleared/unregistered service worker** — the service worker itself
  explicitly unregistered, independent of storage state.
- **installed PWA state** — the standalone-installed app, which can carry
  its own persistent state independent of any browser tab's state.

## Timing

- Timestamps used to reason about ordering or duration should be generated
  inside the browser context under test, not by the automation/reporting
  layer — the two do not share a clock.
- Use one common clock source for any comparison; do not compare a
  timestamp taken in-browser against one taken in the test runner/IPC
  layer and treat the difference as meaningful latency.
- Explicitly separate "app time" (what the product's own code measured)
  from "Playwright/IPC/reporting time" (what the automation layer measured
  around it) in any report — collapsing them can attribute automation
  overhead to the product or vice versa. Automation commands, injected
  page evaluation, instrumentation/logging, screenshots, polling, and
  ordinary browser-process scheduling can all perturb timing or add
  measurement overhead relative to an unobserved real user session — treat
  suspiciously-precise or suspiciously-flaky timing-dependent results with
  that in mind.
- Render, scroll, momentum, and component-lifecycle effects need to settle
  before a measurement is meaningful. Use a pollable readiness condition
  (an expected attribute, rect, or class appearing/stabilizing) — not an
  arbitrary fixed sleep — per [playwright.md](playwright.md)'s
  poll-not-sleep rule.

## Environment fidelity

- **Emulator versus physical device**: Chrome DevTools/Playwright viewport
  emulation approximates layout but not real touch input, iOS Safari
  rendering quirks, or real-device performance. See
  [playwright.md](playwright.md) — emulation never substitutes for physical
  device validation of touch/mobile-specific behavior.
- **Safari LAN versus installed PWA**: Safari over LAN and an installed PWA
  are different runtime contexts (service worker scope, standalone display
  mode, viewport handling). A pass in one is not automatically a pass in
  the other — see [validation.md](validation.md)'s validation sequence.
- **Cursor2 versus Fixed Landscape Cursor**: these are separate mechanisms
  with separate failure modes. A test result about one is not evidence
  about the other unless the test specifically exercised both.

Pair environment-fidelity claims with the runtime identity report in
[runtime.md](runtime.md) — a device test against the wrong server/HEAD
isn't evidence of anything about the intended change.

## Classifying a surprising result

When a test produces a result that contradicts expectation, classify it
before acting on it:

- **confirmed product behavior** — reproduced through a mechanism with
  verified fidelity to the real product path.
- **confirmed test artifact** — traced to a specific fidelity gap in the
  test mechanism itself (wrong event model, stale coordinates, timing
  contamination, etc.).
- **likely product behavior requiring stronger measurement** — plausible,
  but the current mechanism's fidelity isn't strong enough to confirm; state
  what stronger measurement would resolve it.
- **inconclusive** — neither confirmed nor ruled out; say so rather than
  picking one to move forward with.

## Methodology report requirements

A test result is not reported as evidence without stating: the mechanism
used, its fidelity to the real product path (and known gaps), whether
positive/negative controls were used, which fresh-state category applied,
and the classification above if the result was unexpected.
