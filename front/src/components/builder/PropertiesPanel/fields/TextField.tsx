/**
 * TextField Component
 * Text input field with expression support for dynamic data binding
 *
 * Features:
 * - Single-line or multi-line text input
 * - Expression support ({{ data.value }}) with visual highlighting
 * - Real-time two-way binding with debounce
 * - Validation and character limits
 * - Placeholder and help text
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
 * Props for TextField component
 */
export interface TextFieldProps {
  /** Field label */
  label: string;
  /** Current value */
  value: string | undefined;
  /** Callback when value changes */
  onChange: (value: string | undefined) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is read-only */
  readOnly?: boolean;
  /** Whether to allow empty/undefined values */
  allowEmpty?: boolean;
  /** Maximum character length */
  maxLength?: number;
  /** Minimum character length (for validation) */
  minLength?: number;
  /** Debounce delay in ms (default: 150) */
  debounceDelay?: number;
  /** Whether expression syntax is supported ({{ }}) */
  supportsExpression?: boolean;
  /** Whether to use multi-line textarea */
  multiline?: boolean;
  /** Number of rows for multiline (default: 3) */
  rows?: number;
  /** Additional CSS classes */
  className?: string;
  /** ID for accessibility */
  id?: string;
  /** Help text shown below the input */
  helpText?: string;
  /** Error message to display */
  error?: string;
  /** Validation pattern (regex) */
  pattern?: RegExp;
  /** Custom validation error message */
  patternError?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DEBOUNCE_DELAY = 150;
const EXPRESSION_REGEX = /\{\{[^}]*\}\}/g;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Check if a string contains expression syntax
 */
function containsExpression(value: string): boolean {
  return EXPRESSION_REGEX.test(value);
}

/**
 * Validate the text value
 */
function validateValue(
  value: string,
  minLength?: number,
  maxLength?: number,
  pattern?: RegExp
): string | null {
  if (minLength !== undefined && value.length < minLength) {
    return `Minimum ${minLength} characters required`;
  }
  if (maxLength !== undefined && value.length > maxLength) {
    return `Maximum ${maxLength} characters allowed`;
  }
  if (pattern && !pattern.test(value)) {
    return "Invalid format";
  }
  return null;
}

// ============================================================================
// Component
// ============================================================================

/**
 * TextField - Text input with expression support and validation
 */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  readOnly = false,
  allowEmpty = true,
  maxLength,
  minLength,
  debounceDelay = DEFAULT_DEBOUNCE_DELAY,
  supportsExpression = false,
  multiline = false,
  rows = 3,
  className,
  id,
  helpText,
  error,
  pattern,
  patternError,
}: TextFieldProps) {
  // Local editing state - only used while focused and typing
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate unique ID if not provided
  const fieldId =
    id ?? `text-field-${label.toLowerCase().replace(/\s+/g, "-")}`;

  // Compute the displayed value
  const displayValue =
    editingValue !== null ? editingValue : value !== undefined ? value : "";

  // Check if current value contains expressions
  const hasExpression = supportsExpression && containsExpression(displayValue);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Process input value
   */
  const processValue = useCallback(
    (inputValue: string): string | undefined => {
      if (inputValue.trim() === "" && allowEmpty) {
        return undefined;
      }
      return inputValue;
    },
    [allowEmpty]
  );

  /**
   * Handle input change with debounce
   */
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const inputValue = e.target.value;

      // Enforce maxLength if specified
      if (maxLength !== undefined && inputValue.length > maxLength) {
        return;
      }

      setEditingValue(inputValue);

      // Validate
      const validationResult = validateValue(
        inputValue,
        minLength,
        maxLength,
        pattern
      );
      setValidationError(
        validationResult ? (patternError ?? validationResult) : null
      );

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce the onChange callback
      debounceTimerRef.current = setTimeout(() => {
        const processed = processValue(inputValue);
        onChange(processed);
      }, debounceDelay);
    },
    [
      maxLength,
      minLength,
      pattern,
      patternError,
      processValue,
      onChange,
      debounceDelay,
    ]
  );

  /**
   * Handle blur - commit the value immediately
   */
  const handleBlur = useCallback(() => {
    // Clear pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Process and commit the value
    const processed = processValue(displayValue);
    onChange(processed);

    // Clear editing value to show external value
    setEditingValue(null);
  }, [displayValue, processValue, onChange]);

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (disabled || readOnly) return;

      if (e.key === "Enter" && !multiline) {
        // Commit on enter for single-line
        handleBlur();
      } else if (e.key === "Escape") {
        // Revert to original value
        setEditingValue(null);
        setValidationError(null);
        (e.target as HTMLInputElement | HTMLTextAreaElement).blur();
      }
    },
    [disabled, readOnly, multiline, handleBlur]
  );

  // Display error (prop error takes precedence over validation error)
  const displayError = error ?? validationError;

  // Common props for input elements
  const inputProps = {
    id: fieldId,
    value: displayValue,
    onChange: handleChange,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    placeholder: placeholder ?? `Enter ${label.toLowerCase()}`,
    disabled,
    readOnly,
    maxLength,
    "aria-invalid": !!displayError,
    "aria-describedby": displayError
      ? `${fieldId}-error`
      : helpText
        ? `${fieldId}-help`
        : undefined,
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={fieldId} className="text-xs font-medium">
          {label}
        </Label>
        {supportsExpression && hasExpression && (
          <span className="bg-primary/10 text-primary rounded px-1.5 py-0.5 text-[10px] font-medium">
            Expression
          </span>
        )}
      </div>

      <div className="relative">
        {multiline ? (
          <textarea
            {...inputProps}
            rows={rows}
            className={cn(
              "border-input flex min-h-15 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm transition-colors",
              "placeholder:text-muted-foreground",
              "focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "resize-y",
              hasExpression && "font-mono text-xs",
              displayError &&
                "border-destructive focus-visible:ring-destructive"
            )}
          />
        ) : (
          <Input
            {...inputProps}
            type="text"
            className={cn(
              "h-8 text-sm",
              hasExpression && "font-mono text-xs",
              displayError &&
                "border-destructive focus-visible:ring-destructive"
            )}
          />
        )}

        {/* Character count indicator */}
        {maxLength && (
          <span
            className={cn(
              "absolute right-2 bottom-2 text-[10px] select-none",
              displayValue.length > maxLength * 0.9
                ? "text-destructive"
                : "text-muted-foreground"
            )}
          >
            {displayValue.length}/{maxLength}
          </span>
        )}
      </div>

      {/* Expression hint */}
      {supportsExpression && !hasExpression && (
        <p className="text-muted-foreground text-[10px]">
          Use {"{{ expression }}"} for dynamic values
        </p>
      )}

      {/* Help text */}
      {helpText && !displayError && (
        <p id={`${fieldId}-help`} className="text-muted-foreground text-xs">
          {helpText}
        </p>
      )}

      {/* Error message */}
      {displayError && (
        <p id={`${fieldId}-error`} className="text-destructive text-xs">
          {displayError}
        </p>
      )}
    </div>
  );
}

export default TextField;
