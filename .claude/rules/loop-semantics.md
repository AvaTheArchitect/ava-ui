# Loop Semantics Doctrine

## LOOP-004 tick semantics

The stored loop range is tick-domain, not pixel/visual domain. Treat it as a
half-open interval: `[startTick, endTick)`.

Visual offsets, handle styling, and rendering adjustments must never be
baked into the stored ticks. If a handle needs to render 6px to the left of
its logical tick position, that offset belongs in render/geometry code, not
in the value written to `startTick`/`endTick`. Mixing the two makes the
stored range mean different things depending on which handle last touched
it.

## Two-gate loop wall doctrine

Two distinct gates govern loop-wall collision behavior, and they answer
different questions:

- **`sameRect`** gates the mutual collision wall between drag handles —
  "are these two handles occupying the same rendered rect right now."
- **`sameBar`** gates the metadata shadow wall — "are these two handles
  logically on the same bar, regardless of current rect geometry."

Do not unify these two gates. They are checking different things
(rendered-geometry identity vs. logical-bar identity) and collapsing them
into one condition has previously caused wall behavior to leak across the
wrong boundary.

## Stable handle layer doctrine

Handles must not live inside `rects.map(...)` if rect churn (rects being
recomputed/re-keyed) can cause the handle DOM node to remount. A remounted
handle loses drag-in-progress state and any transient DOM lifetime the
gesture depends on.

The raw pointer/driver value may lead the resolved value only when: the
render path clamps to the last *accepted* geometry (not the raw in-flight
value), and the handle's DOM node has stable lifetime across the rect
churn that clamping is meant to absorb. If either condition doesn't hold,
letting raw lead resolved will visibly glitch.

## Case-exact grep rule

When auditing React state involved in loop/handle behavior, grep for both
the state variable and its setter, case-exact — they can diverge in usage
even when named as a pair.

Example: searching for `activeHandleX` alone can miss call sites that only
invoke `setActiveHandleX`. Always grep both:

```
grep -n 'activeHandleX\|setActiveHandleX' <path>
```

## Test-methodology cross-link

Automated verification of loop/handle behavior (Playwright or otherwise)
must satisfy event-model fidelity — touch vs. mouse, real event order,
valid hit-test coordinates — before its result is treated as proof of
product behavior in this domain. See
[test-methodology.md](test-methodology.md).
