"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
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

const STORAGE_KEY = "imprint:selectedCourseId";

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

  // URL is the primary source of truth; fall back to last cached value from localStorage
  const courseIdFromStorage =
    typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;

  const resolvedId = courseIdFromUrl ?? courseIdFromStorage;
  const selectedCourseId =
    resolvedId && courses.some((c) => c.id === resolvedId) ? resolvedId : null;

  // Keep the cache up to date whenever the URL has a course
  useEffect(() => {
    if (courseIdFromUrl && courses.some((c) => c.id === courseIdFromUrl)) {
      localStorage.setItem(STORAGE_KEY, courseIdFromUrl);
    }
  }, [courseIdFromUrl, courses]);

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
