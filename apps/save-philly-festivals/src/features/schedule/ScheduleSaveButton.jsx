"use client";

import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSchedule } from "@/features/schedule/schedule-context";

export function ScheduleSaveButton({ type, id, name, className }) {
  const { contains, toggle, hydrated } = useSchedule();
  const item = { type, id };
  const saved = contains(item);
  const subject = type === "event" ? "event" : "festival";
  const accessibleName = `${saved ? "Remove" : "Save"} ${name} ${saved ? "from" : "to"} schedule`;

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={accessibleName}
      disabled={!hydrated}
      onClick={() => toggle(item)}
      className={cn(
        "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full px-4 font-ui text-sm font-semibold transition-colors disabled:opacity-60",
        saved
          ? "border border-[#1E7BF6] bg-white text-[#1E7BF6]"
          : "bg-black text-white hover:bg-[#333333]",
        className
      )}
    >
      <Bookmark className={cn("size-4", saved && "fill-current")} aria-hidden="true" />
      {saved ? `Saved ${subject}` : `Save ${subject}`}
    </button>
  );
}
