# Probe Doctrine

## Probes remain unstaged/uncommitted unless explicitly approved

A "probe" is read-only diagnostic code (typically gated behind a
localStorage flag or similar, logging primitives only — never object
references) added to investigate a specific behavior. Probes are local
working-tree state by default. They are not staged and not committed unless
the user explicitly approves committing that specific probe.

## Scratch-build from HEAD while probes exist

While a file carries one or more active probes, any patch touching that file
must still scratch-build from HEAD per [staging.md](staging.md) — not from
the probe-carrying working tree — so the probe code does not silently leak
into the scratch base for an unrelated behavior patch.

## Cached diff must be grep-proven probe-free before commit

Before committing a patch to a probe-bearing file, grep the cached diff for
probe markers and confirm zero matches (unless the probe itself is the
explicitly authorized subject of that commit):

```
git diff --cached -- <path> | grep -n 'PROBE'
```

An empty result is the proof required — not a visual scan of the diff.

## Probe tag separation rule

Every new probe investigation gets its own tag. Do not reuse an existing
tag for a new investigation, even a related one.

Example: `[MAESTRO-LOOP-004C.6-PROBE]` and `[MAESTRO-LOOP-004D.4-PROBE]` are
different investigations and must not collapse into one tag, even though
both concern loop handles.

## Removal triggers are grep-scoped by tag

When a probe is ready for removal, scope the removal to its exact tag via
grep, and verify the tag is fully gone afterward:

```
grep -rn '\[MAESTRO-LOOP-004C6-PROBE\]' <path>   # before: locate all sites
grep -rn '\[MAESTRO-LOOP-004C6-PROBE\]' <path>   # after: confirm zero
```

Do not remove by visual inspection alone, and do not let a broad removal
pass accidentally sweep up a different tag's probe code.

## Known current probe inventory note

At the time this doctrine was written, local working-tree state may include
multiple probe families in `BeatCustomLoopOverlay.tsx`, such as:

- `[MAESTRO-LOOP-004C.1b-PROBE]`
- `[MAESTRO-LOOP-004C.6-PROBE]`
- `[MAESTRO-LOOP-004D.4-PROBE]`
- `[MAESTRO-LOOP-004D.4b-PROBE]`

This is **not** active board state and should not be treated as a current
task list — it is a caution that any future cleanup pass must inventory all
probe families present at that time (via grep, not memory) before removing
any of them, since this list will go stale.
