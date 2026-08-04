# Full-File Integrity Doctrine

Governs the workflow-truthfulness boundary stated at
[../../AGENTS.md §G](../../AGENTS.md#g-workflow-truthfulness): literal
full-file workflow and mechanical integrity verification (diff proof, hash
proof, reverse-apply proof) are not equivalent. A clean byte-level proof
never retroactively establishes that a full read, full reconstruction, or
full semantic review occurred.

## A. Trigger

Applies whenever an existing file is being modified — especially production
source files and governance files (`AGENTS.md`, `CLAUDE.md`, any
`.claude/rules/*.md`) — and whenever a genuinely new file is being drafted.
See §C for existing files and §C2 for new files; the two are related but
not identical workflows.

## B. Pre-Edit Workflow Declaration

Before editing an existing file, state which authorized workflow applies:

- **FULL-FILE WORKFLOW** (§C) — the default, and the expected workflow for
  governance files specifically (see §F's scope note).
- **CASE-SPECIFIC EXTRAORDINARY VERIFICATION** (§F) — only under explicit,
  turn-specific authorization naming this category specifically.

Before drafting a genuinely new file, follow the **NEW-FILE WORKFLOW**
(§C2), which is neither of the above.

A **RATIFIED LARGE-FILE CONTROLLED EXCEPTION** is a fourth, currently
**NOT RATIFIED** category. No such reusable exception exists. Do not invoke
it, imply it exists, or treat a past extraordinary-verification episode as
having created one — see [../../AGENTS.md §M](../../AGENTS.md#m-no-silent-doctrine-creation).

## C. Full-File Workflow (Existing Files)

Required sequence:

```
[Read Production Baseline Completely]
  → [Read Current Working-Tree File Completely]
  → [Map Every Change]
  → [Reconstruct Complete File]
  → [Review Complete Modified File]
  → [Compare Against Original]
  → [Validate]
  → [Attest Truthfully]
```

Definitions:

- **Read Production Baseline Completely** — the file as it exists at HEAD
  (`git show HEAD:<path>`), read from first line to last line, not sampled
  or excerpted.
- **Read Current Working-Tree File Completely** — the file as it currently
  sits on disk, read from first line to last line. If the working tree is
  dirty relative to HEAD, both reads are required — the baseline read
  alone does not describe what is actually on disk.
- **Map Every Change** — an explicit, itemized account of every intended
  change (what changes, from what, to what, and why), constructed before
  the reconstruction step, not inferred afterward from the diff.
- **Reconstruct Complete File** — produce the complete post-change file
  content, first line to last line, with no omitted region.
- **Review Complete Modified File** — read the reconstructed complete file,
  first line to last line, as a final check that it says what was intended
  — not just that the diff against the baseline looks right.
- **Compare Against Original** — a diff between the baseline and the
  reconstructed file, confirming it contains only the intended hunks.
- **Validate** — the applicable checks from
  [validation-and-evidence.md](validation-and-evidence.md) and, where
  relevant, [validation.md](validation.md), scoped by file type per §F's
  validation-applicability table.
- **Attest Truthfully** — state explicitly, using the checklist in §H,
  which of the above steps actually occurred.

"Completely" means every line, not a representative sample, not the first
and last N lines, and not "the parts that looked relevant." A read that
skipped sections because the file was long is not a complete read — it is
a partial read that must be reported as such, which routes to §F, not §C.

## C2. New-File Workflow

A genuinely new file (no prior HEAD entry, nothing to reconcile against)
follows a related but distinct sequence — baseline and prior-working-tree
reads are not applicable because there is no prior content:

- **Baseline read** — N/A (no HEAD entry exists).
- **Original working-tree read** — N/A (no prior on-disk content exists).
- **Complete drafting** — the full intended content is produced, not
  assembled incrementally with unreviewed gaps.
- **Complete post-write read** — the file as written is read back in full,
  first line to last line, confirming it matches what was intended to be
  drafted.
- **Zero truncation** — §D applies identically to a new file as to an
  edited one; a new file presented as complete must not contain
  placeholder content.
- **Complete proposed-content review** — the drafted content is reviewed
  as a whole before being presented or written, not only spot-checked.
- **Validate** — per §F's validation-applicability table, scoped by file
  type.
- **Attest truthfully** — per §H, marking the two N/A items as N/A
  explicitly rather than silently omitting them or marking them "Yes."

Drafting a new file is never itself a case-specific extraordinary
verification (§F) or evidence of a large-file exception (§B) — it is its
own named workflow, used whenever the file is genuinely new.

## D. Zero Truncation

A file presented as a complete replacement — or a complete new file — must
not contain placeholders standing in for omitted content, including but
not limited to:

- `// ... rest of code`
- `// existing logic here`
- `// unchanged below`
- any other abbreviation implying content was left out of the presented
  file while still calling it complete.

An abbreviated file may be presented only if explicitly labeled as an
excerpt or diff, never presented or implied to be a complete replacement.

## E. Line-Count Integrity

A large, unexplained line-count reduction between the baseline and the
presented "complete" file is a failure condition unless an authorized
refactor explicitly requires that reduction and the reduction is accounted
for in the change map (§C). An unexplained shrink is treated as evidence of
truncation, not evidence of a good edit, until proven otherwise.

## F. Case-Specific Extraordinary Verification

### Scope

This category exists primarily for an explicitly named large or
operationally constrained **existing production file** — e.g. a file whose
size makes a complete read impractical within a turn's practical
constraints. Governance files (`AGENTS.md`, `CLAUDE.md`,
`.claude/rules/*.md`) should normally use the full-file workflow (§C) —
they are, by construction, doctrine-sized rather than large-production-file
sized, and a governance file is exactly the kind of file where an
unverified partial read is most consequential. Invoking this category for
a governance file requires the authorization to explain specifically why
§C's full-file workflow is impractical for that particular file, not just
that this category exists as an option.

### Authorization requirements

Used only under authorization that explicitly:

- names this category specifically — "extraordinary verification," not a
  general grant to skip full reads;
- identifies the exact file, its line count/size, and the exact target
  region or symbol being changed;
- states why the full-file workflow is not being used for this edit;
- states the compensating proof plan before work begins;
- states explicitly that this authorization has no precedential effect —
  it does not establish a reusable large-file exception (§B), and does not
  authorize skipping the full-file workflow for any other file or any
  later edit to this same file.

### Compensating proof, applicable by file type

All items in the applicable row below are required, not a subset:

| File type | Required compensating proof |
|---|---|
| Production TypeScript | Complete diff review; reverse-apply or equivalent byte-integrity proof; cryptographic hashes of before/after; usage-site audit (§G) for every new identifier; lifecycle audit (§G) for every modified identifier; zero-residue audit if removing instrumentation (per [probes.md](probes.md)); **whole-project type-check**; lint scoped at minimum to the changed file; exact inventory of every file actually changed; explicit statement that no literal full-file reconstruction occurred. |
| Other production languages (e.g. C#, Kotlin) | The same list as TypeScript, with "whole-project type-check" replaced by that language's equivalent whole-project build/compile check, and lint replaced by that language's equivalent static-analysis step. |
| Governance / Markdown | Complete diff review; reverse-apply or equivalent byte-integrity proof; cryptographic hashes of before/after; **link and cross-reference validation** (every relative link in the file resolves, and every reference to a section elsewhere still matches that section's current name/anchor); **terminology audit** (any defined term used in the file still matches its canonical definition elsewhere, per [validation-and-evidence.md](validation-and-evidence.md) for evidence terms); exact inventory of every file actually changed; explicit statement that no literal full-file reconstruction occurred. Whole-project type-check and lint are not applicable to Markdown and are marked N/A, not silently omitted. |

Any substitution of this table's requirements for a specific file requires
the explicit compensating-proof plan to state the substitution and why, in
the authorization itself — a substitution is never assumed or applied
silently.

## G. Interaction Audit

A clean diff and a matching reverse-apply hash prove **source integrity** —
that the bytes changed exactly as intended. They do not, by themselves,
prove **semantic safety** — that the change interacts correctly with the
rest of the codebase. Byte-level proof and interaction-level proof answer
different questions and neither substitutes for the other.

For every newly introduced identifier, and every existing identifier whose
lifecycle was modified (initialization timing, reset/invalidation
conditions, ownership, or cleanup), report:

- every reader (every call/reference site that reads it);
- every writer (every site that sets/mutates it);
- initialization — where and when it first acquires a value;
- reset/invalidation — where and under what condition it is cleared or
  invalidated;
- cleanup — where it is released, unmounted, or torn down;
- ownership — which module/component is responsible for its lifecycle;
- cross-module effect — whether any of the above crosses a boundary named
  in [../../AGENTS.md §F](../../AGENTS.md#f-file-and-module-separation).

### Zero-reader findings are preliminary, not conclusive

A search returning zero readers for an identifier is **preliminary
evidence**, not a conclusion that the identifier is unused. Before
concluding "unused" (and before that conclusion is reported as INFERRED or
PROVEN per [validation-and-evidence.md](validation-and-evidence.md)),
reasonably exclude:

- **repository-wide search scope** — was the search actually run across
  the whole repository, or only a subdirectory or a single file's
  neighborhood?
- **aliases and re-exports** — is the identifier re-exported under a
  different name, or imported with a local alias that a literal-name
  search would miss?
- **computed access** — is it accessed via a computed property name,
  bracket notation, or a string built at runtime rather than a static
  identifier reference?
- **reflection or serialization** — is it read via `JSON.stringify`/parse,
  a serialization layer, or reflection-style access that doesn't appear as
  a normal reference?
- **framework lifecycle use** — is it consumed implicitly by a framework
  convention (e.g. a React hook dependency, a naming-convention-based
  lifecycle method) rather than an explicit call site?
- **generated or external consumers** — is it consumed by generated code,
  a build step, or an external package/platform binding (see
  [../../AGENTS.md §F](../../AGENTS.md#f-file-and-module-separation) for
  the TS/.NET/Kotlin-parity case) not visible in a single-language search?

After these are reasonably excluded and the exclusion is stated explicitly,
a zero-reader result may support an **INFERRED** or, with stronger
verification of the above, a **PROVEN** conclusion — but the conclusion
must state the scope it was established within (per
[validation-and-evidence.md](validation-and-evidence.md)'s PROVEN
definition), not asserted as universally true beyond that scope.

## H. Completion Attestation

State explicit Yes/No/N/A for each, not an implied or partial answer:

- Complete original (baseline) read? *(N/A for a new file — see §C2)*
- Complete working-tree read? *(N/A for a new file — see §C2)*
- Complete modified-file or complete new-file review?
- Complete reconstruction (§C) or complete drafting (§C2) performed?
- Extraordinary verification (§F) used instead of §C?
- If §F was used: was every applicable item in its file-type compensating-
  proof table actually produced, not just planned?
- Interaction audit (§G) completed for every new/lifecycle-modified
  identifier, including the zero-reader exclusion checklist where
  relevant?

## I. Prohibited Claims

Never state or imply any of the following unless it is literally true of
what occurred this turn:

- "full-file reconstruction complete" when §C's sequence was not actually
  followed;
- "complete file reviewed" when only the diff, not the complete file, was
  reviewed;
- "no unrelated interaction is possible" based on hash or diff proof
  alone — that proof establishes byte integrity, not interaction safety
  (§G);
- "zero readers found" presented as "confirmed unused" without the §G
  exclusion checklist having been applied and stated;
- a retroactive compliance claim — asserting after the fact that a step
  occurred because the outcome looks correct, rather than because the step
  was actually performed.

## J. Failure Conditions

A false, ambiguous, or omitted attestation under §H blocks staging and
commit for that change, even when TypeScript, lint, and runtime checks all
pass. A technically clean result is not a substitute for an honest workflow
attestation — see [../../AGENTS.md §G](../../AGENTS.md#g-workflow-truthfulness).
