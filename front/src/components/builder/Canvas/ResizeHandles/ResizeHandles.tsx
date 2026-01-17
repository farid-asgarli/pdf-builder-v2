/**
 * ResizeHandles Component
 * Visual resize system with 8 drag points for component resizing
 *
 * Features:
 * - 8 drag points (4 corners + 4 edges)
 * - Cursor changes based on handle position (↔ ↕ ↗ ↖ ↘ ↙)
 * - Handle visibility based on component type
 * - Integration with interaction store for resize operations
 * - Dimension tooltip during resize
 * - Constraint visualization (red handles at limits)
 * - Support for modifier keys (Shift for aspect ratio, Ctrl for snap)
 */
"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { cn } from "@/lib/utils";
import type { BoundingBox, Size } from "@/types/canvas";
import type { ComponentType } from "@/types/component";
import {
  useInteractionStore,
  type ResizeHandle as ResizeHandleType,
  type ResizeConstraints,
} from "@/store/interaction-store";
import {
  isLeafComponent,
  isContainerComponent,
  isWrapperComponent,
} from "@/types/component";
import { CornerHandle, type CornerPosition } from "./CornerHandle";
import { EdgeHandle, type EdgePosition } from "./EdgeHandle";
import { DimensionTooltip, type ConstraintStatus } from "./DimensionTooltip";
import { ResizeGhostOutline } from "./ResizeGhostOutline";

// ============================================================================
// Types
// ============================================================================

/**
 * Handle position mapping to interaction store types
 */
export type HandlePosition =
  | "nw" // Northwest (top-left corner)
  | "n" // North (top edge)
  | "ne" // Northeast (top-right corner)
  | "e" // East (right edge)
  | "se" // Southeast (bottom-right corner)
  | "s" // South (bottom edge)
  | "sw" // Southwest (bottom-left corner)
  | "w"; // West (left edge)

/**
 * Resize direction based on component type
 */
export type ResizeDirection = "horizontal" | "vertical" | "both" | "none";

/**
 * Handle configuration based on resize direction
 */
export interface HandleConfig {
  /** Which handles to show */
  handles: HandlePosition[];
  /** Direction constraint for this component type */
  direction: ResizeDirection;
}

/**
 * Props for the ResizeHandles component
 */
export interface ResizeHandlesProps {
  /** Component ID being resized */
  componentId: string;
  /** Component type for determining resize behavior */
  componentType: ComponentType;
  /** Bounding box of the component */
  bounds: BoundingBox;
  /** Current canvas zoom level */
  zoom?: number;
  /** Whether resize is enabled */
  enabled?: boolean;
  /** Resize constraints for the component */
  constraints?: ResizeConstraints;
  /** Callback when resize starts */
  onResizeStart?: (handle: HandlePosition, event: ReactMouseEvent) => void;
  /** Callback when resize ends */
  onResizeEnd?: (newSize: Size | null) => void;
  /** Whether the component is currently at constraint limit */
  atConstraintLimit?: {
    minWidth?: boolean;
    maxWidth?: boolean;
    minHeight?: boolean;
    maxHeight?: boolean;
  };
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for individual handle
 */
export interface HandleProps {
  /** Handle position */
  position: HandlePosition;
  /** Whether handle is disabled */
  disabled?: boolean;
  /** Whether handle is at constraint limit */
  atLimit?: boolean;
  /** Handle size in pixels */
  size?: number;
  /** Callback when mouse down on handle */
  onMouseDown?: (event: ReactMouseEvent) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default handle size in pixels */
const DEFAULT_HANDLE_SIZE = 8;

/** Minimum handle size when zoomed out */
const MIN_HANDLE_SIZE = 6;

/** Maximum handle size when zoomed in */
const MAX_HANDLE_SIZE = 12;

/** All 8 handles for full resize capability */
const ALL_HANDLES: HandlePosition[] = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
];

/** Corner handles only */
const CORNER_HANDLES: HandlePosition[] = ["nw", "ne", "se", "sw"];

/** Edge handles only */
const EDGE_HANDLES: HandlePosition[] = ["n", "e", "s", "w"];

/** Horizontal edge handles */
const HORIZONTAL_HANDLES: HandlePosition[] = ["e", "w"];

/** Vertical edge handles */
const VERTICAL_HANDLES: HandlePosition[] = ["n", "s"];

/**
 * Cursor styles for each handle position
 * Maps to CSS cursor values
 */
const HANDLE_CURSORS: Record<HandlePosition, string> = {
  nw: "nwse-resize", // ↖↘
  n: "ns-resize", // ↕
  ne: "nesw-resize", // ↗↙
  e: "ew-resize", // ↔
  se: "nwse-resize", // ↘↖
  s: "ns-resize", // ↕
  sw: "nesw-resize", // ↙↗
  w: "ew-resize", // ↔
};

/**
 * Handle position styles (CSS positioning)
 */
function getHandlePositionStyle(
  position: HandlePosition,
  handleSize: number
): CSSProperties {
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
}

// ============================================================================
// Handle Configuration by Component Type
// ============================================================================

/**
 * Get handle configuration based on component type
 * Different components have different resize capabilities based on flow layout
 */
export function getHandleConfig(componentType: ComponentType): HandleConfig {
  // Text components: width resizable (wraps text), height auto
  if (componentType === "Text") {
    return {
      handles: HORIZONTAL_HANDLES,
      direction: "horizontal",
    };
  }

  // Image components: both dimensions resizable
  if (componentType === "Image") {
    return {
      handles: ALL_HANDLES,
      direction: "both",
    };
  }

  // Line component: depends on orientation (horizontal line = height, vertical = width)
  if (componentType === "Line") {
    return {
      handles: ALL_HANDLES,
      direction: "both",
    };
  }

  // Leaf components without dimensions (PageBreak, etc.): no resize
  if (
    isLeafComponent(componentType) &&
    ![
      "Text",
      "Image",
      "Line",
      "Placeholder",
      "Barcode",
      "QRCode",
      "Canvas",
    ].includes(componentType)
  ) {
    return {
      handles: [],
      direction: "none",
    };
  }

  // Placeholder: both dimensions
  if (componentType === "Placeholder") {
    return {
      handles: ALL_HANDLES,
      direction: "both",
    };
  }

  // Barcode/QRCode: typically width only
  if (componentType === "Barcode" || componentType === "QRCode") {
    return {
      handles: HORIZONTAL_HANDLES,
      direction: "horizontal",
    };
  }

  // Container components (Column, Row, Table, etc.):
  // In flow layout, containers typically take available width
  // but can have height constraints
  if (isContainerComponent(componentType)) {
    return {
      handles: ALL_HANDLES,
      direction: "both",
    };
  }

  // Wrapper components (Padding, Border, etc.):
  // Pass through to child, no direct resize
  if (isWrapperComponent(componentType)) {
    return {
      handles: CORNER_HANDLES, // Show corners for visual feedback
      direction: "both",
    };
  }

  // Sizing components (Width, Height, etc.): specific dimensions
  if (
    componentType === "Width" ||
    componentType === "MinWidth" ||
    componentType === "MaxWidth"
  ) {
    return {
      handles: HORIZONTAL_HANDLES,
      direction: "horizontal",
    };
  }

  if (
    componentType === "Height" ||
    componentType === "MinHeight" ||
    componentType === "MaxHeight"
  ) {
    return {
      handles: VERTICAL_HANDLES,
      direction: "vertical",
    };
  }

  // Default: all handles
  return {
    handles: ALL_HANDLES,
    direction: "both",
  };
}

/**
 * Check if a component type supports resizing
 */
export function isResizable(componentType: ComponentType): boolean {
  const config = getHandleConfig(componentType);
  return config.direction !== "none" && config.handles.length > 0;
}

// ============================================================================
// Handle Component
// ============================================================================

/**
 * Individual resize handle component
 */
const Handle = memo(function Handle({
  position,
  disabled = false,
  atLimit = false,
  size = DEFAULT_HANDLE_SIZE,
  onMouseDown,
  className,
}: HandleProps) {
  const positionStyle = getHandlePositionStyle(position, size);
  const cursor = disabled ? "not-allowed" : HANDLE_CURSORS[position];

  return (
    <div
      className={cn(
        // Base styles
        "absolute z-50 rounded-sm border-2 transition-all duration-100",
        // Normal state
        "border-primary bg-white shadow-sm",
        // Hover state
        "hover:scale-125 hover:shadow-md",
        // At constraint limit
        atLimit && "border-destructive bg-destructive/20",
        // Disabled state
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      style={{
        ...positionStyle,
        width: size,
        height: size,
        cursor,
      }}
      onMouseDown={(e) => {
        if (!disabled && onMouseDown) {
          e.stopPropagation();
          e.preventDefault();
          onMouseDown(e);
        }
      }}
      data-resize-handle={position}
      data-handle-at-limit={atLimit}
      role="button"
      aria-label={`Resize ${position} handle`}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
    />
  );
});

Handle.displayName = "Handle";

// ============================================================================
// Resize Handles Component
// ============================================================================

/**
 * Main ResizeHandles component
 * Renders 8 drag points around a component for resizing
 */
function ResizeHandlesComponent({
  componentId,
  componentType,
  bounds,
  zoom = 1,
  enabled = true,
  constraints,
  onResizeStart,
  onResizeEnd,
  atConstraintLimit,
  className,
}: ResizeHandlesProps) {
  const {
    activeInteraction,
    resize: resizeState,
    startResize,
    updateResize,
    endResize,
    cancelResize,
  } = useInteractionStore();

  // Determine which handles to show based on component type
  const handleConfig = useMemo(
    () => getHandleConfig(componentType),
    [componentType]
  );

  // Calculate scaled handle size based on zoom
  const handleSize = useMemo(() => {
    const scaledSize = DEFAULT_HANDLE_SIZE / zoom;
    return Math.min(Math.max(scaledSize, MIN_HANDLE_SIZE), MAX_HANDLE_SIZE);
  }, [zoom]);

  // Check if this component is currently being resized
  const isResizing =
    activeInteraction === "resize" && resizeState?.componentId === componentId;

  // Handle mouse down on a resize handle
  const handleMouseDown = useCallback(
    (handle: HandlePosition, event: ReactMouseEvent) => {
      if (!enabled) return;

      const startPosition = { x: event.clientX, y: event.clientY };
      const originalSize = { width: bounds.width, height: bounds.height };
      const originalPosition = { x: bounds.x, y: bounds.y };

      // Start resize in the interaction store
      startResize(
        componentId,
        handle as ResizeHandleType,
        startPosition,
        originalSize,
        originalPosition,
        constraints
      );

      // Call external callback if provided
      onResizeStart?.(handle, event);
    },
    [enabled, componentId, bounds, constraints, startResize, onResizeStart]
  );

  // Handle mouse move during resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (event: MouseEvent) => {
      const currentPosition = { x: event.clientX, y: event.clientY };
      const modifiers = {
        shift: event.shiftKey,
        ctrl: event.ctrlKey || event.metaKey,
      };
      updateResize(currentPosition, modifiers);
    };

    const handleMouseUp = () => {
      const finalSize = endResize();
      onResizeEnd?.(finalSize);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancelResize();
        onResizeEnd?.(null);
      }
    };

    // Add event listeners
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    // Cleanup
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isResizing, updateResize, endResize, cancelResize, onResizeEnd]);

  // Don't render if no handles to show
  if (handleConfig.handles.length === 0 || !enabled) {
    return null;
  }

  // Container styles
  const containerStyle: CSSProperties = {
    position: "absolute",
    left: bounds.x,
    top: bounds.y,
    width: bounds.width,
    height: bounds.height,
    pointerEvents: "none",
  };

  // Get current size for tooltip display
  const currentSize: Size =
    isResizing && resizeState?.currentSize
      ? resizeState.currentSize
      : { width: bounds.width, height: bounds.height };

  // Determine constraint status for DimensionTooltip
  const constraintStatusForTooltip: ConstraintStatus = {
    atMinWidth: atConstraintLimit?.minWidth,
    atMaxWidth: atConstraintLimit?.maxWidth,
    atMinHeight: atConstraintLimit?.minHeight,
    atMaxHeight: atConstraintLimit?.maxHeight,
  };

  // Determine if tooltip should show only width or height based on handle config
  const showWidthOnly = handleConfig.direction === "horizontal";
  const showHeightOnly = handleConfig.direction === "vertical";

  // Check if a handle is a corner handle
  const isCornerHandle = (
    position: HandlePosition
  ): position is CornerPosition => {
    return ["nw", "ne", "se", "sw"].includes(position);
  };

  // Check if a handle is an edge handle
  const isEdgeHandle = (position: HandlePosition): position is EdgePosition => {
    return ["n", "e", "s", "w"].includes(position);
  };

  return (
    <div
      className={cn("resize-handles", isResizing && "is-resizing", className)}
      style={containerStyle}
      data-resize-handles
      data-component-id={componentId}
      data-component-type={componentType}
    >
      {handleConfig.handles.map((position) => {
        // Determine if this handle is at a constraint limit
        let isAtLimit = false;
        if (atConstraintLimit) {
          if (position === "w" || position === "e") {
            isAtLimit = !!(
              atConstraintLimit.minWidth || atConstraintLimit.maxWidth
            );
          } else if (position === "n" || position === "s") {
            isAtLimit = !!(
              atConstraintLimit.minHeight || atConstraintLimit.maxHeight
            );
          } else {
            // Corner handles
            isAtLimit = !!(
              atConstraintLimit.minWidth ||
              atConstraintLimit.maxWidth ||
              atConstraintLimit.minHeight ||
              atConstraintLimit.maxHeight
            );
          }
        }

        // Check if this specific handle is being dragged
        const isDragging = isResizing && resizeState?.handle === position;

        // Render appropriate handle type
        if (isCornerHandle(position)) {
          return (
            <CornerHandle
              key={position}
              position={position}
              size={handleSize + 2} // Slightly larger for corners
              disabled={!enabled}
              atLimit={isAtLimit}
              isDragging={isDragging}
              onMouseDown={(e) => handleMouseDown(position, e)}
            />
          );
        }

        if (isEdgeHandle(position)) {
          return (
            <EdgeHandle
              key={position}
              position={position}
              size={handleSize}
              length={Math.max(handleSize * 3, 20)} // Dynamic length
              disabled={!enabled}
              atLimit={isAtLimit}
              isDragging={isDragging}
              onMouseDown={(e) => handleMouseDown(position, e)}
            />
          );
        }

        // Fallback to basic Handle for unknown positions
        return (
          <Handle
            key={position}
            position={position}
            disabled={!enabled}
            atLimit={isAtLimit}
            size={handleSize}
            onMouseDown={(e) => handleMouseDown(position, e)}
          />
        );
      })}

      {/* Dimension tooltip during resize */}
      {isResizing && resizeState && (
        <DimensionTooltip
          width={currentSize.width}
          height={currentSize.height}
          unit="px"
          activeHandle={resizeState.handle as HandlePosition}
          visible={true}
          zoom={zoom}
          constraintStatus={constraintStatusForTooltip}
          showWidthOnly={showWidthOnly}
          showHeightOnly={showHeightOnly}
        />
      )}

      {/* Ghost outline during resize */}
      {isResizing && resizeState && (
        <ResizeGhostOutline
          originalBounds={bounds}
          currentSize={currentSize}
          activeHandle={resizeState.handle as HandlePosition}
          visible={true}
          zoom={zoom}
          constraintStatus={constraintStatusForTooltip}
          aspectRatioLocked={resizeState.lockAspectRatio}
          snapActive={resizeState.snapToIncrement}
        />
      )}
    </div>
  );
}

export const ResizeHandles = memo(ResizeHandlesComponent);
ResizeHandles.displayName = "ResizeHandles";

// ============================================================================
// Exports
// ============================================================================

export { Handle };
export {
  ALL_HANDLES,
  CORNER_HANDLES,
  EDGE_HANDLES,
  HORIZONTAL_HANDLES,
  VERTICAL_HANDLES,
};
export { HANDLE_CURSORS };
export { DEFAULT_HANDLE_SIZE, MIN_HANDLE_SIZE, MAX_HANDLE_SIZE };

export default ResizeHandles;
