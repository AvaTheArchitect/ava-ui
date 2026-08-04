# Validation and Evidence Doctrine

Canonical owner of evidence terminology for this repository, per
[../../AGENTS.md §H](../../AGENTS.md#h-evidence-integrity). This file
**replaces** the confirmed/likely/needs-verification classification
formerly stated in CLAUDE.md and the confirmed-product-behavior /
confirmed-test-artifact / likely / inconclusive classification formerly
stated in [test-methodology.md](test-methodology.md)'s "Classifying a
surprising result" section — those two vocabularies are retired in favor of
the one taxonomy below, and test-methodology.md now redirects to this file
for classification. This file does **not** replace or duplicate
test-methodology.md's mechanism-fidelity content (event-model fidelity,
positive/negative controls, fresh-state categories, timing discipline,
environment fidelity) — that content stays in test-methodology.md and is
cross-referenced, not restated, here.

## Canonical evidence taxonomy

| Term | Meaning | Minimum evidence | Allowed ticket consequence | Valid example wording | Invalid overstatement |
|---|---|---|---|---|---|
| **PROVEN** | Directly established through valid, verified-fidelity evidence, **bounded to the explicitly stated scope, environment, and mechanism** — never universal proof beyond that scope. | A measurement or command result whose mechanism was itself verified as valid for the claim (see test-methodology.md), not merely a result that happened to come back positive, with the scope explicitly stated. | May justify closing the specific claim it covers; does not by itself justify closing a broader ticket unless every claim in that ticket is individually PROVEN or otherwise closed. | "PROVEN, scoped to Chromium/Playwright on current HEAD: `git diff --cached` shows exactly the 3 intended hunks; byte-compare against scratch file is empty." | "PROVEN it works" with no stated scope, environment, or mechanism — implying universal proof from a bounded result. |
| **OBSERVED** | Directly witnessed **in a defined context**, without established cause or generality. | A single directly-witnessed instance, mechanism and context stated, no claim about why or whether it generalizes beyond that context. | May justify OBSERVED-labeled progress notes; never justifies ticket closure alone. | "OBSERVED, one Playwright run, Chromium emulator: cursor reached the loop end tick; cause not yet established." | "OBSERVED, so it's fixed" (generalizing from one instance to a general claim). |
| **INFERRED** | A reasoned conclusion supported by evidence but not directly measured. | The supporting evidence plus the explicit chain of reasoning from it to the conclusion. | May justify a working hypothesis for further investigation; never justifies ticket closure alone. | "INFERRED: given the tick-domain values logged, the wrap is occurring before the shadow wall clears — not directly observed in the DOM this run." | Presenting an inference as if it were OBSERVED or PROVEN. |
| **THEORETICAL RISK** | A plausible concern with no direct reproduction or proof. | A stated mechanism for why the risk is plausible; explicitly no reproduction attempted or reproduction attempted and inconclusive. | May justify a WATCH entry; never justifies a confirmed-defect ticket status. | "THEORETICAL RISK: this pattern resembles a prior remount bug, but not reproduced here." | Treating a theoretical risk as a confirmed defect in a ticket's status. |
| **PARTIAL** | Only part of the requested test or result was established. | An explicit statement of what was and was not covered. | May justify partial sign-off on the covered portion only; the uncovered portion remains open. | "PARTIAL: desktop validation done; Safari LAN not run this turn." | Reporting a partial pass as "validated" without the qualifier. |
| **BLOCKED** | A valid attempt could not complete because of a documented constraint. | The specific constraint that blocked it (no device available, tool denied, authorization not granted). | Keeps the item open pending the constraint's resolution; never justifies treating it as passed. | "BLOCKED: no physical iPhone available this turn; Safari LAN validation not performed." | Silently omitting the stage instead of marking it BLOCKED. |
| **NOT RUN** | No attempt occurred. | Nothing beyond an honest statement that it wasn't attempted. | Keeps the item open; never justifies treating it as passed or as not applicable. | "NOT RUN: Kotlin build not exercised this turn — TypeScript-only change." | Implying a stage passed by simply not mentioning it. |
| **INVALID CAPTURE** | Evidence exists but is unusable because the method, state, or environment was invalid. | The specific fidelity gap that invalidates the capture (wrong server, wrong event model, stale coordinates, contaminated timing). | **Cannot support a pass, failure, closure, or root-cause claim of any kind** — the only valid consequence is discarding the capture and, if still needed, re-running it with a valid mechanism. | "INVALID CAPTURE: Playwright hit the wrong dev-server port; result discarded, re-run needed." | Using an invalid capture as if it were valid supporting evidence for anything, including a failure claim. |
| **NOT REPRODUCED** | A valid test did not reproduce the reported symptom. | Confirmation the test mechanism itself had adequate fidelity for the claim (otherwise this is INVALID CAPTURE, not NOT REPRODUCED). | May justify closing a specific reproduction attempt; never by itself justifies RESOLVED — see "RESOLVED is not an evidence category" below. | "NOT REPRODUCED: ran the repro steps 3x on current HEAD with verified server identity; symptom did not appear." | "NOT REPRODUCED, so RESOLVED" in the same breath. |
| **SUPERSEDED** | Newer or stronger evidence replaces an earlier result. | The earlier result being replaced, and why the new evidence is stronger. | The superseded result is retained in the record but no longer relied upon; the new result governs going forward. | "SUPERSEDED: earlier OBSERVED result superseded by today's PROVEN byte-compare." | Silently dropping an old finding without stating it was superseded and by what. |
| **WATCH** | A retained concern that is currently non-reproduced, non-blocking, or awaiting stronger evidence. | The condition under which it would be escalated (what evidence would move it out of WATCH). | Stays open in the canonical tracker with an explicit reopen condition; does **not** need to be re-stated in every unrelated report — see below. | "WATCH: blink-on-load reported once, not reproduced, parked post-beta per prior investigation; reopen if reproduced twice in one session." | Letting a WATCH item quietly disappear from the canonical tracker itself (as opposed to simply not repeating it in an unrelated report). |

### WATCH items live in the canonical tracker, not every report

A WATCH item is tracked once, in the canonical record (a ticket, Cipher's
board, or an equivalent durable tracker) with its reopen condition stated.
It does not need to be repeated in every unrelated report that happens to
touch nearby code — repeating it everywhere is noise, not diligence. It
must, however, remain visible in the canonical tracker itself and must be
re-surfaced whenever its reopen condition is met.

### RESOLVED is not an evidence category

**RESOLVED** is a ticket-status term, never an evidence classification.
Closing a ticket as RESOLVED requires stating the closure criteria that
were actually met (e.g. "validated per the sequence in validation.md
through stage N, PROVEN at each stage exercised") — it is not itself one of
the eleven terms above, and none of those terms should be used as a
synonym for it. A ticket may be RESOLVED while its evidence trail is a mix
of PROVEN, OBSERVED, and WATCH entries; RESOLVED describes the ticket's
disposition, not the strength of any single piece of evidence.

## Required anti-overstatement rules

- Compile success is not runtime testing — state it as compile-only.
- Lint success is not behavioral validation.
- One clean run is not proof of resolution — see "RESOLVED is not an
  evidence category" above.
- Correlation is not root cause — a root cause claim requires the evidence
  standard in [../../AGENTS.md §H](../../AGENTS.md#h-evidence-integrity).
- A diff review is not a full-file review — see
  [full-file-integrity.md](full-file-integrity.md).
- An emulator result is not automatically a physical-device result — see
  test-methodology.md's environment-fidelity section.
- Inherited test state (an already-hydrated session, an already-loaded
  song) must be disclosed, not silently treated as a fresh-state result —
  see test-methodology.md's fresh-state categories.
- Inferred bar or beat mappings must be labeled INFERRED, not OBSERVED or
  PROVEN.
- An INVALID CAPTURE must never be used as pass, failure, closure, or
  root-cause evidence, even if its raw output happened to look positive or
  negative.
- Missing evidence must be stated as NOT RUN or BLOCKED, never silently
  omitted or implied to be covered by an adjacent result.
- A PROVEN claim must state its scope, environment, and mechanism — an
  unscoped "PROVEN" is itself an overstatement.

## Validation reporting requirements

Fields are required where applicable to the kind of check being reported;
mark a field **N/A** explicitly when it genuinely does not apply — never
fabricate a value to fill a field, and never silently drop a field instead
of marking it N/A.

**Command-based checks** (compile, lint, type-check, grep, scripted test):

- command — the literal command run, not a paraphrase;
- output — the literal output, or a redesigned secret-safe output per
  [security.md](security.md) if literal output would expose a credential;
- exit code.

**Runtime checks** (dev-server-backed validation):

- PID, cwd, port, HEAD, dirty-file state — per
  [runtime.md](runtime.md), where available; if a field genuinely cannot
  be determined, state that explicitly rather than omitting it silently.

**Manual / device checks** (Brett-performed validation):

- performer — who ran it;
- physical device or emulator, named explicitly;
- app mode (browser tab, Safari LAN, installed PWA);
- build identity — the deployed build/commit where observable;
- reproduction steps actually followed;
- observation — what was actually seen, in the performer's own words.

Every report additionally states:

- **baseline** — what "before" state the result is being compared against;
- **attribution** — who/what ran it (e.g. "Claude Code — Playwright
  Chromium" vs. "Brett — Safari LAN physical iPhone"), per validation.md's
  validation-performer-attribution requirement;
- **limitations** — any stage of the validation sequence not run, and why;
- **evidence status** — one term from the canonical taxonomy above, applied
  to this specific result, including PROVEN's required scope statement
  where applicable.

## Relationship to test-methodology.md

test-methodology.md remains the canonical owner of *mechanism fidelity* —
whether a given test mechanism (Playwright interaction, emulator session,
hit-test, timing measurement) is trustworthy evidence of real product
behavior at all. This file is the canonical owner of *how a result, once
obtained, is classified and reported*. A result must pass through
test-methodology.md's fidelity questions before this file's taxonomy is
applied to it — a result from an invalid mechanism is classified INVALID
CAPTURE here, not PROVEN, regardless of how the raw output looked.
