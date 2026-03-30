/**
 * AdminFormField — three-part label → control → help text wrapper.
 * Sprint 8 implementation target. Resolves UX-15, UX-16, UX-19, UX-38.
 *
 * Drupal-style: every admin form field is: label → control → description → error.
 * Enforces htmlFor / id association and aria-describedby automatically.
 */
"use client";
import React from "react";

interface AdminFormFieldProps {
  /** Unique id applied to the child control and referenced by htmlFor / aria-describedby */
  id: string;
  label: string;
  /** Optional help text rendered below the control; linked via aria-describedby */
  description?: string;
  /** Validation error to show below the control; renders role="alert" */
  error?: string;
  /** Mark the field as required; injects aria-required and appends * to the label */
  required?: boolean;
  /** The input, select, or textarea element to render */
  children: React.ReactElement;
}

export function AdminFormField({
  id,
  label,
  description,
  error,
  required,
  children,
}: AdminFormFieldProps) {
  const descId = description ? `${id}-description` : undefined;
  const errId = error ? `${id}-error` : undefined;

  const ariaDescribedBy =
    [descId, errId].filter(Boolean).join(" ") || undefined;

  const controlWithProps = React.cloneElement(children, {
    id,
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": error ? ("true" as const) : undefined,
    "aria-required": required ? ("true" as const) : undefined,
  } as React.HTMLAttributes<HTMLElement>);

  return (
    <div className="grid gap-(--space-1)">
      <label htmlFor={id} className="text-xs font-medium text-foreground/70">
        {required ? `${label} *` : label}
      </label>
      {controlWithProps}
      {description && (
        <p id={descId} className="text-xs leading-5 text-foreground/45">
          {description}
        </p>
      )}
      {error && (
        <p
          id={errId}
          role="alert"
          className="text-xs text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}
