# Staging Doctrine

`.git/info/exclude` is machine-local personal noise control, not project
doctrine. Repo-shared ignore policy belongs in `.gitignore`. Do not use
local excludes in a way that hides project doctrine files from git.

## Scratch-build from HEAD, not dirty working files

When building a scratch copy of a file to patch, base it on `git show
HEAD:<path>`, not on the current dirty working-tree contents. The working
tree may carry local probes, in-progress experiments, or other uncommitted
state that must not silently ride along into a commit.

## Prefer hash-object + update-index --cacheinfo for full scratch-file staging

For a full-file scratch replacement, stage it directly into the index
without touching the working tree first:

```
git hash-object -w <scratch-file>
git update-index --cacheinfo 100644,<blob-sha>,<path>
```

This lets the index be validated (byte-compared) against the intended
scratch content before the working tree is ever overwritten, and before
any commit happens.

## Byte-compare index to validated scratch before commit

Before committing, diff the staged blob against the scratch file that was
reviewed and approved:

```
git cat-file -p :<path> | diff - <scratch-file>
```

No output means an exact match. Do not proceed to commit on a partial or
assumed match — require an actual empty diff.

## Cached diff validation before commit

Run `git diff --cached` (or scoped to the path) and read it before
committing. This is the last read-only checkpoint to confirm the staged
change is exactly the intended change — see [probes.md](probes.md) for the
additional grep-for-probes pass required on probe-bearing files.

## Header reconciliation after scratch-file commits

After a scratch-built file is committed, compare the working-tree file's
header/top-of-file block against the new HEAD's header block for the same
file. Reconcile any divergence immediately — do not let a stale working-tree
header become the base of a future patch. An unreconciled header is a latent
bug: the next scratch-build from HEAD will silently drop whatever the
working tree had that HEAD doesn't.

## Local commit first; push only after explicit push handoff

Commits are local-first. A commit authorization is not a push authorization.
Do not push until the user gives an explicit, separate push handoff for that
push. See [validation.md](validation.md) for what should be true before a
push handoff is reasonable to grant.

## `.LOCKED` / local backup snapshot convention

This repo uses manually-created `*.LOCKED` (and versioned variants like
`*.V102.4.LOCKED`, `*.v1.8.5.LOCKED`) files as local snapshots, e.g.
`BeatCustomLoopOverlay.tsx.V1.8.6.LOCKED`, `AlphaTabRenderer.tsx.V145.LOCKED`.

Rules for these files:

- They exist for Brett's quick VS Code recovery/testing convenience — a fast
  local diff/restore point, not a substitute for source control.
- They are **not** primary source control. Git history plus the
  scratch-staging discipline above is the primary recovery mechanism.
- Do not delete, move, stage, or commit any `.LOCKED` file unless explicitly
  authorized for that specific file on that specific turn.
- Do not treat the existence of a `.LOCKED` file as license to skip the
  scratch-from-HEAD discipline — they serve different purposes and are not
  interchangeable.
