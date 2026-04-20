import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
  real,
  unique,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  name: text("name"),
  role: text("role").default("lecturer"),
  githubId: text("github_id").unique(),
  image: text("image"),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    type: text("type"),
    provider: text("provider"),
    providerAccountId: text("provider_account_id"),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [unique().on(table.provider, table.providerAccountId)]
);

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionToken: text("session_token").unique().notNull(),
  userId: uuid("user_id").references(() => users.id),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  semester: text("semester").notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

export const courseCollaborators = pgTable(
  "course_collaborators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .references(() => courses.id)
      .notNull(),
    userId: uuid("user_id")
      .references(() => users.id)
      .notNull(),
    role: text("role").default("collaborator").notNull(),
  },
  (table) => [unique().on(table.courseId, table.userId)]
);

export const studentGroups = pgTable("student_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  courseId: uuid("course_id")
    .references(() => courses.id, { onDelete: "cascade" })
    .notNull(),
});

export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  groupId: uuid("group_id")
    .references(() => studentGroups.id, { onDelete: "cascade" })
    .notNull(),
});

export const repositories = pgTable("repositories", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  groupId: uuid("group_id")
    .references(() => studentGroups.id, { onDelete: "cascade" })
    .notNull(),
});

export const checkpoints = pgTable("checkpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  courseId: uuid("course_id")
    .references(() => courses.id, { onDelete: "cascade" })
    .notNull(),
  timestamp: timestamp("timestamp", { mode: "date" }),
  gitRef: text("git_ref"),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const checkpointAnalyses = pgTable("checkpoint_analyses", {
  id: uuid("id").primaryKey().defaultRandom(),
  checkpointId: uuid("checkpoint_id").references(() => checkpoints.id, {
    onDelete: "cascade",
  }),
  studentId: uuid("student_id").references(() => students.id, {
    onDelete: "cascade",
  }),
  repositoryId: uuid("repository_id").references(() => repositories.id, {
    onDelete: "cascade",
  }),
  codeMetrics: jsonb("code_metrics"),
  testMetrics: jsonb("test_metrics"),
  docMetrics: jsonb("doc_metrics"),
  cicdMetrics: jsonb("cicd_metrics"),
  reviewMetrics: jsonb("review_metrics"),
  boardMetrics: jsonb("board_metrics"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});

export const grades = pgTable(
  "grades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    checkpointId: uuid("checkpoint_id").references(() => checkpoints.id, {
      onDelete: "cascade",
    }),
    groupId: uuid("group_id").references(() => studentGroups.id, {
      onDelete: "cascade",
    }),
    points: real("points").notNull(),
    maxPoints: real("max_points").notNull(),
    notes: text("notes"),
    gradedBy: uuid("graded_by").references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  },
  (table) => [unique().on(table.checkpointId, table.groupId)]
);
