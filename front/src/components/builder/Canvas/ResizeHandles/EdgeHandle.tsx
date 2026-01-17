/**
 * EdgeHandle Component
 * Specialized resize handle for edge positions
 * Resizes one dimension only (width or height)
 *
 * Features:
 * - Horizontal (↔) or vertical (↕) resize cursor
 * - Visual feedback when at constraint limits
 * - Elongated shape for easier grabbing
 * - Touch-friendly hit area
 */
"use client";

import { memo, type MouseEvent as ReactMouseEvent } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

/** Edge handle positions */
export type EdgePosition = "n" | "e" | "s" | "w";

/**
 * Props for EdgeHandle component
 */
export interface EdgeHandleProps {
  /** Edge position */
  position: EdgePosition;
  /** Handle size (length perpendicular to edge) */
  size?: number;
  /** Handle length (along the edge) */
  length?: number;
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

/** Default edge handle size (perpendicular) */
const DEFAULT_SIZE = 6;

/** Default edge handle length (along edge) */
const DEFAULT_LENGTH = 24;

/** Cursor styles for edge handles */
const EDGE_CURSORS: Record<EdgePosition, string> = {
  n: "ns-resize", // ↕
  s: "ns-resize", // ↕
  e: "ew-resize", // ↔
  w: "ew-resize", // ↔
};

/**
 * Determine if edge is horizontal (n/s) or vertical (e/w)
 */
function isHorizontalEdge(position: EdgePosition): boolean {
  return position === "n" || position === "s";
}

/**
 * Get CSS position styles for edge handle
 */
function getEdgePositionStyle(
  position: EdgePosition,
  size: number,
  length: number
) {
  const offset = -size / 2;
  const centerOffset = `calc(50% - ${length / 2}px)`;

  const styles: Record<EdgePosition, React.CSSProperties> = {
    n: {
      top: offset,
      left: centerOffset,
      width: length,
      height: size,
    },
    s: {
      bottom: offset,
      left: centerOffset,
      width: length,
      height: size,
    },
    e: {
      right: offset,
      top: centerOffset,
      width: size,
      height: length,
    },
    w: {
      left: offset,
      top: centerOffset,
      width: size,
      height: length,
    },
  };

  return styles[position];
}

// ============================================================================
// Component
// ============================================================================

/**
 * Edge resize handle for single-dimension resizing
 */
function EdgeHandleComponent({
  position,
  size = DEFAULT_SIZE,
  length = DEFAULT_LENGTH,
  disabled = false,
  atLimit = false,
  isDragging = false,
  onMouseDown,
  className,
}: EdgeHandleProps) {
  const cursor = disabled ? "not-allowed" : EDGE_CURSORS[position];
  const positionStyle = getEdgePositionStyle(position, size, length);
  const isHorizontal = isHorizontalEdge(position);

  // Use rounded ends for horizontal edges, full rounded for vertical
  const borderRadius = isHorizontal ? `${size / 2}px` : `${size / 2}px`;

  return (
    <div
      className={cn(
        // Base styles
        "absolute z-50 border-2 transition-all duration-100",
        // Normal state
        "border-primary/70 bg-white shadow-sm",
        // Hover state
        "hover:border-primary hover:shadow-md",
        isHorizontal ? "hover:scale-y-125" : "hover:scale-x-125",
        // Dragging state
        isDragging && "border-primary shadow-lg",
        isDragging && (isHorizontal ? "scale-y-150" : "scale-x-150"),
        // At constraint limit
        atLimit &&
          "border-destructive bg-destructive/20 hover:border-destructive",
        // Disabled state
        disabled && "cursor-not-allowed opacity-40 hover:scale-100",
        className
      )}
      style={{
        ...positionStyle,
        cursor,
        borderRadius,
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
      data-handle-type="edge"
      data-handle-direction={isHorizontal ? "vertical" : "horizontal"}
      data-handle-at-limit={atLimit}
      role="button"
      aria-label={`Resize ${isHorizontal ? "height" : "width"} from ${position} edge`}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
    >
      {/* Visual grip indicator */}
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center gap-0.5",
          isHorizontal ? "flex-row" : "flex-col"
        )}
        aria-hidden="true"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "bg-primary/40 rounded-full",
              isHorizontal ? "h-0.5 w-1" : "h-1 w-0.5"
            )}
          />
        ))}
      </div>
    </div>
  );
}

export const EdgeHandle = memo(EdgeHandleComponent);
EdgeHandle.displayName = "EdgeHandle";

export default EdgeHandle;
