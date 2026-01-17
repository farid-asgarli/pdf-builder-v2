/**
 * DimensionTooltip Component
 * Shows current dimensions during resize operations
 *
 * Features:
 * - Real-time size display (e.g., "250 × 100px")
 * - Positioned near the resize handle being dragged
 * - Animated appearance/disappearance
 * - Color feedback when at constraints
 * - Support for different units (px, pt, %, etc.)
 */
"use client";

import { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { HandlePosition } from "./ResizeHandles";

// ============================================================================
// Types
// ============================================================================

/**
 * Size unit for display
 */
export type SizeUnit = "px" | "pt" | "%" | "cm" | "mm" | "inch";

/**
 * Constraint status for visual feedback
 */
export interface ConstraintStatus {
  atMinWidth?: boolean;
  atMaxWidth?: boolean;
  atMinHeight?: boolean;
  atMaxHeight?: boolean;
}

/**
 * Props for DimensionTooltip component
 */
export interface DimensionTooltipProps {
  /** Current width value */
  width: number;
  /** Current height value */
  height: number;
  /** Display unit (default: px) */
  unit?: SizeUnit;
  /** Which handle is being dragged (for positioning) */
  activeHandle?: HandlePosition | null;
  /** Whether the tooltip is visible */
  visible?: boolean;
  /** Position relative to component (x, y offset) */
  position?: { x: number; y: number };
  /** Current canvas zoom level */
  zoom?: number;
  /** Constraint status for color feedback */
  constraintStatus?: ConstraintStatus;
  /** Show only width (for horizontal-only resize) */
  showWidthOnly?: boolean;
  /** Show only height (for vertical-only resize) */
  showHeightOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default tooltip offset from component edge */
const DEFAULT_OFFSET = 8;

/**
 * Get tooltip position based on active handle
 */
function getTooltipPosition(
  handle: HandlePosition | null | undefined,
  componentWidth: number,
  componentHeight: number,
  offset: number = DEFAULT_OFFSET
): { x: number; y: number; anchor: string } {
  if (!handle) {
    // Default to bottom-right when no handle specified
    return {
      x: componentWidth + offset,
      y: componentHeight + offset,
      anchor: "top-left",
    };
  }

  const positions: Record<
    HandlePosition,
    { x: number; y: number; anchor: string }
  > = {
    nw: { x: -offset, y: -offset, anchor: "bottom-right" },
    n: { x: componentWidth / 2, y: -offset, anchor: "bottom-center" },
    ne: { x: componentWidth + offset, y: -offset, anchor: "bottom-left" },
    e: {
      x: componentWidth + offset,
      y: componentHeight / 2,
      anchor: "middle-left",
    },
    se: {
      x: componentWidth + offset,
      y: componentHeight + offset,
      anchor: "top-left",
    },
    s: {
      x: componentWidth / 2,
      y: componentHeight + offset,
      anchor: "top-center",
    },
    sw: { x: -offset, y: componentHeight + offset, anchor: "top-right" },
    w: { x: -offset, y: componentHeight / 2, anchor: "middle-right" },
  };

  return positions[handle];
}

/**
 * Format dimension value for display
 */
function formatDimension(value: number, unit: SizeUnit): string {
  // Round to appropriate precision based on unit
  let formattedValue: string;

  switch (unit) {
    case "px":
    case "pt":
      formattedValue = Math.round(value).toString();
      break;
    case "%":
      formattedValue = value.toFixed(1);
      break;
    case "cm":
    case "mm":
    case "inch":
      formattedValue = value.toFixed(2);
      break;
    default:
      formattedValue = Math.round(value).toString();
  }

  return formattedValue;
}

/**
 * Get anchor transform based on position anchor
 */
function getAnchorTransform(anchor: string): string {
  const transforms: Record<string, string> = {
    "top-left": "translate(0, 0)",
    "top-center": "translate(-50%, 0)",
    "top-right": "translate(-100%, 0)",
    "middle-left": "translate(0, -50%)",
    "middle-center": "translate(-50%, -50%)",
    "middle-right": "translate(-100%, -50%)",
    "bottom-left": "translate(0, -100%)",
    "bottom-center": "translate(-50%, -100%)",
    "bottom-right": "translate(-100%, -100%)",
  };

  return transforms[anchor] || "translate(0, 0)";
}

// ============================================================================
// Component
// ============================================================================

/**
 * Dimension tooltip showing current size during resize
 */
function DimensionTooltipComponent({
  width,
  height,
  unit = "px",
  activeHandle,
  visible = true,
  position,
  zoom = 1,
  constraintStatus,
  showWidthOnly = false,
  showHeightOnly = false,
  className,
}: DimensionTooltipProps) {
  // Calculate position
  const tooltipPosition = useMemo(() => {
    if (position) {
      return { ...position, anchor: "top-left" };
    }
    return getTooltipPosition(activeHandle, width, height);
  }, [activeHandle, position, width, height]);

  // Format dimension strings
  const formattedWidth = formatDimension(width, unit);
  const formattedHeight = formatDimension(height, unit);

  // Determine if at any constraint
  const hasConstraintWarning =
    constraintStatus &&
    (constraintStatus.atMinWidth ||
      constraintStatus.atMaxWidth ||
      constraintStatus.atMinHeight ||
      constraintStatus.atMaxHeight);

  // Build dimension text (for accessibility)
  const dimensionText = useMemo(() => {
    if (showWidthOnly) {
      return `${formattedWidth}${unit}`;
    } else if (showHeightOnly) {
      return `${formattedHeight}${unit}`;
    }
    return `${formattedWidth} × ${formattedHeight}${unit}`;
  }, [formattedWidth, formattedHeight, unit, showWidthOnly, showHeightOnly]);

  // Determine warning indicators
  const widthWarning =
    constraintStatus?.atMinWidth || constraintStatus?.atMaxWidth;
  const heightWarning =
    constraintStatus?.atMinHeight || constraintStatus?.atMaxHeight;

  if (!visible) {
    return null;
  }

  return (
    <div
      className={cn(
        // Base styles
        "pointer-events-none absolute z-100 select-none",
        // Animation
        "animate-in fade-in-0 zoom-in-95 duration-100",
        className
      )}
      style={{
        left: tooltipPosition.x,
        top: tooltipPosition.y,
        transform: `${getAnchorTransform(tooltipPosition.anchor)} scale(${1 / zoom})`,
        transformOrigin: tooltipPosition.anchor.replace("-", " "),
      }}
      data-dimension-tooltip
      aria-live="polite"
      aria-atomic="true"
      aria-label={dimensionText}
    >
      <div
        className={cn(
          // Pill shape
          "rounded-md px-2 py-1 shadow-lg",
          // Typography
          "font-mono text-xs font-medium whitespace-nowrap",
          // Normal state
          "bg-foreground text-background",
          // Warning state (at constraints)
          hasConstraintWarning && "bg-destructive text-destructive-foreground"
        )}
      >
        {/* Dimension display with optional warning indicators */}
        <span className="flex items-center gap-1">
          {!showHeightOnly && (
            <span
              className={cn(widthWarning && "text-destructive-foreground/80")}
            >
              {formattedWidth}
            </span>
          )}
          {!showWidthOnly && !showHeightOnly && (
            <span className="opacity-70">×</span>
          )}
          {!showWidthOnly && (
            <span
              className={cn(heightWarning && "text-destructive-foreground/80")}
            >
              {formattedHeight}
            </span>
          )}
          <span className="opacity-70">{unit}</span>
        </span>

        {/* Constraint indicators */}
        {hasConstraintWarning && (
          <div className="mt-0.5 text-[10px] opacity-80">
            {constraintStatus?.atMinWidth && "Min W"}
            {constraintStatus?.atMaxWidth && "Max W"}
            {(constraintStatus?.atMinWidth || constraintStatus?.atMaxWidth) &&
              (constraintStatus?.atMinHeight ||
                constraintStatus?.atMaxHeight) &&
              " · "}
            {constraintStatus?.atMinHeight && "Min H"}
            {constraintStatus?.atMaxHeight && "Max H"}
          </div>
        )}
      </div>

      {/* Pointer arrow towards component */}
      <div
        className={cn(
          "absolute h-2 w-2 rotate-45",
          hasConstraintWarning ? "bg-destructive" : "bg-foreground",
          // Position arrow based on tooltip anchor
          tooltipPosition.anchor.includes("bottom") &&
            "top-full left-1/2 -mt-1 -ml-1",
          tooltipPosition.anchor.includes("top") &&
            "bottom-full left-1/2 -mb-1 -ml-1",
          tooltipPosition.anchor.includes("left") &&
            !tooltipPosition.anchor.includes("top") &&
            !tooltipPosition.anchor.includes("bottom") &&
            "top-1/2 right-full -mt-1 -mr-1",
          tooltipPosition.anchor.includes("right") &&
            !tooltipPosition.anchor.includes("top") &&
            !tooltipPosition.anchor.includes("bottom") &&
            "top-1/2 left-full -mt-1 -ml-1"
        )}
        aria-hidden="true"
      />
    </div>
  );
}

export const DimensionTooltip = memo(DimensionTooltipComponent);
DimensionTooltip.displayName = "DimensionTooltip";

export default DimensionTooltip;
