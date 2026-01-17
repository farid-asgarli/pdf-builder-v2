/**
 * CanvasRuler Component
 * Horizontal and vertical rulers for the canvas
 *
 * Features:
 * - Pixel measurement display
 * - Zoom-aware tick marks
 * - Mouse position indicator
 * - Customizable appearance
 */
"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Point } from "@/types/canvas";

// ============================================================================
// Types
// ============================================================================

export type RulerOrientation = "horizontal" | "vertical";

export interface CanvasRulerProps {
  /** Ruler orientation */
  orientation: RulerOrientation;
  /** Length of the ruler in pixels */
  length: number;
  /** Thickness of the ruler in pixels */
  thickness?: number;
  /** Current zoom level */
  zoom?: number;
  /** Current pan offset */
  pan?: Point;
  /** Base unit for tick marks */
  unit?: number;
  /** Current mouse position for indicator */
  mousePosition?: Point | null;
  /** Whether ruler is visible */
  visible?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export interface CanvasRulersProps {
  /** Width of the canvas viewport */
  width: number;
  /** Height of the canvas viewport */
  height: number;
  /** Current zoom level */
  zoom?: number;
  /** Current pan offset */
  pan?: Point;
  /** Whether rulers are visible */
  visible?: boolean;
  /** Thickness of rulers */
  thickness?: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_THICKNESS = 20;
const DEFAULT_UNIT = 50; // 50px base units
const TICK_COLORS = {
  major: "hsl(var(--foreground))",
  minor: "hsl(var(--muted-foreground) / 0.5)",
  text: "hsl(var(--foreground))",
};
const RULER_BG = "hsl(var(--muted))";
const INDICATOR_COLOR = "hsl(var(--primary))";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate appropriate tick spacing based on zoom level
 */
function calculateTickSpacing(
  zoom: number,
  baseUnit: number
): { major: number; minor: number } {
  const scaledUnit = baseUnit * zoom;

  // Adjust spacing to keep ticks readable at different zoom levels
  if (scaledUnit < 25) {
    return { major: baseUnit * 4, minor: baseUnit * 2 };
  } else if (scaledUnit < 50) {
    return { major: baseUnit * 2, minor: baseUnit };
  } else if (scaledUnit > 150) {
    return { major: baseUnit / 2, minor: baseUnit / 4 };
  }

  return { major: baseUnit, minor: baseUnit / 5 };
}

/**
 * Generate tick marks for a ruler
 */
function generateTicks(
  length: number,
  zoom: number,
  pan: number,
  spacing: { major: number; minor: number }
): Array<{ position: number; value: number; isMajor: boolean }> {
  const ticks: Array<{ position: number; value: number; isMajor: boolean }> =
    [];

  // Calculate the visible range in canvas coordinates
  const startValue = Math.floor(-pan / zoom / spacing.minor) * spacing.minor;
  const endValue =
    Math.ceil((length - pan) / zoom / spacing.minor) * spacing.minor;

  for (let value = startValue; value <= endValue; value += spacing.minor) {
    const position = value * zoom + pan;

    // Skip if outside visible area
    if (position < 0 || position > length) continue;

    const isMajor = Math.abs(value % spacing.major) < 0.001;
    ticks.push({ position, value, isMajor });
  }

  return ticks;
}

// ============================================================================
// Single Ruler Component
// ============================================================================

/**
 * Single ruler component (horizontal or vertical)
 */
function CanvasRulerComponent({
  orientation,
  length,
  thickness = DEFAULT_THICKNESS,
  zoom = 1,
  pan = { x: 0, y: 0 },
  unit = DEFAULT_UNIT,
  mousePosition,
  visible = true,
  className,
}: CanvasRulerProps) {
  const isHorizontal = orientation === "horizontal";
  const panValue = isHorizontal ? pan.x : pan.y;

  // Calculate tick spacing based on zoom
  const tickSpacing = useMemo(
    () => calculateTickSpacing(zoom, unit),
    [zoom, unit]
  );

  // Generate tick marks
  const ticks = useMemo(
    () => generateTicks(length, zoom, panValue, tickSpacing),
    [length, zoom, panValue, tickSpacing]
  );

  // Calculate mouse indicator position
  const indicatorPosition = mousePosition
    ? isHorizontal
      ? mousePosition.x
      : mousePosition.y
    : null;

  if (!visible) {
    return null;
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden select-none",
        isHorizontal ? `h-[${thickness}px]` : `w-[${thickness}px]`,
        className
      )}
      style={{
        width: isHorizontal ? length : thickness,
        height: isHorizontal ? thickness : length,
        backgroundColor: RULER_BG,
      }}
    >
      <svg
        width={isHorizontal ? length : thickness}
        height={isHorizontal ? thickness : length}
        className="absolute inset-0"
      >
        {/* Tick marks */}
        {ticks.map(({ position, value, isMajor }, index) => {
          const tickLength = isMajor ? thickness * 0.7 : thickness * 0.4;

          if (isHorizontal) {
            return (
              <g key={index}>
                <line
                  x1={position}
                  y1={thickness}
                  x2={position}
                  y2={thickness - tickLength}
                  stroke={isMajor ? TICK_COLORS.major : TICK_COLORS.minor}
                  strokeWidth={isMajor ? 1 : 0.5}
                />
                {isMajor && (
                  <text
                    x={position + 3}
                    y={thickness - tickLength - 2}
                    fontSize={9}
                    fill={TICK_COLORS.text}
                    className="font-mono"
                  >
                    {Math.round(value)}
                  </text>
                )}
              </g>
            );
          } else {
            return (
              <g key={index}>
                <line
                  x1={thickness}
                  y1={position}
                  x2={thickness - tickLength}
                  y2={position}
                  stroke={isMajor ? TICK_COLORS.major : TICK_COLORS.minor}
                  strokeWidth={isMajor ? 1 : 0.5}
                />
                {isMajor && (
                  <text
                    x={2}
                    y={position - 3}
                    fontSize={9}
                    fill={TICK_COLORS.text}
                    className="font-mono"
                    transform={`rotate(-90, 2, ${position - 3})`}
                  >
                    {Math.round(value)}
                  </text>
                )}
              </g>
            );
          }
        })}

        {/* Mouse position indicator */}
        {indicatorPosition !== null &&
          indicatorPosition >= 0 &&
          indicatorPosition <= length &&
          (isHorizontal ? (
            <line
              x1={indicatorPosition}
              y1={0}
              x2={indicatorPosition}
              y2={thickness}
              stroke={INDICATOR_COLOR}
              strokeWidth={1}
            />
          ) : (
            <line
              x1={0}
              y1={indicatorPosition}
              x2={thickness}
              y2={indicatorPosition}
              stroke={INDICATOR_COLOR}
              strokeWidth={1}
            />
          ))}
      </svg>
    </div>
  );
}

export const CanvasRuler = memo(CanvasRulerComponent);
CanvasRuler.displayName = "CanvasRuler";

// ============================================================================
// Combined Rulers Component
// ============================================================================

/**
 * Combined horizontal and vertical rulers with corner piece
 */
function CanvasRulersComponent({
  width,
  height,
  zoom = 1,
  pan = { x: 0, y: 0 },
  visible = true,
  thickness = DEFAULT_THICKNESS,
}: CanvasRulersProps) {
  const [mousePosition, setMousePosition] = useState<Point | null>(null);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setMousePosition(null);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="pointer-events-auto relative"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Corner piece */}
      <div
        className="absolute top-0 left-0 z-20"
        style={{
          width: thickness,
          height: thickness,
          backgroundColor: RULER_BG,
        }}
      />

      {/* Horizontal ruler */}
      <div className="absolute top-0 z-10" style={{ left: thickness }}>
        <CanvasRuler
          orientation="horizontal"
          length={width - thickness}
          thickness={thickness}
          zoom={zoom}
          pan={pan}
          mousePosition={
            mousePosition
              ? { x: mousePosition.x - thickness, y: mousePosition.y }
              : null
          }
          visible={visible}
        />
      </div>

      {/* Vertical ruler */}
      <div className="absolute left-0 z-10" style={{ top: thickness }}>
        <CanvasRuler
          orientation="vertical"
          length={height - thickness}
          thickness={thickness}
          zoom={zoom}
          pan={pan}
          mousePosition={
            mousePosition
              ? { x: mousePosition.x, y: mousePosition.y - thickness }
              : null
          }
          visible={visible}
        />
      </div>
    </div>
  );
}

export const CanvasRulers = memo(CanvasRulersComponent);
CanvasRulers.displayName = "CanvasRulers";

export default CanvasRuler;
