"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "savePhillySchedule";

function loadFromStorage() {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed.festivalIds)) {
        return parsed.festivalIds;
      }
    }
  } catch {
    // ignore malformed data
  }
  return [];
}

const ScheduleContext = createContext(null);

export function ScheduleProvider({ children }) {
  const [savedIds, setSavedIds] = useState(loadFromStorage);
  const writeRef = useRef(false);

  useEffect(() => {
    if (writeRef.current) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ festivalIds: savedIds, updatedAt: new Date().toISOString() })
      );
    } else {
      writeRef.current = true;
    }
  }, [savedIds]);

  const addFestival = useCallback((id) => {
    setSavedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const removeFestival = useCallback((id) => {
    setSavedIds((prev) => prev.filter((sid) => sid !== id));
  }, []);

  const toggleFestival = useCallback((id) => {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  }, []);

  const isInSchedule = useCallback(
    (id) => savedIds.includes(id),
    [savedIds]
  );

  const clearSchedule = useCallback(() => {
    setSavedIds([]);
  }, []);

  return (
    <ScheduleContext.Provider
      value={{
        savedIds,
        savedCount: savedIds.length,
        addFestival,
        removeFestival,
        toggleFestival,
        isInSchedule,
        clearSchedule,
        hydrated: true,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error("useSchedule must be used within ScheduleProvider");
  return ctx;
}
