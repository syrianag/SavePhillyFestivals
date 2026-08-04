"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  SCHEDULE_STORAGE_KEY,
  addScheduleItem,
  containsScheduleItem,
  parseScheduleStorage,
  removeScheduleItem,
  serializeScheduleItems,
  toggleScheduleItem,
} from "@/features/schedule/schedule-storage";

const ScheduleContext = createContext(null);

function safelyPersist(items) {
  try {
    window.localStorage.setItem(SCHEDULE_STORAGE_KEY, serializeScheduleItems(items));
  } catch {
    // Storage can be disabled or unavailable. The in-memory schedule still works.
  }
}

function loadInitialItems() {
  if (typeof window === "undefined") return [];
  try {
    return parseScheduleStorage(window.localStorage.getItem(SCHEDULE_STORAGE_KEY)).items;
  } catch {
    return [];
  }
}

export function ScheduleProvider({ children }) {
  const [items, setItems] = useState([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setItems(loadInitialItems());
      setHydrated(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (hydrated) safelyPersist(items);
  }, [hydrated, items]);

  const add = useCallback((item) => {
    setItems((previous) => addScheduleItem(previous, item));
  }, []);

  const remove = useCallback((item) => {
    setItems((previous) => removeScheduleItem(previous, item));
  }, []);

  const toggle = useCallback((item) => {
    setItems((previous) => toggleScheduleItem(previous, item));
  }, []);

  const contains = useCallback(
    (item) => containsScheduleItem(items, item),
    [items]
  );

  const clear = useCallback(() => setItems([]), []);
  const savedIds = items.filter((item) => item.type === "festival").map((item) => item.id);

  return (
    <ScheduleContext.Provider
      value={{
        items,
        savedIds,
        savedCount: items.length,
        add,
        remove,
        toggle,
        contains,
        clear,
        addFestival: (id) => add({ type: "festival", id }),
        removeFestival: (id) => remove({ type: "festival", id }),
        toggleFestival: (id) => toggle({ type: "festival", id }),
        isInSchedule: (id) => contains({ type: "festival", id }),
        clearSchedule: clear,
        hydrated,
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
