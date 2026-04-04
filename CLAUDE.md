# CLAUDE.md
> Agent operating instructions. Read this file before doing anything else.

---

## Mandatory Session Initialization

Every session, before writing a single line of code, you MUST complete all four steps in order:

**1. Read this file** (`CLAUDE.md`) in full.

**2. Read the project docs:**
- `docs/prd.md` — product requirements and scope
- `docs/implementation_plan.md` — phases, tasks, technical decisions
- `docs/changelog.md` — understand what has already changed and when
- `docs/decisions.md` — understand what has already been decided and why

Do not ask questions already answered in these documents. Do not re-litigate decisions already logged in `decisions.md` unless the user explicitly reopens them.

**3. Audit the codebase and update `docs/progress.md`:**
- Walk the directory tree
- Compare what exists against the implementation plan
- Update progress.md with accurate current state before touching any code

**4. Verify environment hygiene:**
- Confirm `.gitignore` exists and covers: `node_modules/`, `dist/`, `.env`, `.env.local`, build artifacts, OS files (`.DS_Store`, `Thumbs.db`)
- Create or patch it if anything is missing
- Never commit secrets, never hardcode API keys

Only after all four steps are complete should you acknowledge readiness and wait for the user's instruction.

---

## Tracking Documents

You are required to maintain three files in `docs/`. Update them proactively — not as an afterthought.

### `docs/progress.md`
- Update at the **start and end of every Phase**
- Use checklists: `[ ]` pending, `[x]` complete, `[-]` in progress
- Track: built, tested, pending — separately
- Never mark something `[x]` unless it has a passing test

### `docs/changelog.md`
- Update **immediately** after creating, modifying, or deleting any file
- Use [Keep a Changelog](https://keepachangelog.com) format: `Added`, `Changed`, `Removed`, `Fixed`
- Group by date

### `docs/decisions.md`
- Record any decision not explicitly defined in the implementation plan
- Format: **Decision** → **Why** → **Trade-offs considered**
- Covers: library choices, schema changes, prompt design, API shape, styling strategy, test approach

---

## Workflow Rules

### Test-Driven Development
- Write failing tests **before** writing implementation code — no exceptions
- Tests must verify the specific behavior described in the PRD
- Do not mark a task complete in progress.md until its tests pass
- Use the test runner already configured in the project; do not swap it without a decision log entry

### Phase Discipline
- Execute only the Phase the user has requested
- Do not build ahead — no "I'll scaffold this while I'm here"
- If a future phase dependency is discovered, log it in decisions.md and flag it to the user; do not implement it

### No Hallucinated Integrations
- Do not invent `fetch()` calls, backend routes, or database queries that don't exist yet
- If the backend isn't built, use clearly-labeled mock data or stubs — never silent fakes that look real
- All stubs must be marked with a `// STUB` comment and logged in decisions.md

---

## Full-Stack Conventions

### Frontend
- Mobile-first by default; add responsive breakpoints for desktop where the PRD specifies
- No default HTML button/input styling — every interactive element must be explicitly styled
- No inline styles unless dynamically computed; use CSS variables or utility classes

### Backend
- All environment variables via `.env` — never hardcoded
- Every API endpoint must have a corresponding test before it is considered done
- Clearly separate: routing → validation → business logic → data access

### Database
- Schema changes require a migration file — never mutate the DB directly in dev and call it done
- Migration files are append-only; never edit a migration that has already run

---

## Out of Scope Enforcement

If the user requests something listed as out of scope in `docs/prd.md`:
1. Flag it explicitly: *"This is marked out of scope in the PRD."*
2. Do not implement it
3. Ask whether the PRD should be updated before proceeding

---

## Acknowledgment Format

At the end of session initialization, respond with exactly:

```
Session initialized.
- docs/prd.md ✓
- docs/implementation_plan.md ✓
- docs/changelog.md ✓
- docs/decisions.md ✓
- Codebase audited — docs/progress.md updated ✓
- .gitignore verified ✓

Current phase: [Phase N — Name]
Last completed task: [task name or "none"]
Next task: [task name]

Ready for your instruction.
```