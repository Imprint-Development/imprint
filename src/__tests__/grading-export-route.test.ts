import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.fn();
const selectMock = vi.fn();
const fromMock = vi.fn();
const whereMock = vi.fn();

vi.mock("@/lib/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => Symbol("eq")),
  and: vi.fn(() => Symbol("and")),
  inArray: vi.fn(() => Symbol("inArray")),
}));

vi.mock("@/lib/db/schema", () => ({
  courses: { id: "course.id" },
  courseCollaborators: {
    courseId: "courseCollaborators.courseId",
    userId: "courseCollaborators.userId",
  },
  checkpoints: { courseId: "checkpoints.courseId" },
  studentGroups: { courseId: "studentGroups.courseId" },
  students: { groupId: "students.groupId" },
  grades: { studentId: "grades.studentId" },
}));

describe("grading export route", () => {
  beforeEach(() => {
    authMock.mockReset();
    selectMock.mockReset();
    fromMock.mockReset();
    whereMock.mockReset();

    authMock.mockResolvedValue({
      user: { id: "user-1" },
    });

    selectMock.mockReturnValue({ from: fromMock });
    fromMock.mockReturnValue({ where: whereMock });
  });

  it("omits ungraded checkpoints from the exported CSV", async () => {
    whereMock
      .mockResolvedValueOnce([{ id: "membership-1" }])
      .mockResolvedValueOnce([
        {
          id: "course-1",
          name: "Software Engineering",
          gradingConfig: {
            categories: [
              {
                id: "participation",
                name: "Participation",
                maxPoints: 10,
                perCheckpoint: false,
              },
              {
                id: "code-quality",
                name: "Code Quality",
                maxPoints: 10,
                perCheckpoint: true,
              },
            ],
            gradeThresholds: [{ grade: "A", minPercentage: 80 }],
            checkpointOverrides: {},
            ungradedCheckpoints: ["cp-2"],
          },
        },
      ])
      .mockResolvedValueOnce([
        { id: "cp-1", name: "Checkpoint 1" },
        { id: "cp-2", name: "Checkpoint 2" },
      ])
      .mockResolvedValueOnce([{ id: "group-1", name: "Group A" }])
      .mockResolvedValueOnce([
        { id: "student-1", displayName: "Alice", groupId: "group-1" },
      ])
      .mockResolvedValueOnce([
        {
          studentId: "student-1",
          categoryId: "participation",
          checkpointId: null,
          points: 8,
        },
        {
          studentId: "student-1",
          categoryId: "code-quality",
          checkpointId: "cp-1",
          points: 9,
        },
        {
          studentId: "student-1",
          categoryId: "code-quality",
          checkpointId: "cp-2",
          points: 7,
        },
      ]);

    const { GET } = await import("@/app/api/grading/[courseId]/export/route");
    const response = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ courseId: "course-1" }),
    });
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(csv).toContain('"Checkpoint 1 - Code Quality (/10)"');
    expect(csv).not.toContain("Checkpoint 2");
    expect(csv).toContain('"Alice","Group A",8,9,17,20,85.0%,"A"');
  });
});
