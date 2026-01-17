/**
 * useCanvasPan Hook
 * Manages pan/scroll functionality for the canvas
 *
 * Features:
 * - Mouse drag to pan (middle button or space + left click)
 * - Touch pan support
 * - Pan limits/bounds (optional)
 * - Smooth pan animation
 * - Reset pan position
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useCanvasViewStore } from "@/store/canvas-view-store";
import type { Point } from "@/types/canvas";

// ============================================================================
// Types
// ============================================================================

export interface UseCanvasPanOptions {
  /** Enable pan via mouse drag */
  enableMousePan?: boolean;
  /** Enable pan via touch drag */
  enableTouchPan?: boolean;
  /** Enable pan via scroll wheel (without Ctrl) */
  enableWheelPan?: boolean;
  /** Require space key to be held for pan */
  requireSpaceKey?: boolean;
  /** Pan bounds (optional) */
  bounds?: {
    minX?: number;
    maxX?: number;
    minY?: number;
    maxY?: number;
  };
}

export interface UseCanvasPanReturn {
  /** Current pan position */
  pan: Point;
  /** Whether currently panning */
  isPanning: boolean;
  /** Set pan position */
  setPan: (point: Point) => void;
  /** Pan by delta */
  panBy: (delta: Point) => void;
  /** Reset pan to origin */
  resetPan: () => void;
  /** Whether space key is held */
  isSpaceHeld: boolean;
  /** Event handlers to attach to canvas container */
  panHandlers: {
    onMouseDown: (event: React.MouseEvent) => void;
    onMouseMove: (event: React.MouseEvent) => void;
    onMouseUp: (event: React.MouseEvent) => void;
    onMouseLeave: (event: React.MouseEvent) => void;
    onWheel: (event: React.WheelEvent) => void;
    onTouchStart: (event: React.TouchEvent) => void;
    onTouchMove: (event: React.TouchEvent) => void;
    onTouchEnd: (event: React.TouchEvent) => void;
  };
  /** Cursor style based on pan state */
  panCursor: string;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing canvas pan functionality
 */
export function useCanvasPan(
  options: UseCanvasPanOptions = {}
): UseCanvasPanReturn {
  const {
    enableMousePan = true,
    enableTouchPan = true,
    enableWheelPan = true,
    requireSpaceKey = false,
    bounds,
  } = options;

  // Store state and actions
  const pan = useCanvasViewStore((state) => state.pan);
  const isPanning = useCanvasViewStore((state) => state.isPanning);
  const setPan = useCanvasViewStore((state) => state.setPan);
  const _panBy = useCanvasViewStore((state) => state.panBy);
  const resetPan = useCanvasViewStore((state) => state.resetPan);
  const setIsPanning = useCanvasViewStore((state) => state.setIsPanning);

  // Local state for tracking drag
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);
  const lastMousePosition = useRef<Point | null>(null);
  const lastTouchPosition = useRef<Point | null>(null);
  const isDragging = useRef(false);

  /**
   * Clamp pan position to bounds if set
   */
  const clampPan = useCallback(
    (point: Point): Point => {
      if (!bounds) return point;

      return {
        x: Math.max(
          bounds.minX ?? -Infinity,
          Math.min(bounds.maxX ?? Infinity, point.x)
        ),
        y: Math.max(
          bounds.minY ?? -Infinity,
          Math.min(bounds.maxY ?? Infinity, point.y)
        ),
      };
    },
    [bounds]
  );

  /**
   * Handle pan by delta with bounds
   */
  const handlePanBy = useCallback(
    (delta: Point) => {
      const newPan = clampPan({
        x: pan.x + delta.x,
        y: pan.y + delta.y,
      });
      setPan(newPan);
    },
    [pan, clampPan, setPan]
  );

  /**
   * Track space key state
   */
  useEffect(() => {
    if (!requireSpaceKey) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && !event.repeat) {
        event.preventDefault();
        setIsSpaceHeld(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setIsSpaceHeld(false);
        // End any ongoing pan
        if (isDragging.current) {
          isDragging.current = false;
          setIsPanning(false);
          lastMousePosition.current = null;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [requireSpaceKey, setIsPanning]);

  /**
   * Mouse down handler - start pan
   */
  const onMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (!enableMousePan) return;

      // Check if we should pan
      // Middle mouse button always pans
      // Left button + space pans if requireSpaceKey
      // Left button pans if not requireSpaceKey
      const isMiddleButton = event.button === 1;
      const isLeftButton = event.button === 0;
      const canPan =
        isMiddleButton || (isLeftButton && (!requireSpaceKey || isSpaceHeld));

      if (!canPan) return;

      event.preventDefault();
      isDragging.current = true;
      setIsPanning(true);
      lastMousePosition.current = { x: event.clientX, y: event.clientY };
    },
    [enableMousePan, requireSpaceKey, isSpaceHeld, setIsPanning]
  );

  /**
   * Mouse move handler - continue pan
   */
  const onMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!isDragging.current || !lastMousePosition.current) return;

      const delta = {
        x: event.clientX - lastMousePosition.current.x,
        y: event.clientY - lastMousePosition.current.y,
      };

      handlePanBy(delta);
      lastMousePosition.current = { x: event.clientX, y: event.clientY };
    },
    [handlePanBy]
  );

  /**
   * Mouse up handler - end pan
   */
  const onMouseUp = useCallback(
    (_event: React.MouseEvent) => {
      if (isDragging.current) {
        isDragging.current = false;
        setIsPanning(false);
        lastMousePosition.current = null;
      }
    },
    [setIsPanning]
  );

  /**
   * Mouse leave handler - end pan when leaving canvas
   */
  const onMouseLeave = useCallback(
    (_event: React.MouseEvent) => {
      if (isDragging.current) {
        isDragging.current = false;
        setIsPanning(false);
        lastMousePosition.current = null;
      }
    },
    [setIsPanning]
  );

  /**
   * Wheel handler for pan (scroll without Ctrl)
   */
  const onWheel = useCallback(
    (event: React.WheelEvent) => {
      if (!enableWheelPan) return;

      // Don't pan if Ctrl/Cmd is held (that's for zoom)
      if (event.ctrlKey || event.metaKey) return;

      // Prevent default scroll behavior
      event.preventDefault();

      // Pan by scroll amount
      handlePanBy({
        x: -event.deltaX,
        y: -event.deltaY,
      });
    },
    [enableWheelPan, handlePanBy]
  );

  /**
   * Touch start handler - start pan
   */
  const onTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (!enableTouchPan) return;

      // Only handle single touch for pan
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      isDragging.current = true;
      setIsPanning(true);
      lastTouchPosition.current = { x: touch.clientX, y: touch.clientY };
    },
    [enableTouchPan, setIsPanning]
  );

  /**
   * Touch move handler - continue pan
   */
  const onTouchMove = useCallback(
    (event: React.TouchEvent) => {
      if (!isDragging.current || !lastTouchPosition.current) return;

      // Only handle single touch
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      const delta = {
        x: touch.clientX - lastTouchPosition.current.x,
        y: touch.clientY - lastTouchPosition.current.y,
      };

      handlePanBy(delta);
      lastTouchPosition.current = { x: touch.clientX, y: touch.clientY };
    },
    [handlePanBy]
  );

  /**
   * Touch end handler - end pan
   */
  const onTouchEnd = useCallback(
    (_event: React.TouchEvent) => {
      if (isDragging.current) {
        isDragging.current = false;
        setIsPanning(false);
        lastTouchPosition.current = null;
      }
    },
    [setIsPanning]
  );

  /**
   * Determine cursor based on pan state
   */
  const panCursor = isPanning
    ? "grabbing"
    : requireSpaceKey
      ? isSpaceHeld
        ? "grab"
        : "default"
      : "grab";

  return {
    pan,
    isPanning,
    setPan,
    panBy: handlePanBy,
    resetPan,
    isSpaceHeld,
    panHandlers: {
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
      onWheel,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    panCursor,
  };
}

export default useCanvasPan;
