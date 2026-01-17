/**
 * useTransform Hook
 * Encapsulates rotation, scale, and translation interaction logic for canvas components
 *
 * Features:
 * - Rotation calculations with angle snapping (15° increments)
 * - Scale transformations with aspect ratio support
 * - Translation (position offset) with grid snapping
 * - Update transform properties in canvas store
 * - Two-way binding support
 * - Keyboard modifier support (Shift for snap, Ctrl for grid)
 */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInteractionStore } from "@/store/interaction-store";
import { useCanvasStore } from "@/store/canvas-store";
import type { Point, BoundingBox } from "@/types/canvas";
import { ComponentType } from "@/types/component";

// ============================================================================
// Types
// ============================================================================

/**
 * Transform type for the hook
 */
export type TransformType = "rotation" | "scale" | "translation";

/**
 * Rotation state exposed by the hook
 */
export interface RotationInteractionState {
  /** Whether rotation is currently active */
  isRotating: boolean;
  /** Current angle during rotation (degrees) */
  currentAngle: number;
  /** Original angle before rotation started (degrees) */
  originalAngle: number;
  /** Whether angle snapping is active */
  snapActive: boolean;
  /** Snap increment in degrees */
  snapIncrement: number;
}

/**
 * Scale state exposed by the hook
 */
export interface ScaleInteractionState {
  /** Whether scaling is currently active */
  isScaling: boolean;
  /** Current scale factor */
  currentScale: number;
  /** Original scale before scaling started */
  originalScale: number;
  /** Whether aspect ratio is locked */
  aspectRatioLocked: boolean;
}

/**
 * Translation state exposed by the hook
 */
export interface TranslationInteractionState {
  /** Whether translation is currently active */
  isTranslating: boolean;
  /** Current offset during translation */
  currentOffset: Point;
  /** Original offset before translation started */
  originalOffset: Point;
  /** Whether grid snapping is active */
  snapActive: boolean;
  /** Whether axis is constrained (shift key) */
  axisConstrained: boolean;
}

/**
 * Combined transform state
 */
export interface TransformState {
  /** Active transform type */
  activeTransform: TransformType | null;
  /** Rotation state */
  rotation: RotationInteractionState;
  /** Scale state */
  scale: ScaleInteractionState;
  /** Translation state */
  translation: TranslationInteractionState;
}

/**
 * Options for rotation
 */
export interface RotationOptions {
  /** Initial rotation angle in degrees */
  initialAngle?: number;
  /** Whether to snap to angle increments by default */
  snapToAngle?: boolean;
  /** Snap increment in degrees (default: 15) */
  snapIncrement?: number;
  /** Minimum angle (default: 0) */
  minAngle?: number;
  /** Maximum angle (default: 360) */
  maxAngle?: number;
}

/**
 * Options for scale
 */
export interface ScaleOptions {
  /** Initial scale factor */
  initialScale?: number;
  /** Minimum scale (default: 0.1) */
  minScale?: number;
  /** Maximum scale (default: 10) */
  maxScale?: number;
  /** Snap increment for scale (default: 0.1) */
  snapIncrement?: number;
  /** Whether to maintain aspect ratio */
  maintainAspectRatio?: boolean;
}

/**
 * Options for translation
 */
export interface TranslationOptions {
  /** Initial X offset */
  initialOffsetX?: number;
  /** Initial Y offset */
  initialOffsetY?: number;
  /** Whether to snap to grid */
  snapToGrid?: boolean;
  /** Snap increment in pixels (default: 10) */
  snapIncrement?: number;
  /** Minimum X offset */
  minOffsetX?: number;
  /** Maximum X offset */
  maxOffsetX?: number;
  /** Minimum Y offset */
  minOffsetY?: number;
  /** Maximum Y offset */
  maxOffsetY?: number;
}

/**
 * Options for the useTransform hook
 */
export interface UseTransformOptions {
  /** Component ID being transformed */
  componentId: string;
  /** Component type for determining transform behavior */
  componentType: ComponentType;
  /** Current component bounds (for calculating center point) */
  bounds: BoundingBox;
  /** Whether transform is enabled */
  enabled?: boolean;
  /** Rotation options */
  rotationOptions?: RotationOptions;
  /** Scale options */
  scaleOptions?: ScaleOptions;
  /** Translation options */
  translationOptions?: TranslationOptions;
  /** Callback when any transform starts */
  onTransformStart?: (type: TransformType) => void;
  /** Callback during transform */
  onTransform?: (type: TransformType, value: number | Point) => void;
  /** Callback when transform ends */
  onTransformEnd?: (type: TransformType, value: number | Point | null) => void;
  /** Whether to update canvas store automatically */
  updateStore?: boolean;
}

/**
 * Return type for the useTransform hook
 */
export interface UseTransformReturn {
  /** Current transform state */
  state: TransformState;
  /** Rotation handlers */
  rotation: {
    /** Start rotation from mouse position */
    handleMouseDown: (event: React.MouseEvent) => void;
    /** Cancel rotation */
    cancel: () => void;
    /** Set rotation angle directly */
    setAngle: (angle: number) => void;
    /** Whether rotation is supported for this component */
    isSupported: boolean;
  };
  /** Scale handlers */
  scale: {
    /** Handle scale change */
    handleScaleChange: (scale: number) => void;
    /** Cancel scale */
    cancel: () => void;
    /** Set scale directly */
    setScale: (scale: number) => void;
    /** Whether scale is supported for this component */
    isSupported: boolean;
  };
  /** Translation handlers */
  translation: {
    /** Start translation from mouse position */
    handleMouseDown: (event: React.MouseEvent) => void;
    /** Cancel translation */
    cancel: () => void;
    /** Set offset directly */
    setOffset: (offset: Point) => void;
    /** Whether translation is supported for this component */
    isSupported: boolean;
  };
  /** Check if component supports specific transform */
  isTransformSupported: (type: TransformType) => boolean;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default rotation options
 */
export const DEFAULT_ROTATION_OPTIONS: Required<RotationOptions> = {
  initialAngle: 0,
  snapToAngle: false,
  snapIncrement: 15,
  minAngle: 0,
  maxAngle: 360,
};

/**
 * Default scale options
 */
export const DEFAULT_SCALE_OPTIONS: Required<ScaleOptions> = {
  initialScale: 1,
  minScale: 0.1,
  maxScale: 10,
  snapIncrement: 0.1,
  maintainAspectRatio: true,
};

/**
 * Default translation options
 */
export const DEFAULT_TRANSLATION_OPTIONS: Required<TranslationOptions> = {
  initialOffsetX: 0,
  initialOffsetY: 0,
  snapToGrid: false,
  snapIncrement: 10,
  minOffsetX: -10000,
  maxOffsetX: 10000,
  minOffsetY: -10000,
  maxOffsetY: 10000,
};

/**
 * Components that support rotation
 */
const ROTATION_COMPONENTS = new Set<ComponentType>([ComponentType.Rotate]);

/**
 * Components that support scale
 */
const SCALE_COMPONENTS = new Set<ComponentType>([
  ComponentType.Scale,
  ComponentType.ScaleToFit,
]);

/**
 * Components that support translation
 */
const TRANSLATION_COMPONENTS = new Set<ComponentType>([
  ComponentType.Translate,
]);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate the center point of a bounding box
 */
function calculateCenterPoint(bounds: BoundingBox): Point {
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
}

/**
 * Normalize angle to 0-360 range
 */
function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

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
 * Hook for managing component transform interactions (rotation, scale, translation)
 */
export function useTransform({
  componentId,
  componentType,
  bounds,
  enabled = true,
  rotationOptions = {},
  scaleOptions = {},
  translationOptions = {},
  onTransformStart,
  onTransform,
  onTransformEnd,
  updateStore = true,
}: UseTransformOptions): UseTransformReturn {
  // Merge options with defaults
  const rotationOpts = { ...DEFAULT_ROTATION_OPTIONS, ...rotationOptions };
  const scaleOpts = { ...DEFAULT_SCALE_OPTIONS, ...scaleOptions };
  const translationOpts = {
    ...DEFAULT_TRANSLATION_OPTIONS,
    ...translationOptions,
  };

  // Stores
  const {
    activeInteraction,
    rotation: storeRotationState,
    translation: storeTranslationState,
    startRotation,
    updateRotation,
    endRotation,
    cancelRotation: storeCancelRotation,
    startTranslation,
    updateTranslation,
    endTranslation,
    cancelTranslation: storeCancelTranslation,
  } = useInteractionStore();

  const { updateComponentProperty, updateComponentProperties, getComponent } =
    useCanvasStore();

  // Track if this component is being transformed
  const isRotating =
    activeInteraction === "rotation" &&
    storeRotationState?.componentId === componentId;

  const isTranslating =
    activeInteraction === "translation" &&
    storeTranslationState?.componentId === componentId;

  // Refs for tracking during transform
  const isTransformingRef = useRef(false);
  const callbackRef = useRef({ onTransform, onTransformEnd });

  // Internal scale state (using useState instead of ref to avoid render issues)
  const [scaleState, setScaleState] = useState({
    isScaling: false,
    originalScale: scaleOpts.initialScale,
    currentScale: scaleOpts.initialScale,
  });

  // Update callback ref in effect
  useEffect(() => {
    callbackRef.current = { onTransform, onTransformEnd };
  }, [onTransform, onTransformEnd]);

  // Check if transform types are supported
  const isRotationSupported = ROTATION_COMPONENTS.has(componentType);
  const isScaleSupported = SCALE_COMPONENTS.has(componentType);
  const isTranslationSupported = TRANSLATION_COMPONENTS.has(componentType);

  // Calculate transform state
  const state: TransformState = useMemo(() => {
    // Get current component to read properties
    const component = getComponent(componentId);
    const properties = component?.properties || {};

    return {
      activeTransform: isRotating
        ? "rotation"
        : isTranslating
          ? "translation"
          : scaleState.isScaling
            ? "scale"
            : null,
      rotation: {
        isRotating,
        currentAngle: isRotating
          ? (storeRotationState?.currentAngle ?? rotationOpts.initialAngle)
          : ((properties.angle as number) ?? rotationOpts.initialAngle),
        originalAngle: isRotating
          ? (storeRotationState?.originalAngle ?? rotationOpts.initialAngle)
          : rotationOpts.initialAngle,
        snapActive: isRotating
          ? (storeRotationState?.snapToAngle ?? false)
          : false,
        snapIncrement: rotationOpts.snapIncrement,
      },
      scale: {
        isScaling: scaleState.isScaling,
        currentScale: scaleState.currentScale,
        originalScale: scaleState.originalScale,
        aspectRatioLocked: scaleOpts.maintainAspectRatio,
      },
      translation: {
        isTranslating,
        currentOffset:
          isTranslating && storeTranslationState
            ? storeTranslationState.currentOffset
            : {
                x:
                  (properties.offsetX as number) ??
                  translationOpts.initialOffsetX,
                y:
                  (properties.offsetY as number) ??
                  translationOpts.initialOffsetY,
              },
        originalOffset:
          isTranslating && storeTranslationState
            ? storeTranslationState.originalOffset
            : {
                x: translationOpts.initialOffsetX,
                y: translationOpts.initialOffsetY,
              },
        snapActive: isTranslating
          ? (storeTranslationState?.snapToGrid ?? false)
          : false,
        axisConstrained: false,
      },
    };
  }, [
    componentId,
    getComponent,
    isRotating,
    isTranslating,
    storeRotationState,
    storeTranslationState,
    rotationOpts.initialAngle,
    rotationOpts.snapIncrement,
    scaleOpts.maintainAspectRatio,
    scaleState,
    translationOpts.initialOffsetX,
    translationOpts.initialOffsetY,
  ]);

  // ========================================
  // Rotation Handlers
  // ========================================

  const handleRotationMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (!enabled || !isRotationSupported) return;

      event.stopPropagation();
      event.preventDefault();

      const startPosition: Point = { x: event.clientX, y: event.clientY };
      const centerPoint = calculateCenterPoint(bounds);

      // Get current angle from component properties
      const component = getComponent(componentId);
      const currentAngle =
        (component?.properties?.angle as number) ?? rotationOpts.initialAngle;

      startRotation(componentId, startPosition, centerPoint, currentAngle);

      isTransformingRef.current = true;
      onTransformStart?.("rotation");
    },
    [
      enabled,
      isRotationSupported,
      componentId,
      bounds,
      getComponent,
      rotationOpts.initialAngle,
      startRotation,
      onTransformStart,
    ]
  );

  // Handle rotation mouse move and up
  useEffect(() => {
    if (!isRotating) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const currentPosition: Point = { x: event.clientX, y: event.clientY };
      const modifiers = { shift: event.shiftKey };

      updateRotation(currentPosition, modifiers);

      // Call onTransform callback with current angle
      if (
        callbackRef.current.onTransform &&
        storeRotationState?.currentAngle != null
      ) {
        callbackRef.current.onTransform(
          "rotation",
          storeRotationState.currentAngle
        );
      }
    };

    const handleMouseUp = () => {
      const finalAngle = endRotation();
      isTransformingRef.current = false;

      // Update canvas store if enabled
      if (updateStore && finalAngle != null) {
        updateComponentProperty(componentId, "angle", finalAngle);
      }

      callbackRef.current.onTransformEnd?.("rotation", finalAngle);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        storeCancelRotation();
        isTransformingRef.current = false;
        callbackRef.current.onTransformEnd?.("rotation", null);
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
    isRotating,
    storeRotationState?.currentAngle,
    updateRotation,
    endRotation,
    storeCancelRotation,
    updateStore,
    componentId,
    updateComponentProperty,
  ]);

  const cancelRotation = useCallback(() => {
    if (isRotating) {
      storeCancelRotation();
      isTransformingRef.current = false;
      onTransformEnd?.("rotation", null);
    }
  }, [isRotating, storeCancelRotation, onTransformEnd]);

  const setRotationAngle = useCallback(
    (angle: number) => {
      if (!enabled) return;

      const normalizedAngle = normalizeAngle(angle);
      const clampedAngle = clamp(
        normalizedAngle,
        rotationOpts.minAngle,
        rotationOpts.maxAngle
      );

      if (updateStore) {
        updateComponentProperty(componentId, "angle", clampedAngle);
      }

      onTransform?.("rotation", clampedAngle);
    },
    [
      enabled,
      rotationOpts.minAngle,
      rotationOpts.maxAngle,
      updateStore,
      componentId,
      updateComponentProperty,
      onTransform,
    ]
  );

  // ========================================
  // Scale Handlers
  // ========================================

  const handleScaleChange = useCallback(
    (scale: number) => {
      if (!enabled || !isScaleSupported) return;

      // Apply constraints
      let newScale = clamp(scale, scaleOpts.minScale, scaleOpts.maxScale);

      // Apply snapping if needed
      if (scaleOpts.snapIncrement) {
        newScale = snapToIncrement(newScale, scaleOpts.snapIncrement);
      }

      setScaleState((prev) => ({ ...prev, currentScale: newScale }));

      if (updateStore) {
        updateComponentProperty(componentId, "scale", newScale);
      }

      onTransform?.("scale", newScale);
    },
    [
      enabled,
      isScaleSupported,
      scaleOpts.minScale,
      scaleOpts.maxScale,
      scaleOpts.snapIncrement,
      updateStore,
      componentId,
      updateComponentProperty,
      onTransform,
    ]
  );

  const cancelScale = useCallback(() => {
    if (scaleState.isScaling) {
      setScaleState((prev) => ({
        ...prev,
        isScaling: false,
        currentScale: prev.originalScale,
      }));
      onTransformEnd?.("scale", null);
    }
  }, [scaleState.isScaling, onTransformEnd]);

  const setScale = useCallback(
    (scale: number) => {
      if (!enabled) return;

      const clampedScale = clamp(scale, scaleOpts.minScale, scaleOpts.maxScale);

      if (updateStore) {
        updateComponentProperty(componentId, "scale", clampedScale);
      }

      onTransform?.("scale", clampedScale);
    },
    [
      enabled,
      scaleOpts.minScale,
      scaleOpts.maxScale,
      updateStore,
      componentId,
      updateComponentProperty,
      onTransform,
    ]
  );

  // ========================================
  // Translation Handlers
  // ========================================

  const handleTranslationMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (!enabled || !isTranslationSupported) return;

      event.stopPropagation();
      event.preventDefault();

      const startPosition: Point = { x: event.clientX, y: event.clientY };

      // Get current offset from component properties
      const component = getComponent(componentId);
      const currentOffset: Point = {
        x:
          (component?.properties?.offsetX as number) ??
          translationOpts.initialOffsetX,
        y:
          (component?.properties?.offsetY as number) ??
          translationOpts.initialOffsetY,
      };

      startTranslation(componentId, startPosition, currentOffset);

      isTransformingRef.current = true;
      onTransformStart?.("translation");
    },
    [
      enabled,
      isTranslationSupported,
      componentId,
      getComponent,
      translationOpts.initialOffsetX,
      translationOpts.initialOffsetY,
      startTranslation,
      onTransformStart,
    ]
  );

  // Handle translation mouse move and up
  useEffect(() => {
    if (!isTranslating) {
      return;
    }

    const handleMouseMove = (event: MouseEvent) => {
      const currentPosition: Point = { x: event.clientX, y: event.clientY };
      const modifiers = {
        shift: event.shiftKey, // Constrain to axis
        ctrl: event.ctrlKey || event.metaKey, // Snap to grid
      };

      updateTranslation(currentPosition, modifiers);

      // Call onTransform callback with current offset
      if (
        callbackRef.current.onTransform &&
        storeTranslationState?.currentOffset
      ) {
        callbackRef.current.onTransform(
          "translation",
          storeTranslationState.currentOffset
        );
      }
    };

    const handleMouseUp = () => {
      const finalOffset = endTranslation();
      isTransformingRef.current = false;

      // Update canvas store if enabled
      if (updateStore && finalOffset) {
        // Apply constraints
        const clampedOffset: Point = {
          x: clamp(
            finalOffset.x,
            translationOpts.minOffsetX,
            translationOpts.maxOffsetX
          ),
          y: clamp(
            finalOffset.y,
            translationOpts.minOffsetY,
            translationOpts.maxOffsetY
          ),
        };

        updateComponentProperties(componentId, {
          offsetX: clampedOffset.x,
          offsetY: clampedOffset.y,
        });

        callbackRef.current.onTransformEnd?.("translation", clampedOffset);
      } else {
        callbackRef.current.onTransformEnd?.("translation", finalOffset);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        storeCancelTranslation();
        isTransformingRef.current = false;
        callbackRef.current.onTransformEnd?.("translation", null);
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
    isTranslating,
    storeTranslationState?.currentOffset,
    updateTranslation,
    endTranslation,
    storeCancelTranslation,
    updateStore,
    componentId,
    translationOpts.minOffsetX,
    translationOpts.maxOffsetX,
    translationOpts.minOffsetY,
    translationOpts.maxOffsetY,
    updateComponentProperties,
  ]);

  const cancelTranslation = useCallback(() => {
    if (isTranslating) {
      storeCancelTranslation();
      isTransformingRef.current = false;
      onTransformEnd?.("translation", null);
    }
  }, [isTranslating, storeCancelTranslation, onTransformEnd]);

  const setTranslationOffset = useCallback(
    (offset: Point) => {
      if (!enabled) return;

      // Apply constraints
      const clampedOffset: Point = {
        x: clamp(
          offset.x,
          translationOpts.minOffsetX,
          translationOpts.maxOffsetX
        ),
        y: clamp(
          offset.y,
          translationOpts.minOffsetY,
          translationOpts.maxOffsetY
        ),
      };

      if (updateStore) {
        updateComponentProperties(componentId, {
          offsetX: clampedOffset.x,
          offsetY: clampedOffset.y,
        });
      }

      onTransform?.("translation", clampedOffset);
    },
    [
      enabled,
      translationOpts.minOffsetX,
      translationOpts.maxOffsetX,
      translationOpts.minOffsetY,
      translationOpts.maxOffsetY,
      updateStore,
      componentId,
      updateComponentProperties,
      onTransform,
    ]
  );

  // ========================================
  // Utility Functions
  // ========================================

  const isTransformSupported = useCallback(
    (type: TransformType): boolean => {
      switch (type) {
        case "rotation":
          return isRotationSupported;
        case "scale":
          return isScaleSupported;
        case "translation":
          return isTranslationSupported;
        default:
          return false;
      }
    },
    [isRotationSupported, isScaleSupported, isTranslationSupported]
  );

  return {
    state,
    rotation: {
      handleMouseDown: handleRotationMouseDown,
      cancel: cancelRotation,
      setAngle: setRotationAngle,
      isSupported: isRotationSupported,
    },
    scale: {
      handleScaleChange,
      cancel: cancelScale,
      setScale,
      isSupported: isScaleSupported,
    },
    translation: {
      handleMouseDown: handleTranslationMouseDown,
      cancel: cancelTranslation,
      setOffset: setTranslationOffset,
      isSupported: isTranslationSupported,
    },
    isTransformSupported,
  };
}

export default useTransform;

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook to get just the rotation state for a component
 */
export function useRotationState(
  componentId: string
): RotationInteractionState {
  const { activeInteraction, rotation } = useInteractionStore();
  const { getComponent } = useCanvasStore();

  const isRotating =
    activeInteraction === "rotation" && rotation?.componentId === componentId;

  const component = getComponent(componentId);
  const currentAngle = (component?.properties?.angle as number) ?? 0;

  return {
    isRotating,
    currentAngle: isRotating
      ? (rotation?.currentAngle ?? currentAngle)
      : currentAngle,
    originalAngle: isRotating ? (rotation?.originalAngle ?? 0) : 0,
    snapActive: isRotating ? (rotation?.snapToAngle ?? false) : false,
    snapIncrement: rotation?.snapIncrement ?? 15,
  };
}

/**
 * Hook to get just the translation state for a component
 */
export function useTranslationState(
  componentId: string
): TranslationInteractionState {
  const { activeInteraction, translation } = useInteractionStore();
  const { getComponent } = useCanvasStore();

  const isTranslating =
    activeInteraction === "translation" &&
    translation?.componentId === componentId;

  const component = getComponent(componentId);
  const offsetX = (component?.properties?.offsetX as number) ?? 0;
  const offsetY = (component?.properties?.offsetY as number) ?? 0;

  return {
    isTranslating,
    currentOffset:
      isTranslating && translation
        ? translation.currentOffset
        : { x: offsetX, y: offsetY },
    originalOffset:
      isTranslating && translation
        ? translation.originalOffset
        : { x: 0, y: 0 },
    snapActive: isTranslating ? (translation?.snapToGrid ?? false) : false,
    axisConstrained: false,
  };
}

/**
 * Hook to check if any transform is active on a component
 */
export function useIsTransforming(componentId: string): boolean {
  const { activeInteraction, rotation, translation } = useInteractionStore();

  if (
    activeInteraction === "rotation" &&
    rotation?.componentId === componentId
  ) {
    return true;
  }

  if (
    activeInteraction === "translation" &&
    translation?.componentId === componentId
  ) {
    return true;
  }

  return false;
}

/**
 * Hook to get the active transform type for a component
 */
export function useActiveTransformType(
  componentId: string
): TransformType | null {
  const { activeInteraction, rotation, translation } = useInteractionStore();

  if (
    activeInteraction === "rotation" &&
    rotation?.componentId === componentId
  ) {
    return "rotation";
  }

  if (
    activeInteraction === "translation" &&
    translation?.componentId === componentId
  ) {
    return "translation";
  }

  return null;
}
