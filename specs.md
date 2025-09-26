# ONE-SHOT PROMPT — HR & PROJECT MANAGEMENT SYSTEM

## Goal

Build a full-stack HR & Project Management System that models **People, Projects, Courses, Competencies, Tasks, Planning, and Reviews**. Track per-field history, weekly planning, and reflections. Include an LLM-assisted extractor for competencies from course text.

## Tech Stack (strict)

* Language: **TypeScript** end-to-end
* Framework: **Next.js** (App Router) with **SSR/SSG** where appropriate
* UI: **Tailwind CSS** + **shadcn/ui** (open-source) for components; **lucide-react** for icons
* Forms & validation: **react-hook-form** + **zod**
* Data: **PostgreSQL**
* ORM: **Prisma**
* API: **tRPC**
* Auth: **Auth.js (NextAuth)** with **Credentials (email/password)**
* RBAC: custom role guard (middleware + server procedures)
* Packages: keep minimal; only the above plus any shadcn/ui dependencies. No state libraries beyond React Query built into tRPC. No CSS frameworks beyond Tailwind. No additional server frameworks.
* LLM: Provide an **abstraction** for a provider (e.g., OpenAI) via a single server action/route. Read API key from `process.env.LLM_API_KEY`. Do not hard-bind to a library; use `fetch` to a configurable endpoint.

## Roles & Authorization

* Roles: `USER`, `PROJECT_MANAGER` (PM)
* **USER**: can view all public data; can **modify their own profile** (including competencies & plan of formation), submit **weekly reviews** for their assignments.
* **PROJECT_MANAGER**: all USER capabilities **plus** can create/edit **Projects**, **Tasks**, **Assignments**, **OKRs/Expectations**, approve reviews, and manage **Courses** and **Competencies**.
* Guards:

  * Any **mutations** on Projects/Tasks/Assignments/OKRs require `PROJECT_MANAGER`.
  * Users can only update **their own Person** record and their **reviews**.
* Use NextAuth session with role stored on `User.role`.

## Core Concepts & Entities

### 1) Person

* `id` (uuid), `name`, `email` (unique), `role` (`USER`|`PROJECT_MANAGER`)
* **Competency portfolios** (see Competency & PersonCompetency)
* **Plan of formation** (see Plan & Assignments)
* History: every mutable field must record `date`, `state` (`CREATED|MODIFIED`), `value` (see ChangeLog)

### 2) Competency

* Types (enum): `KNOWLEDGE`, `SKILL`, `TECH_TOOL`, `ABILITY`, `VALUE`, `BEHAVIOUR`, `ENABLER`
* `id`, `type`, `name`, `description?`
* **Proficiency** applies to: `SKILL`, `TECH_TOOL`, `ABILITY`

  * Proficiency enum: `BEGINNER(1)`, `NOVICE(2)`, `COMPETENT(3)`, `PROFICIENT(4)`, `EXPERT(5)`
* Link table `PersonCompetency`:

  * `personId`, `competencyId`, `proficiency?`, `lastUpdatedAt`
  * History recorded via ChangeLog on proficiency changes

### 3) Course

* `id`, `name`, `description`, `link?`
* `CourseCompetency`: `courseId`, `competencyId`, `contribution` (enum: `LOW|MEDIUM|HIGH`)
* People-course relations appear through **Assignments** (planning & doing)

### 4) Project

* `id`, `name`, `description`
* `okrs` / **Expectations**: array of `{ id, title, description, metric?, target?, dueDate? }`
* **Responsibilities**: `ProjectResponsibility`:

  * `id`, `projectId`, `personId?`, `title`, `description`
* **Tasks**:

  * `id`, `projectId`, `title`, `description?`, `assigneeId?`, `priority? (LOW|MEDIUM|HIGH)`, `dueDate?`
  * **Lean state** enum: `BACKLOG`, `READY`, `IN_PROGRESS`, `BLOCKED`, `REVIEW`, `DONE`
  * Task history (state changes) tracked via ChangeLog

### 5) Assignments & Weekly Planning

* A unified `Assignment` model to assign a **person** to either a **project** or a **course** for a week span.
* Fields:

  * `id`, `personId`, `type` (`PROJECT`|`COURSE`), `projectId?`, `courseId?`
  * `startDate` (week start), `plannedEndDate`
  * `createdById` (PM)
* A person may have multiple assignments per week (but guard/display overlaps)

### 6) Weekly Review (per Assignment)

* `id`, `assignmentId`, `weekStartDate`, `status` (`FINISHED`|`IN_PROGRESS`|`STALLED`)
* **Competency deltas**: array of `{ competencyId, newProficiency? }` (only for types with proficiency)
* `reflection` (free text)
* `positives` (string[]), `negatives` (string[])
* `submittedById`, `submittedAt`
* PM can comment/approve (optional: `approvedById`, `approvedAt`)

### 7) LLM Competency Extractor

* Screen to paste a **course description text**.
* Server action calls `LLM_EXTRACTOR` (abstraction over provider):

  * Input: `{ text }`
  * Output: array of `{ type, name, description?, contribution }`
* Map output to system competencies (link existing or create suggestions pending PM approval).
* Store results into `CourseCompetency` (after PM confirmation).

### 8) Audit / History (generic)

* `ChangeLog`:

  * `id`, `entity` (enum: `PERSON|COURSE|PROJECT|TASK|ASSIGNMENT|REVIEW|PERSON_COMPETENCY|COURSE_COMPETENCY|RESPONSIBILITY|OKR`), `entityId`
  * `field` (string), `fromValue` (json), `toValue` (json)
  * `state` (`CREATED|MODIFIED`), `changedAt`, `changedById`
* Utilities:

  * Wrapper for all mutations to automatically write a `ChangeLog` entry.
  * Person screen must show history per field (e.g., proficiency timeline).

## Database Schema (Prisma outline)

Create Prisma models to reflect the above. Use UUIDs. Enums:

* `Role`, `CompetencyType`, `Proficiency`, `LeanState`, `AssignmentType`, `ReviewStatus`, `Contribution`, `ChangeState`, `EntityKind`
* Indices: unique on emails; FKs with cascades as appropriate.

## API (tRPC Routers & Key Procedures)

* `auth`: `getSession`, `signInCredentials`, `signOut`
* `people`:

  * `getMe`, `updateMe` (self-service)
  * PM: `list`, `getById`, `updateById` (with changelog)
  * `upsertPersonCompetency` (enforces rules + changelog)
  * `getHistory(personId)` (returns field histories)
* `competencies`:

  * PM: `list`, `create`, `update`, `delete`
* `courses`:

  * PM: `list`, `getById`, `create`, `update`, `attachCompetencies`
  * `extractCompetenciesFromText(text)` → calls server LLM abstraction; returns suggested mappings
* `projects`:

  * PM: CRUD project
  * PM: manage `okrs`, `responsibilities`
  * `list`, `getById` (public view)
* `tasks`:

  * PM: create/update/delete
  * Assignee (or PM): update `state`, `description?`
  * Auto-log state changes
* `assignments`:

  * PM: create/edit weekly assignments (project/course), validate dates (start on Monday), prevent hard conflicts
  * `listForPerson(personId, dateRange?)`
* `reviews`:

  * USER (assignee): create/update weekly review
  * PM: approve/comment
  * On competency deltas: update `PersonCompetency` proficiency + changelog
* `history`:

  * `get(entity, entityId)` paginated change log
* All mutations validate with Zod and enforce RBAC.

## Screens (Next.js App Router pages)

1. **Person Screen** (`/people/[id]`)

   * Tabs: **Profile**, **Competencies**, **Plan of Formation**, **History**
   * Profile form (name, email readonly unless PM)
   * Competencies grid:

     * All 7 types shown; for SKILL/TECH_TOOL/ABILITY use selectable proficiency (1–5) with date of last update
     * Show delta badges and sparkline/timeline per item (simple mini chart from history, no extra package; or text timeline)
   * Plan of Formation: three lists:

     * **Completed Courses**, **In-Progress Courses**, **Wishlist**
     * Add/remove/move between lists (self-service)
   * History tab: per-field change log (date, state, value)
   * Save emits changelog entries.

2. **Project Screen** (`/projects/[id]`)

   * Edit **name**, **description**
   * **OKRs/Expectations** editor (add/remove, titles, metrics, targets, due dates)
   * **Responsibilities**: rows linking to people (optional), with title/description
   * **Tasks**: Kanban by Lean state (`BACKLOG`, `READY`, `IN_PROGRESS`, `BLOCKED`, `REVIEW`, `DONE`)

     * DnD between columns; moving column writes changelog
     * Create/edit task modals
   * PM-only actions gated.

3. **Course Screen** (`/courses/[id]`)

   * Edit **name**, **description**, **link**
   * Competencies table (type, name, contribution)
   * “**Extract from Description (LLM)**” button → modal with preview → PM approves → persists to `CourseCompetency`

4. **Competency Screen** (`/competencies`)

   * Filter by type; CRUD (PM)
   * Bulk link to courses (PM)

5. **Planning Screen** (`/planning`)

   * Week picker (default = current week’s Monday)
   * Assign **person → (project|course)** with `startDate` (Monday) and `plannedEndDate`
   * Conflict warnings if overlapping; show person load
   * PM-only mutations

6. **Review Screen** (`/reviews/[assignmentId]?week=YYYY-MM-DD`)

   * USER fills:

     * `status`: `FINISHED|IN_PROGRESS|STALLED`
     * Competency changes (picker limited to SKILL/TECH_TOOL/ABILITY; set new proficiency if changed)
     * `reflection` (free text)
     * `positives[]`, `negatives[]`
   * PM can comment/approve
   * Submitting updates `PersonCompetency` and writes changelog

7. **LLM Extractor Screen** (`/courses/extractor`)

   * Text area for course description
   * “Extract” → calls server LLM endpoint
   * Show parsed competencies grouped by type with `contribution`
   * Deduplicate by name; suggest link to existing or create new
   * “Apply to Course” (choose course) → persist

## UX & Visuals

* Use shadcn/ui components: Cards, Tabs, Dialog, Table, Badge, Select, Input, Textarea, DropdownMenu, Toast.
* Clean, accessible typography; clear affordances.
* Kanban board for tasks with simple DnD (if adding DnD increases deps too much, use button-based move).
* Indicators:

  * Proficiency chip (1–5) with label.
  * Status badges for tasks/reviews.
  * History entries as a vertical timeline list.

## Auth & Security

* **NextAuth (Auth.js)** Credentials provider:

  * `User`: `id`, `email`, `passwordHash`, `name`, `role`
  * Register gated to PM only (or seed users)
  * Password hashing: `bcrypt`
* Session strategy: JWT; include `role` in token.
* tRPC middleware to enforce role guards.
* CSRF, secure cookies, rate-limit auth routes (simple in-memory limiter or per-IP counter).

## Data Integrity & Rules

* Assignment `startDate` must be a Monday; `plannedEndDate >= startDate`
* Review `weekStartDate` must match the assignment’s week
* Competency `proficiency` only for types SKILL/TECH_TOOL/ABILITY
* Always write `ChangeLog` on:

  * Person updates, proficiency changes, course edits, project edits, task state moves, OKR and responsibility edits, assignments, and review approvals.

## Seed & DevOps

* Prisma migrations & seeds:

  * Create: one PM user, a handful of USERS
  * Seed a set of common competency templates (per type)
  * Seed 1–2 sample projects, courses, and tasks
* `.env` template:

  * `DATABASE_URL`, `NEXTAUTH_SECRET`, `LLM_API_URL?`, `LLM_API_KEY?`
* Dockerfile + docker-compose for Next.js + Postgres
* Scripts: `dev`, `build`, `start`, `prisma:migrate`, `prisma:studio`

## LLM Extractor Contract (server)

* POST `/api/llm/extract-competencies`

  * Body: `{ text: string }`
  * Output:

    ```ts
    type Extracted = {
      type: 'KNOWLEDGE'|'SKILL'|'TECH_TOOL'|'ABILITY'|'VALUE'|'BEHAVIOUR'|'ENABLER',
      name: string,
      description?: string,
      contribution: 'LOW'|'MEDIUM'|'HIGH'
    }[]
    ```
* Implement with `fetch(process.env.LLM_API_URL, {...})` and `Authorization: Bearer ${process.env.LLM_API_KEY}`; map provider’s schema to `Extracted`. Include unit tests with mocked responses.

## Testing & Acceptance

* Unit tests (server) for:

  * RBAC guards on tRPC mutations
  * Proficiency update logic and ChangeLog entries
  * Assignment date rules and conflict detection
  * LLM extractor mapping/dedup
* E2E happy paths:

  1. PM creates project, OKRs, tasks; moves task across Lean states (history recorded).
  2. PM assigns USER to a project for next week (Mon→Fri).
  3. USER submits weekly review with a proficiency increase; PersonCompetency updates + history recorded.
  4. PM creates course; runs extractor; applies competencies; links course to person’s plan.
  5. Person screen shows field histories and current proficiencies.
* Performance: SSR for list pages; cache GETs via Next.js revalidation; keep payloads lean.

## Definition of Done

* All screens implemented and styled with shadcn/ui + Tailwind.
* All models & enums in Prisma; migrations applied; seed data provided.
* tRPC endpoints with Zod validation and RBAC middleware.
* ChangeLog fired on all relevant mutations and visible in UI.
* LLM extractor screen functional behind env-controlled endpoint.
* Auth with Credentials; role-based features enforced across UI and API.
* Dockerized; README with setup steps.

---

**Deliverables:** Complete Next.js repo with Prisma schema, migrations, tRPC routers, pages, components, auth, seed script, Docker config, `.env.example`, and a concise README describing setup and env variables.

