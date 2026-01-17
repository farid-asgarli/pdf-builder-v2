/**
 * useScale Hook
 * Dedicated hook for component scale interactions
 *
 * Features:
 * - Manages scale state for Scale and ScaleToFit components
 * - Supports uniform and non-uniform scaling
 * - Aspect ratio locking
 * - Snapping to increments
 * - Two-way binding with properties panel
 * - Integration with interaction store
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCanvasStore } from "@/store/canvas-store";
import type { BoundingBox, Point } from "@/types/canvas";
import { ComponentType } from "@/types/component";

// ============================================================================
// Types
// ============================================================================

/**
 * Scale interaction state
 */
export interface ScaleInteractionState {
  /** Whether scaling is currently active */
  isScaling: boolean;
  /** Current uniform scale factor */
  currentScale: number;
  /** Current X scale factor */
  currentScaleX: number;
  /** Current Y scale factor */
  currentScaleY: number;
  /** Original scale before scaling started */
  originalScale: number;
  /** Original X scale before scaling started */
  originalScaleX: number;
  /** Original Y scale before scaling started */
  originalScaleY: number;
  /** Whether aspect ratio is locked */
  aspectRatioLocked: boolean;
  /** Whether snap to increment is active */
  snapActive: boolean;
  /** Whether at minimum scale limit */
  atMinScale: boolean;
  /** Whether at maximum scale limit */
  atMaxScale: boolean;
}

/**
 * Scale options
 */
export interface ScaleOptions {
  /** Initial uniform scale factor (default: 1) */
  initialScale?: number;
  /** Initial X scale factor */
  initialScaleX?: number;
  /** Initial Y scale factor */
  initialScaleY?: number;
  /** Minimum scale factor (default: 0.1) */
  minScale?: number;
  /** Maximum scale factor (default: 10) */
  maxScale?: number;
  /** Snap increment for scale (default: 0.05) */
  snapIncrement?: number;
  /** Whether to maintain aspect ratio by default (default: true) */
  maintainAspectRatio?: boolean;
}

/**
 * Options for the useScale hook
 */
export interface UseScaleOptions {
  /** Component ID being scaled */
  componentId: string;
  /** Component type (Scale or ScaleToFit) */
  componentType: ComponentType;
  /** Current component bounds */
  bounds: BoundingBox;
  /** Whether scale is enabled */
  enabled?: boolean;
  /** Scale options */
  options?: ScaleOptions;
  /** Callback when scale starts */
  onScaleStart?: () => void;
  /** Callback during scale */
  onScale?: (scale: number, scaleX: number, scaleY: number) => void;
  /** Callback when scale ends */
  onScaleEnd?: (scale: number | null) => void;
  /** Whether to update canvas store automatically */
  updateStore?: boolean;
}

/**
 * Return type for the useScale hook
 */
export interface UseScaleReturn {
  /** Current scale state */
  state: ScaleInteractionState;
  /** Set uniform scale directly */
  setScale: (scale: number) => void;
  /** Set non-uniform scale directly */
  setScaleXY: (scaleX: number, scaleY: number) => void;
  /** Start scaling interaction */
  startScale: (startPosition: Point) => void;
  /** Update scale during drag */
  updateScale: (
    currentPosition: Point,
    options?: { shiftKey?: boolean; ctrlKey?: boolean }
  ) => void;
  /** End scaling interaction */
  endScale: () => number | null;
  /** Cancel scaling and revert to original */
  cancel: () => void;
  /** Toggle aspect ratio lock */
  toggleAspectRatioLock: () => void;
  /** Whether this component supports scaling */
  isSupported: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default scale options
 */
const DEFAULT_OPTIONS: Required<ScaleOptions> = {
  initialScale: 1,
  initialScaleX: 1,
  initialScaleY: 1,
  minScale: 0.1,
  maxScale: 10,
  snapIncrement: 0.05,
  maintainAspectRatio: true,
};

/**
 * Components that support scaling
 */
const SCALE_COMPONENTS = new Set<ComponentType>([
  ComponentType.Scale,
  ComponentType.ScaleToFit,
]);

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

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing component scale interactions
 */
export function useScale({
  componentId,
  componentType,
  bounds,
  enabled = true,
  options = {},
  onScaleStart,
  onScale,
  onScaleEnd,
  updateStore = true,
}: UseScaleOptions): UseScaleReturn {
  // Merge options with defaults
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Get canvas store
  const { getComponent, updateComponentProperty, updateComponentProperties } =
    useCanvasStore();

  // Check if scale is supported
  const isSupported = SCALE_COMPONENTS.has(componentType);

  // Get current scale from component properties
  const component = getComponent(componentId);
  const properties = component?.properties || {};

  const currentScale = (properties.factor as number) ?? opts.initialScale;
  const currentScaleX = (properties.factorX as number) ?? currentScale;
  const currentScaleY = (properties.factorY as number) ?? currentScale;

  // Internal state for scaling interaction
  const [interactionState, setInteractionState] = useState<{
    isScaling: boolean;
    startPosition: Point | null;
    originalScale: number;
    originalScaleX: number;
    originalScaleY: number;
    currentScale: number;
    currentScaleX: number;
    currentScaleY: number;
    aspectRatioLocked: boolean;
    snapActive: boolean;
  } | null>(null);

  const stateRef = useRef(interactionState);
  const callbackRef = useRef({ onScale, onScaleEnd });

  // Update refs
  useEffect(() => {
    stateRef.current = interactionState;
  }, [interactionState]);

  useEffect(() => {
    callbackRef.current = { onScale, onScaleEnd };
  }, [onScale, onScaleEnd]);

  // Build state object
  const state: ScaleInteractionState = useMemo(() => {
    const isScaling = interactionState?.isScaling ?? false;
    const displayScale = interactionState?.currentScale ?? currentScale;
    const displayScaleX = interactionState?.currentScaleX ?? currentScaleX;
    const displayScaleY = interactionState?.currentScaleY ?? currentScaleY;

    return {
      isScaling,
      currentScale: displayScale,
      currentScaleX: displayScaleX,
      currentScaleY: displayScaleY,
      originalScale: interactionState?.originalScale ?? opts.initialScale,
      originalScaleX: interactionState?.originalScaleX ?? currentScaleX,
      originalScaleY: interactionState?.originalScaleY ?? currentScaleY,
      aspectRatioLocked:
        interactionState?.aspectRatioLocked ?? opts.maintainAspectRatio,
      snapActive: interactionState?.snapActive ?? false,
      atMinScale:
        displayScaleX <= opts.minScale || displayScaleY <= opts.minScale,
      atMaxScale:
        displayScaleX >= opts.maxScale || displayScaleY >= opts.maxScale,
    };
  }, [
    interactionState,
    currentScale,
    currentScaleX,
    currentScaleY,
    opts.initialScale,
    opts.maintainAspectRatio,
    opts.minScale,
    opts.maxScale,
  ]);

  // Set uniform scale directly
  const setScale = useCallback(
    (scale: number) => {
      if (!enabled || !isSupported) return;

      const clampedScale = clamp(scale, opts.minScale, opts.maxScale);

      if (updateStore) {
        updateComponentProperty(componentId, "factor", clampedScale);
      }

      onScale?.(clampedScale, clampedScale, clampedScale);
    },
    [
      enabled,
      isSupported,
      componentId,
      opts.minScale,
      opts.maxScale,
      updateStore,
      updateComponentProperty,
      onScale,
    ]
  );

  // Set non-uniform scale directly
  const setScaleXY = useCallback(
    (scaleX: number, scaleY: number) => {
      if (!enabled || !isSupported) return;

      const clampedScaleX = clamp(scaleX, opts.minScale, opts.maxScale);
      const clampedScaleY = clamp(scaleY, opts.minScale, opts.maxScale);

      if (updateStore) {
        updateComponentProperties(componentId, {
          factorX: clampedScaleX,
          factorY: clampedScaleY,
        });
      }

      const uniformScale = (clampedScaleX + clampedScaleY) / 2;
      onScale?.(uniformScale, clampedScaleX, clampedScaleY);
    },
    [
      enabled,
      isSupported,
      componentId,
      opts.minScale,
      opts.maxScale,
      updateStore,
      updateComponentProperties,
      onScale,
    ]
  );

  // Start scaling interaction
  const startScale = useCallback(
    (startPosition: Point) => {
      if (!enabled || !isSupported) return;

      setInteractionState({
        isScaling: true,
        startPosition,
        originalScale: currentScale,
        originalScaleX: currentScaleX,
        originalScaleY: currentScaleY,
        currentScale,
        currentScaleX,
        currentScaleY,
        aspectRatioLocked: opts.maintainAspectRatio,
        snapActive: false,
      });

      onScaleStart?.();
    },
    [
      enabled,
      isSupported,
      currentScale,
      currentScaleX,
      currentScaleY,
      opts.maintainAspectRatio,
      onScaleStart,
    ]
  );

  // Update scale during drag
  const updateScaleDrag = useCallback(
    (
      currentPosition: Point,
      modifiers?: { shiftKey?: boolean; ctrlKey?: boolean }
    ) => {
      const state = stateRef.current;
      if (!state || !state.isScaling || !state.startPosition) return;

      // Calculate scale factor based on mouse movement
      const dx = currentPosition.x - state.startPosition.x;
      const dy = currentPosition.y - state.startPosition.y;

      // Use average movement as scale factor
      const scaleFactor = 1 + (dx + dy) / Math.max(bounds.width, bounds.height);

      let newScaleX = state.originalScaleX * scaleFactor;
      let newScaleY = state.originalScaleY * scaleFactor;

      // Determine aspect ratio lock
      const aspectRatioLocked = opts.maintainAspectRatio
        ? !modifiers?.shiftKey
        : (modifiers?.shiftKey ?? false);

      if (aspectRatioLocked) {
        const uniformScale = Math.max(newScaleX, newScaleY);
        newScaleX = uniformScale;
        newScaleY = uniformScale;
      }

      // Apply snap
      const snapActive = modifiers?.ctrlKey ?? false;
      if (snapActive) {
        newScaleX = snapToIncrement(newScaleX, opts.snapIncrement);
        newScaleY = snapToIncrement(newScaleY, opts.snapIncrement);
      }

      // Clamp to constraints
      newScaleX = clamp(newScaleX, opts.minScale, opts.maxScale);
      newScaleY = clamp(newScaleY, opts.minScale, opts.maxScale);

      const uniformScale = aspectRatioLocked
        ? newScaleX
        : (newScaleX + newScaleY) / 2;

      setInteractionState({
        ...state,
        currentScale: uniformScale,
        currentScaleX: newScaleX,
        currentScaleY: newScaleY,
        aspectRatioLocked,
        snapActive,
      });

      callbackRef.current.onScale?.(uniformScale, newScaleX, newScaleY);
    },
    [
      bounds,
      opts.maintainAspectRatio,
      opts.snapIncrement,
      opts.minScale,
      opts.maxScale,
    ]
  );

  // End scaling interaction
  const endScale = useCallback((): number | null => {
    const state = stateRef.current;
    if (!state || !state.isScaling) return null;

    const finalScale = state.currentScale;
    const finalScaleX = state.currentScaleX;
    const finalScaleY = state.currentScaleY;

    // Update store if needed
    if (updateStore) {
      if (Math.abs(finalScaleX - finalScaleY) < 0.01) {
        // Uniform scale
        updateComponentProperty(componentId, "factor", finalScale);
      } else {
        // Non-uniform scale
        updateComponentProperties(componentId, {
          factorX: finalScaleX,
          factorY: finalScaleY,
        });
      }
    }

    setInteractionState(null);
    callbackRef.current.onScaleEnd?.(finalScale);

    return finalScale;
  }, [
    componentId,
    updateStore,
    updateComponentProperty,
    updateComponentProperties,
  ]);

  // Cancel scaling
  const cancel = useCallback(() => {
    setInteractionState(null);
    onScaleEnd?.(null);
  }, [onScaleEnd]);

  // Toggle aspect ratio lock
  const toggleAspectRatioLock = useCallback(() => {
    if (!interactionState) return;

    setInteractionState((prev) =>
      prev ? { ...prev, aspectRatioLocked: !prev.aspectRatioLocked } : null
    );
  }, [interactionState]);

  return {
    state,
    setScale,
    setScaleXY,
    startScale,
    updateScale: updateScaleDrag,
    endScale,
    cancel,
    toggleAspectRatioLock,
    isSupported,
  };
}

export default useScale;

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to get just the scale state for a component (read-only)
 */
export function useScaleState(componentId: string): {
  scale: number;
  scaleX: number;
  scaleY: number;
  isUniform: boolean;
} {
  const { getComponent } = useCanvasStore();

  const component = getComponent(componentId);
  const properties = component?.properties || {};

  const scale = (properties.factor as number) ?? 1;
  const scaleX = (properties.factorX as number) ?? scale;
  const scaleY = (properties.factorY as number) ?? scale;

  return {
    scale,
    scaleX,
    scaleY,
    isUniform: Math.abs(scaleX - scaleY) < 0.01,
  };
}

/**
 * Format scale as percentage string
 */
export function formatScaleAsPercentage(scale: number): string {
  return `${Math.round(scale * 100)}%`;
}
