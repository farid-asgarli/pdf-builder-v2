/**
 * ResizeGhostOutline Component
 * Shows a ghost outline during resize operations for visual feedback
 *
 * Features:
 * - Real-time preview of the new size during drag
 * - Dashed outline to differentiate from actual component
 * - Smooth animation for responsive feel
 * - Color feedback when at constraints (red tint)
 * - Shows both original position and new bounds
 */
"use client";

import { memo, useMemo, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { BoundingBox, Size, Point } from "@/types/canvas";
import type { HandlePosition } from "./ResizeHandles";
import type { ConstraintStatus } from "./DimensionTooltip";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for ResizeGhostOutline component
 */
export interface ResizeGhostOutlineProps {
  /** Original bounds of the component before resize started */
  originalBounds: BoundingBox;
  /** Current size during resize */
  currentSize: Size;
  /** Active handle being dragged (for calculating position offset) */
  activeHandle: HandlePosition | null;
  /** Whether the ghost is visible */
  visible?: boolean;
  /** Current canvas zoom level */
  zoom?: number;
  /** Constraint status for visual feedback */
  constraintStatus?: ConstraintStatus;
  /** Whether aspect ratio is locked (show indicator) */
  aspectRatioLocked?: boolean;
  /** Whether snap mode is active */
  snapActive?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate the ghost outline position based on which handle is being dragged.
 * Different handles affect the position differently:
 * - East/South handles: position stays the same
 * - West/North handles: position shifts by the size difference
 * - Corners: combination of the above
 */
function calculateGhostPosition(
  originalBounds: BoundingBox,
  currentSize: Size,
  activeHandle: HandlePosition | null
): Point {
  const widthDelta = currentSize.width - originalBounds.width;
  const heightDelta = currentSize.height - originalBounds.height;

  let x = originalBounds.x;
  let y = originalBounds.y;

  if (!activeHandle) {
    return { x, y };
  }

  // Handle west-side resizing (left edge moves)
  if (activeHandle === "w" || activeHandle === "nw" || activeHandle === "sw") {
    x = originalBounds.x - widthDelta;
  }

  // Handle north-side resizing (top edge moves)
  if (activeHandle === "n" || activeHandle === "nw" || activeHandle === "ne") {
    y = originalBounds.y - heightDelta;
  }

  return { x, y };
}

// ============================================================================
// Component
// ============================================================================

/**
 * Ghost outline shown during resize to preview new size
 */
function ResizeGhostOutlineComponent({
  originalBounds,
  currentSize,
  activeHandle,
  visible = true,
  zoom = 1,
  constraintStatus,
  aspectRatioLocked = false,
  snapActive = false,
  className,
}: ResizeGhostOutlineProps) {
  // Calculate position based on which handle is being dragged
  const ghostPosition = useMemo(
    () => calculateGhostPosition(originalBounds, currentSize, activeHandle),
    [originalBounds, currentSize, activeHandle]
  );

  // Determine if at any constraint
  const hasConstraintWarning = useMemo(() => {
    return (
      constraintStatus &&
      (constraintStatus.atMinWidth ||
        constraintStatus.atMaxWidth ||
        constraintStatus.atMinHeight ||
        constraintStatus.atMaxHeight)
    );
  }, [constraintStatus]);

  // Calculate border width based on zoom (keep it visually consistent)
  const borderWidth = Math.max(1, Math.round(2 / zoom));

  // Ghost outline styles
  const ghostStyle: CSSProperties = useMemo(
    () => ({
      position: "absolute",
      left: ghostPosition.x,
      top: ghostPosition.y,
      width: currentSize.width,
      height: currentSize.height,
      pointerEvents: "none",
      borderWidth: borderWidth,
      borderStyle: "dashed",
      // Smooth transition for snap mode where values jump
      transition: snapActive ? "all 50ms ease-out" : "none",
    }),
    [ghostPosition, currentSize, borderWidth, snapActive]
  );

  // Original outline styles (faded)
  const originalStyle: CSSProperties = useMemo(
    () => ({
      position: "absolute",
      left: originalBounds.x,
      top: originalBounds.y,
      width: originalBounds.width,
      height: originalBounds.height,
      pointerEvents: "none",
      borderWidth: Math.max(1, Math.round(1 / zoom)),
      borderStyle: "dotted",
    }),
    [originalBounds, zoom]
  );

  if (!visible) {
    return null;
  }

  return (
    <>
      {/* Original position indicator (subtle) */}
      <div
        className={cn(
          "border-muted-foreground/30 z-40",
          "animate-in fade-in-0 duration-100"
        )}
        style={originalStyle}
        data-resize-original-outline
        aria-hidden="true"
      />

      {/* Ghost outline showing new size */}
      <div
        className={cn(
          // Base styles
          "z-50",
          // Animation
          "animate-in fade-in-0 zoom-in-95 duration-100",
          // Normal state
          "border-primary bg-primary/5",
          // Constraint warning state
          hasConstraintWarning && "border-destructive bg-destructive/10",
          className
        )}
        style={ghostStyle}
        data-resize-ghost-outline
        aria-hidden="true"
      >
        {/* Aspect ratio indicator */}
        {aspectRatioLocked && (
          <div
            className={cn(
              "absolute -top-5 left-1/2 -translate-x-1/2",
              "rounded-sm px-1.5 py-0.5",
              "bg-foreground text-background",
              "text-[10px] font-medium",
              "animate-in fade-in-0 slide-in-from-bottom-1 duration-150"
            )}
            style={{ transform: `translateX(-50%) scale(${1 / zoom})` }}
          >
            <span className="flex items-center gap-1">
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
                <path d="M15 3v18" />
                <path d="M3 9h18" />
                <path d="M3 15h18" />
              </svg>
              <span>Locked</span>
            </span>
          </div>
        )}

        {/* Snap indicator */}
        {snapActive && (
          <div
            className={cn(
              "absolute -bottom-5 left-1/2 -translate-x-1/2",
              "rounded-sm px-1.5 py-0.5",
              "bg-foreground text-background",
              "text-[10px] font-medium",
              "animate-in fade-in-0 slide-in-from-top-1 duration-150"
            )}
            style={{ transform: `translateX(-50%) scale(${1 / zoom})` }}
          >
            <span className="flex items-center gap-1">
              <svg
                className="h-3 w-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="1" />
                <path d="M12 2v4" />
                <path d="M12 18v4" />
                <path d="M2 12h4" />
                <path d="M18 12h4" />
              </svg>
              <span>Snap</span>
            </span>
          </div>
        )}

        {/* Corner markers for visual clarity */}
        <div
          className={cn(
            "absolute -top-0.5 -left-0.5 h-2 w-2 border-t-2 border-l-2",
            hasConstraintWarning ? "border-destructive" : "border-primary"
          )}
          aria-hidden="true"
        />
        <div
          className={cn(
            "absolute -top-0.5 -right-0.5 h-2 w-2 border-t-2 border-r-2",
            hasConstraintWarning ? "border-destructive" : "border-primary"
          )}
          aria-hidden="true"
        />
        <div
          className={cn(
            "absolute -bottom-0.5 -left-0.5 h-2 w-2 border-b-2 border-l-2",
            hasConstraintWarning ? "border-destructive" : "border-primary"
          )}
          aria-hidden="true"
        />
        <div
          className={cn(
            "absolute -right-0.5 -bottom-0.5 h-2 w-2 border-r-2 border-b-2",
            hasConstraintWarning ? "border-destructive" : "border-primary"
          )}
          aria-hidden="true"
        />
      </div>
    </>
  );
}

export const ResizeGhostOutline = memo(ResizeGhostOutlineComponent);
ResizeGhostOutline.displayName = "ResizeGhostOutline";

export default ResizeGhostOutline;
