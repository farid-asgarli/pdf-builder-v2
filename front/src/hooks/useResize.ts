/**
 * useResize Hook
 * Encapsulates resize interaction logic for canvas components
 *
 * Features:
 * - Mouse down/move/up event handlers
 * - Calculate new size from mouse position
 * - Enforce min/max constraints from component metadata
 * - Aspect ratio locking with Shift key
 * - Snap to grid with Ctrl/Cmd key
 * - Updates canvas store during resize
 * - Two-way binding support
 */
"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useInteractionStore,
  type ResizeHandle,
  type ResizeConstraints,
  DEFAULT_RESIZE_CONSTRAINTS,
} from "@/store/interaction-store";
import { useCanvasStore } from "@/store/canvas-store";
import type { Point, Size, BoundingBox } from "@/types/canvas";
import type { ComponentType } from "@/types/component";
import {
  getHandleConfig,
  type HandlePosition,
} from "@/components/builder/Canvas/ResizeHandles";

// ============================================================================
// Types
// ============================================================================

/**
 * Resize state exposed by the hook
 */
export interface ResizeState {
  /** Whether resize is currently active */
  isResizing: boolean;
  /** Current size during resize */
  currentSize: Size;
  /** Original size before resize started */
  originalSize: Size;
  /** Active handle being dragged */
  activeHandle: HandlePosition | null;
  /** Whether aspect ratio is locked */
  aspectRatioLocked: boolean;
  /** Whether snap mode is active */
  snapActive: boolean;
  /** Whether constraints are being ignored (preview mode) */
  constraintsIgnored: boolean;
}

/**
 * Constraint status for visual feedback
 */
export interface ConstraintLimitStatus {
  atMinWidth: boolean;
  atMaxWidth: boolean;
  atMinHeight: boolean;
  atMaxHeight: boolean;
}

/**
 * Options for the useResize hook
 */
export interface UseResizeOptions {
  /** Component ID being resized */
  componentId: string;
  /** Component type for determining resize behavior */
  componentType: ComponentType;
  /** Current component bounds */
  bounds: BoundingBox;
  /** Resize constraints (min/max values) */
  constraints?: ResizeConstraints;
  /** Whether resize is enabled */
  enabled?: boolean;
  /** Snap increment in pixels (default: 10) */
  snapIncrement?: number;
  /** Callback when resize starts */
  onResizeStart?: (handle: HandlePosition) => void;
  /** Callback during resize with current size */
  onResize?: (size: Size) => void;
  /** Callback when resize ends with final size */
  onResizeEnd?: (size: Size | null) => void;
  /** Whether to update canvas store automatically */
  updateStore?: boolean;
}

/**
 * Return type for the useResize hook
 */
export interface UseResizeReturn {
  /** Current resize state */
  state: ResizeState;
  /** Constraint limit status for visual feedback */
  constraintStatus: ConstraintLimitStatus;
  /** Handler for mouse down on resize handle */
  handleMouseDown: (handle: HandlePosition, event: React.MouseEvent) => void;
  /** Cancel current resize operation */
  cancelResize: () => void;
  /** Check if component is resizable */
  isResizable: boolean;
  /** Get handles to show based on component type */
  handles: HandlePosition[];
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing component resize interactions
 */
export function useResize({
  componentId,
  componentType,
  bounds,
  constraints = DEFAULT_RESIZE_CONSTRAINTS,
  enabled = true,
  snapIncrement: _snapIncrement = 10,
  onResizeStart,
  onResize,
  onResizeEnd,
  updateStore = true,
}: UseResizeOptions): UseResizeReturn {
  // Stores
  const {
    activeInteraction,
    resize: storeResizeState,
    startResize,
    updateResize,
    endResize,
    cancelResize: storeCancelResize,
  } = useInteractionStore();

  const updateComponentProperty = useCanvasStore(
    (state) => state.updateComponentProperty
  );

  // Track if this component is being resized
  const isResizing =
    activeInteraction === "resize" &&
    storeResizeState?.componentId === componentId;

  // Get handle configuration for this component type
  const handleConfig = getHandleConfig(componentType);

  // Refs for tracking during resize
  const isResizingRef = useRef(false);
  const callbackRef = useRef({ onResize, onResizeEnd });

  // Update callback ref in effect to avoid updating during render
  useEffect(() => {
    callbackRef.current = { onResize, onResizeEnd };
  }, [onResize, onResizeEnd]);

  // Calculate resize state
  const state: ResizeState = {
    isResizing,
    currentSize:
      isResizing && storeResizeState?.currentSize
        ? storeResizeState.currentSize
        : { width: bounds.width, height: bounds.height },
    originalSize:
      isResizing && storeResizeState?.originalSize
        ? storeResizeState.originalSize
        : { width: bounds.width, height: bounds.height },
    activeHandle:
      isResizing && storeResizeState?.handle
        ? (storeResizeState.handle as HandlePosition)
        : null,
    aspectRatioLocked: isResizing
      ? (storeResizeState?.lockAspectRatio ?? false)
      : false,
    snapActive: isResizing
      ? (storeResizeState?.snapToIncrement ?? false)
      : false,
    constraintsIgnored: isResizing
      ? (storeResizeState?.ignoreConstraints ?? false)
      : false,
  };

  // Calculate constraint status based on current size (using useMemo to avoid setState in effect)
  const constraintStatus: ConstraintLimitStatus = useMemo(() => {
    if (!isResizing || !storeResizeState?.currentSize) {
      return {
        atMinWidth: false,
        atMaxWidth: false,
        atMinHeight: false,
        atMaxHeight: false,
      };
    }

    const { width, height } = storeResizeState.currentSize;
    const { minWidth, maxWidth, minHeight, maxHeight } = {
      ...DEFAULT_RESIZE_CONSTRAINTS,
      ...constraints,
    };

    return {
      atMinWidth: minWidth !== undefined && width <= minWidth,
      atMaxWidth: maxWidth !== undefined && width >= maxWidth,
      atMinHeight: minHeight !== undefined && height <= minHeight,
      atMaxHeight: maxHeight !== undefined && height >= maxHeight,
    };
  }, [isResizing, storeResizeState?.currentSize, constraints]);

  // Handle mouse down on resize handle
  const handleMouseDown = useCallback(
    (handle: HandlePosition, event: React.MouseEvent) => {
      if (!enabled) return;

      event.stopPropagation();
      event.preventDefault();

      const startPosition: Point = { x: event.clientX, y: event.clientY };
      const originalSize: Size = { width: bounds.width, height: bounds.height };
      const originalPosition: Point = { x: bounds.x, y: bounds.y };

      // Merge constraints with defaults
      const mergedConstraints: ResizeConstraints = {
        ...DEFAULT_RESIZE_CONSTRAINTS,
        ...constraints,
        // Calculate aspect ratio if not provided
        aspectRatio: constraints?.aspectRatio ?? bounds.width / bounds.height,
      };

      // Start resize in the interaction store
      startResize(
        componentId,
        handle as ResizeHandle,
        startPosition,
        originalSize,
        originalPosition,
        mergedConstraints
      );

      isResizingRef.current = true;
      onResizeStart?.(handle);
    },
    [enabled, componentId, bounds, constraints, startResize, onResizeStart]
  );

  // Handle mouse move and up during resize
  useEffect(() => {
    if (!isResizing) {
      isResizingRef.current = false;
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const currentPosition: Point = { x: event.clientX, y: event.clientY };
      const modifiers = {
        shift: event.shiftKey,
        ctrl: event.ctrlKey || event.metaKey,
        alt: event.altKey,
      };

      updateResize(currentPosition, modifiers);

      // Call onResize callback with current size
      if (callbackRef.current.onResize && storeResizeState?.currentSize) {
        callbackRef.current.onResize(storeResizeState.currentSize);
      }
    };

    const handleMouseUp = () => {
      // Check if we were in preview mode (Alt held = ignoreConstraints)
      const wasInPreviewMode = storeResizeState?.ignoreConstraints ?? false;
      const finalSize = endResize();
      isResizingRef.current = false;

      // Don't apply values if we were in preview mode (Alt was held)
      // Preview mode is for "what if" scenarios only
      if (wasInPreviewMode) {
        callbackRef.current.onResizeEnd?.(null);
        return;
      }

      // Update canvas store if enabled
      if (updateStore && finalSize) {
        // Update width if changed
        if (finalSize.width !== bounds.width) {
          updateComponentProperty(componentId, "width", finalSize.width);
        }
        // Update height if changed
        if (finalSize.height !== bounds.height) {
          updateComponentProperty(componentId, "height", finalSize.height);
        }
      }

      callbackRef.current.onResizeEnd?.(finalSize);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        storeCancelResize();
        isResizingRef.current = false;
        callbackRef.current.onResizeEnd?.(null);
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
    isResizing,
    storeResizeState?.currentSize,
    updateResize,
    endResize,
    storeCancelResize,
    updateStore,
    componentId,
    bounds.width,
    bounds.height,
    updateComponentProperty,
  ]);

  // Cancel resize function
  const cancelResize = useCallback(() => {
    if (isResizing) {
      storeCancelResize();
      isResizingRef.current = false;
      onResizeEnd?.(null);
    }
  }, [isResizing, storeCancelResize, onResizeEnd]);

  return {
    state,
    constraintStatus,
    handleMouseDown,
    cancelResize,
    isResizable:
      handleConfig.direction !== "none" && handleConfig.handles.length > 0,
    handles: handleConfig.handles,
  };
}

export default useResize;
