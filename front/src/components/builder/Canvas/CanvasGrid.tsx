/**
 * CanvasGrid Component
 * SVG-based grid background that scales with zoom
 *
 * Features:
 * - Dot or line grid patterns
 * - Zoom-aware scaling
 * - Customizable grid size and colors
 * - Performance optimized with SVG patterns
 */
"use client";

import { memo, useId } from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type GridPattern = "dots" | "lines" | "dashed";

export interface CanvasGridProps {
  /** Grid cell size in pixels */
  gridSize?: number;
  /** Current zoom level */
  zoom?: number;
  /** Grid pattern type */
  pattern?: GridPattern;
  /** Grid color */
  color?: string;
  /** Show major grid lines every N cells */
  majorGridEvery?: number;
  /** Major grid color */
  majorColor?: string;
  /** Whether grid is visible */
  visible?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_GRID_SIZE = 10;
const DEFAULT_GRID_COLOR = "hsl(var(--muted-foreground) / 0.15)";
const DEFAULT_MAJOR_COLOR = "hsl(var(--muted-foreground) / 0.25)";
const DEFAULT_MAJOR_EVERY = 10;

// ============================================================================
// Component
// ============================================================================

/**
 * Grid background component for the canvas
 */
function CanvasGridComponent({
  gridSize = DEFAULT_GRID_SIZE,
  zoom = 1,
  pattern = "dots",
  color = DEFAULT_GRID_COLOR,
  majorGridEvery = DEFAULT_MAJOR_EVERY,
  majorColor = DEFAULT_MAJOR_COLOR,
  visible = true,
  className,
}: CanvasGridProps) {
  // Calculate scaled grid size based on zoom
  const scaledSize = gridSize * zoom;
  const scaledMajorSize = scaledSize * majorGridEvery;

  // Generate unique IDs for SVG patterns using React's useId
  const id = useId();
  const patternId = `grid-pattern-${id}`;
  const majorPatternId = `major-grid-pattern-${id}`;

  if (!visible) {
    return null;
  }

  return (
    <svg
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        className
      )}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Minor grid pattern */}
        {pattern === "dots" && (
          <pattern
            id={patternId}
            width={scaledSize}
            height={scaledSize}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={scaledSize / 2}
              cy={scaledSize / 2}
              r={Math.max(0.5, zoom * 0.5)}
              fill={color}
            />
          </pattern>
        )}

        {pattern === "lines" && (
          <pattern
            id={patternId}
            width={scaledSize}
            height={scaledSize}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${scaledSize} 0 L 0 0 0 ${scaledSize}`}
              fill="none"
              stroke={color}
              strokeWidth={Math.max(0.5, zoom * 0.5)}
            />
          </pattern>
        )}

        {pattern === "dashed" && (
          <pattern
            id={patternId}
            width={scaledSize}
            height={scaledSize}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${scaledSize} 0 L 0 0 0 ${scaledSize}`}
              fill="none"
              stroke={color}
              strokeWidth={Math.max(0.5, zoom * 0.5)}
              strokeDasharray={`${scaledSize / 4} ${scaledSize / 4}`}
            />
          </pattern>
        )}

        {/* Major grid pattern */}
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
            strokeWidth={Math.max(1, zoom)}
          />
        </pattern>
      </defs>

      {/* Minor grid */}
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />

      {/* Major grid */}
      <rect width="100%" height="100%" fill={`url(#${majorPatternId})`} />
    </svg>
  );
}

// Memoize to prevent unnecessary re-renders
export const CanvasGrid = memo(CanvasGridComponent);
CanvasGrid.displayName = "CanvasGrid";

export default CanvasGrid;
