"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCourse } from "@/components/CourseProvider";

/**
 * Keeps the ?courseId= search param in sync with the course selected in
 * CourseProvider (localStorage).  Must be rendered inside CourseProvider.
 */
export default function DashboardCourseSyncer() {
  const { selectedCourseId } = useCourse();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!selectedCourseId) return;
    const current = searchParams.get("courseId");
    if (current === selectedCourseId) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("courseId", selectedCourseId);
    router.replace(`${pathname}?${params.toString()}`);
  }, [selectedCourseId, pathname, router, searchParams]);

  return null;
}
