/**
 * ScaleHandles Component
 * Visual scale controls for Scale wrapper components
 *
 * Features:
 * - Same handle layout as resize handles (8-point handles)
 * - Show scale percentage (e.g., "150%")
 * - Maintain aspect ratio by default
 * - Visual feedback during scaling
 * - Two-way binding with properties panel
 * - Keyboard modifier support (Shift for free scale)
 */
"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { cn } from "@/lib/utils";
import type { BoundingBox, Point } from "@/types/canvas";
import { ComponentType } from "@/types/component";
import { useCanvasStore } from "@/store/canvas-store";
import { CornerHandle, type CornerPosition } from "./CornerHandle";
import { EdgeHandle, type EdgePosition } from "./EdgeHandle";
import { ScaleTooltip } from "./ScaleTooltip";

// ============================================================================
// Types
// ============================================================================

/**
 * Handle position for scale operations
 */
export type ScaleHandlePosition =
  | "nw" // Northwest (top-left corner)
  | "n" // North (top edge)
  | "ne" // Northeast (top-right corner)
  | "e" // East (right edge)
  | "se" // Southeast (bottom-right corner)
  | "s" // South (bottom edge)
  | "sw" // Southwest (bottom-left corner)
  | "w"; // West (left edge)

/**
 * Scale constraints
 */
export interface ScaleConstraints {
  /** Minimum scale factor (default: 0.1) */
  minScale?: number;
  /** Maximum scale factor (default: 10) */
  maxScale?: number;
  /** Whether to maintain aspect ratio (default: true for Scale) */
  maintainAspectRatio?: boolean;
  /** Snap increment for scale (default: 0.05) */
  snapIncrement?: number;
}

/**
 * Props for the ScaleHandles component
 */
export interface ScaleHandlesProps {
  /** Component ID being scaled */
  componentId: string;
  /** Component type (should be Scale or ScaleToFit) */
  componentType: ComponentType;
  /** Bounding box of the component */
  bounds: BoundingBox;
  /** Current scale factor (from component properties) */
  currentScale?: number;
  /** Current X scale factor (for non-uniform scaling) */
  currentScaleX?: number;
  /** Current Y scale factor (for non-uniform scaling) */
  currentScaleY?: number;
  /** Current canvas zoom level */
  zoom?: number;
  /** Whether scale is enabled */
  enabled?: boolean;
  /** Scale constraints */
  constraints?: ScaleConstraints;
  /** Callback when scale starts */
  onScaleStart?: (handle: ScaleHandlePosition, event: ReactMouseEvent) => void;
  /** Callback during scale with current value */
  onScale?: (scale: number, scaleX: number, scaleY: number) => void;
  /** Callback when scale ends */
  onScaleEnd?: (scale: number | null) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Scale state during interaction
 */
interface ScaleState {
  isScaling: boolean;
  handle: ScaleHandlePosition | null;
  startPosition: Point;
  originalScale: number;
  originalScaleX: number;
  originalScaleY: number;
  currentScale: number;
  currentScaleX: number;
  currentScaleY: number;
  aspectRatioLocked: boolean;
  centerPoint: Point;
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

/** All 8 handles for scale capability */
const ALL_HANDLES: ScaleHandlePosition[] = [
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
const CORNER_HANDLES: ScaleHandlePosition[] = ["nw", "ne", "se", "sw"];

/** Default scale constraints */
const DEFAULT_CONSTRAINTS: Required<ScaleConstraints> = {
  minScale: 0.1,
  maxScale: 10,
  maintainAspectRatio: true,
  snapIncrement: 0.05,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Clamp value between min and max
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Snap value to increment
 */
function snapToIncrement(value: number, increment: number): number {
  return Math.round(value / increment) * increment;
}

/**
 * Calculate scale factor from mouse movement
 */
function calculateScaleFromDrag(
  handle: ScaleHandlePosition,
  startPosition: Point,
  currentPosition: Point,
  centerPoint: Point,
  originalScale: number,
  bounds: BoundingBox
): { scaleX: number; scaleY: number } {
  const dx = currentPosition.x - startPosition.x;
  const dy = currentPosition.y - startPosition.y;

  // Calculate scale factor based on handle position
  // Use distance from center as the basis for scaling
  const originalDistanceX = bounds.width / 2;
  const originalDistanceY = bounds.height / 2;

  let scaleX = originalScale;
  let scaleY = originalScale;

  switch (handle) {
    case "e":
      // Right edge - scale X based on horizontal movement
      scaleX = originalScale * (1 + dx / originalDistanceX);
      break;
    case "w":
      // Left edge - scale X inversely
      scaleX = originalScale * (1 - dx / originalDistanceX);
      break;
    case "s":
      // Bottom edge - scale Y based on vertical movement
      scaleY = originalScale * (1 + dy / originalDistanceY);
      break;
    case "n":
      // Top edge - scale Y inversely
      scaleY = originalScale * (1 - dy / originalDistanceY);
      break;
    case "se":
      // Bottom-right corner - scale both
      scaleX = originalScale * (1 + dx / originalDistanceX);
      scaleY = originalScale * (1 + dy / originalDistanceY);
      break;
    case "sw":
      // Bottom-left corner
      scaleX = originalScale * (1 - dx / originalDistanceX);
      scaleY = originalScale * (1 + dy / originalDistanceY);
      break;
    case "ne":
      // Top-right corner
      scaleX = originalScale * (1 + dx / originalDistanceX);
      scaleY = originalScale * (1 - dy / originalDistanceY);
      break;
    case "nw":
      // Top-left corner
      scaleX = originalScale * (1 - dx / originalDistanceX);
      scaleY = originalScale * (1 - dy / originalDistanceY);
      break;
  }

  return { scaleX, scaleY };
}

/**
 * Check if a handle is a corner handle
 */
function isCornerHandle(
  position: ScaleHandlePosition
): position is CornerPosition {
  return CORNER_HANDLES.includes(position);
}

/**
 * Check if a handle is an edge handle
 */
function isEdgeHandle(position: ScaleHandlePosition): position is EdgePosition {
  return ["n", "e", "s", "w"].includes(position);
}

// ============================================================================
// Component
// ============================================================================

/**
 * Scale handles component for visual scaling controls
 */
function ScaleHandlesComponent({
  componentId,
  componentType,
  bounds,
  currentScale = 1,
  currentScaleX,
  currentScaleY,
  zoom = 1,
  enabled = true,
  constraints = {},
  onScaleStart,
  onScale,
  onScaleEnd,
  className,
}: ScaleHandlesProps) {
  // Merge constraints with defaults (memoized to avoid re-render issues)
  const mergedConstraints = useMemo(
    () => ({ ...DEFAULT_CONSTRAINTS, ...constraints }),
    [constraints]
  );

  // Get canvas store for updating properties
  const { updateComponentProperty, updateComponentProperties } =
    useCanvasStore();

  // Local scale state
  const [scaleState, setScaleState] = useState<ScaleState | null>(null);
  const scaleStateRef = useRef<ScaleState | null>(null);

  // Track if scaling is active
  const isScaling = scaleState?.isScaling ?? false;

  // Calculate scaled handle size based on zoom
  const handleSize = useMemo(() => {
    const scaledSize = DEFAULT_HANDLE_SIZE / zoom;
    return Math.min(Math.max(scaledSize, MIN_HANDLE_SIZE), MAX_HANDLE_SIZE);
  }, [zoom]);

  // Effective scale values (use X/Y if provided, otherwise uniform)
  const effectiveScaleX = currentScaleX ?? currentScale;
  const effectiveScaleY = currentScaleY ?? currentScale;

  // Calculate center point
  const centerPoint = useMemo<Point>(
    () => ({
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2,
    }),
    [bounds]
  );

  // Handle mouse down on a scale handle
  const handleMouseDown = useCallback(
    (handle: ScaleHandlePosition, event: ReactMouseEvent) => {
      if (!enabled) return;

      event.stopPropagation();
      event.preventDefault();

      const startPosition: Point = { x: event.clientX, y: event.clientY };

      // Determine if aspect ratio should be locked
      // For Scale component, default is to maintain aspect ratio
      // Shift key can toggle this behavior
      const aspectRatioLocked = mergedConstraints.maintainAspectRatio;

      const newState: ScaleState = {
        isScaling: true,
        handle,
        startPosition,
        originalScale: currentScale,
        originalScaleX: effectiveScaleX,
        originalScaleY: effectiveScaleY,
        currentScale,
        currentScaleX: effectiveScaleX,
        currentScaleY: effectiveScaleY,
        aspectRatioLocked,
        centerPoint,
      };

      setScaleState(newState);
      scaleStateRef.current = newState;

      onScaleStart?.(handle, event);
    },
    [
      enabled,
      currentScale,
      effectiveScaleX,
      effectiveScaleY,
      centerPoint,
      mergedConstraints.maintainAspectRatio,
      onScaleStart,
    ]
  );

  // Handle mouse move during scale
  useEffect(() => {
    if (!isScaling || !scaleState) return;

    const handleMouseMove = (event: MouseEvent) => {
      const state = scaleStateRef.current;
      if (!state || !state.handle) return;

      const currentPosition: Point = { x: event.clientX, y: event.clientY };

      // Calculate new scale from drag
      const { scaleX, scaleY } = calculateScaleFromDrag(
        state.handle,
        state.startPosition,
        currentPosition,
        state.centerPoint,
        state.originalScale,
        bounds
      );

      // Determine if aspect ratio is locked
      // Shift key toggles the default behavior
      const shiftPressed = event.shiftKey;
      const aspectRatioLocked = mergedConstraints.maintainAspectRatio
        ? !shiftPressed
        : shiftPressed;

      let finalScaleX = scaleX;
      let finalScaleY = scaleY;

      // If aspect ratio locked, use the larger scale for both
      if (aspectRatioLocked) {
        const uniformScale = Math.max(scaleX, scaleY);
        finalScaleX = uniformScale;
        finalScaleY = uniformScale;
      }

      // Snap to increment if Ctrl/Cmd is pressed
      const snapActive = event.ctrlKey || event.metaKey;
      if (snapActive) {
        finalScaleX = snapToIncrement(
          finalScaleX,
          mergedConstraints.snapIncrement
        );
        finalScaleY = snapToIncrement(
          finalScaleY,
          mergedConstraints.snapIncrement
        );
      }

      // Clamp to constraints
      finalScaleX = clamp(
        finalScaleX,
        mergedConstraints.minScale,
        mergedConstraints.maxScale
      );
      finalScaleY = clamp(
        finalScaleY,
        mergedConstraints.minScale,
        mergedConstraints.maxScale
      );

      // Uniform scale for display
      const uniformScale = aspectRatioLocked
        ? finalScaleX
        : (finalScaleX + finalScaleY) / 2;

      // Update state
      const updatedState: ScaleState = {
        ...state,
        currentScale: uniformScale,
        currentScaleX: finalScaleX,
        currentScaleY: finalScaleY,
        aspectRatioLocked,
      };

      setScaleState(updatedState);
      scaleStateRef.current = updatedState;

      // Call onScale callback
      onScale?.(uniformScale, finalScaleX, finalScaleY);
    };

    const handleMouseUp = () => {
      const state = scaleStateRef.current;
      if (!state) return;

      // Update component properties
      if (state.currentScaleX === state.currentScaleY) {
        // Uniform scale - just update factor
        updateComponentProperty(componentId, "factor", state.currentScale);
      } else {
        // Non-uniform scale - update factorX and factorY
        updateComponentProperties(componentId, {
          factorX: state.currentScaleX,
          factorY: state.currentScaleY,
        });
      }

      // Reset state
      setScaleState(null);
      scaleStateRef.current = null;

      onScaleEnd?.(state.currentScale);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Cancel scaling
        setScaleState(null);
        scaleStateRef.current = null;
        onScaleEnd?.(null);
      }
    };

    // Add event listeners
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isScaling,
    scaleState,
    bounds,
    componentId,
    mergedConstraints,
    onScale,
    onScaleEnd,
    updateComponentProperty,
    updateComponentProperties,
  ]);

  // Check if component type supports scaling
  const isScaleSupported =
    componentType === ComponentType.Scale ||
    componentType === ComponentType.ScaleToFit;

  if (!isScaleSupported || !enabled) {
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

  // Current display scale
  const displayScale = scaleState?.currentScale ?? currentScale;
  const displayScaleX = scaleState?.currentScaleX ?? effectiveScaleX;
  const displayScaleY = scaleState?.currentScaleY ?? effectiveScaleY;

  // Check if at constraint limits
  const atMinScale =
    displayScaleX <= mergedConstraints.minScale ||
    displayScaleY <= mergedConstraints.minScale;
  const atMaxScale =
    displayScaleX >= mergedConstraints.maxScale ||
    displayScaleY >= mergedConstraints.maxScale;

  return (
    <div
      className={cn("scale-handles", isScaling && "is-scaling", className)}
      style={containerStyle}
      data-scale-handles
      data-component-id={componentId}
      data-component-type={componentType}
    >
      {/* Render handles */}
      {ALL_HANDLES.map((position) => {
        const isDragging = isScaling && scaleState?.handle === position;
        const atLimit = atMinScale || atMaxScale;

        if (isCornerHandle(position)) {
          return (
            <CornerHandle
              key={position}
              position={position}
              size={handleSize + 2}
              disabled={!enabled}
              atLimit={atLimit}
              isDragging={isDragging}
              onMouseDown={(e) => handleMouseDown(position, e)}
              className="border-blue-500 bg-blue-50"
            />
          );
        }

        if (isEdgeHandle(position)) {
          return (
            <EdgeHandle
              key={position}
              position={position}
              size={handleSize}
              length={Math.max(handleSize * 3, 20)}
              disabled={!enabled}
              atLimit={atLimit}
              isDragging={isDragging}
              onMouseDown={(e) => handleMouseDown(position, e)}
              className="border-blue-500 bg-blue-50"
            />
          );
        }

        return null;
      })}

      {/* Scale tooltip during scaling */}
      {isScaling && scaleState && (
        <ScaleTooltip
          scale={displayScale}
          scaleX={displayScaleX}
          scaleY={displayScaleY}
          visible={true}
          position={{
            x: bounds.width + 12,
            y: -8,
          }}
          isUniform={scaleState.aspectRatioLocked}
          atLimit={atMinScale || atMaxScale}
        />
      )}

      {/* Visual scale indicator (ghost outline) during scaling */}
      {isScaling && scaleState && (
        <div
          className="pointer-events-none absolute border-2 border-dashed border-blue-500/50"
          style={{
            left: bounds.width / 2 - (bounds.width * displayScaleX) / 2,
            top: bounds.height / 2 - (bounds.height * displayScaleY) / 2,
            width: bounds.width * displayScaleX,
            height: bounds.height * displayScaleY,
            transformOrigin: "center center",
          }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export const ScaleHandles = memo(ScaleHandlesComponent);
ScaleHandles.displayName = "ScaleHandles";

export default ScaleHandles;
