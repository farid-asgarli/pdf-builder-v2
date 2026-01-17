/**
 * DropIndicator Component
 * Visual indicator showing where a component will be inserted during drag and drop
 *
 * Features:
 * - Line indicator for before/after positions
 * - Highlight overlay for inside position
 * - Animated transitions
 * - Invalid drop feedback
 */

"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { DropZonePosition } from "@/types/canvas";

// ============================================================================
// Types
// ============================================================================

export interface DropIndicatorProps {
  /** Position of the indicator */
  position: DropZonePosition;
  /** Whether the drop is valid at this position */
  isValid?: boolean;
  /** Whether the indicator is currently active/visible */
  isActive?: boolean;
  /** Optional class name */
  className?: string;
  /** Depth level for indentation */
  depth?: number;
}

// ============================================================================
// Constants
// ============================================================================

const INDICATOR_COLORS = {
  valid: {
    line: "bg-primary",
    fill: "bg-primary/10 border-primary",
    dot: "bg-primary",
  },
  invalid: {
    line: "bg-destructive",
    fill: "bg-destructive/10 border-destructive",
    dot: "bg-destructive",
  },
};

// ============================================================================
// Component
// ============================================================================

/**
 * DropIndicator - Shows visual feedback for drop position
 *
 * Renders different indicators based on position:
 * - before/start: Line at top
 * - after/end: Line at bottom
 * - inside: Highlighted border/overlay
 */
function DropIndicatorComponent({
  position,
  isValid = true,
  isActive = true,
  className,
  depth = 0,
}: DropIndicatorProps) {
  if (!isActive) {
    return null;
  }

  const colors = isValid ? INDICATOR_COLORS.valid : INDICATOR_COLORS.invalid;

  // Line indicator for before/after positions
  if (position === "before" || position === "start") {
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-50",
          "flex items-center",
          className
        )}
        style={{ paddingLeft: depth * 16 }}
        role="presentation"
        aria-hidden="true"
      >
        <div
          className={cn(
            "h-0.5 flex-1 rounded-full",
            colors.line,
            "animate-pulse"
          )}
        />
        <div
          className={cn(
            "absolute top-1/2 -left-1 h-3 w-3 -translate-y-1/2 rounded-full",
            colors.dot,
            "shadow-sm"
          )}
          style={{ marginLeft: depth * 16 }}
        />
      </div>
    );
  }

  if (position === "after" || position === "end") {
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-50",
          "flex items-center",
          className
        )}
        style={{ paddingLeft: depth * 16 }}
        role="presentation"
        aria-hidden="true"
      >
        <div
          className={cn(
            "h-0.5 flex-1 rounded-full",
            colors.line,
            "animate-pulse"
          )}
        />
        <div
          className={cn(
            "absolute top-1/2 -left-1 h-3 w-3 -translate-y-1/2 rounded-full",
            colors.dot,
            "shadow-sm"
          )}
          style={{ marginLeft: depth * 16 }}
        />
      </div>
    );
  }

  // Overlay indicator for inside position
  if (position === "inside") {
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-40",
          "rounded-md border-2 border-dashed",
          colors.fill,
          "transition-colors duration-150",
          className
        )}
        role="presentation"
        aria-hidden="true"
      >
        {/* Optional: center text for empty containers */}
        <div className="flex h-full items-center justify-center">
          <span
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium",
              isValid
                ? "bg-primary/20 text-primary"
                : "bg-destructive/20 text-destructive"
            )}
          >
            {isValid ? "Drop here" : "Cannot drop here"}
          </span>
        </div>
      </div>
    );
  }

  return null;
}

export const DropIndicator = memo(DropIndicatorComponent);
DropIndicator.displayName = "DropIndicator";

// ============================================================================
// Compact Line Indicator (for tree view)
// ============================================================================

export interface DropLineIndicatorProps {
  /** Position: top or bottom */
  position: "top" | "bottom";
  /** Whether valid */
  isValid?: boolean;
  /** Class name */
  className?: string;
}

/**
 * Simple line indicator for tree drag operations
 */
function DropLineIndicatorComponent({
  position,
  isValid = true,
  className,
}: DropLineIndicatorProps) {
  const colors = isValid ? INDICATOR_COLORS.valid : INDICATOR_COLORS.invalid;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 z-50 h-0.5",
        position === "top" ? "top-0" : "bottom-0",
        colors.line,
        className
      )}
      role="presentation"
      aria-hidden="true"
    />
  );
}

export const DropLineIndicator = memo(DropLineIndicatorComponent);
DropLineIndicator.displayName = "DropLineIndicator";

export default DropIndicator;
