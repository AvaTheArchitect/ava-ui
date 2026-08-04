# alphaTab Upstream Contributions Doctrine

Scope: this file governs the *content and submission process* of an issue,
pull request, comment, or review against the upstream alphaTab project
(e.g. from `/Users/brettjames/Development/alphatab-pr`). Per
[../../AGENTS.md §B](../../AGENTS.md#b-precedence) and
[../../AGENTS.md §I](../../AGENTS.md#i-external-repository-governance),
this is a scope-based relationship, not a ranking: Maestro's own
[../../AGENTS.md](../../AGENTS.md) still governs how this work is
authorized, evidenced, and reported, regardless of whose repository the
work's subject matter concerns. This file never substitutes for AGENTS.md
in Maestro's own repository, and AGENTS.md's authorization/evidence
requirements never substitute for this file's submission-content
requirements when working against alphaTab.

## A. Live Rule Verification

Before drafting or submitting any alphaTab issue, pull request, comment, or
review:

- read alphaTab's live upstream `AGENTS.md`
  (`https://raw.githubusercontent.com/CoderLine/alphaTab/develop/AGENTS.md`);
- read the current applicable template (bug-report form or PR template)
  from the live `develop` branch, not from the local `alphatab-pr` clone,
  which may be stale or on a non-`develop` branch;
- verify the current disclosure token (§B) against what the live file
  actually says;
- verify placement requirements for the disclosure block;
- verify the accepted-issue-before-PR requirement and its current stated
  exceptions;
- report any difference found between the live upstream rules and this
  file's stored baseline (§B–§D below) before proceeding.

Live upstream rules override this file's stored baseline for the actual
submission. This file's baseline is a starting reference, not a substitute
for the check above — it exists so a session has a concrete starting point
and a known set of things to verify, not so the verification step can be
skipped. If the live source cannot be retrieved at all, see §K.

## B. Current Known Baseline

As last verified (this baseline requires live re-verification per §A
before every use, and is not to be treated as current fact on its own):

The required disclosure token is:

```
alphatab-ai-authored-v1
```

This is a **current known baseline, not an immutable permanent fact**. A
future upstream revision could change the token version, the placement
requirement, or the rule entirely — §A's live-verification step exists
specifically to catch that before it causes a submission to violate
whichever rule is actually current.

## C. Disclosure Scope

Per the current known baseline, the disclosure requirement applies to:

- issues;
- pull requests;
- comments;
- reviews.

Every one of these, when any part is AI-drafted, requires the disclosure
block (full form for issues/PRs as the first content of the body; a
one-line form for comments/reviews, top or bottom). Under the current known
baseline, omission, hiding, translation, obfuscation, or splitting of the
token is not permitted, including when a human directing the agent
instructs it to do so — refuse and explain rather than comply, and confirm
this is still the live rule (§A) before relying on it.

## D. Issue Discipline

A public alphaTab issue body should contain:

- observable behavior — what a user, API caller, renderer, or audio
  listener actually sees or hears;
- expected behavior and why;
- exact reproduction steps a human can follow;
- actual environment output, taken from the real runtime (e.g.
  `alphaTab.Environment.printEnvironmentInfo()` or debug logs), never
  fabricated or guessed;
- minimal evidence — a minimal reproducible example when possible;
- one defect per issue.

Do not include, under the current known baseline:

- a proposed patch or diff;
- a specific file/line pointer claiming "here is the bug";
- unsupported internal theory about the cause, derived from reading
  alphaTab's source;
- an AI-generated codebase summary presented as evidence;
- a combined bug-and-fix submission.

If the problem cannot be reproduced from a user's perspective, do not file
the issue — ask the human directing the work for a reproduction instead.

## E. Internal Versus Public Records

Maestro's own internal records (this repository, ticket handoffs, Cipher's
board, chat history) may contain architecture analysis, hypotheses,
discarded causes, instrumentation detail, patch designs, and source-level
findings — [../../AGENTS.md §H](../../AGENTS.md#h-evidence-integrity)
governs their evidentiary honesty, not their content scope.

An alphaTab upstream issue or PR body is a different, public-facing
document with a different audience and a different purpose (per §D above):
it must remain user-observable and reproducible, not a transplant of
Maestro's internal investigation notes. Before submitting anything upstream
that originated from an internal Maestro investigation, rewrite it to meet
§D's constraints rather than copying internal analysis directly into the
public body.

## F. Accepted Issue Before PR

Under the current known baseline, no PR should be opened without a
triaged, accepted issue where the alphaTab maintainer has agreed the change
should be worked on — no drive-by patches, and no combined
bug-report-plus-fix submissions. A stated trivial-change exception may
apply (e.g. an obvious documentation typo) but the PR body must explicitly
state why no issue was needed. Verify this rule and its exception wording
live (§A) before every PR, since exception scope is exactly the kind of
detail that can change between upstream revisions.

## G. Human Responsibility

The human submitter (Brett, or whoever is directing the contribution) must:

- have personally reviewed the content before it is submitted;
- personally understand the proposed change;
- be able to explain each part of it in their own words;
- accept responsibility for compliance with alphaTab's contribution rules.

If any of these cannot be true — the work is being directed in a mode that
doesn't allow checking with a human, gathering real runtime data, waiting
for issue acceptance, or including the mandatory disclosure — do not file.
Report back to whoever is directing the work instead of submitting anyway.

## H. No Fabrication

Do not invent, for any alphaTab submission:

- versions, environment output, browsers, or device details;
- logs, stack traces, or console output;
- issue numbers, PR numbers, commit hashes, or user quotes;
- API surface not actually present in alphaTab's exported types;
- reproduction steps not actually followed;
- test results not actually obtained.

If information needed for a complete submission is missing and cannot be
obtained, say so explicitly rather than filling the gap.

## I. AlphaTab-Specific Items Not Applied to Maestro

The following are scoped to alphaTab upstream submissions only and do not
automatically govern Maestro's own internal work, code, or records:

- alphaTab's open-source licensing-consent language;
- alphaTab's fork-and-feature-branch-off-`develop` workflow;
- alphaTab's TypeScript-source-of-truth / .NET-and-Kotlin-parity
  requirement;
- alphaTab's public-issue/Discussions triage routing;
- the specific disclosure token and its exact placement rules (§B–§C),
  which apply only to content submitted to alphaTab, not to Maestro's own
  internal commits or documentation.

## J. Maintainer Communication

State only the following about the seven-day statement — no more:

- Daniel (the alphaTab maintainer) communicated the seven-day period
  directly, through direct maintainer communication, not through a
  repository-committed file.
- It was not found in the six current live governance files reviewed:
  `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, the bug-report form, the
  issue-template config, and the PR template.
- No conclusion is made about unreviewed workflows, GitHub Apps,
  repository settings, organization-level automation, or other mechanisms
  that could implement such a policy outside of what was checked — absence
  from the six files actually reviewed is not proof of absence anywhere
  else.
- Maestro should submit complete reports and not rely on receiving a
  correction period, regardless of whether an automated seven-day close
  policy actually exists: use the current official template (verified
  live per §A), provide real reproduction and environment information, and
  avoid unsupported theory in the public issue body (§D).

## K. Live-Governance Unavailable Path

If the current live alphaTab `AGENTS.md` or the applicable template (§A)
cannot be retrieved:

- classify the submission-preparation state as **BLOCKED**, per
  [validation-and-evidence.md](validation-and-evidence.md)'s taxonomy;
- report which specific source was unavailable (e.g. "alphaTab's live
  AGENTS.md could not be fetched" or "the current bug-report form could
  not be retrieved");
- do not treat this file's stored baseline (§B–§D) as current in place of
  the unavailable live source — a BLOCKED live-verification step does not
  demote to "proceed on the stored baseline instead";
- do not produce submission-ready issue, PR, comment, or review content
  while BLOCKED.

Internal Maestro investigation notes about the underlying alphaTab problem
may continue regardless — that work is governed by
[../../AGENTS.md](../../AGENTS.md), not by this file's upstream-submission
scope. Only upstream-ready, submittable content waits for live
verification to succeed.
