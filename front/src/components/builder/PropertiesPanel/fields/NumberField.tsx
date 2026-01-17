/**
 * NumberField Component
 * Input field for numeric values with unit support
 *
 * Features:
 * - Number input with validation
 * - Optional unit display (px, pt, %, etc.)
 * - Min/max constraints
 * - Step increment
 * - Expression support ({{ data.value }})
 * - Real-time two-way binding with debounce
 * - Keyboard shortcuts (up/down arrows for increment)
 */
"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ============================================================================
// Types
// ============================================================================

/**
 * Unit types for size values
 */
export type SizeUnit = "px" | "pt" | "%" | "cm" | "mm" | "inch" | "em" | "rem";

/**
 * Props for NumberField component
 */
export interface NumberFieldProps {
  /** Field label */
  label: string;
  /** Current value */
  value: number | undefined;
  /** Callback when value changes */
  onChange: (value: number | undefined) => void;
  /** Unit to display */
  unit?: SizeUnit;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Step increment for keyboard/scroll changes */
  step?: number;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is read-only */
  readOnly?: boolean;
  /** Whether to allow empty/undefined values */
  allowEmpty?: boolean;
  /** Debounce delay in ms (default: 150) */
  debounceDelay?: number;
  /** Whether to show spinner buttons */
  showSpinner?: boolean;
  /** Whether expression syntax is supported */
  supportsExpression?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** ID for accessibility */
  id?: string;
  /** Help text shown below the input */
  helpText?: string;
  /** Error message to display */
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_STEP = 1;
const DEFAULT_DEBOUNCE_DELAY = 150;
const LARGE_STEP_MULTIPLIER = 10; // Shift+Arrow uses 10x step

// ============================================================================
// Component
// ============================================================================

/**
 * NumberField - Numeric input with unit support and validation
 */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  min,
  max,
  step = DEFAULT_STEP,
  placeholder,
  disabled = false,
  readOnly = false,
  allowEmpty = true,
  debounceDelay = DEFAULT_DEBOUNCE_DELAY,
  showSpinner = true,
  supportsExpression = false,
  className,
  id,
  helpText,
  error,
}: NumberFieldProps) {
  // Local editing state - only used while focused and typing
  // When null, we show the external value. When set, we show the local edit.
  const [editingValue, setEditingValue] = useState<string | null>(null);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate unique ID if not provided
  const fieldId =
    id ?? `number-field-${label.toLowerCase().replace(/\s+/g, "-")}`;

  // Compute the displayed value:
  // - When editing (focused with local changes), show editingValue
  // - Otherwise, show the external value
  const displayValue =
    editingValue !== null
      ? editingValue
      : value !== undefined
        ? String(value)
        : "";

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Parse input string to number with validation
   */
  const parseValue = useCallback(
    (inputValue: string): number | undefined => {
      if (inputValue.trim() === "") {
        return allowEmpty ? undefined : (min ?? 0);
      }

      // Check for expression syntax
      if (supportsExpression && inputValue.includes("{{")) {
        // Expression values are handled differently
        return undefined;
      }

      const parsed = parseFloat(inputValue);
      if (isNaN(parsed)) {
        return allowEmpty ? undefined : (min ?? 0);
      }

      // Apply min/max constraints
      let constrained = parsed;
      if (min !== undefined) {
        constrained = Math.max(min, constrained);
      }
      if (max !== undefined) {
        constrained = Math.min(max, constrained);
      }

      return constrained;
    },
    [allowEmpty, min, max, supportsExpression]
  );

  /**
   * Handle input change with debounce
   */
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      setEditingValue(inputValue);

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce the onChange callback
      debounceTimerRef.current = setTimeout(() => {
        const parsed = parseValue(inputValue);
        onChange(parsed);
      }, debounceDelay);
    },
    [parseValue, onChange, debounceDelay]
  );

  /**
   * Handle blur - commit the value immediately
   */
  const handleBlur = useCallback(() => {
    // Clear pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Parse and commit the value from display value
    const parsed = parseValue(displayValue);
    onChange(parsed);

    // Clear editing value to show external value
    setEditingValue(null);
  }, [displayValue, parseValue, onChange]);

  /**
   * Handle focus - we don't need to track focus state separately
   * The editingValue being non-null indicates we're editing
   */
  const handleFocus = useCallback(() => {
    // Nothing needed - editingValue tracks editing state
  }, []);

  /**
   * Handle keyboard events for increment/decrement
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (disabled || readOnly) return;

      const currentValue = parseValue(displayValue) ?? min ?? 0;
      const actualStep = e.shiftKey ? step * LARGE_STEP_MULTIPLIER : step;

      if (e.key === "ArrowUp") {
        e.preventDefault();
        let newValue = currentValue + actualStep;
        if (max !== undefined) {
          newValue = Math.min(max, newValue);
        }
        setEditingValue(null); // Clear local editing
        onChange(newValue);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        let newValue = currentValue - actualStep;
        if (min !== undefined) {
          newValue = Math.max(min, newValue);
        }
        setEditingValue(null); // Clear local editing
        onChange(newValue);
      } else if (e.key === "Enter") {
        // Commit on enter
        handleBlur();
      } else if (e.key === "Escape") {
        // Revert to original value - clear editing
        setEditingValue(null);
        // Blur the input to lose focus
        (e.target as HTMLInputElement).blur();
      }
    },
    [
      disabled,
      readOnly,
      displayValue,
      parseValue,
      step,
      min,
      max,
      onChange,
      handleBlur,
    ]
  );

  /**
   * Increment value by step
   */
  const increment = useCallback(() => {
    if (disabled || readOnly) return;
    const currentValue = parseValue(displayValue) ?? min ?? 0;
    let newValue = currentValue + step;
    if (max !== undefined) {
      newValue = Math.min(max, newValue);
    }
    setEditingValue(null); // Clear local editing, let external value update
    onChange(newValue);
  }, [disabled, readOnly, displayValue, parseValue, step, min, max, onChange]);

  /**
   * Decrement value by step
   */
  const decrement = useCallback(() => {
    if (disabled || readOnly) return;
    const currentValue = parseValue(displayValue) ?? min ?? 0;
    let newValue = currentValue - step;
    if (min !== undefined) {
      newValue = Math.max(min, newValue);
    }
    setEditingValue(null); // Clear local editing, let external value update
    onChange(newValue);
  }, [disabled, readOnly, displayValue, parseValue, step, min, onChange]);

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={fieldId} className="text-xs font-medium">
        {label}
      </Label>

      <div className="relative flex items-center">
        <Input
          id={fieldId}
          type="text" // Use text to allow expressions and better control
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
          disabled={disabled}
          readOnly={readOnly}
          className={cn(
            "h-8 text-sm",
            unit && "pr-12",
            showSpinner && "pr-16",
            error && "border-destructive focus-visible:ring-destructive"
          )}
          aria-invalid={!!error}
          aria-describedby={
            error
              ? `${fieldId}-error`
              : helpText
                ? `${fieldId}-help`
                : undefined
          }
        />

        {/* Unit display */}
        {unit && (
          <span className="text-muted-foreground absolute right-2 text-xs select-none">
            {unit}
          </span>
        )}

        {/* Spinner buttons */}
        {showSpinner && !disabled && !readOnly && (
          <div className="absolute right-1 flex flex-col">
            <button
              type="button"
              onClick={increment}
              className={cn(
                "flex h-3.5 w-5 items-center justify-center rounded-t border-l",
                "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                "focus-visible:ring-ring focus:outline-none focus-visible:ring-1"
              )}
              tabIndex={-1}
              aria-label={`Increase ${label}`}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M4 2L7 5H1L4 2Z" fill="currentColor" />
              </svg>
            </button>
            <button
              type="button"
              onClick={decrement}
              className={cn(
                "flex h-3.5 w-5 items-center justify-center rounded-b border-t border-l",
                "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                "focus-visible:ring-ring focus:outline-none focus-visible:ring-1"
              )}
              tabIndex={-1}
              aria-label={`Decrease ${label}`}
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M4 6L1 3H7L4 6Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Help text */}
      {helpText && !error && (
        <p id={`${fieldId}-help`} className="text-muted-foreground text-xs">
          {helpText}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p id={`${fieldId}-error`} className="text-destructive text-xs">
          {error}
        </p>
      )}
    </div>
  );
}

export default NumberField;
