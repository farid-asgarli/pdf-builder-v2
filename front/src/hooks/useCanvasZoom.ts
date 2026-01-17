/**
 * useCanvasZoom Hook
 * Manages zoom functionality for the canvas including keyboard shortcuts
 *
 * Features:
 * - Zoom in/out via wheel with Ctrl/Cmd
 * - Zoom via keyboard shortcuts (Ctrl/Cmd + +/-)
 * - Zoom to specific levels
 * - Zoom to fit content
 * - Zoom centered on mouse position
 */
import { useCallback, useEffect } from "react";
import {
  useCanvasViewStore,
  ZOOM_LEVELS,
  ZOOM_LABELS,
} from "@/store/canvas-view-store";
import type { ZoomLevel, Point } from "@/types/canvas";

// ============================================================================
// Types
// ============================================================================

export interface UseCanvasZoomOptions {
  /** Enable keyboard shortcuts */
  enableKeyboard?: boolean;
  /** Enable wheel zoom */
  enableWheel?: boolean;
  /** Minimum zoom level */
  minZoom?: ZoomLevel;
  /** Maximum zoom level */
  maxZoom?: ZoomLevel;
}

export interface UseCanvasZoomReturn {
  /** Current zoom level */
  zoom: ZoomLevel;
  /** Zoom level as percentage string */
  zoomLabel: string;
  /** All available zoom levels */
  zoomLevels: ZoomLevel[];
  /** Set zoom to specific level */
  setZoom: (level: ZoomLevel) => void;
  /** Zoom in one level */
  zoomIn: () => void;
  /** Zoom out one level */
  zoomOut: () => void;
  /** Reset to 100% */
  resetZoom: () => void;
  /** Zoom to fit content */
  zoomToFit: (
    contentSize: { width: number; height: number },
    viewportSize: { width: number; height: number }
  ) => void;
  /** Check if can zoom in */
  canZoomIn: boolean;
  /** Check if can zoom out */
  canZoomOut: boolean;
  /** Handle wheel event for zoom */
  handleWheelZoom: (
    event: WheelEvent | React.WheelEvent,
    mousePosition?: Point
  ) => void;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for managing canvas zoom functionality
 */
export function useCanvasZoom(
  options: UseCanvasZoomOptions = {}
): UseCanvasZoomReturn {
  const {
    enableKeyboard = true,
    enableWheel = true,
    minZoom = 0.25,
    maxZoom = 2,
  } = options;

  // Get store state and actions
  const zoom = useCanvasViewStore((state) => state.zoom);
  const setZoom = useCanvasViewStore((state) => state.setZoom);
  const zoomIn = useCanvasViewStore((state) => state.zoomIn);
  const zoomOut = useCanvasViewStore((state) => state.zoomOut);
  const resetZoom = useCanvasViewStore((state) => state.resetZoom);
  const zoomToFit = useCanvasViewStore((state) => state.zoomToFit);
  const setPan = useCanvasViewStore((state) => state.setPan);
  const pan = useCanvasViewStore((state) => state.pan);

  // Calculate if we can zoom in/out
  const currentIndex = ZOOM_LEVELS.indexOf(zoom);
  const canZoomIn =
    currentIndex < ZOOM_LEVELS.length - 1 &&
    ZOOM_LEVELS[currentIndex + 1] <= maxZoom;
  const canZoomOut =
    currentIndex > 0 && ZOOM_LEVELS[currentIndex - 1] >= minZoom;

  // Get zoom label
  const zoomLabel = ZOOM_LABELS[zoom];

  /**
   * Handle wheel zoom with optional center point
   */
  const handleWheelZoom = useCallback(
    (event: WheelEvent | React.WheelEvent, mousePosition?: Point) => {
      if (!enableWheel) return;

      // Only zoom if Ctrl/Cmd is pressed
      if (!event.ctrlKey && !event.metaKey) return;

      event.preventDefault();

      const delta = event.deltaY;
      const oldZoom = zoom;

      if (delta < 0 && canZoomIn) {
        // Zoom in
        const newZoomLevel = ZOOM_LEVELS[currentIndex + 1];

        if (mousePosition) {
          // Zoom centered on mouse position
          const zoomRatio = newZoomLevel / oldZoom;
          const newPan = {
            x: mousePosition.x - (mousePosition.x - pan.x) * zoomRatio,
            y: mousePosition.y - (mousePosition.y - pan.y) * zoomRatio,
          };
          setZoom(newZoomLevel);
          setPan(newPan);
        } else {
          zoomIn();
        }
      } else if (delta > 0 && canZoomOut) {
        // Zoom out
        const newZoomLevel = ZOOM_LEVELS[currentIndex - 1];

        if (mousePosition) {
          // Zoom centered on mouse position
          const zoomRatio = newZoomLevel / oldZoom;
          const newPan = {
            x: mousePosition.x - (mousePosition.x - pan.x) * zoomRatio,
            y: mousePosition.y - (mousePosition.y - pan.y) * zoomRatio,
          };
          setZoom(newZoomLevel);
          setPan(newPan);
        } else {
          zoomOut();
        }
      }
    },
    [
      enableWheel,
      zoom,
      canZoomIn,
      canZoomOut,
      currentIndex,
      pan,
      setZoom,
      setPan,
      zoomIn,
      zoomOut,
    ]
  );

  /**
   * Handle keyboard shortcuts for zoom
   */
  useEffect(() => {
    if (!enableKeyboard) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Ctrl/Cmd modifier
      if (!event.ctrlKey && !event.metaKey) return;

      // Prevent default browser zoom
      if (
        event.key === "+" ||
        event.key === "=" ||
        event.key === "-" ||
        event.key === "0"
      ) {
        event.preventDefault();
      }

      switch (event.key) {
        case "+":
        case "=":
          // Zoom in (Ctrl/Cmd + +)
          if (canZoomIn) zoomIn();
          break;
        case "-":
          // Zoom out (Ctrl/Cmd + -)
          if (canZoomOut) zoomOut();
          break;
        case "0":
          // Reset zoom (Ctrl/Cmd + 0)
          resetZoom();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableKeyboard, canZoomIn, canZoomOut, zoomIn, zoomOut, resetZoom]);

  return {
    zoom,
    zoomLabel,
    zoomLevels: ZOOM_LEVELS.filter(
      (level) => level >= minZoom && level <= maxZoom
    ),
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomToFit,
    canZoomIn,
    canZoomOut,
    handleWheelZoom,
  };
}

export default useCanvasZoom;
