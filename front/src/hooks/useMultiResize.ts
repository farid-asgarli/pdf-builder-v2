/**
 * useMultiResize Hook
 * Encapsulates multi-component proportional resize logic for canvas components
 *
 * Features:
 * - Select multiple components and resize all proportionally
 * - Maintain relative spacing between components
 * - Calculate scale factors from bounding box changes
 * - Support Shift key for aspect ratio lock
 * - Support Ctrl/Cmd key for snap to grid
 * - Update all component sizes and positions in canvas store
 * - Two-way binding support
 */
"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  useInteractionStore,
  type ResizeHandle,
  type ResizeConstraints,
  type MultiResizeComponentInfo,
  DEFAULT_RESIZE_CONSTRAINTS,
} from "@/store/interaction-store";
import { useCanvasStore } from "@/store/canvas-store";
import type { Point, Size, BoundingBox } from "@/types/canvas";
import type { HandlePosition } from "@/components/builder/Canvas/ResizeHandles";

// ============================================================================
// Types
// ============================================================================

/**
 * Component bounds info for multi-resize calculations
 */
export interface ComponentBounds {
  componentId: string;
  bounds: BoundingBox;
}

/**
 * Multi-resize state exposed by the hook
 */
export interface MultiResizeState {
  /** Whether multi-resize is currently active */
  isResizing: boolean;
  /** Current bounding box of all selected components */
  currentBoundingBox: BoundingBox | null;
  /** Original bounding box before resize started */
  originalBoundingBox: BoundingBox | null;
  /** Active handle being dragged */
  activeHandle: HandlePosition | null;
  /** Current scale factors */
  scaleFactor: { x: number; y: number };
  /** Whether aspect ratio is locked */
  aspectRatioLocked: boolean;
  /** Whether snap mode is active */
  snapActive: boolean;
  /** Whether constraints are being ignored (preview mode) */
  constraintsIgnored: boolean;
  /** Number of components being resized */
  componentCount: number;
}

/**
 * Options for the useMultiResize hook
 */
export interface UseMultiResizeOptions {
  /** Array of component bounds to resize together */
  componentBounds: ComponentBounds[];
  /** Resize constraints (min/max values) */
  constraints?: ResizeConstraints;
  /** Whether multi-resize is enabled */
  enabled?: boolean;
  /** Snap increment in pixels (default: 10) */
  snapIncrement?: number;
  /** Callback when resize starts */
  onResizeStart?: (handle: HandlePosition) => void;
  /** Callback during resize with current scale */
  onResize?: (scaleFactor: { x: number; y: number }) => void;
  /** Callback when resize ends with final component info */
  onResizeEnd?: (components: MultiResizeComponentInfo[] | null) => void;
  /** Whether to update canvas store automatically */
  updateStore?: boolean;
}

/**
 * Return type for the useMultiResize hook
 */
export interface UseMultiResizeReturn {
  /** Current multi-resize state */
  state: MultiResizeState;
  /** Combined bounding box of all components */
  boundingBox: BoundingBox | null;
  /** Handler for mouse down on resize handle */
  handleMouseDown: (handle: HandlePosition, event: React.MouseEvent) => void;
  /** Cancel current resize operation */
  cancelResize: () => void;
  /** Check if multi-resize is available (multiple components selected) */
  canMultiResize: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate the combined bounding box of multiple component bounds
 */
export function calculateCombinedBoundingBox(
  componentBounds: ComponentBounds[]
): BoundingBox | null {
  if (componentBounds.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const { bounds } of componentBounds) {
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
 * Calculate the relative position of a component within a bounding box
 * Returns values from 0 to 1 representing the percentage position
 */
export function calculateRelativePosition(
  componentBounds: BoundingBox,
  containerBounds: BoundingBox
): Point {
  return {
    x:
      containerBounds.width > 0
        ? (componentBounds.x - containerBounds.x) / containerBounds.width
        : 0,
    y:
      containerBounds.height > 0
        ? (componentBounds.y - containerBounds.y) / containerBounds.height
        : 0,
  };
}

/**
 * Calculate the relative size of a component within a bounding box
 * Returns values from 0 to 1 representing the percentage size
 */
export function calculateRelativeSize(
  componentBounds: BoundingBox,
  containerBounds: BoundingBox
): Size {
  return {
    width:
      containerBounds.width > 0
        ? componentBounds.width / containerBounds.width
        : 1,
    height:
      containerBounds.height > 0
        ? componentBounds.height / containerBounds.height
        : 1,
  };
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing multi-component proportional resize interactions
 */
export function useMultiResize({
  componentBounds,
  constraints = DEFAULT_RESIZE_CONSTRAINTS,
  enabled = true,
  snapIncrement: _snapIncrement = 10,
  onResizeStart,
  onResize,
  onResizeEnd,
  updateStore = true,
}: UseMultiResizeOptions): UseMultiResizeReturn {
  // Stores
  const {
    activeInteraction,
    multiResize: storeMultiResizeState,
    startMultiResize,
    updateMultiResize,
    endMultiResize,
    cancelMultiResize: storeCancelMultiResize,
  } = useInteractionStore();

  const updateComponentProperties = useCanvasStore(
    (state) => state.updateComponentProperties
  );

  // Track if this multi-resize is active
  const isResizing = activeInteraction === "multi-resize";

  // Refs for tracking during resize
  const isResizingRef = useRef(false);
  const callbackRef = useRef({ onResize, onResizeEnd });

  // Update callback ref in effect to avoid updating during render
  useEffect(() => {
    callbackRef.current = { onResize, onResizeEnd };
  }, [onResize, onResizeEnd]);

  // Calculate combined bounding box
  const boundingBox = useMemo(
    () => calculateCombinedBoundingBox(componentBounds),
    [componentBounds]
  );

  // Check if multi-resize is available
  const canMultiResize = enabled && componentBounds.length > 1;

  // Calculate current state
  const state: MultiResizeState = useMemo(() => {
    if (!isResizing || !storeMultiResizeState) {
      return {
        isResizing: false,
        currentBoundingBox: boundingBox,
        originalBoundingBox: null,
        activeHandle: null,
        scaleFactor: { x: 1, y: 1 },
        aspectRatioLocked: false,
        snapActive: false,
        constraintsIgnored: false,
        componentCount: componentBounds.length,
      };
    }

    return {
      isResizing: true,
      currentBoundingBox: storeMultiResizeState.currentBoundingBox,
      originalBoundingBox: storeMultiResizeState.originalBoundingBox,
      activeHandle: storeMultiResizeState.handle as HandlePosition,
      scaleFactor: storeMultiResizeState.scaleFactor,
      aspectRatioLocked: storeMultiResizeState.lockAspectRatio,
      snapActive: storeMultiResizeState.snapToIncrement,
      constraintsIgnored: storeMultiResizeState.ignoreConstraints,
      componentCount: storeMultiResizeState.components.length,
    };
  }, [isResizing, storeMultiResizeState, boundingBox, componentBounds.length]);

  // Handle mouse down on resize handle
  const handleMouseDown = useCallback(
    (handle: HandlePosition, event: React.MouseEvent) => {
      if (!enabled || !canMultiResize || !boundingBox) return;

      event.stopPropagation();
      event.preventDefault();

      const startPosition: Point = { x: event.clientX, y: event.clientY };

      // Prepare component info for the store
      const components = componentBounds.map(({ componentId, bounds }) => ({
        componentId,
        size: { width: bounds.width, height: bounds.height },
        position: { x: bounds.x, y: bounds.y },
      }));

      // Merge constraints with defaults
      const mergedConstraints: ResizeConstraints = {
        ...DEFAULT_RESIZE_CONSTRAINTS,
        ...constraints,
        // For multi-resize, aspect ratio is based on bounding box
        aspectRatio:
          constraints?.aspectRatio ?? boundingBox.width / boundingBox.height,
      };

      // Start multi-resize in the interaction store
      startMultiResize(
        components,
        handle as ResizeHandle,
        startPosition,
        boundingBox,
        mergedConstraints
      );

      isResizingRef.current = true;
      onResizeStart?.(handle);
    },
    [
      enabled,
      canMultiResize,
      componentBounds,
      boundingBox,
      constraints,
      startMultiResize,
      onResizeStart,
    ]
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

      updateMultiResize(currentPosition, modifiers);

      // Call onResize callback with current scale factor
      if (callbackRef.current.onResize && storeMultiResizeState?.scaleFactor) {
        callbackRef.current.onResize(storeMultiResizeState.scaleFactor);
      }
    };

    const handleMouseUp = () => {
      // Check if we were in preview mode (Alt held = ignoreConstraints)
      const wasInPreviewMode =
        storeMultiResizeState?.ignoreConstraints ?? false;
      const finalComponents = endMultiResize();
      isResizingRef.current = false;

      // Don't apply values if we were in preview mode (Alt was held)
      // Preview mode is for "what if" scenarios only
      if (wasInPreviewMode) {
        callbackRef.current.onResizeEnd?.(null);
        return;
      }

      // Update canvas store for all components if enabled
      if (updateStore && finalComponents) {
        for (const comp of finalComponents) {
          // Update width and height for each component
          updateComponentProperties(comp.componentId, {
            width: comp.currentSize.width,
            height: comp.currentSize.height,
          });
        }
      }

      callbackRef.current.onResizeEnd?.(finalComponents);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        storeCancelMultiResize();
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
    storeMultiResizeState?.scaleFactor,
    updateMultiResize,
    endMultiResize,
    storeCancelMultiResize,
    updateStore,
    updateComponentProperties,
  ]);

  // Cancel resize function
  const cancelResize = useCallback(() => {
    if (isResizing) {
      storeCancelMultiResize();
      isResizingRef.current = false;
      onResizeEnd?.(null);
    }
  }, [isResizing, storeCancelMultiResize, onResizeEnd]);

  return {
    state,
    boundingBox,
    handleMouseDown,
    cancelResize,
    canMultiResize,
  };
}

export default useMultiResize;
