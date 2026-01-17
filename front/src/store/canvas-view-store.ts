/**
 * Canvas View Store
 * Manages zoom level, pan position, and view configuration for the canvas
 *
 * Features:
 * - Zoom controls (25%, 50%, 75%, 100%, 125%, 150%, 200%)
 * - Pan/scroll state management
 * - Grid and ruler visibility toggles
 * - Zoom to fit functionality
 * - Keyboard shortcut support
 */
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { Point, ZoomLevel, CanvasConfig } from "@/types/canvas";
import { DEFAULT_CANVAS_CONFIG } from "@/types/canvas";

// ============================================================================
// Constants
// ============================================================================

/**
 * Available zoom levels matching ZoomLevel type
 */
export const ZOOM_LEVELS: ZoomLevel[] = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

/**
 * Zoom level display labels
 */
export const ZOOM_LABELS: Record<ZoomLevel, string> = {
  0.25: "25%",
  0.5: "50%",
  0.75: "75%",
  1: "100%",
  1.25: "125%",
  1.5: "150%",
  2: "200%",
};

/**
 * Default zoom level
 */
export const DEFAULT_ZOOM: ZoomLevel = 1;

/**
 * Default pan position (centered)
 */
export const DEFAULT_PAN: Point = { x: 0, y: 0 };

// ============================================================================
// Types
// ============================================================================

/**
 * Canvas view state interface
 */
interface CanvasViewState {
  // ========================================
  // View State
  // ========================================

  /** Current zoom level */
  zoom: ZoomLevel;

  /** Current pan offset */
  pan: Point;

  /** Whether panning is currently active (mouse drag) */
  isPanning: boolean;

  /** Canvas configuration */
  config: CanvasConfig;

  // ========================================
  // Zoom Actions
  // ========================================

  /**
   * Set zoom to a specific level
   * @param level - Target zoom level
   */
  setZoom: (level: ZoomLevel) => void;

  /**
   * Zoom in to the next level
   */
  zoomIn: () => void;

  /**
   * Zoom out to the previous level
   */
  zoomOut: () => void;

  /**
   * Reset zoom to 100%
   */
  resetZoom: () => void;

  /**
   * Zoom to fit content in viewport
   * @param contentSize - Size of the content to fit
   * @param viewportSize - Size of the viewport
   */
  zoomToFit: (
    contentSize: { width: number; height: number },
    viewportSize: { width: number; height: number }
  ) => void;

  // ========================================
  // Pan Actions
  // ========================================

  /**
   * Set pan position
   * @param point - New pan offset
   */
  setPan: (point: Point) => void;

  /**
   * Pan by a delta amount
   * @param delta - Amount to pan by
   */
  panBy: (delta: Point) => void;

  /**
   * Reset pan to origin
   */
  resetPan: () => void;

  /**
   * Set panning state (for mouse drag)
   * @param isPanning - Whether panning is active
   */
  setIsPanning: (isPanning: boolean) => void;

  /**
   * Center the view on a specific point
   * @param point - Point to center on
   * @param viewportSize - Size of the viewport
   */
  centerOn: (
    point: Point,
    viewportSize: { width: number; height: number }
  ) => void;

  // ========================================
  // Config Actions
  // ========================================

  /**
   * Toggle grid visibility
   */
  toggleGrid: () => void;

  /**
   * Toggle ruler visibility
   */
  toggleRulers: () => void;

  /**
   * Toggle snap to grid
   */
  toggleSnapToGrid: () => void;

  /**
   * Update grid size
   * @param size - New grid size in pixels
   */
  setGridSize: (size: number) => void;

  /**
   * Update configuration
   * @param updates - Partial config updates
   */
  updateConfig: (updates: Partial<CanvasConfig>) => void;

  // ========================================
  // Reset
  // ========================================

  /**
   * Reset all view state to defaults
   */
  resetView: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the next zoom level (zoom in)
 */
function getNextZoomLevel(current: ZoomLevel): ZoomLevel {
  const currentIndex = ZOOM_LEVELS.indexOf(current);
  if (currentIndex < ZOOM_LEVELS.length - 1) {
    return ZOOM_LEVELS[currentIndex + 1];
  }
  return current;
}

/**
 * Get the previous zoom level (zoom out)
 */
function getPreviousZoomLevel(current: ZoomLevel): ZoomLevel {
  const currentIndex = ZOOM_LEVELS.indexOf(current);
  if (currentIndex > 0) {
    return ZOOM_LEVELS[currentIndex - 1];
  }
  return current;
}

/**
 * Calculate zoom level to fit content in viewport
 */
function calculateFitZoom(
  contentSize: { width: number; height: number },
  viewportSize: { width: number; height: number },
  padding: number = 40
): ZoomLevel {
  const availableWidth = viewportSize.width - padding * 2;
  const availableHeight = viewportSize.height - padding * 2;

  const scaleX = availableWidth / contentSize.width;
  const scaleY = availableHeight / contentSize.height;
  const scale = Math.min(scaleX, scaleY);

  // Find the closest zoom level that doesn't exceed the calculated scale
  let bestZoom: ZoomLevel = ZOOM_LEVELS[0];
  for (const level of ZOOM_LEVELS) {
    if (level <= scale) {
      bestZoom = level;
    } else {
      break;
    }
  }

  return bestZoom;
}

// ============================================================================
// Store
// ============================================================================

/**
 * Canvas view store for managing zoom, pan, and configuration
 */
export const useCanvasViewStore = create<CanvasViewState>()(
  subscribeWithSelector((set, get) => ({
    // ========================================
    // Initial State
    // ========================================

    zoom: DEFAULT_ZOOM,
    pan: DEFAULT_PAN,
    isPanning: false,
    config: { ...DEFAULT_CANVAS_CONFIG },

    // ========================================
    // Zoom Actions
    // ========================================

    setZoom: (level: ZoomLevel) => {
      if (ZOOM_LEVELS.includes(level)) {
        set({ zoom: level });
      }
    },

    zoomIn: () => {
      const { zoom } = get();
      const nextLevel = getNextZoomLevel(zoom);
      if (nextLevel !== zoom) {
        set({ zoom: nextLevel });
      }
    },

    zoomOut: () => {
      const { zoom } = get();
      const prevLevel = getPreviousZoomLevel(zoom);
      if (prevLevel !== zoom) {
        set({ zoom: prevLevel });
      }
    },

    resetZoom: () => {
      set({ zoom: DEFAULT_ZOOM });
    },

    zoomToFit: (contentSize, viewportSize) => {
      const fitZoom = calculateFitZoom(contentSize, viewportSize);
      set({ zoom: fitZoom, pan: DEFAULT_PAN });
    },

    // ========================================
    // Pan Actions
    // ========================================

    setPan: (point: Point) => {
      set({ pan: point });
    },

    panBy: (delta: Point) => {
      const { pan } = get();
      set({
        pan: {
          x: pan.x + delta.x,
          y: pan.y + delta.y,
        },
      });
    },

    resetPan: () => {
      set({ pan: DEFAULT_PAN });
    },

    setIsPanning: (isPanning: boolean) => {
      set({ isPanning });
    },

    centerOn: (point: Point, viewportSize) => {
      const { zoom } = get();
      set({
        pan: {
          x: viewportSize.width / 2 - point.x * zoom,
          y: viewportSize.height / 2 - point.y * zoom,
        },
      });
    },

    // ========================================
    // Config Actions
    // ========================================

    toggleGrid: () => {
      const { config } = get();
      set({
        config: {
          ...config,
          showGrid: !config.showGrid,
        },
      });
    },

    toggleRulers: () => {
      const { config } = get();
      set({
        config: {
          ...config,
          showRulers: !config.showRulers,
        },
      });
    },

    toggleSnapToGrid: () => {
      const { config } = get();
      set({
        config: {
          ...config,
          snapToGrid: !config.snapToGrid,
        },
      });
    },

    setGridSize: (size: number) => {
      const { config } = get();
      if (size > 0 && size <= 100) {
        set({
          config: {
            ...config,
            gridSize: size,
          },
        });
      }
    },

    updateConfig: (updates: Partial<CanvasConfig>) => {
      const { config } = get();
      set({
        config: {
          ...config,
          ...updates,
        },
      });
    },

    // ========================================
    // Reset
    // ========================================

    resetView: () => {
      set({
        zoom: DEFAULT_ZOOM,
        pan: DEFAULT_PAN,
        isPanning: false,
        config: { ...DEFAULT_CANVAS_CONFIG },
      });
    },
  }))
);

// ============================================================================
// Selectors
// ============================================================================

/**
 * Select current zoom level
 */
export const selectZoom = (state: CanvasViewState) => state.zoom;

/**
 * Select current pan position
 */
export const selectPan = (state: CanvasViewState) => state.pan;

/**
 * Select whether grid is visible
 */
export const selectShowGrid = (state: CanvasViewState) => state.config.showGrid;

/**
 * Select whether rulers are visible
 */
export const selectShowRulers = (state: CanvasViewState) =>
  state.config.showRulers;

/**
 * Select grid size
 */
export const selectGridSize = (state: CanvasViewState) => state.config.gridSize;

/**
 * Select whether snap to grid is enabled
 */
export const selectSnapToGrid = (state: CanvasViewState) =>
  state.config.snapToGrid;

/**
 * Select full config
 */
export const selectConfig = (state: CanvasViewState) => state.config;
