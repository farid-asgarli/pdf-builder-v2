/**
 * AlignmentPicker Component
 * Visual 3x3 grid alignment picker for horizontal and vertical alignment
 *
 * Features:
 * - 3x3 visual grid for intuitive alignment selection
 * - Horizontal alignment: left, center, right
 * - Vertical alignment: top, middle, bottom
 * - Keyboard navigation support
 * - Combined or separate horizontal/vertical modes
 * - Visual feedback for current selection
 */
"use client";

import { useCallback, useId } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { HorizontalAlignment, VerticalAlignment } from "@/types/component";

// ============================================================================
// Types
// ============================================================================

/**
 * Combined alignment value for the 3x3 grid
 */
export interface AlignmentValue {
  horizontal: HorizontalAlignment;
  vertical: VerticalAlignment;
}

/**
 * Alignment mode - combined or single axis
 */
export type AlignmentMode = "combined" | "horizontal" | "vertical";

/**
 * Props for AlignmentPicker component
 */
export interface AlignmentPickerProps {
  /** Field label */
  label: string;
  /** Current alignment value */
  value: AlignmentValue | undefined;
  /** Callback when alignment changes */
  onChange: (value: AlignmentValue) => void;
  /** Alignment mode */
  mode?: AlignmentMode;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is read-only */
  readOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** ID for accessibility */
  id?: string;
  /** Help text shown below the picker */
  helpText?: string;
  /** Error message to display */
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const HORIZONTAL_VALUES: HorizontalAlignment[] = ["left", "center", "right"];
const VERTICAL_VALUES: VerticalAlignment[] = ["top", "middle", "bottom"];

// Alignment position labels for tooltips
const ALIGNMENT_LABELS: Record<string, string> = {
  "top-left": "Top Left",
  "top-center": "Top Center",
  "top-right": "Top Right",
  "middle-left": "Middle Left",
  "middle-center": "Center",
  "middle-right": "Middle Right",
  "bottom-left": "Bottom Left",
  "bottom-center": "Bottom Center",
  "bottom-right": "Bottom Right",
};

// Default alignment
const DEFAULT_ALIGNMENT: AlignmentValue = {
  horizontal: "left",
  vertical: "top",
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the position key for an alignment combination
 */
function getPositionKey(
  horizontal: HorizontalAlignment,
  vertical: VerticalAlignment
): string {
  return `${vertical}-${horizontal}`;
}

/**
 * Get grid position indices from alignment value
 */
function getGridPosition(value: AlignmentValue): { row: number; col: number } {
  const col = HORIZONTAL_VALUES.indexOf(value.horizontal);
  const row = VERTICAL_VALUES.indexOf(
    value.vertical === "center" ? "middle" : value.vertical
  );
  return { row: row === -1 ? 0 : row, col: col === -1 ? 0 : col };
}

// ============================================================================
// Component
// ============================================================================

/**
 * AlignmentPicker - Visual 3x3 grid for alignment selection
 */
export function AlignmentPicker({
  label,
  value = DEFAULT_ALIGNMENT,
  onChange,
  mode = "combined",
  disabled = false,
  readOnly = false,
  className,
  id,
  helpText,
  error,
}: AlignmentPickerProps) {
  // Generate unique ID if not provided
  const generatedId = useId();
  const fieldId = id ?? `alignment-picker-${generatedId}`;

  // Normalize value - handle "center" as "middle" for vertical
  const normalizedValue: AlignmentValue = {
    horizontal: value?.horizontal ?? "left",
    vertical:
      value?.vertical === "center" ? "middle" : (value?.vertical ?? "top"),
  };

  // Current grid position
  const { row: currentRow, col: currentCol } = getGridPosition(normalizedValue);

  /**
   * Handle cell click
   */
  const handleCellClick = useCallback(
    (horizontal: HorizontalAlignment, vertical: VerticalAlignment) => {
      if (disabled || readOnly) return;

      // Convert "middle" back to "center" if needed for backend compatibility
      const newValue: AlignmentValue = {
        horizontal,
        vertical: vertical === "middle" ? "center" : vertical,
      };
      onChange(newValue);
    },
    [disabled, readOnly, onChange]
  );

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, row: number, col: number) => {
      if (disabled || readOnly) return;

      let newRow = row;
      let newCol = col;

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          newRow = Math.max(0, row - 1);
          break;
        case "ArrowDown":
          e.preventDefault();
          newRow = Math.min(2, row + 1);
          break;
        case "ArrowLeft":
          e.preventDefault();
          newCol = Math.max(0, col - 1);
          break;
        case "ArrowRight":
          e.preventDefault();
          newCol = Math.min(2, col + 1);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          handleCellClick(HORIZONTAL_VALUES[col], VERTICAL_VALUES[row]);
          return;
        default:
          return;
      }

      // Focus the new cell
      const newCellId = `${fieldId}-cell-${newRow}-${newCol}`;
      const newCell = document.getElementById(newCellId);
      newCell?.focus();
    },
    [disabled, readOnly, fieldId, handleCellClick]
  );

  /**
   * Render a single alignment cell
   */
  const renderCell = (row: number, col: number) => {
    const horizontal = HORIZONTAL_VALUES[col];
    const vertical = VERTICAL_VALUES[row];
    const positionKey = getPositionKey(horizontal, vertical);
    const isSelected = row === currentRow && col === currentCol;
    const cellId = `${fieldId}-cell-${row}-${col}`;

    // Determine if this cell should be selectable based on mode
    const isSelectable =
      mode === "combined" ||
      (mode === "horizontal" && row === currentRow) ||
      (mode === "vertical" && col === currentCol);

    return (
      <Tooltip key={positionKey}>
        <TooltipTrigger asChild>
          <button
            id={cellId}
            type="button"
            role="gridcell"
            aria-selected={isSelected}
            aria-label={ALIGNMENT_LABELS[positionKey]}
            disabled={disabled || !isSelectable}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => handleCellClick(horizontal, vertical)}
            onKeyDown={(e) => handleKeyDown(e, row, col)}
            className={cn(
              "relative flex h-6 w-6 items-center justify-center rounded-sm transition-all",
              "focus-visible:ring-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
              isSelected
                ? "bg-primary"
                : isSelectable
                  ? "bg-muted hover:bg-muted-foreground/20"
                  : "bg-muted/50",
              disabled && "cursor-not-allowed opacity-50",
              !isSelectable && !disabled && "cursor-not-allowed opacity-50",
              readOnly && "cursor-default"
            )}
          >
            {/* Alignment indicator dot */}
            <span
              className={cn(
                "h-2 w-2 rounded-full transition-colors",
                isSelected ? "bg-primary-foreground" : "bg-muted-foreground/40"
              )}
            />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {ALIGNMENT_LABELS[positionKey]}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label */}
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

      {/* Alignment Grid */}
      <div
        id={fieldId}
        role="grid"
        aria-label={`${label} alignment picker`}
        className={cn(
          "border-input bg-background inline-grid grid-cols-3 gap-1 rounded-md border p-1.5",
          disabled && "opacity-50",
          error && "border-destructive"
        )}
      >
        {VERTICAL_VALUES.map((_, row) => (
          <div key={row} role="row" className="contents">
            {HORIZONTAL_VALUES.map((_, col) => renderCell(row, col))}
          </div>
        ))}
      </div>

      {/* Current Value Display */}
      <div className="text-muted-foreground text-xs">
        {ALIGNMENT_LABELS[
          getPositionKey(normalizedValue.horizontal, normalizedValue.vertical)
        ] ?? "Unknown"}
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
export default AlignmentPicker;
