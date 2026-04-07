# AI Feature Workflow

This document is a step-by-step guide for adding AI features to this codebase using the patterns that already exist.

It is written for a new developer who has not built an AI feature in this repo before.

The goal is not to describe AI in general. The goal is to show exactly how this repo does it:

- where to put each piece of code
- what order to build things in
- which files already provide the baseline pattern
- when to cache AI results and when not to
- how to keep outputs typed and safe for the UI

## Read This First

If you are adding a new AI feature, do not start in a React component.

Start with the backend contract:

1. Decide the product outcome.
2. Define the response schema.
3. Build the app-owned context.
4. Build the prompt.
5. Add a route.
6. Add a typed client helper.
7. Render it in the UI.

That is the pattern already established here.

## Current AI Architecture In This Repo

These are the main files you should understand before adding a new feature.

### Runtime

- `lib/ai/client.ts`
- `lib/ai/runtime.ts`

Purpose:

- initialize OpenAI
- request strict JSON output from the model
- validate the output with Zod

### Prompt and schema layer

- `lib/ai/prompts/index.ts`
- `lib/ai/schemas/index.ts`

Purpose:

- define what the model should do
- define the exact shape the model must return

### Context building

- `lib/ai/context/index.ts`

Purpose:

- fetch deterministic app data with Prisma
- normalize it into a smaller AI-ready object

### Feature config / orchestration

- `lib/ai/features/taskAssistant.ts`
- `lib/ai/appointments.ts`
- `lib/ai/index.ts`

Purpose:

- keep model, version, schema, and prompt wiring centralized
- optionally cache appointment-based AI insights

### API routes

- `app/api/ai/task-assistant/route.ts`
- `app/api/ai/staff-recommendation/route.ts`
- `app/api/ai/appointments/[id]/task-assistant/route.ts`

Purpose:

- expose AI features to the browser or other app flows

### Browser-side integration

- `lib/api/appointments.ts`
- `app/components/cards/AiTaskAssistantCard.tsx`
- `app/components/cards/AIStaffSuggestionCard.tsx`

Purpose:

- wrap browser calls in typed helpers
- render structured AI output in the UI

## The Two Existing AI Patterns

There are currently two real patterns in the repo.

### Pattern A: Preview-only AI route

Example:

- `app/api/ai/staff-recommendation/route.ts`

Characteristics:

- no persistence
- used during active editing
- result is generated on demand
- output is structured and typed

Use this when:

- there is no saved entity yet
- the user is still editing a form
- the result is disposable or draft-like

### Pattern B: Entity-specific AI insight with caching

Example:

- `app/api/ai/appointments/[id]/task-assistant/route.ts`
- `lib/ai/appointments.ts`

Characteristics:

- tied to a saved appointment
- can reuse previous result
- stores model + promptVersion + payload
- has a stable insight type

Use this when:

- the result belongs to a persisted record
- the same insight may be reused
- you want traceability or future auditing

## Core Development Rule

Do not ask the model to infer things the app already knows.

Bad:

- sending raw user-entered text and asking the model to “figure everything out”

Good:

- loading the appointment
- loading staff conflicts
- computing time ranges
- normalizing the address
- then asking the model for the judgment or explanation layer

In this repo, AI is used for:

- ranking
- summarization
- planning
- explanation
- flagging

It is not used as a replacement for deterministic business logic.

## Exact Step-By-Step Workflow

Follow this in order.

## Step 1: Decide What The Feature Does

Before writing code, answer these questions in one short note:

1. Who uses the feature?
2. On which page or flow?
3. What exact decision or action does it improve?
4. Is the output temporary or worth saving?
5. What should the UI display?

Example:

`AI timesheet anomaly review`

- user: admin
- place: timesheet approval page
- improvement: identify suspicious shifts quickly
- persistence: maybe yes, if tied to a submitted timesheet
- UI: summary, severity, list of flags, recommended actions

If you cannot describe the feature in these terms, the implementation will drift.

## Step 2: Decide Whether It Is Preview-Only Or Cacheable

Make this decision early.

### Use preview-only if:

- the user is editing a draft
- the record does not exist yet
- the output should refresh frequently
- the result is not important to store

### Use cached insight if:

- the feature belongs to an existing appointment, client, or timesheet
- the result should be reused later
- the output might be reviewed by multiple users
- you want model/prompt version saved with the payload

This decision affects:

- route shape
- orchestration code
- persistence behavior

## Step 3: Define The Response Schema First

Do this before prompt writing.

File:

- `lib/ai/schemas/index.ts`

Why first:

- it forces you to decide what the UI actually needs
- it prevents vague responses
- it gives you a TS type for the rest of the implementation

### Existing examples

- `TaskAssistantResponseSchema`
- `StaffRecommendationResponseSchema`

### Rules for new schemas

- keep keys small and UI-friendly
- prefer arrays of objects over paragraphs
- include severity/risk enums if the UI needs status
- use `.default([])` for optional arrays when possible
- use `.nullable()` intentionally, not casually

### Example

```ts
export const VisitSummaryResponseSchema = z.object({
  summary: z.string(),
  highlights: z.array(z.string()).default([]),
  issues: z.array(z.string()).default([]),
  clientSafeSummary: z.string().nullable(),
});

export type VisitSummaryResponse = z.infer<
  typeof VisitSummaryResponseSchema
>;
```

### Definition of done for this step

- schema exists
- inferred TS type exists
- you can describe what each field will be used for in the UI

## Step 4: Build The AI Context From App Data

Do not build prompts directly from raw page state if domain data needs enrichment.

File location:

- usually `lib/ai/context/index.ts`
- if the feature grows large, create a dedicated file under `lib/ai/context/`

### Existing example

- `getTaskAssistantContext(...)` in `lib/ai/context/index.ts`

That function already shows the expected pattern:

1. validate the incoming ids/time window
2. fetch records with Prisma
3. normalize null/optional data
4. derive computed values
5. return a compact context object

### What belongs in context code

- Prisma queries
- normalization
- computed counts
- overlap checks
- address formatting inputs
- time/duration calculations

### What does not belong in context code

- prompt text
- UI labels for cards
- API request parsing
- React component concerns

### Example checklist for a new context loader

If you are adding `AI visit note summary`, the context loader should answer:

- which appointment?
- which client?
- which job?
- what note content exists?
- what prior note exists?
- are there any images?
- what date/time did the visit happen?

### Definition of done for this step

- one function can load everything the prompt needs
- that function returns a stable typed object
- the model will not need to infer basic facts the app already knows

## Step 5: Add The Prompt Builder

File:

- `lib/ai/prompts/index.ts`

### Existing examples

- `buildTaskAssistantPrompt(...)`
- `buildStaffRecommendationPrompt(...)`

### Prompt structure to follow

Use this order:

1. one sentence telling the model what it is doing
2. structured context
3. explicit rules
4. exact output keys
5. constraints for each field

### Prompt writing rules for this repo

- always say not to invent facts
- always specify exact keys
- always state output constraints
- keep the model advisory, not authoritative
- make deterministic logic come from the server, not the model

### Recommended prompt template

```ts
export function buildMyFeaturePrompt(ctx: MyFeatureContext) {
  return `
Generate a structured AI response for ...

Context:
- ...
- ...

Rules:
- Do not invent facts.
- Use only the provided context.
- ...

Return JSON with exactly these keys:
summary,
flags,
actions

Requirements:
- "summary": 2-3 sentences
- "flags": 0-5 concise items
- "actions": 0-5 concrete next steps
- Do not include extra keys.
`;
}
```

### Definition of done for this step

- prompt builder exists
- it accepts typed context, not raw request body
- it lists exact output fields

## Step 6: Decide Whether To Add A Feature Object

File pattern:

- `lib/ai/features/<featureName>.ts`

You do not strictly need a feature object for every small route, but you should use one when the feature is expected to live beyond a prototype.

### Existing example

- `lib/ai/features/taskAssistant.ts`

### Use a feature object when:

- the feature might be cached
- prompt version matters
- model choice matters
- the feature has modes
- you want orchestration code to stay generic

### Suggested shape

```ts
export const visitSummaryFeature = {
  type: "visit_summary.v1",
  model: "gpt-5-mini",
  promptVersion: "visit_summary_v1",
  schemaName: "visit_summary_response",
  system: "You are an AI visit-summary assistant. Return valid JSON only.",
  schema: VisitSummaryResponseSchema,
  async getContext(appointmentId: string) {
    return getVisitSummaryContext(appointmentId);
  },
  buildUserPrompt(context: VisitSummaryContext) {
    return buildVisitSummaryPrompt(context);
  },
};
```

### Definition of done for this step

- feature object exists if the feature is substantial
- model, type, version, prompt, and schema are centralized

## Step 7: Add Orchestration Logic

Do this if the feature needs reuse, caching, or shared execution logic.

Current file:

- `lib/ai/appointments.ts`

### Existing orchestration pattern

`runTaskAssistantFeature(...)` does:

1. load context
2. return `null` if context is missing
3. call `generateStructuredJson(...)`
4. cache if appropriate
5. return typed result

### If your feature is appointment-based

You can:

- add a new runner to `lib/ai/appointments.ts`
- reuse the same persistence helpers if the insight belongs in `appointmentAiInsight`

### If your feature is not appointment-based

Consider a new orchestrator file:

- `lib/ai/timesheets.ts`
- `lib/ai/payroll.ts`
- `lib/ai/clients.ts`

Do not force unrelated features into `lib/ai/appointments.ts` if the entity is clearly different.

### Definition of done for this step

- there is one function the route can call
- orchestration is not duplicated between route files

## Step 8: Add The API Route

File pattern:

- preview route: `app/api/ai/<feature-name>/route.ts`
- entity route: `app/api/ai/<entity>/<id>/<feature-name>/route.ts`

### Existing examples

- `app/api/ai/task-assistant/route.ts`
- `app/api/ai/staff-recommendation/route.ts`
- `app/api/ai/appointments/[id]/task-assistant/route.ts`

### Route responsibilities

- parse request body or params
- validate required inputs
- call feature orchestration
- return JSON
- handle error codes consistently

### Route responsibilities that should stay out

- long prompt text
- Prisma-heavy context loading
- UI response formatting

### Suggested route checklist

1. read `req.json()` safely
2. normalize strings with `trim()`
3. validate required fields
4. call runner or runtime
5. return 400 for bad input
6. return 404 if context cannot be built
7. return 500 on unexpected failure

### Definition of done for this step

- route returns typed structured JSON
- route errors are explicit
- route does not contain prompt logic or Prisma-heavy logic inline

## Step 9: Add A Typed Browser Helper

File:

- put it in the relevant `lib/api/*` file

Current example:

- `lib/api/appointments.ts`

### Existing helpers

- `runTaskAssistantPreview(...)`
- `runStaffRecommendationPreview(...)`

### Rules

- the helper should return the inferred schema type
- the helper should own the endpoint URL
- the component should not build raw fetch calls if a domain helper belongs here

### Example

```ts
export function runVisitSummary(body: {
  appointmentId: string;
}): Promise<VisitSummaryResponse> {
  return apiClient<VisitSummaryResponse>("/api/ai/appointments/visit-summary", {
    method: "POST",
    body,
  });
}
```

### Definition of done for this step

- the browser has a single typed entry point for the feature

## Step 10: Add The UI

UI should be the last step, not the first.

### Existing display components

- `app/components/cards/AiTaskAssistantCard.tsx`
- `app/components/cards/AIStaffSuggestionCard.tsx`

### Recommended UI pattern

Keep rendering separate from fetching when possible.

Use:

- loading state
- error state
- empty state
- structured render of returned fields

Do not:

- render raw JSON
- dump unformatted model text
- make the UI depend on fields not enforced by the schema

### Good AI UI behavior

- show that it is guidance
- keep user actions grounded in deterministic controls
- make warnings and recommendations easy to scan

### Definition of done for this step

- the component renders only typed fields
- no `any`
- all schema fields used by the UI are validated upstream

## Step 11: Decide Caching And Persistence

This is easy to get wrong, so decide it explicitly.

### Cache it when:

- it belongs to a saved entity
- users may revisit it
- generation cost matters
- you want auditability

### Do not cache when:

- the output is a draft
- the user is still editing
- inputs change frequently
- the result is cheap and temporary

### Existing example

`getTaskAssistantInsightType(...)` distinguishes:

- stable reusable output
- volatile draft-like output

That is a good pattern to reuse.

If the feature is saved, also save:

- payload
- model
- promptVersion
- insight type

## Step 12: Test The Feature Properly

Do not stop after the route returns JSON once.

### Minimum test checklist

1. valid request returns schema-compliant data
2. missing input returns 400
3. missing entity/context returns 404 if applicable
4. UI handles loading
5. UI handles API failure
6. UI handles empty but valid arrays
7. feature still works with null/optional source data

### Manual test checklist

Use realistic seed data and verify:

- names render correctly
- empty arrays do not break the UI
- long strings do not overflow
- alerts or cautions render well
- caching does not show stale garbage for volatile flows

## Worked Example: Add “AI Visit Summary”

This is the exact sequence a new developer should follow.

## Goal

Add an AI-generated summary for a completed appointment that:

- summarizes what happened
- highlights issues
- optionally creates a client-safe summary

## Files To Touch

Likely files:

- `lib/ai/schemas/index.ts`
- `lib/ai/prompts/index.ts`
- `lib/ai/context/index.ts` or `lib/ai/context/visitSummary.ts`
- `lib/ai/features/visitSummary.ts`
- `lib/ai/appointments.ts`
- `lib/ai/index.ts`
- `app/api/ai/appointments/[id]/visit-summary/route.ts`
- `lib/api/appointments.ts`
- `app/components/cards/AiVisitSummaryCard.tsx`
- the page where it is rendered, likely `app/(staff)/staff/tasks/[id]/page.tsx`

## Implementation Sequence

### 1. Add schema

Add to `lib/ai/schemas/index.ts`:

```ts
export const VisitSummaryResponseSchema = z.object({
  summary: z.string(),
  issues: z.array(z.string()).default([]),
  highlights: z.array(z.string()).default([]),
  clientSafeSummary: z.string().nullable(),
});

export type VisitSummaryResponse = z.infer<
  typeof VisitSummaryResponseSchema
>;
```

### 2. Add context loader

Add a function that loads:

- appointment
- job
- client
- visit notes
- note metadata if needed

Return a context object shaped for the prompt, not for the UI database layer.

### 3. Add prompt builder

Add `buildVisitSummaryPrompt(context)` to `lib/ai/prompts/index.ts`.

Tell the model:

- summarize only from provided context
- do not invent work performed
- return only the exact keys

### 4. Add feature object

Create `lib/ai/features/visitSummary.ts` with:

- `type`
- `model`
- `promptVersion`
- `schemaName`
- `schema`
- `getContext`
- `buildUserPrompt`

### 5. Add runner

Add `runVisitSummaryFeature(...)` in `lib/ai/appointments.ts` if this feature is appointment-bound.

Mirror the `runTaskAssistantFeature(...)` structure.

### 6. Export runner

Update `lib/ai/index.ts` if other code needs to import the runner from there.

### 7. Add route

Create:

- `app/api/ai/appointments/[id]/visit-summary/route.ts`

Route flow:

1. read appointment id from params
2. optionally check cache
3. run feature
4. return JSON

### 8. Add browser helper

Add a helper to `lib/api/appointments.ts`.

### 9. Add UI component

Create a card component that renders:

- summary
- highlights
- issues
- optional client-safe summary

### 10. Render it

Plug the card into `app/(staff)/staff/tasks/[id]/page.tsx` or the relevant admin appointment detail screen.

### 11. Test all states

Verify:

- loading
- error
- no notes
- notes present
- cached repeat request

## What To Reuse

When adding new AI features, reuse these existing pieces first.

### Always reuse if possible

- `generateStructuredJson` from `lib/ai/runtime.ts`
- Zod schemas from `lib/ai/schemas/index.ts`
- prompt style from `lib/ai/prompts/index.ts`
- typed client helpers in `lib/api/*`

### Reuse when the feature is substantial

- feature object pattern from `lib/ai/features/taskAssistant.ts`
- orchestration pattern from `lib/ai/appointments.ts`

### Reuse only when entity scope matches

- appointment insight persistence from `lib/ai/appointments.ts`

Do not reuse appointment-specific persistence for a payroll or client feature unless the entity model truly matches.

## What Not To Do

Avoid these mistakes.

### Do not do prompt construction in React components

Why:

- hard to test
- hard to version
- easy to break

### Do not return unstructured text when the UI needs structure

Why:

- impossible to render safely
- brittle parsing
- easy regressions

### Do not skip schema validation

Why:

- model output is not trustworthy without a contract

### Do not put all logic in the route file

Why:

- route files become unmaintainable fast

### Do not let AI replace deterministic business rules

Examples of deterministic logic that should stay in app code:

- overlap detection
- date validation
- user permission checks
- payroll arithmetic
- leave conflict checks

## Current AI Feature Inventory

Use these as references when deciding how much structure your new feature needs.

### Task assistant

Primary reference for the full pattern.

Files:

- `lib/ai/features/taskAssistant.ts`
- `lib/ai/context/index.ts`
- `lib/ai/prompts/index.ts`
- `lib/ai/schemas/index.ts`
- `lib/ai/appointments.ts`
- `app/api/ai/task-assistant/route.ts`
- `app/api/ai/appointments/[id]/task-assistant/route.ts`
- `app/components/cards/AiTaskAssistantCard.tsx`

Use this as the model when:

- the feature has a real domain context
- the output is structured and likely reusable
- prompt version and caching matter

### Staff recommendation

Primary reference for a lighter preview-only path.

Files:

- `app/api/ai/staff-recommendation/route.ts`
- `lib/ai/prompts/index.ts`
- `lib/ai/schemas/index.ts`
- `lib/api/appointments.ts`
- `app/components/cards/AIStaffSuggestionCard.tsx`

Use this as the model when:

- the feature is preview-only
- the route can directly call the runtime
- persistence is not required yet

## File-By-File Quick Reference

When a new developer asks “where do I put this?”, use this mapping.

### I need the model call

- `lib/ai/runtime.ts`

### I need the output shape

- `lib/ai/schemas/index.ts`

### I need prompt text

- `lib/ai/prompts/index.ts`

### I need to fetch app data for AI

- `lib/ai/context/index.ts`

### I need feature metadata and versioning

- `lib/ai/features/`

### I need shared orchestration or caching

- `lib/ai/appointments.ts` or a new entity-specific AI module

### I need an API endpoint

- `app/api/ai/...`

### I need browser-side calling code

- `lib/api/*`

### I need the rendered UI

- `app/components/cards/*` or the page-specific component tree

## Final Checklist For A New Developer

Use this exact checklist before opening a PR.

1. I chose preview-only or cached behavior explicitly.
2. I added a Zod schema and inferred TS type.
3. I built the context from app-owned data.
4. I added a prompt builder with exact JSON keys.
5. I used `generateStructuredJson`.
6. I added a route with explicit 400/404/500 handling as needed.
7. I added a typed client helper if the browser calls it.
8. I rendered the output from typed fields only.
9. I handled loading, error, and empty states.
10. I did not put prompt logic in the UI.
11. I did not rely on AI for deterministic business rules.
12. I tested realistic data and failure cases.

## Best Next Candidates In This Repo

The easiest next AI features to add using this workflow are:

- job scoping assistant in `app/components/popups/JobModal.tsx`
- timesheet anomaly review in staff/admin timesheet flows
- visit note summarization in `app/(staff)/staff/tasks/[id]/page.tsx`
- dispatch risk summary in `app/(admin)/admin/DashboardClient.tsx`
- payroll explanation assistant in `app/(staff)/staff/your-pay/page.tsx`

Those all map cleanly onto the existing schema -> context -> prompt -> route -> helper -> UI workflow documented above.
