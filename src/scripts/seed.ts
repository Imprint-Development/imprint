/**
 * Seed script — populates the database with realistic example data.
 *
 * Run with:
 *   npx tsx src/scripts/seed.ts
 *
 * Safe to re-run: it checks for the admin user first and bails if data
 * already exists, so you won't get duplicates.
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  users,
  courses,
  courseCollaborators,
  studentGroups,
  students,
  repositories,
  checkpoints,
  checkpointAnalyses,
  checkpointRepoMeta,
  grades,
  type GradingConfig,
  type AiAnalysisConfig,
  DEFAULT_AI_SYSTEM_PROMPT,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function dateOffset(base: Date, days: number) {
  return new Date(base.getTime() + days * 86_400_000);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Guard against double-seeding
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@localhost"));

  if (existing) {
    console.log(
      "⚠️  admin@localhost already exists — database already seeded. Exiting."
    );
    await client.end();
    return;
  }

  console.log("🌱 Seeding database…");

  // -------------------------------------------------------------------------
  // 1. Users
  // -------------------------------------------------------------------------

  const [adminUser] = await db
    .insert(users)
    .values({
      email: "admin@localhost",
      name: "Local Admin",
      role: "admin",
    })
    .returning();

  const [lecturer1] = await db
    .insert(users)
    .values({
      email: "prof.mueller@university.edu",
      name: "Prof. Anna Müller",
      role: "lecturer",
    })
    .returning();

  const [lecturer2] = await db
    .insert(users)
    .values({
      email: "dr.schmidt@university.edu",
      name: "Dr. Jonas Schmidt",
      role: "lecturer",
    })
    .returning();

  console.log("  ✓ Users created");

  // -------------------------------------------------------------------------
  // 2. Courses
  // -------------------------------------------------------------------------

  const gradingConfig: GradingConfig = {
    categories: [
      {
        id: "cat-code",
        name: "Code Quality",
        maxPoints: 30,
        perCheckpoint: true,
      },
      {
        id: "cat-tests",
        name: "Testing",
        maxPoints: 20,
        perCheckpoint: true,
      },
      {
        id: "cat-review",
        name: "Code Review",
        maxPoints: 20,
        perCheckpoint: true,
      },
      {
        id: "cat-final",
        name: "Final Presentation",
        maxPoints: 30,
        perCheckpoint: false,
      },
    ],
    gradeThresholds: [
      { grade: "A", minPercentage: 90 },
      { grade: "B", minPercentage: 75 },
      { grade: "C", minPercentage: 60 },
      { grade: "D", minPercentage: 45 },
      { grade: "F", minPercentage: 0 },
    ],
    checkpointOverrides: {},
  };

  const aiConfig: AiAnalysisConfig = {
    enabled: false,
    provider: "openai",
    model: "gpt-4o",
    systemPrompt: DEFAULT_AI_SYSTEM_PROMPT,
  };

  const [seCourse] = await db
    .insert(courses)
    .values({
      name: "Software Engineering Praktikum",
      semester: "WS 2024/25",
      ignoredGitEmails: ["ci@noreply.github.com", "dependabot@github.com"],
      ignoredGithubUsernames: ["dependabot[bot]", "github-actions[bot]"],
      gradingConfig,
      aiAnalysisConfig: aiConfig,
      createdBy: lecturer1.id,
    })
    .returning();

  const [webCourse] = await db
    .insert(courses)
    .values({
      name: "Web Development Project",
      semester: "SS 2025",
      ignoredGitEmails: [],
      ignoredGithubUsernames: [],
      gradingConfig: {
        categories: [
          {
            id: "cat-frontend",
            name: "Frontend",
            maxPoints: 40,
            perCheckpoint: true,
          },
          {
            id: "cat-backend",
            name: "Backend",
            maxPoints: 40,
            perCheckpoint: true,
          },
          {
            id: "cat-docs",
            name: "Documentation",
            maxPoints: 20,
            perCheckpoint: false,
          },
        ],
        gradeThresholds: [
          { grade: "Sehr Gut", minPercentage: 87 },
          { grade: "Gut", minPercentage: 75 },
          { grade: "Befriedigend", minPercentage: 60 },
          { grade: "Genügend", minPercentage: 50 },
          { grade: "Nicht Genügend", minPercentage: 0 },
        ],
        checkpointOverrides: {},
      },
      aiAnalysisConfig: aiConfig,
      createdBy: lecturer2.id,
    })
    .returning();

  console.log("  ✓ Courses created");

  // -------------------------------------------------------------------------
  // 3. Collaborators  (admin sees everything, lecturers own their course)
  // -------------------------------------------------------------------------

  await db.insert(courseCollaborators).values([
    { courseId: seCourse.id, userId: lecturer1.id, role: "owner" },
    { courseId: seCourse.id, userId: adminUser.id, role: "collaborator" },
    { courseId: webCourse.id, userId: lecturer2.id, role: "owner" },
    { courseId: webCourse.id, userId: lecturer1.id, role: "collaborator" },
  ]);

  console.log("  ✓ Collaborators added");

  // -------------------------------------------------------------------------
  // 4. Student groups — SE course (4 groups of 4)
  // -------------------------------------------------------------------------

  const seGroupData = [
    { name: "Team Alpha" },
    { name: "Team Beta" },
    { name: "Team Gamma" },
    { name: "Team Delta" },
  ];

  const seGroups = await db
    .insert(studentGroups)
    .values(seGroupData.map((g) => ({ ...g, courseId: seCourse.id })))
    .returning();

  // Web course — 2 groups
  const webGroups = await db
    .insert(studentGroups)
    .values([
      { name: "Group 1", courseId: webCourse.id },
      { name: "Group 2", courseId: webCourse.id },
    ])
    .returning();

  console.log("  ✓ Student groups created");

  // -------------------------------------------------------------------------
  // 5. Students
  // -------------------------------------------------------------------------

  // SE course students — 4 per group
  const seStudentDefs = [
    // Team Alpha
    {
      group: seGroups[0]!,
      name: "Lena Fischer",
      email: "lena.fischer@student.uni.edu",
      git: ["lena.fischer@student.uni.edu", "l.fischer@gmail.com"],
      github: "lenafischer",
    },
    {
      group: seGroups[0]!,
      name: "Max Bauer",
      email: "max.bauer@student.uni.edu",
      git: ["max.bauer@student.uni.edu"],
      github: "maxbauer42",
    },
    {
      group: seGroups[0]!,
      name: "Sophie Wagner",
      email: "sophie.wagner@student.uni.edu",
      git: ["sophie.wagner@student.uni.edu", "swagner@proton.me"],
      github: "sophiewagner",
    },
    {
      group: seGroups[0]!,
      name: "Tim Schulz",
      email: "tim.schulz@student.uni.edu",
      git: ["tim.schulz@student.uni.edu"],
      github: "timschulz99",
    },
    // Team Beta
    {
      group: seGroups[1]!,
      name: "Emma Hoffmann",
      email: "emma.hoffmann@student.uni.edu",
      git: ["emma.hoffmann@student.uni.edu"],
      github: "emmahoffmann",
    },
    {
      group: seGroups[1]!,
      name: "Noah Klein",
      email: "noah.klein@student.uni.edu",
      git: ["noah.klein@student.uni.edu", "nklein@outlook.com"],
      github: "noahklein",
    },
    {
      group: seGroups[1]!,
      name: "Mia Richter",
      email: "mia.richter@student.uni.edu",
      git: ["mia.richter@student.uni.edu"],
      github: "miarichter",
    },
    {
      group: seGroups[1]!,
      name: "Paul Weber",
      email: "paul.weber@student.uni.edu",
      git: ["paul.weber@student.uni.edu", "paul@weberfamily.de"],
      github: "paulweber",
    },
    // Team Gamma
    {
      group: seGroups[2]!,
      name: "Anna Becker",
      email: "anna.becker@student.uni.edu",
      git: ["anna.becker@student.uni.edu"],
      github: "annabecker",
    },
    {
      group: seGroups[2]!,
      name: "Leon Koch",
      email: "leon.koch@student.uni.edu",
      git: ["leon.koch@student.uni.edu"],
      github: "leonkoch",
    },
    {
      group: seGroups[2]!,
      name: "Clara Meier",
      email: "clara.meier@student.uni.edu",
      git: ["clara.meier@student.uni.edu", "c.meier@icloud.com"],
      github: "clarameier",
    },
    {
      group: seGroups[2]!,
      name: "Jonas Braun",
      email: "jonas.braun@student.uni.edu",
      git: ["jonas.braun@student.uni.edu"],
      github: "jonasbraun",
    },
    // Team Delta
    {
      group: seGroups[3]!,
      name: "Laura Zimmermann",
      email: "laura.zimmermann@student.uni.edu",
      git: ["laura.zimmermann@student.uni.edu"],
      github: "laurazimmermann",
    },
    {
      group: seGroups[3]!,
      name: "Felix Krause",
      email: "felix.krause@student.uni.edu",
      git: ["felix.krause@student.uni.edu", "felix.krause@gmail.com"],
      github: "felixkrause",
    },
    {
      group: seGroups[3]!,
      name: "Hannah Wolf",
      email: "hannah.wolf@student.uni.edu",
      git: ["hannah.wolf@student.uni.edu"],
      github: "hannahwolf",
    },
    {
      group: seGroups[3]!,
      name: "Lukas Neumann",
      email: "lukas.neumann@student.uni.edu",
      git: ["lukas.neumann@student.uni.edu"],
      github: "lukasneumann",
    },
  ];

  const seStudents = await db
    .insert(students)
    .values(
      seStudentDefs.map((s) => ({
        email: s.email,
        displayName: s.name,
        gitEmails: s.git,
        githubUsername: s.github,
        groupId: s.group.id,
      }))
    )
    .returning();

  // Web course students
  const webStudentDefs = [
    {
      group: webGroups[0]!,
      name: "Sara Engel",
      email: "sara.engel@student.uni.edu",
      git: ["sara.engel@student.uni.edu"],
      github: "saraengel",
    },
    {
      group: webGroups[0]!,
      name: "Moritz Lange",
      email: "moritz.lange@student.uni.edu",
      git: ["moritz.lange@student.uni.edu"],
      github: "moritzlange",
    },
    {
      group: webGroups[0]!,
      name: "Julia Hartmann",
      email: "julia.hartmann@student.uni.edu",
      git: ["julia.hartmann@student.uni.edu"],
      github: "juliahartmann",
    },
    {
      group: webGroups[1]!,
      name: "Tobias Vogt",
      email: "tobias.vogt@student.uni.edu",
      git: ["tobias.vogt@student.uni.edu"],
      github: "tobiasvogt",
    },
    {
      group: webGroups[1]!,
      name: "Nele Schwarz",
      email: "nele.schwarz@student.uni.edu",
      git: ["nele.schwarz@student.uni.edu"],
      github: "neleschwarz",
    },
    {
      group: webGroups[1]!,
      name: "David Werner",
      email: "david.werner@student.uni.edu",
      git: ["david.werner@student.uni.edu"],
      github: "davidwerner",
    },
  ];

  await db
    .insert(students)
    .values(
      webStudentDefs.map((s) => ({
        email: s.email,
        displayName: s.name,
        gitEmails: s.git,
        githubUsername: s.github,
        groupId: s.group.id,
      }))
    )
    .returning();

  console.log("  ✓ Students created");

  // -------------------------------------------------------------------------
  // 6. Repositories — one per group
  // -------------------------------------------------------------------------

  const seRepos = await db
    .insert(repositories)
    .values([
      {
        url: "https://github.com/uni-se-ws2425/team-alpha",
        groupId: seGroups[0]!.id,
      },
      {
        url: "https://github.com/uni-se-ws2425/team-beta",
        groupId: seGroups[1]!.id,
      },
      {
        url: "https://github.com/uni-se-ws2425/team-gamma",
        groupId: seGroups[2]!.id,
      },
      {
        url: "https://github.com/uni-se-ws2425/team-delta",
        groupId: seGroups[3]!.id,
      },
    ])
    .returning();

  await db.insert(repositories).values([
    {
      url: "https://github.com/uni-webdev-ss25/group-1",
      groupId: webGroups[0]!.id,
    },
    {
      url: "https://github.com/uni-webdev-ss25/group-2",
      groupId: webGroups[1]!.id,
    },
  ]);

  console.log("  ✓ Repositories added");

  // -------------------------------------------------------------------------
  // 7. Checkpoints — SE course: 2 completed + 1 pending
  // -------------------------------------------------------------------------

  const now = new Date("2025-01-15T00:00:00Z");

  const [cp1] = await db
    .insert(checkpoints)
    .values({
      name: "Checkpoint 1 — Project Setup",
      courseId: seCourse.id,
      startDate: dateOffset(now, -90),
      endDate: dateOffset(now, -60),
      gitRef: "main",
      status: "complete",
      enabledPipelines: ["contributions", "review"],
    })
    .returning();

  const [cp2] = await db
    .insert(checkpoints)
    .values({
      name: "Checkpoint 2 — Core Features",
      courseId: seCourse.id,
      startDate: dateOffset(now, -59),
      endDate: dateOffset(now, -30),
      gitRef: "main",
      status: "complete",
      enabledPipelines: ["contributions", "review"],
    })
    .returning();

  const [cp3] = await db
    .insert(checkpoints)
    .values({
      name: "Checkpoint 3 — Final Submission",
      courseId: seCourse.id,
      startDate: dateOffset(now, -29),
      endDate: dateOffset(now, -1),
      gitRef: "main",
      status: "pending",
      enabledPipelines: ["contributions", "review"],
    })
    .returning();

  // Web course: 1 completed checkpoint
  await db.insert(checkpoints).values({
    name: "Sprint 1",
    courseId: webCourse.id,
    startDate: dateOffset(now, -45),
    endDate: dateOffset(now, -15),
    gitRef: "main",
    status: "complete",
    enabledPipelines: ["contributions"],
  });

  console.log("  ✓ Checkpoints created");

  // -------------------------------------------------------------------------
  // 8. Checkpoint analyses — for the 2 completed SE checkpoints
  //    4 groups × 4 students × 2 checkpoints
  // -------------------------------------------------------------------------

  type StudentGroup = { student: (typeof seStudents)[0]; repoId: string };

  // Build a map: groupIdx → [{student, repoId}]
  const seGroupStudents: StudentGroup[][] = seGroups.map((g, i) => {
    const repo = seRepos[i]!;
    return seStudents
      .filter((s) => s.groupId === g.id)
      .map((s) => ({ student: s, repoId: repo.id }));
  });

  const analysisValues = [];
  const repoMetaValues = [];

  for (const checkpoint of [cp1, cp2]) {
    for (let gi = 0; gi < seGroups.length; gi++) {
      const groupMembers = seGroupStudents[gi]!;
      const repoId = seRepos[gi]!.id;
      const checkpointId = checkpoint.id;

      // One analysis row per student per checkpoint
      for (const { student } of groupMembers) {
        // Vary the contribution profile to make it realistic:
        // Some students contribute more code, others more tests/reviews
        const commitBase = randomInt(8, 40);
        const linesBase = commitBase * randomInt(30, 120);
        const testFraction = randomBetween(0.05, 0.35);

        analysisValues.push({
          checkpointId,
          studentId: student.id,
          repositoryId: repoId,
          codeMetrics: {
            commits: commitBase,
            linesAdded: linesBase,
            linesRemoved: Math.floor(linesBase * randomBetween(0.1, 0.4)),
            filesChanged: randomInt(
              5,
              Math.max(6, Math.floor(commitBase * 1.5))
            ),
          },
          testMetrics: {
            commits: Math.floor(commitBase * testFraction),
            linesAdded: Math.floor(linesBase * testFraction),
            linesRemoved: Math.floor(linesBase * testFraction * 0.1),
            filesChanged: randomInt(
              1,
              Math.max(2, Math.floor(commitBase * testFraction))
            ),
          },
          reviewMetrics: {
            prsReviewed: randomInt(2, 12),
            approvals: randomInt(1, 8),
            changesRequested: randomInt(0, 4),
            reviewComments: randomInt(3, 25),
            issueComments: randomInt(0, 15),
          },
          docMetrics: null,
          cicdMetrics: null,
          boardMetrics: null,
        });
      }

      // Repo meta — no unidentified authors
      repoMetaValues.push({
        checkpointId,
        repositoryId: repoId,
        unidentifiedAuthors: [],
      });
    }
  }

  await db.insert(checkpointAnalyses).values(analysisValues);
  await db.insert(checkpointRepoMeta).values(repoMetaValues);

  console.log("  ✓ Checkpoint analyses created");

  // -------------------------------------------------------------------------
  // 9. Grades — for completed checkpoints (cp1, cp2) and standalone category
  //    Uses the category IDs defined in gradingConfig above
  // -------------------------------------------------------------------------

  const gradeValues = [];

  for (const checkpoint of [cp1, cp2]) {
    for (const { student } of seGroupStudents.flat()) {
      // Code Quality
      gradeValues.push({
        studentId: student.id,
        categoryId: "cat-code",
        checkpointId: checkpoint.id,
        points: randomBetween(18, 30),
        gradedBy: lecturer1.id,
      });
      // Testing
      gradeValues.push({
        studentId: student.id,
        categoryId: "cat-tests",
        checkpointId: checkpoint.id,
        points: randomBetween(10, 20),
        gradedBy: lecturer1.id,
      });
      // Code Review
      gradeValues.push({
        studentId: student.id,
        categoryId: "cat-review",
        checkpointId: checkpoint.id,
        points: randomBetween(12, 20),
        gradedBy: lecturer1.id,
      });
    }
  }

  // Standalone: Final Presentation — half the students have been graded so far
  const gradedSoFar = seGroupStudents.flat().slice(0, 8);
  for (const { student } of gradedSoFar) {
    gradeValues.push({
      studentId: student.id,
      categoryId: "cat-final",
      checkpointId: null,
      points: randomBetween(20, 30),
      gradedBy: lecturer1.id,
    });
  }

  await db.insert(grades).values(gradeValues);

  console.log("  ✓ Grades created");

  // -------------------------------------------------------------------------
  // Done
  // -------------------------------------------------------------------------

  await client.end();

  console.log("");
  console.log("✅ Seed complete!");
  console.log("");
  console.log("  Login:    http://localhost:3000/login");
  console.log("  Username: admin   Password: admin");
  console.log("");
  console.log("  Courses seeded:");
  console.log(
    `    • ${seCourse.name} (${seCourse.semester}) — 4 groups, 16 students, 2 completed checkpoints`
  );
  console.log(
    `    • ${webCourse.name} (${webCourse.semester}) — 2 groups, 6 students, 1 completed checkpoint`
  );
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
