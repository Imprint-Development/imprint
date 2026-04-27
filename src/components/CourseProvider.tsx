"use client";

import {
  createContext,
  useContext,
  useSyncExternalStore,
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

function subscribeStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function writeStorage(id: string) {
  localStorage.setItem(STORAGE_KEY, id);
  // Notify useSyncExternalStore subscribers in the same tab
  window.dispatchEvent(
    new StorageEvent("storage", { key: STORAGE_KEY, newValue: id })
  );
}

export function CourseProvider({
  courses,
  children,
}: {
  courses: CourseOption[];
  children: ReactNode;
}) {
  // Read from localStorage — useSyncExternalStore handles SSR (server snapshot = null)
  // and re-renders the component on the client once the real value is available.
  const storedId = useSyncExternalStore(
    subscribeStorage,
    () => localStorage.getItem(STORAGE_KEY),
    () => null
  );

  const selectedCourseId =
    storedId && courses.some((c) => c.id === storedId) ? storedId : null;

  // Auto-select when there is exactly one course; write to the external store only
  useEffect(() => {
    if (!storedId && courses.length === 1) {
      writeStorage(courses[0].id);
    }
  }, [storedId, courses]);

  const selectCourse = useCallback(
    (id: string) => {
      if (courses.some((c) => c.id === id)) {
        writeStorage(id);
      }
    },
    [courses]
  );

  const selectedCourse = courses.find((c) => c.id === selectedCourseId) ?? null;

  // useSyncExternalStore returns the server snapshot (null) during SSR and switches to
  // the real localStorage value after hydration, so needsSelection is safe to derive here.
  const needsSelection = !selectedCourse && courses.length > 0;

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
