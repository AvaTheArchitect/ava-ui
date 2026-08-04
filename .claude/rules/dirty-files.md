# Dirty-File Doctrine

Governs any file that is locally modified (dirty) relative to HEAD and is
not the direct, current subject of the active ticket. This includes, in
particular, a **persistent dirty file** — one that survives from one
ticket into a second ticket without resolution. A persistent dirty file
may not remain semantically unknown across those tickets; it must be
classified per this file, not merely re-noted.

## Persistent dirty-file classification

A dirty file that survives from one ticket into a second ticket must be
classified, not just noted. Re-noting `M path/to/file` alone, with no
further content, is not sufficient. At minimum, also report:

- what the dirty diff changes semantically, not just which lines moved
  (see "Semantic diff summary" below);
- whether it shadows currently committed runtime behavior;
- which classification below it has been assigned.

Classify each persistent dirty file as one of:

- **known intentional work** — Brett has stated what it is and that it
  should stay dirty.
- **unknown local experiment** — no record of what it is or why it's dirty.
- **obsolete or regressive work** — appears to undo or conflict with
  committed behavior without a known reason.
- **required protected WIP** — actively needed, must not be touched.
- **mixed historical reversion and new WIP** — partially reverts committed
  behavior while also carrying new, apparently intentional changes.

If a restoration decision might follow the classification, an external
forensic copy is created before that decision — but only after separate
authorization for that specific external write; classification and audit
do not by themselves authorize it (see "External forensic diff
preservation" below). Do not restore, discard, stage, or commit a
persistent dirty file based on classification alone — see "No action
without separate authorization" below.

## Protected-file handling

A file classified as required protected WIP, or any file Brett has marked
protected, may not be read-modified, restored, staged, or discarded without
separate turn-specific authorization.

Read-only diff inspection is not automatically permitted just because this
file governs dirty-file handling — it is allowed only when the current
turn's scope permits it and no stronger rule forbids it. In particular:

- If the file matches a Local Backup File pattern (see
  [../../AGENTS.md §D](../../AGENTS.md#d-write-and-state-change-boundaries)),
  the backup-file rule's "do not read unless Brett explicitly asks"
  restriction overrides this file's general audit allowance.
- If the file plausibly contains credential or session material,
  [security.md](security.md)'s restrictions override this file's general
  audit allowance.

When neither restriction applies, read-only diff inspection for
classification purposes is permitted.

## Semantic diff summary

For every persistent dirty file, summarize in plain language:

1. What behavior the diff changes (not just which lines).
2. Whether the diff shadows or contradicts currently committed runtime
   behavior — i.e., would a user see different behavior from HEAD than from
   the dirty working tree.

## External forensic diff preservation

Creating an external forensic snapshot is a file write, even though it
lands outside the repository — it requires the same turn-specific
authorization as any other write, per
[../../AGENTS.md §D](../../AGENTS.md#d-write-and-state-change-boundaries).
It is not implied by permission to audit or classify the file.

Once authorized, before any restoration, discard, or recovery decision
touches a persistent dirty file, preserve it outside the repository:

```
cp <path> <external-path>/<basename>.snapshot
git diff HEAD -- <path> > <external-path>/<basename>.diff-vs-HEAD.snapshot
shasum -a 256 <external-path>/<basename>.snapshot
wc -l <external-path>/<basename>.snapshot
```

Report the external path, SHA-256, and line count for both the snapshot and
the diff. Also record the current source file's own hash
(`shasum -a 256 <path>`) so a later comparison can prove whether the working
tree changed again between preservation and any subsequent action.

## No action without separate authorization

Do not restore, discard, stage, or commit a persistent dirty file based on
its classification alone. Classification informs the recommendation;
authorization for the actual state-changing operation is separate, per
[../../AGENTS.md §D](../../AGENTS.md#d-write-and-state-change-boundaries).

## Historical partial-revert fingerprinting

When a dirty file appears to partially revert a prior fix, establish the
fingerprint before concluding anything:

1. Identify the fix commit(s) that introduced the behavior the dirty file
   appears to undo:
   ```
   git log --oneline -- <path>
   git log -p --all -S '<distinctive token from the reverted behavior>' -- <path>
   ```
2. Diff the exact fix-commit transition against the current dirty diff:
   ```
   git diff <fix-commit>^ <fix-commit> -- <path>
   git diff HEAD -- <path>
   ```
   If `<fix-commit>` is a merge commit, `^` alone is ambiguous — first
   identify its parents (`git show <fix-commit> --format='%P' -s`) and
   pick the specific parent that represents the pre-fix state explicitly
   (`<fix-commit>^1`, `<fix-commit>^2`, ...) rather than relying on the
   default.
3. Check directional sign correlation — does the dirty diff move the same
   lines in the *opposite* direction from the fix commit, or does it touch
   unrelated lines that only coincidentally overlap?
4. Use pickaxe search across all refs, not just the current branch, in case
   the reverted behavior was reintroduced or removed on another branch:
   ```
   git log --all -p -S '<token>' -- <path>
   ```

## Subsystem-by-subsystem classification

For a dirty file spanning multiple subsystems or concerns, classify each
hunk/region independently using this finer-grained set (distinct from, and
more specific than, the whole-file categories in "Persistent dirty-file
classification" above):

- **exact historical reversion** — this region exactly reproduces a prior,
  now-superseded version of the code.
- **partial historical reversion** — this region moves some but not all
  lines back toward a prior version.
- **structurally similar older architecture** — resembles an earlier
  approach without being a literal revert (e.g. independently rewritten
  toward a pattern the codebase already moved away from).
- **known intentional WIP** — Brett has stated what this region is.
- **unknown experiment** — no record of what this region is or why.
- **inconclusive** — the evidence doesn't clearly support any of the
  above.

After classifying each region, provide an aggregate whole-file
classification (using the categories in "Persistent dirty-file
classification") for reporting purposes — but the aggregate is a summary,
not a replacement for the subsystem-level detail. A file classified
overall as "mixed historical reversion and new WIP" should still show
which specific regions are which. A file can simultaneously carry required
protected WIP in one region and obsolete experimentation in another.

## Targeted recovery procedure

Targeted recovery of specific hunks/regions is the default when unrelated
WIP in the same file must survive:

1. Recovery is always scratch-built from current HEAD for the file
   (per [staging.md](staging.md)), never from the dirty working copy.
2. Recovery is targeted to the specific hunks/regions authorized —
   whole-file overwrite is not the default.
3. Any unrelated dirty region in the same file that was not part of the
   authorized recovery must be preserved exactly as it was; confirm this
   with a pre/post byte comparison of that region.
4. After recovery, byte-compare the result against the intended target
   (HEAD, or the specific hunk source) — an empty diff is the required
   proof, not a visual read.

Whole-file restoration from HEAD is a separate, explicitly allowed path —
not a fallback taken by default — and requires all three of:

- explicit authorization naming whole-file restoration specifically (not
  just "recovery" in general),
- an external forensic snapshot taken first, per the preservation section
  above,
- byte/diff verification of the result against HEAD after restoration.

Use it only when Brett has confirmed no unrelated WIP in the file needs to
survive, or has explicitly accepted the loss of specific unrelated regions.

## Recovery report requirements

A recovery is not reported complete without:

- the external forensic snapshot path/hash/line-count taken before the
  change,
- the classification assigned to the file (and per-hunk, if split),
- whether the recovery was targeted (hunk-scoped) or whole-file, and why,
- the exact scope of what was recovered vs. preserved,
- the pre/post byte comparison showing preserved regions are unchanged,
- explicit confirmation of the authorization that covered the operation.
