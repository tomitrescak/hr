-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('USER', 'PROJECT_MANAGER');

-- CreateEnum
CREATE TYPE "public"."CompetencyType" AS ENUM ('KNOWLEDGE', 'SKILL', 'TECH_TOOL', 'ABILITY', 'VALUE', 'BEHAVIOUR', 'ENABLER');

-- CreateEnum
CREATE TYPE "public"."Proficiency" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "public"."LeanState" AS ENUM ('BACKLOG', 'READY', 'IN_PROGRESS', 'BLOCKED', 'REVIEW', 'DONE');

-- CreateEnum
CREATE TYPE "public"."AssignmentType" AS ENUM ('PROJECT', 'COURSE');

-- CreateEnum
CREATE TYPE "public"."ReviewStatus" AS ENUM ('FINISHED', 'IN_PROGRESS', 'STALLED');

-- CreateEnum
CREATE TYPE "public"."Contribution" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."ChangeState" AS ENUM ('CREATED', 'MODIFIED');

-- CreateEnum
CREATE TYPE "public"."CourseStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."EntityKind" AS ENUM ('PERSON', 'COURSE', 'PROJECT', 'TASK', 'ASSIGNMENT', 'REVIEW', 'PERSON_COMPETENCY', 'COURSE_COMPETENCY', 'RESPONSIBILITY', 'OKR', 'KEY_RESULT');

-- CreateEnum
CREATE TYPE "public"."Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "public"."ProjectStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ON_HOLD', 'PLANNING');

-- CreateEnum
CREATE TYPE "public"."EnrollmentStatus" AS ENUM ('WISHLIST', 'IN_PROGRESS', 'COMPLETED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."people" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "alternativeEmail" TEXT,
    "role" "public"."Role" NOT NULL,
    "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deactivatedAt" TIMESTAMP(3),
    "cv" TEXT,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."competencies" (
    "id" TEXT NOT NULL,
    "type" "public"."CompetencyType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."person_competencies" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "proficiency" "public"."Proficiency",
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "person_competencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."courses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "duration" INTEGER,
    "status" "public"."CourseStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_competencies" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "proficiency" "public"."Proficiency",

    CONSTRAINT "course_competencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."course_enrollments" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "status" "public"."EnrollmentStatus" NOT NULL DEFAULT 'WISHLIST',
    "progress" INTEGER DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "course_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."okrs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metric" TEXT,
    "target" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "okrs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."key_results" (
    "id" TEXT NOT NULL,
    "okrId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "target" TEXT,
    "metric" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "key_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."project_responsibilities" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "personId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_responsibilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tasks" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "okrId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigneeId" TEXT,
    "priority" "public"."Priority" DEFAULT 'MEDIUM',
    "state" "public"."LeanState" NOT NULL DEFAULT 'BACKLOG',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."assignments" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "type" "public"."AssignmentType" NOT NULL,
    "projectId" TEXT,
    "courseId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "plannedEndDate" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reviews" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "status" "public"."ReviewStatus" NOT NULL,
    "reflection" TEXT NOT NULL,
    "positives" TEXT[],
    "negatives" TEXT[],
    "submittedById" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "comment" TEXT,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."competency_deltas" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "newProficiency" "public"."Proficiency",

    CONSTRAINT "competency_deltas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."person_reviews" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "recordingText" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "person_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."change_logs" (
    "id" TEXT NOT NULL,
    "entity" "public"."EntityKind" NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "fromValue" JSONB,
    "toValue" JSONB,
    "state" "public"."ChangeState" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT NOT NULL,

    CONSTRAINT "change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "people_userId_key" ON "public"."people"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "people_email_key" ON "public"."people"("email");

-- CreateIndex
CREATE UNIQUE INDEX "person_competencies_personId_competencyId_key" ON "public"."person_competencies"("personId", "competencyId");

-- CreateIndex
CREATE UNIQUE INDEX "course_competencies_courseId_competencyId_key" ON "public"."course_competencies"("courseId", "competencyId");

-- CreateIndex
CREATE UNIQUE INDEX "course_enrollments_courseId_personId_key" ON "public"."course_enrollments"("courseId", "personId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_assignmentId_weekStartDate_key" ON "public"."reviews"("assignmentId", "weekStartDate");

-- CreateIndex
CREATE INDEX "change_logs_entity_entityId_idx" ON "public"."change_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "change_logs_changedAt_idx" ON "public"."change_logs"("changedAt");

-- AddForeignKey
ALTER TABLE "public"."people" ADD CONSTRAINT "people_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."person_competencies" ADD CONSTRAINT "person_competencies_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."person_competencies" ADD CONSTRAINT "person_competencies_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "public"."competencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_competencies" ADD CONSTRAINT "course_competencies_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_competencies" ADD CONSTRAINT "course_competencies_competencyId_fkey" FOREIGN KEY ("competencyId") REFERENCES "public"."competencies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_enrollments" ADD CONSTRAINT "course_enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."course_enrollments" ADD CONSTRAINT "course_enrollments_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."okrs" ADD CONSTRAINT "okrs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."key_results" ADD CONSTRAINT "key_results_okrId_fkey" FOREIGN KEY ("okrId") REFERENCES "public"."okrs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_responsibilities" ADD CONSTRAINT "project_responsibilities_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."project_responsibilities" ADD CONSTRAINT "project_responsibilities_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_okrId_fkey" FOREIGN KEY ("okrId") REFERENCES "public"."okrs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "public"."people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignments" ADD CONSTRAINT "assignments_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignments" ADD CONSTRAINT "assignments_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignments" ADD CONSTRAINT "assignments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "public"."courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."assignments" ADD CONSTRAINT "assignments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "public"."assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "public"."people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."competency_deltas" ADD CONSTRAINT "competency_deltas_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "public"."reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."person_reviews" ADD CONSTRAINT "person_reviews_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."change_logs" ADD CONSTRAINT "change_logs_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
