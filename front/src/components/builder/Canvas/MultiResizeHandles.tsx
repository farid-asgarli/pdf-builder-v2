/**
 * MultiResizeHandles Component
 * Visual resize handles for multi-component proportional resize
 *
 * Features:
 * - 8 drag points around the combined bounding box of selected components
 * - Shows scale percentage during resize
 * - Ghost outline showing the new bounding box
 * - Individual component outlines during resize
 * - Integration with multi-resize interaction store
 */
"use client";

import {
  memo,
  useCallback,
  useMemo,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { cn } from "@/lib/utils";
import type { BoundingBox } from "@/types/canvas";
import { useMultiResizeState } from "@/store/interaction-store";
import {
  ALL_HANDLES,
  HANDLE_CURSORS,
  DEFAULT_HANDLE_SIZE,
  MIN_HANDLE_SIZE,
  MAX_HANDLE_SIZE,
  type HandlePosition,
} from "./ResizeHandles";

// ============================================================================
// Types
// ============================================================================

/**
 * Component info for rendering during multi-resize
 */
export interface MultiResizeComponentInfo {
  componentId: string;
  originalBounds: BoundingBox;
  currentBounds: BoundingBox;
}

/**
 * Props for the MultiResizeHandles component
 */
export interface MultiResizeHandlesProps {
  /** Combined bounding box of all selected components */
  boundingBox: BoundingBox;
  /** Individual component bounds for ghost outlines */
  componentBounds?: MultiResizeComponentInfo[];
  /** Current canvas zoom level */
  zoom?: number;
  /** Whether resize is enabled */
  enabled?: boolean;
  /** Callback when resize handle is pressed */
  onResizeStart?: (handle: HandlePosition, event: ReactMouseEvent) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Ghost outline for a single component during multi-resize
 */
const ComponentGhostOutline = memo(function ComponentGhostOutline({
  bounds,
  zoom = 1,
}: {
  bounds: BoundingBox;
  zoom?: number;
}) {
  const borderWidth = Math.max(1, 1 / zoom);

  return (
    <div
      className="border-primary/50 pointer-events-none absolute border border-dashed"
      style={{
        left: bounds.x,
        top: bounds.y,
        width: bounds.width,
        height: bounds.height,
        borderWidth,
      }}
    />
  );
});

ComponentGhostOutline.displayName = "ComponentGhostOutline";

/**
 * Scale tooltip showing percentage during multi-resize
 */
const ScaleTooltip = memo(function ScaleTooltip({
  scaleX,
  scaleY,
  boundingBox,
}: {
  scaleX: number;
  scaleY: number;
  boundingBox: BoundingBox;
}) {
  const scaleXPercent = Math.round(scaleX * 100);
  const scaleYPercent = Math.round(scaleY * 100);

  return (
    <div
      className="bg-popover text-popover-foreground pointer-events-none absolute z-50 -translate-x-1/2 -translate-y-full transform rounded px-2 py-1 text-xs font-medium shadow-md"
      style={{
        left: boundingBox.x + boundingBox.width / 2,
        top: boundingBox.y - 8,
      }}
    >
      {scaleXPercent === scaleYPercent ? (
        <span>{scaleXPercent}%</span>
      ) : (
        <span>
          {scaleXPercent}% × {scaleYPercent}%
        </span>
      )}
    </div>
  );
});

ScaleTooltip.displayName = "ScaleTooltip";

/**
 * Main MultiResizeHandles component
 */
function MultiResizeHandlesComponent({
  boundingBox,
  componentBounds,
  zoom = 1,
  enabled = true,
  onResizeStart,
  className,
}: MultiResizeHandlesProps) {
  const multiResizeState = useMultiResizeState();
  const isResizing = multiResizeState !== null;

  // Calculate scaled handle size based on zoom
  const handleSize = useMemo(() => {
    const scaledSize = DEFAULT_HANDLE_SIZE / zoom;
    return Math.min(Math.max(scaledSize, MIN_HANDLE_SIZE), MAX_HANDLE_SIZE);
  }, [zoom]);

  // Get current bounding box (either from state during resize or from props)
  const currentBoundingBox = isResizing
    ? multiResizeState.currentBoundingBox
    : boundingBox;

  // Get scale factors during resize
  const scaleFactor = isResizing
    ? multiResizeState.scaleFactor
    : { x: 1, y: 1 };

  // Handle mouse down on a resize handle
  const handleMouseDown = useCallback(
    (handle: HandlePosition, event: ReactMouseEvent) => {
      if (!enabled) return;
      onResizeStart?.(handle, event);
    },
    [enabled, onResizeStart]
  );

  // Calculate position style for handle
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

  return (
    <>
      {/* Bounding box outline */}
      <div
        className={cn(
          "pointer-events-none absolute z-40 border-2 border-dashed",
          isResizing ? "border-primary" : "border-blue-500",
          className
        )}
        style={{
          left: currentBoundingBox.x,
          top: currentBoundingBox.y,
          width: currentBoundingBox.width,
          height: currentBoundingBox.height,
        }}
      >
        {/* Resize handles */}
        {ALL_HANDLES.map((handle) => (
          <div
            key={handle}
            className={cn(
              "pointer-events-auto absolute z-50 rounded-sm border-2 transition-all duration-100",
              "border-blue-500 bg-white shadow-sm",
              "hover:scale-125 hover:shadow-md",
              !enabled && "cursor-not-allowed opacity-50"
            )}
            style={{
              ...getHandlePositionStyle(handle),
              width: handleSize,
              height: handleSize,
              cursor: enabled ? HANDLE_CURSORS[handle] : "not-allowed",
            }}
            onMouseDown={(e) => {
              if (enabled) {
                e.stopPropagation();
                e.preventDefault();
                handleMouseDown(handle, e);
              }
            }}
            data-multi-resize-handle={handle}
            role="button"
            aria-label={`Multi-resize ${handle} handle`}
            aria-disabled={!enabled}
            tabIndex={enabled ? 0 : -1}
          />
        ))}
      </div>

      {/* Scale tooltip during resize */}
      {isResizing && (
        <ScaleTooltip
          scaleX={scaleFactor.x}
          scaleY={scaleFactor.y}
          boundingBox={currentBoundingBox}
        />
      )}

      {/* Individual component ghost outlines during resize */}
      {isResizing &&
        multiResizeState.components.map((comp) => (
          <ComponentGhostOutline
            key={comp.componentId}
            bounds={{
              x: comp.currentPosition.x,
              y: comp.currentPosition.y,
              width: comp.currentSize.width,
              height: comp.currentSize.height,
            }}
            zoom={zoom}
          />
        ))}

      {/* Selection count badge */}
      {!isResizing && componentBounds && componentBounds.length > 1 && (
        <div
          className="pointer-events-none absolute z-50 -translate-y-full transform rounded-full bg-blue-500 px-2 py-0.5 text-xs font-medium text-white shadow-sm"
          style={{
            left: currentBoundingBox.x + currentBoundingBox.width,
            top: currentBoundingBox.y - 4,
          }}
        >
          {componentBounds.length} selected
        </div>
      )}
    </>
  );
}

export const MultiResizeHandles = memo(MultiResizeHandlesComponent);
MultiResizeHandles.displayName = "MultiResizeHandles";

export default MultiResizeHandles;
