/**
 * TranslationDragHandle Component
 * Makes components with Translate wrapper draggable
 *
 * Features:
 * - Entire component becomes draggable
 * - Show offset tooltip (e.g., "X: +10, Y: -5")
 * - Snap to grid if enabled (Ctrl/Cmd key)
 * - Shift key constrains to axis
 * - Visual feedback during drag
 * - Two-way binding with properties panel
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
import { Move } from "lucide-react";
import type { BoundingBox, Point } from "@/types/canvas";
import { ComponentType } from "@/types/component";
import { useInteractionStore } from "@/store/interaction-store";
import { useCanvasStore } from "@/store/canvas-store";

// ============================================================================
// Types
// ============================================================================

/**
 * Translation constraints
 */
export interface TranslationConstraints {
  /** Minimum X offset */
  minX?: number;
  /** Maximum X offset */
  maxX?: number;
  /** Minimum Y offset */
  minY?: number;
  /** Maximum Y offset */
  maxY?: number;
  /** Snap increment in pixels (default: 10) */
  snapIncrement?: number;
}

/**
 * Props for the TranslationDragHandle component
 */
export interface TranslationDragHandleProps {
  /** Component ID being translated */
  componentId: string;
  /** Component type (should be Translate) */
  componentType: ComponentType;
  /** Bounding box of the component */
  bounds: BoundingBox;
  /** Current X offset (from component properties) */
  currentOffsetX?: number;
  /** Current Y offset (from component properties) */
  currentOffsetY?: number;
  /** Current canvas zoom level */
  zoom?: number;
  /** Whether translation is enabled */
  enabled?: boolean;
  /** Translation constraints */
  constraints?: TranslationConstraints;
  /** Whether to show the move handle icon */
  showHandle?: boolean;
  /** Callback when translation starts */
  onTranslationStart?: (event: ReactMouseEvent) => void;
  /** Callback during translation with current offset */
  onTranslation?: (offsetX: number, offsetY: number) => void;
  /** Callback when translation ends */
  onTranslationEnd?: (offset: Point | null) => void;
  /** Additional CSS classes */
  className?: string;
  /** Children to render inside the draggable area */
  children?: React.ReactNode;
}

/**
 * Translation state during interaction
 */
interface TranslationState {
  isDragging: boolean;
  startPosition: Point;
  originalOffset: Point;
  currentOffset: Point;
  snapToGrid: boolean;
  axisConstrained: "x" | "y" | null;
}

/**
 * Props for the OffsetTooltip component
 */
interface OffsetTooltipProps {
  /** Current X offset */
  offsetX: number;
  /** Current Y offset */
  offsetY: number;
  /** Whether the tooltip is visible */
  visible: boolean;
  /** Position relative to component */
  position: Point;
  /** Whether snapping is active */
  isSnapping: boolean;
  /** Which axis is constrained (if any) */
  axisConstrained: "x" | "y" | null;
  /** Current canvas zoom level */
  zoom?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default translation constraints */
const DEFAULT_CONSTRAINTS: Required<TranslationConstraints> = {
  minX: -10000,
  maxX: 10000,
  minY: -10000,
  maxY: 10000,
  snapIncrement: 10,
};

/** Move handle size */
const HANDLE_SIZE = 24;

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
 * Format offset for display
 */
function formatOffset(value: number): string {
  const rounded = Math.round(value);
  return rounded >= 0 ? `+${rounded}` : `${rounded}`;
}

// ============================================================================
// OffsetTooltip Component
// ============================================================================

/**
 * Tooltip showing the current translation offset
 */
const OffsetTooltip = memo(function OffsetTooltipComponent({
  offsetX,
  offsetY,
  visible,
  position,
  isSnapping,
  axisConstrained,
  zoom = 1,
  className,
}: OffsetTooltipProps) {
  if (!visible) return null;

  // Counter-scale tooltip based on zoom to maintain readability
  const tooltipScale = Math.min(1.5, Math.max(0.75, 1 / zoom));

  return (
    <div
      className={cn(
        // Base styles
        "pointer-events-none absolute z-50",
        "rounded-md px-2 py-1.5 text-xs font-medium",
        "transition-all duration-100 ease-out",
        // Shadow and border
        "border shadow-lg",
        // Visibility animation
        visible ? "scale-100 opacity-100" : "scale-95 opacity-0",
        // Color based on state
        isSnapping
          ? "border-primary/40 bg-primary text-primary-foreground"
          : "border-border bg-popover text-popover-foreground",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -100%) scale(${tooltipScale})`,
        transformOrigin: "bottom center",
      }}
      role="tooltip"
      aria-label={`Offset: X: ${formatOffset(offsetX)}, Y: ${formatOffset(offsetY)}`}
    >
      <div className="flex items-center gap-2">
        <Move className="h-3 w-3" aria-hidden="true" />

        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-0.5",
              axisConstrained === "y" && "opacity-50"
            )}
          >
            <span className="text-[10px] opacity-70">X:</span>
            <span className={offsetX !== 0 ? "font-semibold" : ""}>
              {formatOffset(offsetX)}
            </span>
          </span>

          <span className="text-[10px] opacity-50">|</span>

          <span
            className={cn(
              "flex items-center gap-0.5",
              axisConstrained === "x" && "opacity-50"
            )}
          >
            <span className="text-[10px] opacity-70">Y:</span>
            <span className={offsetY !== 0 ? "font-semibold" : ""}>
              {formatOffset(offsetY)}
            </span>
          </span>
        </div>

        {/* Indicators */}
        {isSnapping && <span className="text-[10px] opacity-75">(snap)</span>}
        {axisConstrained && (
          <span className="text-[10px] opacity-75">
            ({axisConstrained}-axis)
          </span>
        )}
      </div>
    </div>
  );
});

OffsetTooltip.displayName = "OffsetTooltip";

// ============================================================================
// TranslationDragHandle Component
// ============================================================================

/**
 * Translation drag handle that makes components draggable
 */
function TranslationDragHandleComponent({
  componentId,
  componentType,
  bounds,
  currentOffsetX = 0,
  currentOffsetY = 0,
  zoom = 1,
  enabled = true,
  constraints = {},
  showHandle = true,
  onTranslationStart,
  onTranslation,
  onTranslationEnd,
  className,
  children,
}: TranslationDragHandleProps) {
  // Merge constraints with defaults (memoized to avoid re-render issues)
  const mergedConstraints = useMemo(
    () => ({ ...DEFAULT_CONSTRAINTS, ...constraints }),
    [constraints]
  );

  // Get stores
  const {
    activeInteraction,
    translation: storeTranslation,
    startTranslation,
    updateTranslation,
    endTranslation,
    cancelTranslation,
  } = useInteractionStore();

  const { updateComponentProperties } = useCanvasStore();

  // Local translation state (for when not using store)
  const [localState, setLocalState] = useState<TranslationState | null>(null);
  const stateRef = useRef<TranslationState | null>(null);

  // Check if this component is being translated via store
  const isStoreTranslating =
    activeInteraction === "translation" &&
    storeTranslation?.componentId === componentId;

  // Use local state or store state
  const isDragging = localState?.isDragging || isStoreTranslating;

  // Calculate scaled handle size
  const scaledHandleSize = useMemo(() => {
    return Math.max(HANDLE_SIZE * (1 / zoom), 20);
  }, [zoom]);

  // Handle mouse down - start translation
  const handleMouseDown = useCallback(
    (event: ReactMouseEvent) => {
      if (!enabled) return;

      event.stopPropagation();
      event.preventDefault();

      const startPosition: Point = { x: event.clientX, y: event.clientY };
      const originalOffset: Point = { x: currentOffsetX, y: currentOffsetY };

      // Start translation in interaction store
      startTranslation(componentId, startPosition, originalOffset);

      // Also set local state for tooltip
      const newState: TranslationState = {
        isDragging: true,
        startPosition,
        originalOffset,
        currentOffset: originalOffset,
        snapToGrid: false,
        axisConstrained: null,
      };

      setLocalState(newState);
      stateRef.current = newState;

      onTranslationStart?.(event);
    },
    [
      enabled,
      componentId,
      currentOffsetX,
      currentOffsetY,
      startTranslation,
      onTranslationStart,
    ]
  );

  // Handle mouse move during translation
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      const state = stateRef.current;
      if (!state) return;

      const currentPosition: Point = { x: event.clientX, y: event.clientY };
      const dx = (currentPosition.x - state.startPosition.x) / zoom;
      const dy = (currentPosition.y - state.startPosition.y) / zoom;

      let offsetX = state.originalOffset.x + dx;
      let offsetY = state.originalOffset.y + dy;

      // Check for axis constraint (Shift key)
      const shiftPressed = event.shiftKey;
      let axisConstrained: "x" | "y" | null = null;

      if (shiftPressed) {
        // Constrain to the axis with larger movement
        if (Math.abs(dx) > Math.abs(dy)) {
          offsetY = state.originalOffset.y;
          axisConstrained = "x";
        } else {
          offsetX = state.originalOffset.x;
          axisConstrained = "y";
        }
      }

      // Check for snap to grid (Ctrl/Cmd key)
      const snapActive = event.ctrlKey || event.metaKey;
      if (snapActive) {
        offsetX = snapToIncrement(offsetX, mergedConstraints.snapIncrement);
        offsetY = snapToIncrement(offsetY, mergedConstraints.snapIncrement);
      }

      // Clamp to constraints
      offsetX = clamp(offsetX, mergedConstraints.minX, mergedConstraints.maxX);
      offsetY = clamp(offsetY, mergedConstraints.minY, mergedConstraints.maxY);

      // Update store
      updateTranslation(currentPosition, {
        shift: shiftPressed,
        ctrl: snapActive,
      });

      // Update local state for tooltip
      const updatedState: TranslationState = {
        ...state,
        currentOffset: { x: offsetX, y: offsetY },
        snapToGrid: snapActive,
        axisConstrained,
      };

      setLocalState(updatedState);
      stateRef.current = updatedState;

      onTranslation?.(offsetX, offsetY);
    };

    const handleMouseUp = () => {
      const state = stateRef.current;

      // Get final offset from store or local state
      const finalOffset = endTranslation();

      if (finalOffset || state?.currentOffset) {
        const offset = finalOffset || state?.currentOffset;
        if (offset) {
          // Apply constraints
          const clampedX = clamp(
            offset.x,
            mergedConstraints.minX,
            mergedConstraints.maxX
          );
          const clampedY = clamp(
            offset.y,
            mergedConstraints.minY,
            mergedConstraints.maxY
          );

          // Update component properties
          updateComponentProperties(componentId, {
            x: clampedX,
            y: clampedY,
          });

          onTranslationEnd?.({ x: clampedX, y: clampedY });
        }
      } else {
        onTranslationEnd?.(null);
      }

      // Reset local state
      setLocalState(null);
      stateRef.current = null;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Cancel translation
        cancelTranslation();
        setLocalState(null);
        stateRef.current = null;
        onTranslationEnd?.(null);
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
    isDragging,
    zoom,
    componentId,
    mergedConstraints,
    updateTranslation,
    endTranslation,
    cancelTranslation,
    updateComponentProperties,
    onTranslation,
    onTranslationEnd,
  ]);

  // Check if component type supports translation
  const isTranslationSupported = componentType === ComponentType.Translate;

  if (!isTranslationSupported || !enabled) {
    return children ? <>{children}</> : null;
  }

  // Current display values
  const displayOffsetX =
    localState?.currentOffset.x ??
    storeTranslation?.currentOffset.x ??
    currentOffsetX;
  const displayOffsetY =
    localState?.currentOffset.y ??
    storeTranslation?.currentOffset.y ??
    currentOffsetY;

  // Container styles - the entire area is draggable
  const containerStyle: CSSProperties = {
    position: "absolute",
    left: bounds.x,
    top: bounds.y,
    width: bounds.width,
    height: bounds.height,
    cursor: enabled ? (isDragging ? "grabbing" : "grab") : "default",
  };

  return (
    <div
      className={cn(
        "translation-drag-handle",
        isDragging && "is-dragging",
        className
      )}
      style={containerStyle}
      onMouseDown={handleMouseDown}
      data-translation-handle
      data-component-id={componentId}
      role="button"
      aria-label="Drag to translate component"
      tabIndex={enabled ? 0 : -1}
    >
      {/* Visual overlay when dragging */}
      {isDragging && (
        <div
          className="border-primary/50 bg-primary/5 pointer-events-none absolute inset-0 rounded-sm border-2 border-dashed"
          aria-hidden="true"
        />
      )}

      {/* Move handle icon in corner */}
      {showHandle && (
        <div
          className={cn(
            "pointer-events-none absolute z-50",
            "flex items-center justify-center",
            "bg-background rounded-sm border shadow-sm",
            "transition-all duration-100",
            isDragging && "border-primary bg-primary/10"
          )}
          style={{
            top: 4,
            right: 4,
            width: scaledHandleSize,
            height: scaledHandleSize,
          }}
          aria-hidden="true"
        >
          <Move
            className={cn(
              "text-muted-foreground",
              isDragging && "text-primary"
            )}
            style={{
              width: scaledHandleSize * 0.6,
              height: scaledHandleSize * 0.6,
            }}
          />
        </div>
      )}

      {/* Offset tooltip during dragging */}
      {isDragging && (
        <OffsetTooltip
          offsetX={displayOffsetX}
          offsetY={displayOffsetY}
          visible={true}
          position={{
            x: bounds.width / 2,
            y: -8,
          }}
          isSnapping={
            localState?.snapToGrid ?? storeTranslation?.snapToGrid ?? false
          }
          axisConstrained={localState?.axisConstrained ?? null}
          zoom={zoom}
        />
      )}

      {/* Original position indicator when dragging */}
      {isDragging &&
        (displayOffsetX !== currentOffsetX ||
          displayOffsetY !== currentOffsetY) && (
          <div
            className="border-muted-foreground/30 pointer-events-none absolute border border-dashed"
            style={{
              left: currentOffsetX - displayOffsetX,
              top: currentOffsetY - displayOffsetY,
              width: bounds.width,
              height: bounds.height,
            }}
            aria-hidden="true"
          />
        )}

      {/* Children */}
      {children}
    </div>
  );
}

export const TranslationDragHandle = memo(TranslationDragHandleComponent);
TranslationDragHandle.displayName = "TranslationDragHandle";

export default TranslationDragHandle;
