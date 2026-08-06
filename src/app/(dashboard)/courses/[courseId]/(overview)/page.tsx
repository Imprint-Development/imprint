import { redirect } from "next/navigation";

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  redirect(`/courses/${courseId}/groups`);
}
