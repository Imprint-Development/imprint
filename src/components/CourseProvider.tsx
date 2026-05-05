"use client";

import { createContext, useContext, useCallback, type ReactNode } from "react";
import { usePathname } from "next/navigation";

export interface CourseOption {
  id: string;
  name: string;
  semester: string;
}

interface CourseContextValue {
  courses: CourseOption[];
  selectedCourseId: string | null;
  selectedCourse: CourseOption | null;
  /** @deprecated navigate to /courses/[id]/dashboard instead */
  selectCourse: (id: string) => void;
}

const CourseContext = createContext<CourseContextValue>({
  courses: [],
  selectedCourseId: null,
  selectedCourse: null,
  selectCourse: () => {},
});

// Extracts /courses/[id] from the current pathname
function courseIdFromPathname(pathname: string): string | null {
  const match = pathname.match(/\/courses\/([^/]+)/);
  return match?.[1] ?? null;
}

export function CourseProvider({
  courses,
  children,
}: {
  courses: CourseOption[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const courseIdFromUrl = courseIdFromPathname(pathname);

  const selectedCourseId =
    courseIdFromUrl && courses.some((c) => c.id === courseIdFromUrl)
      ? courseIdFromUrl
      : null;

  // Keep selectCourse in the API so CourseSyncer / CourseSelectModal don't break,
  // but it's a no-op now — navigation is the source of truth.
  const selectCourse = useCallback((_id: string) => {}, []);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) ?? null;

  return (
    <CourseContext.Provider
      value={{ courses, selectedCourseId, selectedCourse, selectCourse }}
    >
      {children}
    </CourseContext.Provider>
  );
}

export function useCourse() {
  return useContext(CourseContext);
}
