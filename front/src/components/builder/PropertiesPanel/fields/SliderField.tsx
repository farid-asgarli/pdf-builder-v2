/**
 * SliderField Component
 * Slider input for numeric range values
 *
 * Features:
 * - Visual slider with track and thumb
 * - Numeric input for precise values
 * - Min/max constraints
 * - Step increments
 * - Optional unit suffix
 * - Value tooltip on drag
 * - Keyboard accessible
 */
"use client";

import { useState, useCallback, useRef, useEffect, useId } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { SizeUnit } from "./NumberField";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for SliderField component
 */
export interface SliderFieldProps {
  /** Field label */
  label: string;
  /** Current value */
  value: number | undefined;
  /** Callback when value changes */
  onChange: (value: number | undefined) => void;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Step increment */
  step?: number;
  /** Unit to display */
  unit?: SizeUnit | string;
  /** Default value when undefined */
  defaultValue?: number;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is read-only */
  readOnly?: boolean;
  /** Whether to allow empty/undefined values */
  allowEmpty?: boolean;
  /** Whether to show the numeric input */
  showInput?: boolean;
  /** Whether to show value tooltip on drag */
  showTooltip?: boolean;
  /** Whether to show min/max labels */
  showMinMax?: boolean;
  /** Debounce delay in ms */
  debounceDelay?: number;
  /** Additional CSS classes */
  className?: string;
  /** ID for accessibility */
  id?: string;
  /** Help text shown below the input */
  helpText?: string;
  /** Error message to display */
  error?: string;
  /** Value formatter for display */
  formatValue?: (value: number) => string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_STEP = 1;
const DEFAULT_DEBOUNCE_DELAY = 50;

// ============================================================================
// Component
// ============================================================================

/**
 * SliderField - Visual slider with numeric input
 */
export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step = DEFAULT_STEP,
  unit,
  defaultValue,
  disabled = false,
  readOnly = false,
  allowEmpty = false,
  showInput = true,
  showTooltip = true,
  showMinMax = false,
  debounceDelay = DEFAULT_DEBOUNCE_DELAY,
  className,
  id,
  helpText,
  error,
  formatValue,
}: SliderFieldProps) {
  // Local state for dragging
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState<number | undefined>(value);

  // Refs
  const sliderRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Generate unique ID
  const generatedId = useId();
  const fieldId = id ?? `slider-field-${generatedId}`;

  // Effective value (use default if undefined)
  const effectiveValue = localValue ?? defaultValue ?? min;

  // Calculate percentage for visual positioning
  const percentage = ((effectiveValue - min) / (max - min)) * 100;

  // Format value for display
  const displayValue = formatValue
    ? formatValue(effectiveValue)
    : String(effectiveValue);

  // Sync local value with external value when not dragging
  // This is an intentional state synchronization pattern - when the external value changes
  // and the user is not actively dragging, we need to update the local state to reflect it
  useEffect(() => {
    if (!isDragging) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocalValue(value);
    }
  }, [value, isDragging]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Calculate value from mouse/touch position
   */
  const calculateValue = useCallback(
    (clientX: number): number => {
      if (!sliderRef.current) return min;

      const rect = sliderRef.current.getBoundingClientRect();
      const percentage = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width)
      );
      const rawValue = min + percentage * (max - min);

      // Round to step
      const steppedValue = Math.round(rawValue / step) * step;

      // Clamp to min/max
      return Math.max(min, Math.min(max, steppedValue));
    },
    [min, max, step]
  );

  /**
   * Update value with debouncing
   */
  const updateValue = useCallback(
    (newValue: number, immediate = false) => {
      setLocalValue(newValue);

      if (immediate) {
        onChange(newValue);
      } else {
        // Debounce the onChange callback
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          onChange(newValue);
        }, debounceDelay);
      }
    },
    [debounceDelay, onChange]
  );

  /**
   * Handle mouse down on slider
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled || readOnly) return;

      e.preventDefault();
      setIsDragging(true);

      const newValue = calculateValue(e.clientX);
      updateValue(newValue);

      // Add global mouse listeners
      const handleMouseMove = (e: MouseEvent) => {
        const newValue = calculateValue(e.clientX);
        updateValue(newValue);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        // Final update
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        onChange(localValue ?? effectiveValue);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [
      disabled,
      readOnly,
      calculateValue,
      updateValue,
      onChange,
      localValue,
      effectiveValue,
    ]
  );

  /**
   * Handle touch start on slider
   */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || readOnly) return;

      e.preventDefault();
      setIsDragging(true);

      const touch = e.touches[0];
      const newValue = calculateValue(touch.clientX);
      updateValue(newValue);

      // Add global touch listeners
      const handleTouchMove = (e: TouchEvent) => {
        const touch = e.touches[0];
        const newValue = calculateValue(touch.clientX);
        updateValue(newValue);
      };

      const handleTouchEnd = () => {
        setIsDragging(false);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);

        // Final update
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        onChange(localValue ?? effectiveValue);
      };

      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleTouchEnd);
    },
    [
      disabled,
      readOnly,
      calculateValue,
      updateValue,
      onChange,
      localValue,
      effectiveValue,
    ]
  );

  /**
   * Handle keyboard input on slider
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled || readOnly) return;

      let newValue = effectiveValue;
      const largeStep = step * 10;

      switch (e.key) {
        case "ArrowRight":
        case "ArrowUp":
          e.preventDefault();
          newValue = Math.min(max, effectiveValue + step);
          break;
        case "ArrowLeft":
        case "ArrowDown":
          e.preventDefault();
          newValue = Math.max(min, effectiveValue - step);
          break;
        case "PageUp":
          e.preventDefault();
          newValue = Math.min(max, effectiveValue + largeStep);
          break;
        case "PageDown":
          e.preventDefault();
          newValue = Math.max(min, effectiveValue - largeStep);
          break;
        case "Home":
          e.preventDefault();
          newValue = min;
          break;
        case "End":
          e.preventDefault();
          newValue = max;
          break;
        default:
          return;
      }

      updateValue(newValue, true);
    },
    [disabled, readOnly, effectiveValue, step, min, max, updateValue]
  );

  /**
   * Handle numeric input change
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;

      if (inputValue === "" && allowEmpty) {
        setLocalValue(undefined);
        onChange(undefined);
        return;
      }

      const parsed = parseFloat(inputValue);
      if (!isNaN(parsed)) {
        const clamped = Math.max(min, Math.min(max, parsed));
        setLocalValue(clamped);
        onChange(clamped);
      }
    },
    [allowEmpty, min, max, onChange]
  );

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label */}
      <div className="flex items-center justify-between">
        <Label
          htmlFor={fieldId}
          className={cn(
            "text-sm font-medium",
            disabled && "opacity-50",
            error && "text-destructive"
          )}
        >
          {label}
        </Label>

        {/* Numeric Input */}
        {showInput && (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={localValue !== undefined ? localValue : ""}
              onChange={handleInputChange}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
              readOnly={readOnly}
              className={cn(
                "h-7 w-16 text-center text-xs",
                error && "border-destructive"
              )}
            />
            {unit && (
              <span className="text-muted-foreground text-xs">{unit}</span>
            )}
          </div>
        )}
      </div>

      {/* Slider Track */}
      <div
        ref={sliderRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={effectiveValue}
        aria-valuetext={`${displayValue}${unit ? ` ${unit}` : ""}`}
        aria-disabled={disabled}
        aria-readonly={readOnly}
        aria-label={label}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onKeyDown={handleKeyDown}
        className={cn(
          "relative h-5 cursor-pointer rounded-full",
          "focus-visible:ring-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          disabled && "cursor-not-allowed opacity-50",
          readOnly && "cursor-default"
        )}
      >
        {/* Track Background */}
        <div className="bg-muted absolute top-1/2 h-2 w-full -translate-y-1/2 rounded-full" />

        {/* Track Fill */}
        <div
          className="bg-primary absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
          style={{ width: `${percentage}%` }}
        />

        {/* Thumb */}
        <div
          className={cn(
            "border-primary bg-background absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow transition-shadow",
            isDragging && "ring-primary/50 ring-2",
            disabled && "bg-muted"
          )}
          style={{ left: `${percentage}%` }}
        >
          {/* Tooltip */}
          {showTooltip && isDragging && (
            <div
              className={cn(
                "bg-primary text-primary-foreground absolute bottom-full left-1/2 mb-2 -translate-x-1/2 rounded px-2 py-0.5 text-xs whitespace-nowrap",
                "animate-in fade-in-0 zoom-in-95"
              )}
            >
              {displayValue}
              {unit && ` ${unit}`}
            </div>
          )}
        </div>
      </div>

      {/* Min/Max Labels */}
      {showMinMax && (
        <div className="text-muted-foreground flex justify-between text-xs">
          <span>
            {min}
            {unit && ` ${unit}`}
          </span>
          <span>
            {max}
            {unit && ` ${unit}`}
          </span>
        </div>
      )}

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
export default SliderField;
