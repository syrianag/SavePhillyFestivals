"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function Toast({ message, onClose, duration = 3000, visible = true }) {
  const timerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const isVisible = visible && !!message;

  useEffect(() => {
    if (!isVisible) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);

    timerRef.current = setTimeout(() => {
      closeTimerRef.current = setTimeout(() => onCloseRef.current(), 300);
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, [isVisible, duration]);

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-full bg-brand-dark px-6 py-3 font-ui text-sm font-medium text-white shadow-lg transition-all duration-300",
        isVisible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0"
      )}
    >
      {message}
    </div>
  );
}
