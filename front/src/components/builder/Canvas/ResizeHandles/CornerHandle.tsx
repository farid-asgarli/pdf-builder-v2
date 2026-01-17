/**
 * CornerHandle Component
 * Specialized resize handle for corner positions
 * Resizes both width and height simultaneously
 *
 * Features:
 * - Diagonal resize cursor (↗↖↘↙)
 * - Proportional resize with Shift key
 * - Visual feedback when at constraint limits
 * - Touch-friendly hit area
 */
"use client";

import { memo, type MouseEvent as ReactMouseEvent } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

/** Corner handle positions */
export type CornerPosition = "nw" | "ne" | "se" | "sw";

/**
 * Props for CornerHandle component
 */
export interface CornerHandleProps {
  /** Corner position */
  position: CornerPosition;
  /** Handle size in pixels */
  size?: number;
  /** Whether the handle is disabled */
  disabled?: boolean;
  /** Whether at a constraint limit */
  atLimit?: boolean;
  /** Whether currently being dragged */
  isDragging?: boolean;
  /** Mouse down handler */
  onMouseDown?: (event: ReactMouseEvent) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default corner handle size */
const DEFAULT_SIZE = 10;

/** Cursor styles for corner handles */
const CORNER_CURSORS: Record<CornerPosition, string> = {
  nw: "nwse-resize", // ↖↘
  ne: "nesw-resize", // ↗↙
  se: "nwse-resize", // ↘↖
  sw: "nesw-resize", // ↙↗
};

/**
 * Get CSS position styles for corner handle
 */
function getCornerPositionStyle(position: CornerPosition, size: number) {
  const offset = -size / 2;

  const positions: Record<
    CornerPosition,
    { top?: number; bottom?: number; left?: number; right?: number }
  > = {
    nw: { top: offset, left: offset },
    ne: { top: offset, right: offset },
    se: { bottom: offset, right: offset },
    sw: { bottom: offset, left: offset },
  };

  return positions[position];
}

// ============================================================================
// Component
// ============================================================================

/**
 * Corner resize handle for diagonal resizing
 */
function CornerHandleComponent({
  position,
  size = DEFAULT_SIZE,
  disabled = false,
  atLimit = false,
  isDragging = false,
  onMouseDown,
  className,
}: CornerHandleProps) {
  const cursor = disabled ? "not-allowed" : CORNER_CURSORS[position];
  const positionStyle = getCornerPositionStyle(position, size);

  return (
    <div
      className={cn(
        // Base styles
        "absolute z-50 rounded-sm border-2 transition-all duration-100",
        // Normal state
        "border-primary bg-white shadow-sm",
        // Hover state
        "hover:border-primary/80 hover:scale-110 hover:shadow-md",
        // Dragging state
        isDragging && "border-primary scale-125 shadow-lg",
        // At constraint limit
        atLimit &&
          "border-destructive bg-destructive/20 hover:border-destructive",
        // Disabled state
        disabled && "cursor-not-allowed opacity-40 hover:scale-100",
        className
      )}
      style={{
        ...positionStyle,
        width: size,
        height: size,
        cursor,
        // Larger touch target
        touchAction: "none",
      }}
      onMouseDown={(e) => {
        if (!disabled && onMouseDown) {
          e.stopPropagation();
          e.preventDefault();
          onMouseDown(e);
        }
      }}
      data-resize-handle={position}
      data-handle-type="corner"
      data-handle-at-limit={atLimit}
      role="button"
      aria-label={`Resize from ${position} corner`}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
    >
      {/* Inner visual indicator for dragging state */}
      {isDragging && (
        <div
          className="bg-primary/30 absolute inset-0.5 rounded-sm"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export const CornerHandle = memo(CornerHandleComponent);
CornerHandle.displayName = "CornerHandle";

export default CornerHandle;
