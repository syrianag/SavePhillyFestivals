"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId } from "react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  const grid = [];
  let dayCount = 1;

  for (let row = 0; row < 6; row++) {
    const week = [];
    for (let col = 0; col < 7; col++) {
      if ((row === 0 && col < startDayOfWeek) || dayCount > daysInMonth) {
        week.push(null);
      } else {
        week.push(dayCount);
        dayCount++;
      }
    }
    grid.push(week);
    if (dayCount > daysInMonth) break;
  }
  return grid;
}

export function CalendarWidget({
  year = 2025,
  month = 10,
  festivalDates = [],
  selectedDay = 1,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
}) {
  const grid = getMonthGrid(year, month);
  const headingId = useId();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthLabel = `${monthNames[month]} ${year}`;

  const festivalDaySet = new Set(
    festivalDates.map((d) => {
      const dt = new Date(d);
      return dt.getDate();
    })
  );

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return (
    <section
      aria-labelledby={headingId}
      className="w-full rounded-xl bg-white p-3 md:p-5"
      style={{ boxShadow: "0px 3.48px 17.4px rgba(0,0,0,0.25)" }}
    >
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label={`Show previous month before ${monthLabel}`}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] bg-brand-orange text-white transition-opacity hover:opacity-90"
        >
          <ChevronLeft className="size-4" />
        </button>
        <h3
          id={headingId}
          className="font-heading text-center text-base font-medium leading-[19px] text-black"
          style={{ letterSpacing: "-0.198857px" }}
        >
          {monthLabel}
        </h3>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label={`Show next month after ${monthLabel}`}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-[6px] bg-brand-orange text-white transition-opacity hover:opacity-90"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="pb-2 text-center font-ui text-xs font-bold leading-[15px] text-[#424242]"
          >
            {name}
          </div>
        ))}

        {grid.map((week, wi) =>
          week.map((day, di) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${wi}-${di}`}
                  aria-hidden="true"
                  className="aspect-square rounded-[10.4px] border border-[#BDBDBD]"
                />
              );
            }

            const isToday = isCurrentMonth && day === today.getDate();
            const hasFestival = festivalDaySet.has(day);
            const isSelected = day === selectedDay;

            return (
              <button
                key={day}
                type="button"
                onClick={() => onSelectDay?.(day)}
                aria-label={`${monthNames[month]} ${day}, ${year}${hasFestival ? ", festival scheduled" : ""}`}
                aria-pressed={isSelected}
                aria-current={isToday ? "date" : undefined}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-[10.4px] font-ui text-xs font-bold leading-[15px] transition-colors",
                  isSelected
                    ? "bg-brand-orange text-white"
                    : hasFestival
                      ? "bg-[#E3E1DD] text-black"
                      : "bg-white text-black hover:bg-gray-100"
                )}
              >
                {day}
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
