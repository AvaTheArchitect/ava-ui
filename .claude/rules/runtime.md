# Runtime Doctrine

Governs identifying, reporting on, and managing local development server
processes for this repo.

## One authoritative Maestro dev server

Maestro's preferred local port is `3000`. The preferred final state is
exactly one authoritative dev server for this repo, running on `3000`. A
second server started against the same repo is a duplicate, not a second
authoritative instance.

## Starting, stopping, and restarting each require separate authorization

Starting a server, stopping a server, and restarting a server are three
distinct state-changing operations under
[../../AGENTS.md §D](../../AGENTS.md#d-write-and-state-change-boundaries).
Authorization for one does not carry over to another — e.g., being
told to "restart the dev server" authorizes a stop-then-start of that
specific server, not a standing authorization to stop or start servers
again later in the same turn or in a following one.

## Enumerate the actual process chain

Do not infer server identity from a port number alone. Enumerate the
actual process chain before making any claim about what's running,
checking the full range Next.js dev tooling can auto-increment into
(`3000`–`3008`) as well as the preferred port:

```
lsof -nP -iTCP:3000-3008 -sTCP:LISTEN
ps -ef | grep -E 'next dev|next-server|npm run dev' | grep -v grep
```

For `next dev`, expect a parent (`npm run dev` or the shell) and a child
`next-server` process — report both PID and PPID, not just one.

## Identify each candidate process

For every candidate process found, determine:

- PID and PPID
- start time (`ps -o lstart=`)
- listening port
- working directory (`lsof -p <pid> | grep cwd`)
- which repository that cwd belongs to

Classify each as:

- **active Maestro repo** — cwd resolves to `~/Development/maestro-ai`.
- **old validation copy** — cwd resolves to a different checkout/clone of
  this project.
- **unrelated repo** — cwd resolves to an entirely different project.
- **unknown** — cwd could not be determined.

## Scope of inspection and termination

- Do not inspect unrelated repository source beyond what's needed to
  establish process identity (PID/PPID/cwd) — cwd is normally sufficient
  to classify a process without opening any of its source files.
- Classify every candidate by PID, PPID, and cwd before any termination is
  even proposed.
- Do not terminate unrelated or unknown processes.
- Never use a broad `pkill` or `killall` that could match processes outside
  this classification (e.g. `pkill node` is forbidden — it can kill
  unrelated Node processes on the machine).
- Termination targets only PIDs that were individually identified and
  classified as belonging to this repo, and only with turn-specific
  authorization per
  [../../AGENTS.md §D](../../AGENTS.md#d-write-and-state-change-boundaries).

## Graceful termination and confirmation

1. Send a graceful termination to the top-level process in the chain first
   (e.g. the `npm run dev` parent, not just the `next-server` child).
2. Confirm the child(ren) also terminated — a parent exiting does not
   guarantee an orphaned child did:
   ```
   ps -ef | grep -E 'next-server' | grep -v grep
   ```
3. Confirm the port is actually clear:
   ```
   lsof -nP -iTCP:3000-3008 -sTCP:LISTEN
   ```
   Empty output (for the ports that should now be clear) is the required
   proof, not an assumption based on step 1.

## Starting the authoritative server

Starting a server requires its own authorization per the section above.
Once authorized, start from the correct working directory:

```
cd ~/Development/maestro-ai && npm run dev
```

Do not assume it started on `3000` — Next.js silently moves to the next
free port (`3001`–`3008`) if `3000` is occupied. After starting, verify
directly:

```
lsof -nP -iTCP:3000-3008 -sTCP:LISTEN
ps -ef | grep -E 'next dev|next-server|npm run dev' | grep -v grep
```

Report the full runtime identity of the server that actually started —
actual listening port, PID, PPID, cwd, current `git rev-parse HEAD`, and
`git status --short` — per "Runtime identity report" below. Do not report
the preferred port as if it were confirmed just because it's the default.

If the server came up on a port other than `3000`:

- report the actual port used,
- report explicitly that the preferred final state (one authoritative
  server on `3000`) was not achieved,
- identify whatever is occupying `3000` by PID, PPID, and cwd (per
  "Identify each candidate process" above),
- do not terminate that occupant without separate authorization, even if
  it looks like a stale/duplicate Maestro process — classification is not
  authorization.

Report the exact `localhost` URL actually in use and, if relevant to
LAN/device testing, the LAN URL (`http://<LAN-IP>:<actual-port>`).

## Runtime identity report

A runtime identity report — required before any browser-based validation is
trusted per [validation.md](validation.md) and [playwright.md](playwright.md)
— consists of:

- PID, PPID, port, cwd of the server under test
- current `git rev-parse HEAD` for that cwd
- current `git status --short` for that cwd (dirty-file attribution)

## Intentional secondary servers

If a second server against a different checkout, branch, or port is
intentional (e.g. an old-version comparison), it must be explicitly named
("comparison server on port 3001, branch X") and reported as such — it is
not exempt from the classification and identity requirements above just
because it's intentional.

## No silent duplicate servers

Do not leave a duplicate Maestro server running silently after starting a
new one. If a duplicate is found, report it and get authorization before
terminating it — do not assume the newest one found is authoritative
without checking cwd/branch/HEAD.

## Cold-load / No Track / Track 1 of 0 diagnosis

"No Track" or "Track 1 of 0" on cold load is a song-context/state question,
not necessarily a server-identity question — but before diagnosing it as a
product bug, first rule out server identity as the cause:

- Confirm which server/HEAD is actually serving the tab under test.
- Confirm song selection was reached through the actual supported product
  flow (route navigation, UI selection) rather than a direct/deep-linked URL
  that bypasses normal state initialization, unless the deep-link path
  itself is what's being tested.

Visible state in the browser is not proof of server identity by itself —
pair it with the runtime identity report above.

## Runtime cleanup and closeout reporting

At the end of a runtime-focused turn, report: which server(s) are left
running, their PID/port/cwd/HEAD, and whether that end-state matches what
was authorized (one authoritative server, or explicitly-named secondaries).
