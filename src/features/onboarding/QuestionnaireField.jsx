"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";

export function QuestionnaireField({
  label,
  name,
  type = "text",
  placeholder,
  required = false,
  value,
  onChange,
  error,
  rows,
  children,
  className,
  ...props
}) {
  const [touched, setTouched] = useState(false);
  const showError = touched && error;

  return (
    <div className={cn("flex w-full flex-col gap-[10px]", className)}>
      <label
        htmlFor={name}
        className="font-body text-lg font-semibold leading-[19px] text-foreground"
        style={{ letterSpacing: "-0.198857px" }}
      >
        {label}
        {required && <span className="ml-1 text-brand-coral">*</span>}
      </label>

      {type === "textarea" ? (
        <textarea
          id={name}
          name={name}
          placeholder={placeholder}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          rows={rows || 4}
          aria-required={required}
          aria-invalid={showError}
          aria-describedby={showError ? `${name}-error` : undefined}
          className="w-full resize-none rounded-[13.22px] bg-muted px-4 py-3 font-body text-lg leading-[22px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          style={{ letterSpacing: "-0.198857px" }}
          {...props}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-required={required}
          aria-invalid={showError}
          aria-describedby={showError ? `${name}-error` : undefined}
          className="w-full rounded-[13.22px] bg-muted px-4 py-3 font-body text-lg leading-[22px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          style={{ letterSpacing: "-0.198857px" }}
          {...props}
        />
      )}

      {children}

      {showError && (
        <span
          id={`${name}-error`}
          role="alert"
          aria-live="polite"
          className="font-body text-sm text-brand-coral"
        >
          {error}
        </span>
      )}
    </div>
  );
}
