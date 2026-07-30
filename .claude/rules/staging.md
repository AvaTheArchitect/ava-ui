# Staging Doctrine

`.git/info/exclude` is machine-local personal noise control, not project
doctrine. Repo-shared ignore policy belongs in `.gitignore`. Do not use
local excludes in a way that hides project doctrine files from git.

## Scratch-build from HEAD, not dirty working files

When building a scratch copy of a file to patch, base it on `git show
HEAD:<path>`, not on the current dirty working-tree contents. The working
tree may carry local probes, in-progress experiments, or other uncommitted
state that must not silently ride along into a commit.

## Never use broad staging commands

Never stage with:

```
git add .
git add -A
git add -u
git add <directory>
```

These stage by directory or by "everything changed," which can silently
pull in probe code, backup files, unrelated dirty files, or other
uncommitted state that was never reviewed for this specific commit.

Stage only by exact file path, and only files that were explicitly
reviewed and explicitly authorized for staging on the current turn.

## Preserve file mode

Do not hardcode `100644` for every file. Derive the intended mode from
HEAD (or from the explicitly reviewed candidate, if the file is new)
before staging:

```
git ls-tree HEAD -- <path>
```

This reports the current mode as the first field (`100644` regular,
`100755` executable, `120000` symbolic link). Use that mode in
`--cacheinfo`, not a hardcoded default — silently dropping an executable
bit or symlink mode on a scratch-staged file is a behavior change
disguised as a staging mechanic.

For a genuinely new file with no HEAD entry, use the mode of the reviewed
scratch file (e.g. `stat -f '%A' <scratch-file>` for the octal mode) rather
than assuming `100644`.

## Prefer hash-object + update-index --cacheinfo for exact staging

For a full-file scratch replacement, stage it directly into the index by
exact path, without touching the working tree first:

```
git ls-tree HEAD -- <path>                      # read the existing mode, if any
git hash-object -w <scratch-file>
git update-index --cacheinfo <mode>,<blob-sha>,<path>
```

This lets the index be validated (byte-compared) against the intended
scratch content before the working tree is ever overwritten, and before
any commit happens.

## Git-object write authorization

Both `git hash-object -w` (above) and `git write-tree` (used in the
isolated scratch-index procedure below) write objects into
`.git/objects`. That is a repository write, not a pure read — even though
`hash-object -w` alone touches neither the index nor the working tree, and
`write-tree` in an isolated index touches neither `.git/index` nor the
working tree either. Both require the same turn-specific staging
authorization as the rest of this procedure. Do not run either as a "just
checking" step outside an explicitly authorized staging/commit-sensitive
lane.

## Isolated scratch-index (GIT_INDEX_FILE) procedure

For a multi-file candidate, or any candidate where the real index should
not be touched until the whole set is validated, build the candidate in an
isolated index, in a subshell, so `GIT_INDEX_FILE` cannot leak into the
parent shell:

```
SCRATCH_INDEX=$(mktemp)
rm -f "$SCRATCH_INDEX"          # remove the empty placeholder before git touches it

(
  export GIT_INDEX_FILE="$SCRATCH_INDEX"
  trap 'rm -f "$SCRATCH_INDEX"' EXIT

  git read-tree HEAD
  git update-index --cacheinfo <mode>,<blob-sha>,<path>   # repeat per file; mode per "Preserve file mode" above
  git write-tree
)

echo "scratch index path: $SCRATCH_INDEX"
ls "$SCRATCH_INDEX" 2>&1        # confirm removal: expect "No such file or directory"
```

`GIT_INDEX_FILE` is exported only inside the subshell's environment — it
does not exist in the parent shell before, during, or after this block, so
no later command in the same session can accidentally operate against the
scratch index. The `trap` removes the scratch index file when the subshell
exits, whether that's normal completion or a failure partway through.

Report the scratch-index path explicitly, and confirm its removal
afterward per the `ls` check above — do not assume the trap fired just
because the procedure was followed.

Everything above operates against the scratch index. The real index
(`.git/index`) is not touched until the candidate tree has been reviewed
and the user has authorized staging it for real — see "Promotion rule"
below.

## Candidate tree comparison

Before promoting a scratch-index candidate to the real index, diff in the
intuitive direction — HEAD as the "before," the candidate as the "after,"
matching how `git diff --cached` itself reads:

```
git diff-tree -r HEAD <candidate-tree-sha>
git diff HEAD <candidate-tree-sha> -- <path>
```

Confirm the diff contains only the exact intended files and hunks. For
multi-file candidates, a tree-hash comparison against what the intended
result should be is the required proof — not a visual read of a diff.

## Proof the real index remains untouched

A filename list alone can miss a staged-byte change to a file whose name
didn't change. Capture semantic fingerprints of the real index before
starting any isolated scratch-index work, and again after, in a temporary
external report directory (outside the repo):

```
REPORT_DIR=$(mktemp -d)

git ls-files --stage -z > "$REPORT_DIR/index-before.raw"
git diff --cached --binary > "$REPORT_DIR/cached-before.diff"
shasum -a 256 "$REPORT_DIR/index-before.raw" "$REPORT_DIR/cached-before.diff"

# ... isolated scratch-index work happens here, real index untouched ...

git ls-files --stage -z > "$REPORT_DIR/index-after.raw"
git diff --cached --binary > "$REPORT_DIR/cached-after.diff"
shasum -a 256 "$REPORT_DIR/index-after.raw" "$REPORT_DIR/cached-after.diff"

diff "$REPORT_DIR/index-before.raw" "$REPORT_DIR/index-after.raw"
diff "$REPORT_DIR/cached-before.diff" "$REPORT_DIR/cached-after.diff"
```

Matching hashes (and empty diffs) for both pairs are the proof that
isolation held — this catches a staged-byte change even when the staged
filename list is unchanged, which a `git status --short` /
`git diff --cached --name-only` comparison alone would miss. Report this
confirmation explicitly; do not assume isolation held just because the
procedure was followed.

## Promotion rule

A validated scratch-index candidate is promoted to the real index only
under separate, explicit staging authorization, and only by this path:

- Never copy or move the scratch index file over `.git/index`.
- Never replace the real index wholesale (no `cp $SCRATCH_INDEX
  .git/index` or equivalent) — the real index may carry other legitimate
  staged state that a wholesale replacement would destroy or corrupt.
- Before staging anything, check for pre-existing staged state:
  `git diff --cached --name-only`. If it's non-empty and wasn't expected,
  stop and report it rather than staging on top of unexplained state —
  see [dirty-files.md](dirty-files.md).
- After staging authorization, stage only the exact approved files into
  the real index, individually, by path (per "Never use broad staging
  commands" above) — never the scratch index as a unit.
- After staging, verify the real staged candidate against the
  already-reviewed scratch tree: `git diff <candidate-tree-sha> --cached`
  should be empty for the files in scope.
- Any pre-existing authorized staged state (from a separate, prior
  authorization) must survive this operation unchanged — confirm with the
  before/after fingerprint procedure above, scoped to the files that were
  not part of this promotion.

## Exact candidate file list

Before staging for real, restate the exact file list the authorization
covers. Staging must match that list exactly — no more, no fewer files.

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
file. If they diverge, report the divergence and wait for separate
authorization before writing anything — do not reconcile it unilaterally.
An unreconciled header is a latent bug (the next scratch-build from HEAD
will silently drop whatever the working tree had that HEAD doesn't), but
fixing it is itself a write and follows the same authorization rule as any
other patch.

## Local commit first; push only after explicit push handoff

Commits are local-first. A commit authorization is not a push authorization.
Do not push until the user gives an explicit, separate push handoff for that
push. See [validation.md](validation.md) for what should be true before a
push handoff is reasonable to grant.

Before any push gate is evaluated, run `git fetch origin main` to refresh
remote-tracking state — do not evaluate ahead/behind against a stale
`origin/main`.

## Push synchronization

Before a push, re-derive the relationship between the local branch and
`origin/<branch>` from current state, not from an earlier report:

```
git fetch origin main
git rev-parse HEAD
git rev-parse origin/main
git log --oneline origin/main..HEAD    # commits this push would add
git log --oneline HEAD..origin/main    # commits only on remote
```

Rule by the result:

- **Already pushed** (`HEAD` == `origin/main`): nothing to push; report and
  stop.
- **Ahead, clean** (only local commits ahead, no remote-only commits): push
  is a fast-forward; proceed only with explicit push authorization for this
  exact commit stack.
- **Behind** (remote-only commits exist, no local-only commits): do not
  push; report that a pull/rebase decision is needed first.
- **Diverged** (commits on both sides): stop. Do not merge, rebase, or
  force anything without explicit instruction — report the divergence and
  wait.

A push authorization is scoped to the exact ref and commit stack described
at the time it was granted. If `git fetch` shows the remote has moved, or
new local commits were added, since that authorization was given, it has
expired — stop and get a fresh one before pushing.

Never force-push (`--force`, `--force-with-lease`) unless separately and
explicitly authorized for that specific push, on that specific turn.

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
