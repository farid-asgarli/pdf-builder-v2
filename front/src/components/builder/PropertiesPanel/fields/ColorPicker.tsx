/**
 * ColorPicker Component
 * Color selection input with preset palette and hex input
 *
 * Features:
 * - Hex color input with validation
 * - Color preset palette
 * - Visual color preview swatch
 * - Expression support ({{ data.color }})
 * - Common color names support (black, white, etc.)
 * - Alpha/opacity support (optional)
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  COLOR_PALETTE,
  COMMON_COLORS,
  isValidColor,
} from "@/lib/constants/colors";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for ColorPicker component
 */
export interface ColorPickerProps {
  /** Field label */
  label: string;
  /** Current color value (hex, named color, or expression) */
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
  /** Debounce delay in ms (default: 150) */
  debounceDelay?: number;
  /** Whether expression syntax is supported ({{ }}) */
  supportsExpression?: boolean;
  /** Whether to show color palette */
  showPalette?: boolean;
  /** Whether to show named colors (black, white, etc.) */
  showNamedColors?: boolean;
  /** Custom color palette (overrides default) */
  customPalette?: readonly string[];
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

const DEFAULT_DEBOUNCE_DELAY = 150;
const EXPRESSION_REGEX = /\{\{[^}]*\}\}/;

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
 * Normalize hex color to include # prefix
 */
function normalizeHexColor(value: string): string {
  if (!value.startsWith("#") && /^[0-9A-Fa-f]{6}$/.test(value)) {
    return `#${value}`;
  }
  return value;
}

/**
 * Get the display color for the swatch (returns fallback if invalid)
 */
function getDisplayColor(value: string | undefined): string | null {
  if (!value) return null;
  if (containsExpression(value)) return null;

  const normalized = normalizeHexColor(value);
  if (isValidColor(normalized)) {
    return normalized;
  }
  return null;
}

// ============================================================================
// Component
// ============================================================================

/**
 * ColorPicker - Color selection with palette and hex input
 */
export function ColorPicker({
  label,
  value,
  onChange,
  placeholder = "#000000",
  disabled = false,
  readOnly = false,
  allowEmpty = true,
  debounceDelay = DEFAULT_DEBOUNCE_DELAY,
  supportsExpression = false,
  showPalette = true,
  showNamedColors = false,
  customPalette,
  className,
  id,
  helpText,
  error,
}: ColorPickerProps) {
  // Local editing state
  const [editingValue, setEditingValue] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate unique ID if not provided
  const fieldId =
    id ?? `color-picker-${label.toLowerCase().replace(/\s+/g, "-")}`;

  // Compute the displayed value
  const displayValue =
    editingValue !== null ? editingValue : value !== undefined ? value : "";

  // Get the color for swatch display
  const swatchColor = getDisplayColor(displayValue);
  const hasExpression = supportsExpression && containsExpression(displayValue);

  // Color palette to use
  const palette = customPalette ?? COLOR_PALETTE;

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Close palette on outside click
  useEffect(() => {
    if (!isPaletteOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsPaletteOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPaletteOpen]);

  /**
   * Validate color value
   */
  const validateColor = useCallback(
    (inputValue: string): string | null => {
      if (inputValue.trim() === "") return null;
      if (supportsExpression && containsExpression(inputValue)) return null;

      const normalized = normalizeHexColor(inputValue);
      if (!isValidColor(normalized)) {
        return "Invalid color format";
      }
      return null;
    },
    [supportsExpression]
  );

  /**
   * Process input value
   */
  const processValue = useCallback(
    (inputValue: string): string | undefined => {
      if (inputValue.trim() === "" && allowEmpty) {
        return undefined;
      }
      return normalizeHexColor(inputValue);
    },
    [allowEmpty]
  );

  /**
   * Handle input change with debounce
   */
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      setEditingValue(inputValue);

      // Validate
      const validationResult = validateColor(inputValue);
      setValidationError(validationResult);

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
    [validateColor, processValue, onChange, debounceDelay]
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

    // Clear editing value
    setEditingValue(null);
  }, [displayValue, processValue, onChange]);

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (disabled || readOnly) return;

      if (e.key === "Enter") {
        handleBlur();
        setIsPaletteOpen(false);
      } else if (e.key === "Escape") {
        setEditingValue(null);
        setValidationError(null);
        setIsPaletteOpen(false);
        (e.target as HTMLInputElement).blur();
      }
    },
    [disabled, readOnly, handleBlur]
  );

  /**
   * Handle palette color selection
   */
  const handlePaletteSelect = useCallback(
    (color: string) => {
      setEditingValue(null);
      setValidationError(null);
      onChange(color);
      setIsPaletteOpen(false);
    },
    [onChange]
  );

  /**
   * Handle named color selection
   */
  const handleNamedColorSelect = useCallback(
    (colorName: string) => {
      setEditingValue(null);
      setValidationError(null);
      onChange(colorName);
      setIsPaletteOpen(false);
    },
    [onChange]
  );

  /**
   * Toggle palette visibility
   */
  const togglePalette = useCallback(() => {
    if (!disabled && !readOnly) {
      setIsPaletteOpen((prev) => !prev);
    }
  }, [disabled, readOnly]);

  // Display error (prop error takes precedence)
  const displayError = error ?? validationError;

  return (
    <div ref={containerRef} className={cn("space-y-1.5", className)}>
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
        <div className="flex items-center gap-2">
          {/* Color swatch button */}
          <button
            type="button"
            onClick={togglePalette}
            disabled={disabled || readOnly}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border shadow-sm",
              "focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none",
              "disabled:cursor-not-allowed disabled:opacity-50",
              displayError && "border-destructive"
            )}
            aria-label="Select color from palette"
            aria-expanded={isPaletteOpen}
          >
            {swatchColor ? (
              <span
                className="h-5 w-5 rounded-sm border border-black/10"
                style={{ backgroundColor: swatchColor }}
              />
            ) : (
              <span className="border-muted-foreground/50 bg-muted/50 h-5 w-5 rounded-sm border border-dashed" />
            )}
          </button>

          {/* Text input */}
          <Input
            id={fieldId}
            type="text"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsPaletteOpen(false)}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            className={cn(
              "h-8 flex-1 font-mono text-sm uppercase",
              hasExpression && "text-xs normal-case",
              displayError &&
                "border-destructive focus-visible:ring-destructive"
            )}
            aria-invalid={!!displayError}
            aria-describedby={
              displayError
                ? `${fieldId}-error`
                : helpText
                  ? `${fieldId}-help`
                  : undefined
            }
          />
        </div>

        {/* Color palette dropdown */}
        {isPaletteOpen && showPalette && (
          <div
            className={cn(
              "bg-popover absolute z-50 mt-1 w-full rounded-md border p-2 shadow-md",
              "animate-in fade-in-0 zoom-in-95"
            )}
          >
            {/* Hex color palette */}
            <div className="grid grid-cols-6 gap-1">
              {palette.map((color) => (
                <Tooltip key={color}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handlePaletteSelect(color)}
                      className={cn(
                        "h-6 w-full rounded-sm border border-black/10 transition-transform",
                        "hover:ring-ring hover:scale-110 hover:ring-2 hover:ring-offset-1",
                        "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
                        value === color && "ring-primary ring-2 ring-offset-1"
                      )}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {color}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>

            {/* Named colors section */}
            {showNamedColors && (
              <>
                <div className="my-2 border-t" />
                <div className="flex flex-wrap gap-1">
                  {COMMON_COLORS.filter((c) => c !== "transparent").map(
                    (colorName) => (
                      <button
                        key={colorName}
                        type="button"
                        onClick={() => handleNamedColorSelect(colorName)}
                        className={cn(
                          "rounded-sm border px-2 py-0.5 text-[10px] capitalize",
                          "hover:bg-accent hover:text-accent-foreground",
                          "focus-visible:ring-ring focus-visible:ring-1 focus-visible:outline-none",
                          value === colorName && "bg-primary/10 border-primary"
                        )}
                      >
                        {colorName}
                      </button>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

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

export default ColorPicker;
