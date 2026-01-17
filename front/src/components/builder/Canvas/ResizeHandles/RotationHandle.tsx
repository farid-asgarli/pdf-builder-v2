/**
 * RotationHandle Component
 * Visual rotation control that appears above components with Rotate wrapper
 *
 * Features:
 * - Appears above component (only for Rotate wrapper)
 * - Drag in circular motion to rotate
 * - Show angle tooltip (e.g., "45°")
 * - Snap to 15° increments (configurable)
 * - Shift+drag for continuous rotation (bypasses snapping)
 * - Visual feedback during rotation
 * - Touch-friendly interaction
 */
"use client";

import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { cn } from "@/lib/utils";
import { RotateCw } from "lucide-react";
import type { Point, BoundingBox } from "@/types/canvas";
import { useInteractionStore } from "@/store/interaction-store";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the RotationHandle component
 */
export interface RotationHandleProps {
  /** Component ID being rotated */
  componentId: string;
  /** Current component bounds */
  bounds: BoundingBox;
  /** Current rotation angle in degrees */
  currentAngle?: number;
  /** Whether rotation is enabled */
  enabled?: boolean;
  /** Current canvas zoom level (affects handle size) */
  zoom?: number;
  /** Snap increment in degrees (default: 15) */
  snapIncrement?: number;
  /** Whether to enable snapping by default */
  snapByDefault?: boolean;
  /** Distance from component top edge to handle (default: 24) */
  handleOffset?: number;
  /** Connector line length from component to handle (default: 16) */
  connectorLength?: number;
  /** Handle size in pixels (default: 20) */
  handleSize?: number;
  /** Whether the handle is currently being dragged */
  isDragging?: boolean;
  /** Callback when rotation starts */
  onRotationStart?: (startAngle: number) => void;
  /** Callback during rotation with current angle */
  onRotation?: (angle: number, snapping: boolean) => void;
  /** Callback when rotation ends */
  onRotationEnd?: (finalAngle: number | null) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for the AngleTooltip component
 */
interface AngleTooltipProps {
  /** Current angle to display */
  angle: number;
  /** Whether the tooltip is visible */
  visible: boolean;
  /** Position relative to component center */
  position: Point;
  /** Whether snapping is active */
  isSnapping: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default snap increment in degrees */
const DEFAULT_SNAP_INCREMENT = 15;

/** Default distance from component top to handle */
const DEFAULT_HANDLE_OFFSET = 24;

/** Default connector line length */
const DEFAULT_CONNECTOR_LENGTH = 16;

/** Default handle size */
const DEFAULT_HANDLE_SIZE = 20;

/** Minimum handle size when zoomed out */
const MIN_HANDLE_SIZE = 16;

/** Maximum handle size when zoomed in */
const MAX_HANDLE_SIZE = 28;

/** Angles to show visual indicators for (common angles) */
const NOTABLE_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315, 360];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize angle to 0-360 range
 */
function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

/**
 * Check if an angle is a notable angle
 */
function isNotableAngle(angle: number, tolerance: number = 2): boolean {
  const normalized = normalizeAngle(angle);
  return NOTABLE_ANGLES.some(
    (notable) => Math.abs(normalized - notable) <= tolerance
  );
}

/**
 * Format angle for display
 */
function formatAngle(angle: number): string {
  const normalized = normalizeAngle(angle);
  return `${Math.round(normalized)}°`;
}

/**
 * Get scaled handle size based on zoom level
 */
function getScaledHandleSize(baseSize: number, zoom: number): number {
  // Counter-scale to maintain visual size across zoom levels
  const scaledSize = baseSize / zoom;
  return Math.min(MAX_HANDLE_SIZE, Math.max(MIN_HANDLE_SIZE, scaledSize));
}

// ============================================================================
// AngleTooltip Component
// ============================================================================

/**
 * Tooltip showing the current rotation angle
 */
const AngleTooltip = memo(function AngleTooltipComponent({
  angle,
  visible,
  position,
  isSnapping,
  className,
}: AngleTooltipProps) {
  if (!visible) return null;

  const isNotable = isNotableAngle(angle);

  return (
    <div
      className={cn(
        // Base styles
        "pointer-events-none absolute z-50",
        "rounded-md px-2 py-1 text-xs font-medium",
        "transition-all duration-100 ease-out",
        // Shadow and border
        "border shadow-lg",
        // Visibility animation
        visible ? "scale-100 opacity-100" : "scale-95 opacity-0",
        // Color based on snapping state
        isSnapping
          ? "border-primary/40 bg-primary text-primary-foreground"
          : "border-border bg-popover text-popover-foreground",
        // Notable angle highlight
        isNotable && isSnapping && "ring-primary/50 ring-2",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -100%)",
      }}
      role="tooltip"
      aria-label={`Rotation: ${formatAngle(angle)}`}
    >
      <div className="flex items-center gap-1">
        <RotateCw className="h-3 w-3" aria-hidden="true" />
        <span>{formatAngle(angle)}</span>
        {isSnapping && <span className="text-[10px] opacity-75">(snap)</span>}
      </div>
    </div>
  );
});

AngleTooltip.displayName = "AngleTooltip";

// ============================================================================
// RotationHandle Component
// ============================================================================

/**
 * Rotation handle that appears above a component for Rotate wrapper
 */
function RotationHandleComponent({
  componentId,
  bounds,
  currentAngle = 0,
  enabled = true,
  zoom = 1,
  snapIncrement: _snapIncrement = DEFAULT_SNAP_INCREMENT,
  snapByDefault = true,
  handleOffset = DEFAULT_HANDLE_OFFSET,
  connectorLength: _connectorLength = DEFAULT_CONNECTOR_LENGTH,
  handleSize = DEFAULT_HANDLE_SIZE,
  isDragging: externalIsDragging,
  onRotationStart,
  onRotation,
  onRotationEnd,
  className,
}: RotationHandleProps) {
  // Refs
  const handleRef = useRef<HTMLDivElement>(null);
  const isInternalDragging = useRef(false);

  // State for tooltip
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipAngle, setTooltipAngle] = useState(currentAngle);
  const [isSnapping, setIsSnapping] = useState(snapByDefault);

  // Get interaction store methods
  const {
    activeInteraction,
    rotation: storeRotationState,
    startRotation,
    updateRotation,
    endRotation,
    cancelRotation,
  } = useInteractionStore();

  // Determine if this handle is being dragged
  const isStoreDragging =
    activeInteraction === "rotation" &&
    storeRotationState?.componentId === componentId;

  const isDragging = externalIsDragging ?? isStoreDragging;

  // Calculate handle position (centered above component)
  const scaledHandleSize = getScaledHandleSize(handleSize, zoom);
  const scaledOffset = handleOffset / zoom;

  // Center point of the component
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;

  // Handle position (above the component)
  const handleX = centerX;
  const handleY = bounds.y - scaledOffset;

  // Connector line coordinates
  const connectorStartY = bounds.y;
  const connectorEndY = handleY + scaledHandleSize / 2;

  // Derive tooltip values from store state when dragging
  const displayAngle =
    isStoreDragging && storeRotationState
      ? storeRotationState.currentAngle
      : tooltipAngle;

  const displayIsSnapping =
    isStoreDragging && storeRotationState
      ? storeRotationState.snapToAngle
      : isSnapping;

  // Handle mouse down - start rotation
  const handleMouseDown = useCallback(
    (event: ReactMouseEvent) => {
      if (!enabled) return;

      event.stopPropagation();
      event.preventDefault();

      isInternalDragging.current = true;
      setShowTooltip(true);
      setTooltipAngle(currentAngle);

      // Start rotation in interaction store
      const startPosition: Point = { x: event.clientX, y: event.clientY };
      const centerPoint: Point = { x: centerX, y: centerY };

      startRotation(componentId, startPosition, centerPoint, currentAngle);

      onRotationStart?.(currentAngle);
    },
    [
      enabled,
      componentId,
      centerX,
      centerY,
      currentAngle,
      startRotation,
      onRotationStart,
    ]
  );

  // Handle global mouse move and mouse up
  useEffect(() => {
    if (!isDragging && !isInternalDragging.current) return;

    const handleMouseMove = (event: MouseEvent) => {
      if (!isInternalDragging.current && !isDragging) return;

      const currentPosition: Point = { x: event.clientX, y: event.clientY };

      // Shift key toggles snapping behavior
      // If snapByDefault is true, shift disables snapping
      // If snapByDefault is false, shift enables snapping
      const shiftPressed = event.shiftKey;
      const shouldSnap = snapByDefault ? !shiftPressed : shiftPressed;

      // Use opposite of shouldSnap for the shift modifier
      // because the store uses shift to ENABLE snapping
      updateRotation(currentPosition, { shift: shouldSnap });

      setIsSnapping(shouldSnap);
    };

    const handleMouseUp = () => {
      if (!isInternalDragging.current && !isDragging) return;

      isInternalDragging.current = false;
      setShowTooltip(false);

      const finalAngle = endRotation();
      onRotationEnd?.(finalAngle);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        isInternalDragging.current = false;
        setShowTooltip(false);
        cancelRotation();
        onRotationEnd?.(null);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isDragging,
    snapByDefault,
    updateRotation,
    endRotation,
    cancelRotation,
    onRotation,
    onRotationEnd,
  ]);

  // Update external callback during rotation
  useEffect(() => {
    if (isDragging && storeRotationState) {
      onRotation?.(
        storeRotationState.currentAngle,
        storeRotationState.snapToAngle
      );
    }
  }, [isDragging, storeRotationState, onRotation]);

  if (!enabled) return null;

  return (
    <div
      className={cn("pointer-events-none absolute inset-0", className)}
      aria-label="Rotation control"
    >
      {/* Connector line from component to handle */}
      <svg
        className="pointer-events-none absolute inset-0 overflow-visible"
        style={{
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
        }}
      >
        <line
          x1={centerX - bounds.x}
          y1={connectorStartY - bounds.y}
          x2={handleX - bounds.x}
          y2={connectorEndY - bounds.y}
          stroke={
            isDragging ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"
          }
          strokeWidth={isDragging ? 2 : 1}
          strokeDasharray={isDragging ? "none" : "3 2"}
          className="transition-all duration-100"
        />
      </svg>

      {/* Rotation handle */}
      <div
        ref={handleRef}
        className={cn(
          // Base styles
          "pointer-events-auto absolute z-50 flex items-center justify-center",
          "rounded-full border-2 transition-all duration-100",
          "cursor-grab active:cursor-grabbing",
          // Normal state
          "border-primary bg-background shadow-md",
          // Hover state
          "hover:border-primary hover:bg-primary/10 hover:scale-110 hover:shadow-lg",
          // Active/Dragging state
          isDragging && [
            "scale-125 cursor-grabbing",
            "border-primary bg-primary/20 shadow-xl",
            "ring-primary/30 ring-4",
          ],
          // Disabled state
          !enabled && "pointer-events-none cursor-not-allowed opacity-40"
        )}
        style={{
          left: handleX - bounds.x - scaledHandleSize / 2,
          top: handleY - bounds.y - scaledHandleSize / 2,
          width: scaledHandleSize,
          height: scaledHandleSize,
          touchAction: "none",
        }}
        onMouseDown={handleMouseDown}
        role="slider"
        aria-label="Rotation angle"
        aria-valuenow={Math.round(normalizeAngle(currentAngle))}
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuetext={formatAngle(currentAngle)}
        tabIndex={enabled ? 0 : -1}
      >
        <RotateCw
          className={cn(
            "text-muted-foreground transition-colors duration-100",
            isDragging && "text-primary"
          )}
          style={{
            width: scaledHandleSize * 0.5,
            height: scaledHandleSize * 0.5,
          }}
          aria-hidden="true"
        />
      </div>

      {/* Angle tooltip */}
      <AngleTooltip
        angle={displayAngle}
        visible={showTooltip || isDragging}
        position={{
          x: handleX - bounds.x,
          y: handleY - bounds.y - scaledHandleSize / 2 - 8,
        }}
        isSnapping={displayIsSnapping}
      />

      {/* Visual rotation arc during dragging (optional enhancement) */}
      {isDragging && storeRotationState && (
        <svg
          className="pointer-events-none absolute inset-0 overflow-visible"
          style={{
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
          }}
        >
          {/* Arc showing rotation path */}
          <circle
            cx={centerX - bounds.x}
            cy={centerY - bounds.y}
            r={Math.max(bounds.width, bounds.height) / 2 + 10}
            fill="none"
            stroke="hsl(var(--primary) / 0.2)"
            strokeWidth={2}
            strokeDasharray="4 4"
          />

          {/* Current angle indicator line */}
          <line
            x1={centerX - bounds.x}
            y1={centerY - bounds.y}
            x2={
              centerX -
              bounds.x +
              (Math.max(bounds.width, bounds.height) / 2 + 10) *
                Math.sin((storeRotationState.currentAngle * Math.PI) / 180)
            }
            y2={
              centerY -
              bounds.y -
              (Math.max(bounds.width, bounds.height) / 2 + 10) *
                Math.cos((storeRotationState.currentAngle * Math.PI) / 180)
            }
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeLinecap="round"
          />

          {/* Original angle indicator (if different) */}
          {Math.abs(
            storeRotationState.originalAngle - storeRotationState.currentAngle
          ) > 1 && (
            <line
              x1={centerX - bounds.x}
              y1={centerY - bounds.y}
              x2={
                centerX -
                bounds.x +
                (Math.max(bounds.width, bounds.height) / 2 + 10) *
                  Math.sin((storeRotationState.originalAngle * Math.PI) / 180)
              }
              y2={
                centerY -
                bounds.y -
                (Math.max(bounds.width, bounds.height) / 2 + 10) *
                  Math.cos((storeRotationState.originalAngle * Math.PI) / 180)
              }
              stroke="hsl(var(--muted-foreground) / 0.5)"
              strokeWidth={1}
              strokeDasharray="3 3"
              strokeLinecap="round"
            />
          )}
        </svg>
      )}
    </div>
  );
}

export const RotationHandle = memo(RotationHandleComponent);
RotationHandle.displayName = "RotationHandle";

export default RotationHandle;
