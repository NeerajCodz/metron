import {
  forwardRef,
  useState,
  type HTMLAttributes,
} from "react";

import { cn } from "../lib/cn.js";

export interface CalendarProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  value?: Date | undefined;
  defaultValue?: Date | undefined;
  onValueChange?: ((date: Date) => void) | undefined;
}

export const Calendar = forwardRef<HTMLDivElement, CalendarProps>(
  ({ value: controlledValue, defaultValue, onValueChange, className, ...props }, ref) => {
    const [currentMonth, setCurrentMonth] = useState(() => new Date());
    const [uncontrolledValue, setUncontrolledValue] = useState<Date | undefined>(defaultValue);

    const isControlled = controlledValue !== undefined;
    const selectedDate = isControlled ? controlledValue : uncontrolledValue;

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay();

    const handleSelectDay = (day: number) => {
      const next = new Date(year, month, day);
      if (!isControlled) setUncontrolledValue(next);
      onValueChange?.(next);
    };

    const isSelected = (day: number) => {
      if (!selectedDate) return false;
      return (
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === month &&
        selectedDate.getFullYear() === year
      );
    };

    const isToday = (day: number) => {
      const today = new Date();
      return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
    };

    return (
      <div ref={ref} className={cn("metron-calendar", className)} {...props}>
        <div className="metron-calendar-header">
          <button
            className="metron-button metron-button--glass metron-button--sm"
            onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
            style={{ width: "2rem", height: "2rem", padding: 0 }}
            type="button"
          >
            ‹
          </button>
          <span className="metron-calendar-title">
            {monthNames[month]} {year}
          </span>
          <button
            className="metron-button metron-button--glass metron-button--sm"
            onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
            style={{ width: "2rem", height: "2rem", padding: 0 }}
            type="button"
          >
            ›
          </button>
        </div>

        <div className="metron-calendar-grid">
          {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
            <div key={d} className="metron-calendar-weekday">
              {d}
            </div>
          ))}
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            return (
              <button
                key={day}
                className="metron-calendar-day"
                data-selected={isSelected(day) || undefined}
                data-today={isToday(day) || undefined}
                onClick={() => handleSelectDay(day)}
                type="button"
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
    );
  },
);
Calendar.displayName = "Calendar";
