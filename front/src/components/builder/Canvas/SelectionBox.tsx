/**
 * Selection Box Component
 * Visual selection indicator for selected components on the canvas
 *
 * Features:
 * - Highlight selected components with visual border/ring
 * - Show resize handles (for future resize functionality)
 * - Multi-select visual feedback (different styles for single vs multi)
 * - Primary selection indicator (in multi-select scenarios)
 * - Animated selection transitions
 * - Multi-component proportional resize support
 * - Action buttons for quick operations (future)
 */
"use client";

import { memo, useMemo, useCallback, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import type { BoundingBox } from "@/types/canvas";
import { useMultiResize, type ComponentBounds } from "@/hooks/useMultiResize";
import {
  useInteractionStore,
  type ResizeHandle,
} from "@/store/interaction-store";
import { type HandlePosition } from "./ResizeHandles";

// ============================================================================
// Types
// ============================================================================

/**
 * Resize handle positions
 */
export type ResizeHandlePosition =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left";

/**
 * Selection box style variants
 */
export type SelectionVariant = "single" | "multi" | "primary" | "secondary";

/**
 * Props for the SelectionBox component
 */
export interface SelectionBoxProps {
  /** Bounding box of the selected component */
  bounds: BoundingBox;
  /** Whether this is a single selection, multi-selection primary, or secondary */
  variant?: SelectionVariant;
  /** Whether to show resize handles */
  showResizeHandles?: boolean;
  /** Which resize handles to show (defaults to all corners) */
  resizeHandles?: ResizeHandlePosition[];
  /** Whether resize handles are disabled (visual only) */
  resizeDisabled?: boolean;
  /** Whether the selection box should animate on appearance */
  animate?: boolean;
  /** Callback when a resize handle is pressed (for future implementation) */
  onResizeStart?: (
    handle: ResizeHandlePosition,
    event: React.MouseEvent
  ) => void;
  /** Callback when clicking on the selection box (propagates selection) */
  onClick?: (event: React.MouseEvent) => void;
  /** Component label to display (e.g., component type) */
  label?: string;
  /** Show label badge */
  showLabel?: boolean;
  /** Current canvas zoom level (for scaling UI elements) */
  zoom?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for individual resize handles
 */
export interface ResizeHandleProps {
  /** Position of the handle */
  position: ResizeHandlePosition;
  /** Whether the handle is disabled */
  disabled?: boolean;
  /** Callback when handle is pressed */
  onMouseDown?: (event: React.MouseEvent) => void;
  /** Size of the handle in pixels */
  size?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for multi-selection box (wrapping multiple items)
 */
export interface MultiSelectionBoxProps {
  /** Combined bounding box of all selected items */
  bounds: BoundingBox;
  /** Number of items selected */
  selectedCount: number;
  /** Whether to show the count badge */
  showCount?: boolean;
  /** Current canvas zoom level */
  zoom?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default resize handles to show (corners only for flow-based layout) */
const DEFAULT_RESIZE_HANDLES: ResizeHandlePosition[] = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
];

/** All possible resize handles */
const ALL_RESIZE_HANDLES: ResizeHandlePosition[] = [
  "top-left",
  "top",
  "top-right",
  "right",
  "bottom-right",
  "bottom",
  "bottom-left",
  "left",
];

/** Handle size in pixels */
const HANDLE_SIZE = 8;

/** Minimum handle size when zoomed out */
const MIN_HANDLE_SIZE = 6;

/** Maximum handle size when zoomed in */
const MAX_HANDLE_SIZE = 10;

/** Selection box colors by variant */
const SELECTION_COLORS = {
  single: {
    ring: "ring-primary",
    bg: "bg-primary/5",
    handle: "bg-primary border-primary",
  },
  primary: {
    ring: "ring-primary",
    bg: "bg-primary/10",
    handle: "bg-primary border-primary",
  },
  multi: {
    ring: "ring-blue-500",
    bg: "bg-blue-500/5",
    handle: "bg-blue-500 border-blue-500",
  },
  secondary: {
    ring: "ring-blue-400/70",
    bg: "bg-blue-400/5",
    handle: "bg-blue-400 border-blue-400",
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate handle size based on zoom level
 */
function getScaledHandleSize(zoom: number): number {
  // Inverse scale so handles stay consistent size visually
  const scaledSize = HANDLE_SIZE / zoom;
  return Math.min(Math.max(scaledSize, MIN_HANDLE_SIZE), MAX_HANDLE_SIZE);
}

/**
 * Get CSS positioning for resize handle based on position
 */
function getHandlePosition(
  position: ResizeHandlePosition,
  handleSize: number
): CSSProperties {
  const offset = -handleSize / 2;

  const positions: Record<ResizeHandlePosition, CSSProperties> = {
    "top-left": { top: offset, left: offset },
    top: { top: offset, left: "50%", transform: "translateX(-50%)" },
    "top-right": { top: offset, right: offset },
    right: { top: "50%", right: offset, transform: "translateY(-50%)" },
    "bottom-right": { bottom: offset, right: offset },
    bottom: { bottom: offset, left: "50%", transform: "translateX(-50%)" },
    "bottom-left": { bottom: offset, left: offset },
    left: { top: "50%", left: offset, transform: "translateY(-50%)" },
  };

  return positions[position];
}

/**
 * Get cursor style for resize handle
 */
function getHandleCursor(position: ResizeHandlePosition): string {
  const cursors: Record<ResizeHandlePosition, string> = {
    "top-left": "nwse-resize",
    top: "ns-resize",
    "top-right": "nesw-resize",
    right: "ew-resize",
    "bottom-right": "nwse-resize",
    bottom: "ns-resize",
    "bottom-left": "nesw-resize",
    left: "ew-resize",
  };

  return cursors[position];
}

// ============================================================================
// Resize Handle Component
// ============================================================================

/**
 * Individual resize handle component
 */
const ResizeHandle = memo(function ResizeHandle({
  position,
  disabled = false,
  onMouseDown,
  size = HANDLE_SIZE,
  className,
}: ResizeHandleProps) {
  const positionStyle = getHandlePosition(position, size);
  const cursor = disabled ? "default" : getHandleCursor(position);

  return (
    <div
      className={cn(
        "absolute z-50 rounded-sm border-2 transition-transform",
        "hover:scale-125",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      style={{
        ...positionStyle,
        width: size,
        height: size,
        cursor,
      }}
      onMouseDown={disabled ? undefined : onMouseDown}
      data-resize-handle={position}
    />
  );
});

ResizeHandle.displayName = "ResizeHandle";

// ============================================================================
// Selection Box Component
// ============================================================================

/**
 * Main selection box component that wraps selected components
 */
function SelectionBoxComponent({
  bounds,
  variant = "single",
  showResizeHandles = false,
  resizeHandles = DEFAULT_RESIZE_HANDLES,
  resizeDisabled = true, // Disabled by default for flow-based layout
  animate = true,
  onResizeStart,
  onClick,
  label,
  showLabel = false,
  zoom = 1,
  className,
}: SelectionBoxProps) {
  const colors = SELECTION_COLORS[variant];
  const handleSize = getScaledHandleSize(zoom);

  // Calculate ring width based on variant
  const ringWidth = variant === "primary" || variant === "single" ? 2 : 1.5;

  // Memoize the style object
  const boxStyle = useMemo<CSSProperties>(
    () => ({
      position: "absolute",
      left: bounds.x,
      top: bounds.y,
      width: bounds.width,
      height: bounds.height,
      // Compensate ring offset for accurate positioning
      margin: -ringWidth,
      pointerEvents: "none" as const,
    }),
    [bounds.x, bounds.y, bounds.width, bounds.height, ringWidth]
  );

  return (
    <div
      className={cn(
        "ring-offset-background rounded-sm",
        colors.ring,
        colors.bg,
        animate && "animate-in fade-in-0 duration-150",
        variant === "primary" && "ring-2 ring-offset-1",
        variant === "single" && "ring-2 ring-offset-1",
        variant === "multi" && "ring-[1.5px] ring-offset-1",
        variant === "secondary" && "ring-[1.5px] ring-offset-0",
        className
      )}
      style={boxStyle}
      onClick={onClick}
      data-selection-box
      data-selection-variant={variant}
    >
      {/* Label badge */}
      {showLabel && label && (
        <div
          className={cn(
            "absolute -top-6 left-0 z-50 rounded px-1.5 py-0.5 whitespace-nowrap",
            "text-[10px] leading-tight font-medium",
            "bg-primary text-primary-foreground",
            "pointer-events-none shadow-sm"
          )}
          style={{
            // Scale label inversely to zoom for consistent size
            transform: `scale(${1 / zoom})`,
            transformOrigin: "bottom left",
          }}
        >
          {label}
        </div>
      )}

      {/* Resize handles */}
      {showResizeHandles && (
        <>
          {resizeHandles.map((position) => (
            <ResizeHandle
              key={position}
              position={position}
              disabled={resizeDisabled}
              size={handleSize}
              className={colors.handle}
              onMouseDown={
                onResizeStart
                  ? (e) => {
                      e.stopPropagation();
                      onResizeStart(position, e);
                    }
                  : undefined
              }
            />
          ))}
        </>
      )}

      {/* Selection indicator dots for corners (always visible, subtle) */}
      {!showResizeHandles &&
        (variant === "primary" || variant === "single") && (
          <>
            <div
              className={cn(
                "bg-primary absolute -top-1 -left-1 h-2 w-2 rounded-full"
              )}
              style={{ transform: `scale(${1 / zoom})` }}
            />
            <div
              className={cn(
                "bg-primary absolute -top-1 -right-1 h-2 w-2 rounded-full"
              )}
              style={{ transform: `scale(${1 / zoom})` }}
            />
            <div
              className={cn(
                "bg-primary absolute -bottom-1 -left-1 h-2 w-2 rounded-full"
              )}
              style={{ transform: `scale(${1 / zoom})` }}
            />
            <div
              className={cn(
                "bg-primary absolute -right-1 -bottom-1 h-2 w-2 rounded-full"
              )}
              style={{ transform: `scale(${1 / zoom})` }}
            />
          </>
        )}
    </div>
  );
}

export const SelectionBox = memo(SelectionBoxComponent);
SelectionBox.displayName = "SelectionBox";

// ============================================================================
// Multi-Selection Box Component
// ============================================================================

/**
 * Selection box for multiple selected items
 * Shows a combined bounding box with selection count and resize handles
 */
function MultiSelectionBoxComponent({
  bounds,
  selectedCount,
  showCount = true,
  zoom = 1,
  showResizeHandles = false,
  onResizeHandleMouseDown,
  className,
}: MultiSelectionBoxProps & {
  showResizeHandles?: boolean;
  onResizeHandleMouseDown?: (
    handle: HandlePosition,
    event: React.MouseEvent
  ) => void;
}) {
  const handleSize = getScaledHandleSize(zoom);

  const boxStyle = useMemo<CSSProperties>(
    () => ({
      position: "absolute",
      left: bounds.x,
      top: bounds.y,
      width: bounds.width,
      height: bounds.height,
      pointerEvents: "none" as const,
    }),
    [bounds.x, bounds.y, bounds.width, bounds.height]
  );

  // Handle position styles for multi-resize
  const getHandlePositionStyle = useCallback(
    (position: HandlePosition): CSSProperties => {
      const offset = -handleSize / 2;
      const centerOffset = `calc(50% - ${handleSize / 2}px)`;

      const positions: Record<HandlePosition, CSSProperties> = {
        nw: { top: offset, left: offset },
        n: { top: offset, left: centerOffset },
        ne: { top: offset, right: offset },
        e: { top: centerOffset, right: offset },
        se: { bottom: offset, right: offset },
        s: { bottom: offset, left: centerOffset },
        sw: { bottom: offset, left: offset },
        w: { top: centerOffset, left: offset },
      };

      return positions[position];
    },
    [handleSize]
  );

  // Cursor styles for handles
  const handleCursors: Record<HandlePosition, string> = {
    nw: "nwse-resize",
    n: "ns-resize",
    ne: "nesw-resize",
    e: "ew-resize",
    se: "nwse-resize",
    s: "ns-resize",
    sw: "nesw-resize",
    w: "ew-resize",
  };

  // All 8 handles
  const allHandles: HandlePosition[] = [
    "nw",
    "n",
    "ne",
    "e",
    "se",
    "s",
    "sw",
    "w",
  ];

  return (
    <div
      className={cn(
        "ring-offset-background rounded-sm",
        "ring-dashed ring-2 ring-blue-500 ring-offset-1",
        "bg-blue-500/5",
        "animate-in fade-in-0 duration-150",
        className
      )}
      style={boxStyle}
      data-multi-selection-box
      data-selected-count={selectedCount}
    >
      {/* Selection count badge */}
      {showCount && selectedCount > 1 && (
        <div
          className={cn(
            "absolute -top-6 -right-1 z-50 rounded-full px-2 py-0.5",
            "text-[10px] leading-tight font-semibold",
            "bg-blue-500 text-white",
            "pointer-events-none shadow-sm"
          )}
          style={{
            transform: `scale(${1 / zoom})`,
            transformOrigin: "bottom right",
          }}
        >
          {selectedCount} selected
        </div>
      )}

      {/* Multi-resize handles */}
      {showResizeHandles &&
        allHandles.map((handle) => (
          <div
            key={handle}
            className={cn(
              "pointer-events-auto absolute z-50 rounded-sm border-2 transition-all duration-100",
              "border-blue-500 bg-white shadow-sm",
              "hover:scale-125 hover:shadow-md"
            )}
            style={{
              ...getHandlePositionStyle(handle),
              width: handleSize,
              height: handleSize,
              cursor: handleCursors[handle],
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeHandleMouseDown?.(handle, e);
            }}
            data-multi-resize-handle={handle}
            role="button"
            aria-label={`Multi-resize ${handle} handle`}
            tabIndex={0}
          />
        ))}
    </div>
  );
}

export const MultiSelectionBox = memo(MultiSelectionBoxComponent);
MultiSelectionBox.displayName = "MultiSelectionBox";

// ============================================================================
// Selection Overlay Component
// ============================================================================

/**
 * Props for the selection overlay
 */
export interface SelectionOverlayProps {
  /** Array of selected component bounds with their metadata */
  selections: Array<{
    id: string;
    bounds: BoundingBox;
    label?: string;
    isPrimary?: boolean;
  }>;
  /** Whether to show the combined multi-selection box */
  showCombinedBox?: boolean;
  /** Whether to show individual selection boxes */
  showIndividualBoxes?: boolean;
  /** Whether to show labels on selected components */
  showLabels?: boolean;
  /** Whether to show resize handles */
  showResizeHandles?: boolean;
  /** Whether to enable multi-component proportional resize */
  enableMultiResize?: boolean;
  /** Current canvas zoom level */
  zoom?: number;
  /** Callback when resize starts */
  onResizeStart?: (
    componentId: string,
    handle: ResizeHandlePosition,
    event: React.MouseEvent
  ) => void;
  /** Callback when multi-resize starts */
  onMultiResizeStart?: (
    handle: HandlePosition,
    event: React.MouseEvent
  ) => void;
  /** Callback when multi-resize ends */
  onMultiResizeEnd?: (
    components: Array<{
      componentId: string;
      width: number;
      height: number;
    }> | null
  ) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Calculate combined bounding box for multiple selections
 */
function calculateCombinedBounds(
  selections: Array<{ bounds: BoundingBox }>
): BoundingBox {
  if (selections.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  if (selections.length === 1) {
    return selections[0].bounds;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const { bounds } of selections) {
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Overlay component that renders selection boxes for all selected components
 * Use this at the canvas level to render all selections at once
 * Supports multi-component proportional resize when multiple components are selected
 */
function SelectionOverlayComponent({
  selections,
  showCombinedBox = true,
  showIndividualBoxes = true,
  showLabels = false,
  showResizeHandles = false,
  enableMultiResize = true,
  zoom = 1,
  onResizeStart,
  onMultiResizeStart,
  onMultiResizeEnd,
  className,
}: SelectionOverlayProps) {
  const isMultiSelect = selections.length > 1;
  const combinedBounds = useMemo(
    () => calculateCombinedBounds(selections),
    [selections]
  );

  // Prepare component bounds for multi-resize hook
  const componentBounds: ComponentBounds[] = useMemo(
    () =>
      selections.map(({ id, bounds }) => ({
        componentId: id,
        bounds,
      })),
    [selections]
  );

  // Multi-resize hook for proportional resizing
  const {
    state: multiResizeState,
    handleMouseDown: handleMultiResizeMouseDown,
    canMultiResize,
  } = useMultiResize({
    componentBounds,
    enabled: enableMultiResize && isMultiSelect,
    onResizeStart: onMultiResizeStart,
    onResizeEnd: (components) => {
      if (components) {
        onMultiResizeEnd?.(
          components.map((c) => ({
            componentId: c.componentId,
            width: c.currentSize.width,
            height: c.currentSize.height,
          }))
        );
      } else {
        onMultiResizeEnd?.(null);
      }
    },
    updateStore: true,
  });

  if (selections.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("pointer-events-none absolute inset-0", className)}
      data-selection-overlay
    >
      {/* Individual selection boxes */}
      {showIndividualBoxes &&
        selections.map(({ id, bounds, label, isPrimary }) => (
          <SelectionBox
            key={id}
            bounds={bounds}
            variant={
              isMultiSelect ? (isPrimary ? "primary" : "secondary") : "single"
            }
            label={label}
            showLabel={showLabels}
            showResizeHandles={showResizeHandles && !isMultiSelect}
            resizeDisabled={true} // Always disabled for now
            zoom={zoom}
            onResizeStart={
              onResizeStart
                ? (handle, event) => onResizeStart(id, handle, event)
                : undefined
            }
          />
        ))}

      {/* Combined multi-selection box with resize handles */}
      {isMultiSelect && showCombinedBox && (
        <MultiSelectionBox
          bounds={
            multiResizeState.isResizing && multiResizeState.currentBoundingBox
              ? multiResizeState.currentBoundingBox
              : combinedBounds
          }
          selectedCount={selections.length}
          showCount={!multiResizeState.isResizing}
          showResizeHandles={enableMultiResize && canMultiResize}
          onResizeHandleMouseDown={handleMultiResizeMouseDown}
          zoom={zoom}
        />
      )}

      {/* Scale tooltip during multi-resize */}
      {multiResizeState.isResizing && multiResizeState.currentBoundingBox && (
        <div
          className="bg-popover text-popover-foreground pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-full transform rounded px-2 py-1 text-xs font-medium shadow-md"
          style={{
            left:
              multiResizeState.currentBoundingBox.x +
              multiResizeState.currentBoundingBox.width / 2,
            top: multiResizeState.currentBoundingBox.y - 8,
          }}
        >
          {Math.round(multiResizeState.scaleFactor.x * 100) ===
          Math.round(multiResizeState.scaleFactor.y * 100) ? (
            <span>{Math.round(multiResizeState.scaleFactor.x * 100)}%</span>
          ) : (
            <span>
              {Math.round(multiResizeState.scaleFactor.x * 100)}% ×{" "}
              {Math.round(multiResizeState.scaleFactor.y * 100)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export const SelectionOverlay = memo(SelectionOverlayComponent);
SelectionOverlay.displayName = "SelectionOverlay";

// ============================================================================
// Utility Exports
// ============================================================================

export {
  DEFAULT_RESIZE_HANDLES,
  ALL_RESIZE_HANDLES,
  HANDLE_SIZE,
  SELECTION_COLORS,
  getScaledHandleSize,
  getHandlePosition,
  getHandleCursor,
  calculateCombinedBounds,
};

export default SelectionBox;
