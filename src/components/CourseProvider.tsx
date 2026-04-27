"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

export interface CourseOption {
  id: string;
  name: string;
  semester: string;
}

interface CourseContextValue {
  courses: CourseOption[];
  selectedCourseId: string | null;
  selectedCourse: CourseOption | null;
  selectCourse: (id: string) => void;
  /** True when we need to show the picker modal */
  needsSelection: boolean;
}

const CourseContext = createContext<CourseContextValue>({
  courses: [],
  selectedCourseId: null,
  selectedCourse: null,
  selectCourse: () => {},
  needsSelection: false,
});

const STORAGE_KEY = "imprint:selectedCourseId";

export function CourseProvider({
  courses,
  children,
}: {
  courses: CourseOption[];
  children: ReactNode;
}) {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && courses.some((c) => c.id === stored)) {
      setSelectedCourseId(stored);
    } else if (courses.length === 1) {
      // Auto-select if only one course
      setSelectedCourseId(courses[0].id);
      localStorage.setItem(STORAGE_KEY, courses[0].id);
    }
    setHydrated(true);
  }, [courses]);

  const selectCourse = useCallback(
    (id: string) => {
      if (courses.some((c) => c.id === id)) {
        setSelectedCourseId(id);
        localStorage.setItem(STORAGE_KEY, id);
      }
    },
    [courses]
  );

  const selectedCourse =
    courses.find((c) => c.id === selectedCourseId) ?? null;

  const needsSelection = hydrated && !selectedCourse && courses.length > 0;

  return (
    <CourseContext.Provider
      value={{
        courses,
        selectedCourseId,
        selectedCourse,
        selectCourse,
        needsSelection,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
}

export function useCourse() {
  return useContext(CourseContext);
}
