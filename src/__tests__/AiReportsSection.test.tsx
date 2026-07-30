import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AiReportsSection from "@/app/(dashboard)/courses/[courseId]/checkpoints/[checkpointId]/AiReportsSection";

vi.mock("@/components/AppLink", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>,
}));

describe("AiReportsSection", () => {
  it("shows existing reports during an in-progress rerun", () => {
    render(
      <AiReportsSection
        reports={[
          {
            id: "report-1",
            studentId: null,
            studentName: null,
            content: "# Group summary\n\nStill visible during reruns.",
            provider: "openai",
            model: "gpt-4o",
            createdAt: new Date("2026-05-26T12:00:00.000Z"),
          },
        ]}
        checkpointName="Checkpoint 1"
        groupName="Group 1"
        checkpointStatus="analyzing"
        courseId="course-1"
        checkpointId="checkpoint-1"
      />
    );

    expect(screen.getByText("AI Analysis")).toBeInTheDocument();
    expect(
      screen.getByText("Still visible during reruns.")
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/Analysis has not completed yet/i)
    ).not.toBeInTheDocument();
  });
});
