/**
 * ToggleField Component
 * Toggle switch for boolean properties
 *
 * Features:
 * - Visual toggle switch
 * - On/off labels
 * - Expression support ({{ data.enabled }})
 * - Keyboard accessible
 * - Customizable true/false values
 */
"use client";

import { useCallback, useId } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for ToggleField component
 */
export interface ToggleFieldProps {
  /** Field label */
  label: string;
  /** Current value */
  value: boolean | undefined;
  /** Callback when value changes */
  onChange: (value: boolean) => void;
  /** Label shown when toggle is on */
  onLabel?: string;
  /** Label shown when toggle is off */
  offLabel?: string;
  /** Default value when undefined */
  defaultValue?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is read-only */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** ID for accessibility */
  id?: string;
  /** Help text shown below the toggle */
  helpText?: string;
  /** Error message to display */
  error?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Whether to show on/off labels inline */
  showLabels?: boolean;
  /** Position of the label relative to switch */
  labelPosition?: "left" | "right";
}

// ============================================================================
// Constants
// ============================================================================

const SIZE_CLASSES = {
  sm: {
    track: "h-4 w-7",
    thumb: "h-3 w-3",
    thumbTranslate: "translate-x-3",
  },
  md: {
    track: "h-5 w-9",
    thumb: "h-4 w-4",
    thumbTranslate: "translate-x-4",
  },
  lg: {
    track: "h-6 w-11",
    thumb: "h-5 w-5",
    thumbTranslate: "translate-x-5",
  },
};

// ============================================================================
// Component
// ============================================================================

/**
 * ToggleField - Toggle switch for boolean values
 */
export function ToggleField({
  label,
  value,
  onChange,
  onLabel = "On",
  offLabel = "Off",
  defaultValue = false,
  disabled = false,
  readOnly = false,
  className,
  id,
  helpText,
  error,
  size = "md",
  showLabels = false,
  labelPosition = "right",
}: ToggleFieldProps) {
  // Generate unique ID
  const generatedId = useId();
  const fieldId = id ?? `toggle-field-${generatedId}`;

  // Effective value
  const isChecked = value ?? defaultValue;
  const sizeClasses = SIZE_CLASSES[size];

  /**
   * Handle toggle click
   */
  const handleToggle = useCallback(() => {
    if (disabled || readOnly) return;
    onChange(!isChecked);
  }, [disabled, readOnly, isChecked, onChange]);

  /**
   * Handle keyboard interaction
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled || readOnly) return;

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onChange(!isChecked);
      }
    },
    [disabled, readOnly, isChecked, onChange]
  );

  // Build the toggle switch element
  const toggleSwitch = (
    <button
      id={fieldId}
      type="button"
      role="switch"
      aria-checked={isChecked}
      aria-disabled={disabled}
      aria-readonly={readOnly}
      disabled={disabled}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
        "focus-visible:ring-ring focus-visible:ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        sizeClasses.track,
        isChecked ? "bg-primary" : "bg-input",
        disabled && "cursor-not-allowed opacity-50",
        readOnly && "cursor-default",
        error && "ring-destructive ring-1"
      )}
    >
      {/* Thumb */}
      <span
        className={cn(
          "bg-background pointer-events-none block rounded-full shadow-lg ring-0 transition-transform",
          sizeClasses.thumb,
          isChecked ? sizeClasses.thumbTranslate : "translate-x-0.5"
        )}
      />
    </button>
  );

  return (
    <div className={cn("space-y-2", className)}>
      {/* Toggle with Label */}
      <div
        className={cn(
          "flex items-center gap-3",
          labelPosition === "left" && "flex-row-reverse justify-end"
        )}
      >
        {/* Toggle Switch */}
        <div className="flex items-center gap-2">
          {showLabels && (
            <span
              className={cn(
                "text-xs transition-colors",
                !isChecked
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              {offLabel}
            </span>
          )}

          {toggleSwitch}

          {showLabels && (
            <span
              className={cn(
                "text-xs transition-colors",
                isChecked
                  ? "text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              {onLabel}
            </span>
          )}
        </div>

        {/* Label */}
        <Label
          htmlFor={fieldId}
          onClick={handleToggle}
          className={cn(
            "cursor-pointer text-sm font-medium select-none",
            disabled && "cursor-not-allowed opacity-50",
            readOnly && "cursor-default",
            error && "text-destructive"
          )}
        >
          {label}
        </Label>
      </div>

      {/* Help Text */}
      {helpText && !error && (
        <p className="text-muted-foreground text-xs">{helpText}</p>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

// Default export for convenience
export default ToggleField;
