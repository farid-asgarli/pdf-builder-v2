/**
 * SnapGrid Component
 * Visual grid overlay for snap-to-grid functionality during resize/transform operations
 *
 * Features:
 * - Visual grid overlay (10px or 5px increments)
 * - Snap-to-grid visualization while resizing
 * - Toggle on/off from canvas toolbar
 * - Highlights active snap points during resize
 * - Integrates with canvas-view-store for grid settings
 * - Integrates with interaction-store for active resize state
 *
 * The component renders an SVG overlay with grid lines that become more
 * visible during resize operations to help users align components.
 */
"use client";

import { memo, useMemo, useId } from "react";
import { cn } from "@/lib/utils";
import { useCanvasViewStore } from "@/store/canvas-view-store";
import { useInteractionStore } from "@/store/interaction-store";
import type { Point, Size } from "@/types/canvas";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for the SnapGrid component
 */
export interface SnapGridProps {
  /** Current canvas zoom level */
  zoom?: number;
  /** Canvas offset for proper positioning */
  canvasOffset?: Point;
  /** Canvas viewport size */
  viewportSize?: Size;
  /** Override grid size (default: from canvas-view-store) */
  gridSize?: number;
  /** Override snap enabled (default: from canvas-view-store) */
  snapEnabled?: boolean;
  /** Grid line color */
  gridColor?: string;
  /** Active snap point color (when hovering snap point during resize) */
  snapPointColor?: string;
  /** Grid line opacity when not actively resizing */
  inactiveOpacity?: number;
  /** Grid line opacity when actively resizing */
  activeOpacity?: number;
  /** Whether to show major grid lines (every N cells) */
  showMajorLines?: boolean;
  /** Major grid line interval */
  majorLineEvery?: number;
  /** Whether to show snap point indicators */
  showSnapPoints?: boolean;
  /** Snap point radius */
  snapPointRadius?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for individual snap point indicator
 */
export interface SnapPointIndicatorProps {
  /** X position in canvas coordinates */
  x: number;
  /** Y position in canvas coordinates */
  y: number;
  /** Current zoom level */
  zoom: number;
  /** Point radius */
  radius?: number;
  /** Point color */
  color?: string;
  /** Whether this point is actively being snapped to */
  isActive?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Default grid size in pixels */
const DEFAULT_GRID_SIZE = 10;

/** Alternative small grid size */
const SMALL_GRID_SIZE = 5;

/** Default grid color */
const DEFAULT_GRID_COLOR = "hsl(var(--primary) / 0.15)";

/** Default snap point color */
const DEFAULT_SNAP_POINT_COLOR = "hsl(var(--primary))";

/** Default inactive opacity */
const DEFAULT_INACTIVE_OPACITY = 0.3;

/** Default active opacity */
const DEFAULT_ACTIVE_OPACITY = 0.6;

/** Default major line interval */
const DEFAULT_MAJOR_LINE_EVERY = 10;

/** Default snap point radius */
const DEFAULT_SNAP_POINT_RADIUS = 3;

/** Minimum visible grid size at zoom (below this, grid becomes too dense) */
const MIN_VISIBLE_GRID_SIZE = 5;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate snap points within viewport for current resize operation
 * @internal Reserved for future use with enhanced snap visualization
 */
function _calculateNearbySnapPoints(
  currentPosition: Point,
  gridSize: number,
  viewportSize: Size,
  threshold: number = 20
): Point[] {
  const points: Point[] = [];

  // Calculate snap points near the current position
  const startX =
    Math.floor((currentPosition.x - threshold) / gridSize) * gridSize;
  const endX = Math.ceil((currentPosition.x + threshold) / gridSize) * gridSize;
  const startY =
    Math.floor((currentPosition.y - threshold) / gridSize) * gridSize;
  const endY = Math.ceil((currentPosition.y + threshold) / gridSize) * gridSize;

  for (let x = startX; x <= endX; x += gridSize) {
    for (let y = startY; y <= endY; y += gridSize) {
      if (
        x >= 0 &&
        x <= viewportSize.width &&
        y >= 0 &&
        y <= viewportSize.height
      ) {
        points.push({ x, y });
      }
    }
  }

  return points;
}

/**
 * Check if a value is snapped to grid
 */
function isSnappedToGrid(
  value: number,
  gridSize: number,
  tolerance: number = 1
): boolean {
  return (
    Math.abs(value % gridSize) <= tolerance ||
    Math.abs((value % gridSize) - gridSize) <= tolerance
  );
}

/**
 * Get the nearest snap point
 */
function getNearestSnapPoint(position: Point, gridSize: number): Point {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
}

// ============================================================================
// Snap Point Indicator Component
// ============================================================================

/**
 * Individual snap point indicator
 */
const SnapPointIndicator = memo(function SnapPointIndicator({
  x,
  y,
  zoom,
  radius = DEFAULT_SNAP_POINT_RADIUS,
  color = DEFAULT_SNAP_POINT_COLOR,
  isActive = false,
  animationDuration = 150,
}: SnapPointIndicatorProps) {
  // Scale radius inversely with zoom for consistent visual
  const scaledRadius = Math.max(radius / zoom, 2);
  const activeRadius = scaledRadius * 1.5;

  return (
    <circle
      cx={x}
      cy={y}
      r={isActive ? activeRadius : scaledRadius}
      fill={color}
      opacity={isActive ? 1 : 0.7}
      style={{
        transition: `all ${animationDuration}ms ease-out`,
      }}
    />
  );
});

SnapPointIndicator.displayName = "SnapPointIndicator";

// ============================================================================
// Snap Grid Lines Component
// ============================================================================

interface SnapGridLinesProps {
  patternId: string;
  majorPatternId: string;
  scaledSize: number;
  scaledMajorSize: number;
  gridColor: string;
  majorColor: string;
  zoom: number;
  showMajorLines: boolean;
  opacity: number;
}

const SnapGridLines = memo(function SnapGridLines({
  patternId,
  majorPatternId,
  scaledSize,
  scaledMajorSize,
  gridColor,
  majorColor,
  zoom,
  showMajorLines,
  opacity,
}: SnapGridLinesProps) {
  const strokeWidth = Math.max(0.5, zoom * 0.5);
  const majorStrokeWidth = Math.max(1, zoom);

  return (
    <>
      <defs>
        {/* Minor grid pattern - crosshairs at each intersection */}
        <pattern
          id={patternId}
          width={scaledSize}
          height={scaledSize}
          patternUnits="userSpaceOnUse"
        >
          {/* Horizontal tick */}
          <line
            x1={0}
            y1={scaledSize / 2}
            x2={scaledSize}
            y2={scaledSize / 2}
            stroke={gridColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
          {/* Vertical tick */}
          <line
            x1={scaledSize / 2}
            y1={0}
            x2={scaledSize / 2}
            y2={scaledSize}
            stroke={gridColor}
            strokeWidth={strokeWidth}
            opacity={opacity}
          />
        </pattern>

        {/* Major grid pattern - full lines */}
        {showMajorLines && (
          <pattern
            id={majorPatternId}
            width={scaledMajorSize}
            height={scaledMajorSize}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${scaledMajorSize} 0 L 0 0 0 ${scaledMajorSize}`}
              fill="none"
              stroke={majorColor}
              strokeWidth={majorStrokeWidth}
              opacity={opacity * 1.5}
            />
          </pattern>
        )}
      </defs>

      {/* Minor grid */}
      <rect
        width="100%"
        height="100%"
        fill={`url(#${patternId})`}
        style={{ transition: "opacity 150ms ease-out" }}
      />

      {/* Major grid */}
      {showMajorLines && (
        <rect
          width="100%"
          height="100%"
          fill={`url(#${majorPatternId})`}
          style={{ transition: "opacity 150ms ease-out" }}
        />
      )}
    </>
  );
});

SnapGridLines.displayName = "SnapGridLines";

// ============================================================================
// Active Snap Indicators Component
// ============================================================================

interface ActiveSnapIndicatorsProps {
  currentSize: { width: number; height: number } | null;
  originalPosition: Point | null;
  gridSize: number;
  zoom: number;
  color: string;
}

const ActiveSnapIndicators = memo(function ActiveSnapIndicators({
  currentSize,
  originalPosition,
  gridSize,
  zoom,
  color,
}: ActiveSnapIndicatorsProps) {
  if (!currentSize || !originalPosition) return null;

  const indicators: { position: Point; isSnapped: boolean }[] = [];

  // Calculate corners of the resizing component
  const corners = [
    { x: originalPosition.x, y: originalPosition.y }, // Top-left
    { x: originalPosition.x + currentSize.width, y: originalPosition.y }, // Top-right
    { x: originalPosition.x, y: originalPosition.y + currentSize.height }, // Bottom-left
    {
      x: originalPosition.x + currentSize.width,
      y: originalPosition.y + currentSize.height,
    }, // Bottom-right
  ];

  corners.forEach((corner) => {
    const isSnappedX = isSnappedToGrid(corner.x, gridSize);
    const isSnappedY = isSnappedToGrid(corner.y, gridSize);
    if (isSnappedX && isSnappedY) {
      const snapPoint = getNearestSnapPoint(corner, gridSize);
      indicators.push({ position: snapPoint, isSnapped: true });
    }
  });

  // Calculate edge midpoints
  const edges = [
    { x: originalPosition.x + currentSize.width / 2, y: originalPosition.y }, // Top
    {
      x: originalPosition.x + currentSize.width / 2,
      y: originalPosition.y + currentSize.height,
    }, // Bottom
    { x: originalPosition.x, y: originalPosition.y + currentSize.height / 2 }, // Left
    {
      x: originalPosition.x + currentSize.width,
      y: originalPosition.y + currentSize.height / 2,
    }, // Right
  ];

  edges.forEach((edge) => {
    const isSnappedX = isSnappedToGrid(edge.x, gridSize);
    const isSnappedY = isSnappedToGrid(edge.y, gridSize);
    if (isSnappedX || isSnappedY) {
      const snapPoint = getNearestSnapPoint(edge, gridSize);
      indicators.push({ position: snapPoint, isSnapped: true });
    }
  });

  return (
    <>
      {indicators.map((indicator, index) => (
        <SnapPointIndicator
          key={`snap-${index}-${indicator.position.x}-${indicator.position.y}`}
          x={indicator.position.x}
          y={indicator.position.y}
          zoom={zoom}
          color={color}
          isActive={indicator.isSnapped}
        />
      ))}
    </>
  );
});

ActiveSnapIndicators.displayName = "ActiveSnapIndicators";

// ============================================================================
// Main SnapGrid Component
// ============================================================================

/**
 * Snap grid overlay component
 * Shows a visual grid that helps users align components during resize operations
 */
function SnapGridComponent({
  zoom = 1,
  canvasOffset = { x: 0, y: 0 },
  viewportSize: _viewportSize = { width: 1000, height: 800 },
  gridSize: gridSizeOverride,
  snapEnabled: snapEnabledOverride,
  gridColor = DEFAULT_GRID_COLOR,
  snapPointColor = DEFAULT_SNAP_POINT_COLOR,
  inactiveOpacity = DEFAULT_INACTIVE_OPACITY,
  activeOpacity = DEFAULT_ACTIVE_OPACITY,
  showMajorLines = true,
  majorLineEvery = DEFAULT_MAJOR_LINE_EVERY,
  showSnapPoints = true,
  snapPointRadius: _snapPointRadius = DEFAULT_SNAP_POINT_RADIUS,
  className,
}: SnapGridProps) {
  // Generate unique IDs for SVG patterns
  const id = useId();
  const patternId = `snap-grid-${id}`;
  const majorPatternId = `snap-grid-major-${id}`;

  // Get settings from canvas-view-store
  const storeGridSize = useCanvasViewStore((state) => state.config.gridSize);
  const storeSnapEnabled = useCanvasViewStore(
    (state) => state.config.snapToGrid
  );

  // Get interaction state
  const activeInteraction = useInteractionStore(
    (state) => state.activeInteraction
  );
  const resizeState = useInteractionStore((state) => state.resize);
  const rotationState = useInteractionStore((state) => state.rotation);
  const translationState = useInteractionStore((state) => state.translation);

  // Use override values or store values
  const gridSize = gridSizeOverride ?? storeGridSize ?? DEFAULT_GRID_SIZE;
  const snapEnabled = snapEnabledOverride ?? storeSnapEnabled;

  // Check if any resize/transform interaction is active
  const isInteractionActive =
    activeInteraction === "resize" ||
    activeInteraction === "rotation" ||
    activeInteraction === "translation";

  // Check if snap mode is active (Ctrl/Cmd held during resize)
  const isSnapModeActive = useMemo(() => {
    if (resizeState?.snapToIncrement) return true;
    if (translationState?.snapToGrid) return true;
    if (rotationState?.snapToAngle) return true;
    return false;
  }, [
    resizeState?.snapToIncrement,
    translationState?.snapToGrid,
    rotationState?.snapToAngle,
  ]);

  // Calculate scaled grid size
  const scaledSize = gridSize * zoom;
  const scaledMajorSize = scaledSize * majorLineEvery;

  // Don't render if grid is too dense (would look like solid color)
  const isTooSmall = scaledSize < MIN_VISIBLE_GRID_SIZE;

  // Determine opacity based on interaction state
  const opacity = useMemo(() => {
    if (!snapEnabled && !isInteractionActive) return 0;
    if (isSnapModeActive) return activeOpacity;
    if (isInteractionActive) return inactiveOpacity * 1.5;
    return inactiveOpacity;
  }, [
    snapEnabled,
    isInteractionActive,
    isSnapModeActive,
    activeOpacity,
    inactiveOpacity,
  ]);

  // Major grid color (slightly more visible)
  const majorGridColor = gridColor.replace(/[\d.]+\)$/, (match) => {
    const value = parseFloat(match);
    return `${Math.min(value * 1.5, 1)})`;
  });

  // Don't render if snap is disabled and not interacting
  if (!snapEnabled && !isInteractionActive) {
    return null;
  }

  // Don't render if grid is too small to be useful
  if (isTooSmall) {
    return null;
  }

  return (
    <svg
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        "transition-opacity duration-150",
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
      }}
      aria-hidden="true"
    >
      {/* Grid lines */}
      <SnapGridLines
        patternId={patternId}
        majorPatternId={majorPatternId}
        scaledSize={scaledSize}
        scaledMajorSize={scaledMajorSize}
        gridColor={gridColor}
        majorColor={majorGridColor}
        zoom={zoom}
        showMajorLines={showMajorLines}
        opacity={opacity}
      />

      {/* Active snap point indicators during resize */}
      {showSnapPoints && isSnapModeActive && resizeState && (
        <ActiveSnapIndicators
          currentSize={resizeState.currentSize}
          originalPosition={resizeState.originalPosition}
          gridSize={gridSize}
          zoom={zoom}
          color={snapPointColor}
        />
      )}
    </svg>
  );
}

// ============================================================================
// Exports
// ============================================================================

export const SnapGrid = memo(SnapGridComponent);
SnapGrid.displayName = "SnapGrid";

export default SnapGrid;

// ============================================================================
// Custom Hooks
// ============================================================================

/**
 * Hook to get the current snap grid settings
 */
export function useSnapGridSettings() {
  const gridSize = useCanvasViewStore((state) => state.config.gridSize);
  const snapToGrid = useCanvasViewStore((state) => state.config.snapToGrid);
  const toggleSnapToGrid = useCanvasViewStore(
    (state) => state.toggleSnapToGrid
  );
  const setGridSize = useCanvasViewStore((state) => state.setGridSize);

  return {
    gridSize,
    snapToGrid,
    toggleSnapToGrid,
    setGridSize,
    /** Available grid size presets */
    gridSizePresets: [SMALL_GRID_SIZE, DEFAULT_GRID_SIZE, 20] as const,
  };
}

/**
 * Hook to check if snap mode is currently active
 */
export function useIsSnapModeActive() {
  const resizeState = useInteractionStore((state) => state.resize);
  const translationState = useInteractionStore((state) => state.translation);
  const rotationState = useInteractionStore((state) => state.rotation);

  return useMemo(() => {
    if (resizeState?.snapToIncrement) return true;
    if (translationState?.snapToGrid) return true;
    if (rotationState?.snapToAngle) return true;
    return false;
  }, [
    resizeState?.snapToIncrement,
    translationState?.snapToGrid,
    rotationState?.snapToAngle,
  ]);
}

/**
 * Utility to snap a value to the nearest grid point
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Utility to snap a size to the nearest grid point
 */
export function snapSizeToGrid(size: Size, gridSize: number): Size {
  return {
    width: snapToGrid(size.width, gridSize),
    height: snapToGrid(size.height, gridSize),
  };
}

/**
 * Utility to snap a point to the nearest grid intersection
 */
export function snapPointToGrid(point: Point, gridSize: number): Point {
  return {
    x: snapToGrid(point.x, gridSize),
    y: snapToGrid(point.y, gridSize),
  };
}

// Re-export constants for external use
export { DEFAULT_GRID_SIZE, SMALL_GRID_SIZE, DEFAULT_SNAP_POINT_RADIUS };
