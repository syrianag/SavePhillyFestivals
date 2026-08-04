"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function Toast({ message, onClose, duration = 3000 }) {
  const timerRef = useRef(null);
  const closeTimerRef = useRef(null);

  useEffect(() => {
    if (!message) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

    timerRef.current = setTimeout(() => {
      closeTimerRef.current = setTimeout(onClose, 300);
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [message, duration, onClose]);

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-brand-dark px-6 py-3 font-ui text-sm font-medium text-white shadow-lg transition-all duration-300",
        message ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"
      )}
    >
      {message}
    </div>
  );
}
