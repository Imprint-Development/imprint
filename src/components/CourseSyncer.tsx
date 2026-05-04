"use client";

import { useEffect } from "react";
import { useCourse } from "@/components/CourseProvider";

/**
 * Syncs the courseId from the URL path into the sidebar's CourseProvider
 * so the course dropdown and nav links stay in sync when navigating directly
 * to a course URL.
 */
export default function CourseSyncer({ courseId }: { courseId: string }) {
  const { selectedCourseId, selectCourse } = useCourse();

  useEffect(() => {
    if (courseId && courseId !== selectedCourseId) {
      selectCourse(courseId);
    }
  }, [courseId, selectedCourseId, selectCourse]);

  return null;
}
