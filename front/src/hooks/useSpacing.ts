/**
 * useSpacing Hook
 * Encapsulates spacing adjustment interaction logic for Column/Row containers
 *
 * Features:
 * - Mouse down/move/up event handlers for gap adjustment
 * - Calculate new spacing from mouse position
 * - Snap to 5px increments
 * - Updates canvas store during adjustment
 * - Two-way binding support with properties panel
 */
"use client";

import { useCallback, useEffect, useRef, useMemo } from "react";
import { useInteractionStore } from "@/store/interaction-store";
import { useCanvasStore } from "@/store/canvas-store";
import type { Point } from "@/types/canvas";
import type { ComponentType } from "@/types/component";

// ============================================================================
// Types
// ============================================================================

/**
 * Spacing state exposed by the hook
 */
export interface SpacingState {
  /** Whether spacing adjustment is currently active */
  isAdjusting: boolean;
  /** Current spacing value during adjustment (in points) */
  currentSpacing: number;
  /** Original spacing value before adjustment started */
  originalSpacing: number;
  /** Index of the gap being adjusted */
  activeGapIndex: number | null;
}

/**
 * Options for the useSpacing hook
 */
export interface UseSpacingOptions {
  /** Container component ID */
  componentId: string;
  /** Component type (Column or Row) */
  componentType: ComponentType;
  /** Current spacing value in points */
  currentSpacing: number;
  /** Whether spacing adjustment is enabled */
  enabled?: boolean;
  /** Snap increment in points (default: 5) */
  snapIncrement?: number;
  /** Minimum spacing value (default: 0) */
  minSpacing?: number;
  /** Maximum spacing value (default: 200) */
  maxSpacing?: number;
  /** Callback when spacing adjustment starts */
  onAdjustStart?: (gapIndex: number) => void;
  /** Callback during spacing adjustment */
  onAdjust?: (spacing: number) => void;
  /** Callback when spacing adjustment ends */
  onAdjustEnd?: (spacing: number | null) => void;
  /** Whether to update canvas store automatically */
  updateStore?: boolean;
}

/**
 * Return type for the useSpacing hook
 */
export interface UseSpacingReturn {
  /** Current spacing state */
  state: SpacingState;
  /** Handler for mouse down on spacing gap */
  handleMouseDown: (gapIndex: number, event: React.MouseEvent) => void;
  /** Cancel current spacing adjustment */
  cancelAdjust: () => void;
  /** Check if spacing can be adjusted (Column or Row with children) */
  canAdjust: boolean;
  /** Whether at minimum spacing */
  atMinSpacing: boolean;
  /** Whether at maximum spacing */
  atMaxSpacing: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Default snap increment for spacing (in points) */
const DEFAULT_SNAP_INCREMENT = 5;

/** Default minimum spacing */
const DEFAULT_MIN_SPACING = 0;

/** Default maximum spacing */
const DEFAULT_MAX_SPACING = 200;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing spacing adjustment interactions
 */
export function useSpacing({
  componentId,
  componentType,
  currentSpacing,
  enabled = true,
  snapIncrement = DEFAULT_SNAP_INCREMENT,
  minSpacing = DEFAULT_MIN_SPACING,
  maxSpacing = DEFAULT_MAX_SPACING,
  onAdjustStart,
  onAdjust,
  onAdjustEnd,
  updateStore = true,
}: UseSpacingOptions): UseSpacingReturn {
  // Stores
  const {
    activeInteraction,
    spacingAdjust: storeSpacingState,
    startSpacingAdjust,
    updateSpacingAdjust,
    endSpacingAdjust,
    cancelSpacingAdjust: storeCancelAdjust,
  } = useInteractionStore();

  const updateComponentProperty = useCanvasStore(
    (state) => state.updateComponentProperty
  );

  // Track if this component's spacing is being adjusted
  const isAdjusting =
    activeInteraction === "spacing" &&
    storeSpacingState?.componentId === componentId;

  // Refs for tracking during adjustment
  const isAdjustingRef = useRef(false);
  const callbackRef = useRef({ onAdjust, onAdjustEnd });

  // Update callback ref in effect
  useEffect(() => {
    callbackRef.current = { onAdjust, onAdjustEnd };
  }, [onAdjust, onAdjustEnd]);

  // Calculate spacing state
  const state: SpacingState = useMemo(
    () => ({
      isAdjusting,
      currentSpacing: isAdjusting
        ? (storeSpacingState?.currentSpacing ?? currentSpacing)
        : currentSpacing,
      originalSpacing: isAdjusting
        ? (storeSpacingState?.originalSpacing ?? currentSpacing)
        : currentSpacing,
      activeGapIndex: isAdjusting
        ? (storeSpacingState?.gapIndex ?? null)
        : null,
    }),
    [isAdjusting, storeSpacingState, currentSpacing]
  );

  // Constraint status
  const atMinSpacing = state.currentSpacing <= minSpacing;
  const atMaxSpacing = state.currentSpacing >= maxSpacing;

  // Check if spacing can be adjusted
  const canAdjust = useMemo(() => {
    const isColumnOrRow = componentType === "Column" || componentType === "Row";
    return enabled && isColumnOrRow;
  }, [enabled, componentType]);

  // Determine direction based on component type
  const direction = useMemo(() => {
    return componentType === "Column" ? "vertical" : "horizontal";
  }, [componentType]);

  // ========================================
  // Mouse Event Handlers
  // ========================================

  /**
   * Handle mouse down on spacing gap
   */
  const handleMouseDown = useCallback(
    (gapIndex: number, event: React.MouseEvent) => {
      if (!enabled || !canAdjust) return;

      event.preventDefault();
      event.stopPropagation();

      const startPosition: Point = {
        x: event.clientX,
        y: event.clientY,
      };

      // Start spacing adjustment in store with direction
      startSpacingAdjust(
        componentId,
        gapIndex,
        startPosition,
        currentSpacing,
        direction
      );

      isAdjustingRef.current = true;
      onAdjustStart?.(gapIndex);
    },
    [
      enabled,
      canAdjust,
      componentId,
      currentSpacing,
      direction,
      startSpacingAdjust,
      onAdjustStart,
    ]
  );

  /**
   * Handle mouse move during adjustment
   */
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isAdjustingRef.current || !storeSpacingState) return;

      const currentPosition: Point = {
        x: event.clientX,
        y: event.clientY,
      };

      // Update spacing in store
      updateSpacingAdjust(currentPosition);
    },
    [storeSpacingState, updateSpacingAdjust]
  );

  /**
   * Handle mouse up to end adjustment
   */
  const handleMouseUp = useCallback(() => {
    if (!isAdjustingRef.current) return;

    isAdjustingRef.current = false;

    const finalSpacing = endSpacingAdjust();

    if (finalSpacing !== null && updateStore) {
      // Apply snapping to final value
      const snappedSpacing =
        Math.round(finalSpacing / snapIncrement) * snapIncrement;
      const clampedSpacing = Math.max(
        minSpacing,
        Math.min(maxSpacing, snappedSpacing)
      );

      // Update the component's spacing property
      updateComponentProperty(componentId, "spacing", clampedSpacing);
    }

    callbackRef.current.onAdjustEnd?.(finalSpacing);
  }, [
    componentId,
    snapIncrement,
    minSpacing,
    maxSpacing,
    updateStore,
    endSpacingAdjust,
    updateComponentProperty,
  ]);

  /**
   * Handle escape key to cancel adjustment
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape" && isAdjustingRef.current) {
        isAdjustingRef.current = false;
        storeCancelAdjust();
        callbackRef.current.onAdjustEnd?.(null);
      }
    },
    [storeCancelAdjust]
  );

  /**
   * Cancel current adjustment
   */
  const cancelAdjust = useCallback(() => {
    if (isAdjustingRef.current) {
      isAdjustingRef.current = false;
      storeCancelAdjust();
      callbackRef.current.onAdjustEnd?.(null);
    }
  }, [storeCancelAdjust]);

  // ========================================
  // Effect: Global Event Listeners
  // ========================================

  useEffect(() => {
    if (!isAdjusting) return;

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAdjusting, handleMouseMove, handleMouseUp, handleKeyDown]);

  // ========================================
  // Notify callback during adjustment
  // ========================================

  useEffect(() => {
    if (isAdjusting && storeSpacingState?.currentSpacing !== undefined) {
      callbackRef.current.onAdjust?.(storeSpacingState.currentSpacing);
    }
  }, [isAdjusting, storeSpacingState?.currentSpacing]);

  return {
    state,
    handleMouseDown,
    cancelAdjust,
    canAdjust,
    atMinSpacing,
    atMaxSpacing,
  };
}

export default useSpacing;
