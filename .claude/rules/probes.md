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
grep -rn '\[MAESTRO-LOOP-004C\.6-PROBE\]' <path>   # before: locate all sites
grep -rn '\[MAESTRO-LOOP-004C\.6-PROBE\]' <path>   # after: confirm zero
```

Do not remove by visual inspection alone, and do not let a broad removal
pass accidentally sweep up a different tag's probe code.

## Probe baseline discipline

Probe inventory is not a fixed list maintained in this file. It is derived
fresh, every time, from current HEAD and the live, authorized working
tree — scoped to approved live source paths only:

```
git grep -n '\-PROBE\]' -- '<approved source path>'
```

`git grep` scopes the search to tracked files by default, which
automatically excludes `node_modules/`, `.claude/worktrees/`, and anything
covered by `.gitignore`. Do not run an unscoped `grep -r` against the repo
root — that can read Local Backup Files (see
[../../CLAUDE.md](../../CLAUDE.md) §6), environment files, or other
forbidden paths as a side effect of the search itself, not because anyone
meant to read them.

If an untracked or `.gitignore`d probe-bearing file also needs checking
(e.g. a working-tree-only experiment), check it as a separately named,
explicitly approved path — never by widening the search to the repo root
or an unscoped recursive grep:

```
grep -n '\-PROBE\]' <explicitly approved untracked path>
```

Either way, honor [security.md](security.md) and
[../../CLAUDE.md](../../CLAUDE.md) §6 (Local Backup Files) restrictions —
do not read a file the search happens to touch if either of those rules
forbids reading it.

Record this search's result as the probe baseline at the start of a ticket
that touches a probe-bearing file, and again at the end, so the delta
(what was added, what was removed) is explicit.

Any historical tag list that appears in a prior chat report, handoff, or
older revision of this file is evidence of what existed at that point in
time — not a current baseline. Do not treat it as current without
re-running the search.

A probe-bearing file that survives into a second ticket without resolution
is also a persistent dirty file — see
[dirty-files.md](dirty-files.md).
