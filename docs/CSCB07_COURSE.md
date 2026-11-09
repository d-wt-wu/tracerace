# CSCB07 Midterm: C++ Foundations Through Iterators

[Open the course](https://tracerace.onrender.com/course/cscb07) · [Public source](https://github.com/d-wt-wu/tracerace)

## Scope and sources

This student-built course follows the owner's reported November 13, 2026 paper/no-notes midterm boundary: Lectures 1–5 and Lecture 6 PDF pages 1–3 through range-based `for` and `auto &`, stopping before **System Modelling** on page 3. UML, composition/aggregation, inheritance, protected access, slicing, virtual methods, and polymorphism are excluded. An official complete coverage announcement and exam duration have not been supplied.

The content was checked against six privately supplied Fall 2026 CSCB07 lecture PDFs by Rafael F. Toledo, the 15-page beginner day-by-day guide, and the 31-page original study/practice workbook. The guides inform prerequisite order and paper exercises; their earlier Sunday schedule is replaced by the owner's actual Monday, November 9 start. Assignment logistics inside the notes are reference material, not app requirements.

Only independently written teaching/practice content is shipped. The private PDFs, extracted text, source diagrams, and local file paths are excluded from the repository and client export. Optional reading references identify lecture and PDF pages; there is no public “Open source” button for an unavailable private file. This course is not an official university product, past exam bank, or guarantee of exam readiness.

## Complete learning path

The 24 lessons start with variables, assignment/comparison, functions, return/void, conditions, loops, scope, and structs. They continue through references/pointers/parameter modes, lifetime and dynamic memory, methods/this, constructors/defaults/MIL, destruction, separate compilation/modules, testing, copy construction, deep copying, explicit conversion, assignment/self-assignment/copy-and-swap, moves/Rule of Five, encapsulated List, iterator operations, and range traversal costs.

Each lesson has one objective, plain-language vocabulary, a worked example with statement steps, an optional complete class/function context, relevant ownership sketches, two guided checks, two fresh independent checks, feedback, and a later review schedule. The initial sequence therefore contains 96 practice items, using 69 reusable course question families. Fixed concepts have finite variants and may repeat; answer reordering alone does not create a new rewarded problem.

A running owning Node and List connect the lessons. The small List explicitly disallows copying; its own Big Five policy is not silently assumed. Public iteration mutates int data without exposing owning links. Long problems offer a worked explanation, gaps, and a blank editor or physical-paper attempt.

## Progress and grading

The existing version-two progress format gains an optional course field. Old saves decode into an empty course without losing existing XP, scores, review dates, or drafts. A 108-example fingerprint regression checks that adding the course leaves original core question material unchanged. The existing general 18-question/six-topic ranked assessment remains a general CS check, not a CSCB07 exam grade.

Course progress records attempts, incorrect answers, requested hints, supported successes, fresh independent successes, later retrieval results, common missed question families, active lesson identity/answer, written drafts, self-review ratings, and paper timer/answers. A concept becomes secure only after at least two distinct independently correct examples and successful retrieval at least four hours later or on another Toronto date. An error or requested hint resets the recent independent baseline. The four-hour threshold is a transparent study rule, not a validated mastery model.

Wrong or supported answers return after about 20 minutes; independent work is revisited later and on a subsequent day. A fresh repair is always available. Recent detailed attempts are bounded at 128 to keep saves small; cumulative per-lesson counters remain. Completing a lesson requires four practiced items and an independently checked answer. No Sunday lessons are credited by assumption.

Output/choice questions use deterministic checked answers. Correct short answers retain existing **local** practice XP. Cloud account saves use the existing authenticated revision-conflict mechanism; private course JSON cannot award server league XP. Arbitrary written C++ and explanations are not executed or AI-graded. Model answers and explicit rubrics support valid alternatives. Self-rated independence is stored separately and never counts as automatically checked concept mastery.

## Daily path and paper mode

The default budget is 180 focused minutes, adjustable from 30–480. Monday targets lessons 1–7; Tuesday 8–14; Wednesday 15–21; Thursday 22–24 plus cumulative paper practice; Friday offers a 20-minute retrieval warm-up and error list. Pending prerequisites, due reviews, written tasks, reading references, and unfinished coverage remain visible. A later start compresses the target and surfaces estimated extra time rather than claiming completion.

There are 12 longer written tasks and two different eight-problem mixed paper sets. A user can type in a blank editor or work on physical paper. Before submission, paper mode hides choices, hints, model answers, and rubrics. The advisory timer defaults to a chosen 90 minutes and can be changed to 5–240 minutes. It resumes across refresh; reaching zero never discards an answer. Submission or explicit paper-completion reveals models and self-review. A nonempty response counts as an attempt only.

## C++ checks and deliberate limits

`npm run verify:cpp` compiles reviewed C++20 fixtures with clang++, compares defined outputs, checks intended build failures, checks executable worked examples and written-model programs, and builds/links/runs a real three-file named module. No undefined-behavior demonstration is executed to guess an answer. Specification/ownership reasoning is reviewed as reasoning, not mislabeled as a compiler result.

The iterator compares stored node positions directly, repairing the missing `==` in the lecture sketch. `ADMIN99` is rejected under the D-plus-five-digits specification. Pointer destruction is not pointee deletion. Copy construction has no old destination resource; assignment does. Swap-based move assignment may leave a named source owning the old destination resource until later destruction. End is a boundary, not an item. Constructor-count examples avoid unstated copy-elision assumptions.

The app is not a general C++ interpreter, online compiler, official marking service, or calibrated exam predictor. Step-through displays are reviewed worked examples; generated question answers/explanations come from checked templates. Free-form code still needs the rubric, a human reviewer, or an external compiler. Physical-phone testing of this new course remains separate from desktop viewport checks and from the owner's reported testing of the earlier app.

## Code map

- `src/content/cscb07/lessons.ts`: objectives, vocabulary, examples, prerequisites, page references, question-family mapping.
- `src/content/cscb07/lecture*.ts`, `primer.ts`, `shared.ts`: seeded templates and answer metadata.
- `src/content/cscb07/models.ts`: complete reviewed Node/List teaching code.
- `src/content/cscb07/written.ts`: longer tasks, models, rubrics, and two paper sets.
- `src/app/course/cscb07/`: course Today/checklist, walkthrough/practice, written editor, paper mode.
- `src/domain/course.ts`: progress schema, independent/delayed rules, repair and daily planning.
- `src/state/progress.ts`, `ProgressProvider.tsx`, `AccountSyncProvider.tsx`: saved state and private cloud integration.
- `server/accounts.ts`: authenticated progress validation and revision checks; no new database migration.
- `server/api.ts`: shared question generation and server grading for online question tickets.
- `tests/course.test.ts`, `server-tests/accounts.test.ts`, `scripts/verify-cpp.ts`: course regression, private API round trip, compiler references.

The course uses existing Expo/React Native UI, account infrastructure, PostgreSQL, and Free Render hosting. It adds no paid grading service or store distribution fee.

## Release checks

The release passed 196 unit/content/regression checks and 23 database/API checks. The C++20 verifier built 115 seeded question fixtures, compared 102 defined outputs, confirmed 11 intended build failures, checked 20 executable worked examples and 10 written models, and completed a real named-module compile/link/run. Undefined-behavior examples were not executed.

Browser checks at a 390-pixel viewport covered the zero-progress start, prerequisite gating, a wrong answer and fresh repair, guided support, a requested hint, independent typed output, lesson completion, saved drafts/progress after refresh, written scaffolds and rubric reveal, both paper sets, physical-paper completion, hidden solutions before submission, and timer restoration. A crowded walkthrough control was changed to a vertical layout. This is desktop responsive testing; physical-device testing of the new course remains outstanding.
