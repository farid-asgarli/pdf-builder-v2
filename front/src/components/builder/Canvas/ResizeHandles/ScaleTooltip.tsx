/**
 * ScaleTooltip Component
 * Shows current scale percentage during scale operations
 *
 * Features:
 * - Real-time scale display (e.g., "150%")
 * - Shows uniform vs non-uniform scale indicators
 * - Positioned near the scale handles
 * - Animated appearance/disappearance
 * - Color feedback when at constraints
 */
"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import { Maximize2 } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for ScaleTooltip component
 */
export interface ScaleTooltipProps {
  /** Current uniform scale value (0.1 to 10, where 1 = 100%) */
  scale: number;
  /** Current X scale value (for non-uniform scaling) */
  scaleX?: number;
  /** Current Y scale value (for non-uniform scaling) */
  scaleY?: number;
  /** Whether the tooltip is visible */
  visible?: boolean;
  /** Position relative to component (x, y offset) */
  position?: { x: number; y: number };
  /** Whether the scale is uniform (same X and Y) */
  isUniform?: boolean;
  /** Whether at a constraint limit */
  atLimit?: boolean;
  /** Current canvas zoom level */
  zoom?: number;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Format scale as percentage */
function formatScale(scale: number): string {
  const percentage = Math.round(scale * 100);
  return `${percentage}%`;
}

/** Format scale with precision for non-uniform */
function formatScalePrecise(scale: number): string {
  if (scale === Math.round(scale * 10) / 10) {
    return `${Math.round(scale * 100)}%`;
  }
  return `${(scale * 100).toFixed(1)}%`;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Tooltip showing the current scale percentage
 */
function ScaleTooltipComponent({
  scale,
  scaleX,
  scaleY,
  visible = true,
  position = { x: 0, y: 0 },
  isUniform = true,
  atLimit = false,
  zoom = 1,
  className,
}: ScaleTooltipProps) {
  if (!visible) return null;

  // Determine display values
  const displayScaleX = scaleX ?? scale;
  const displayScaleY = scaleY ?? scale;
  const isNonUniform =
    !isUniform && Math.abs(displayScaleX - displayScaleY) > 0.01;

  // Counter-scale tooltip based on zoom to maintain readability
  const tooltipScale = Math.min(1.5, Math.max(0.75, 1 / zoom));

  return (
    <div
      className={cn(
        // Base styles
        "pointer-events-none absolute z-50",
        "rounded-md px-2 py-1 text-xs font-medium",
        "transition-all duration-100 ease-out",
        // Shadow and border
        "border shadow-lg",
        // Visibility animation
        visible ? "scale-100 opacity-100" : "scale-95 opacity-0",
        // Normal state
        "border-blue-500/40 bg-blue-50 text-blue-700",
        // At constraint limit
        atLimit && "border-destructive/40 bg-destructive/10 text-destructive",
        className
      )}
      style={{
        left: position.x,
        top: position.y,
        transform: `scale(${tooltipScale})`,
        transformOrigin: "top left",
      }}
      role="tooltip"
      aria-label={`Scale: ${formatScale(scale)}`}
    >
      <div className="flex items-center gap-1.5">
        <Maximize2 className="h-3 w-3" aria-hidden="true" />

        {isNonUniform ? (
          // Non-uniform scale display
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1">
              <span className="text-[10px] opacity-70">X:</span>
              <span>{formatScalePrecise(displayScaleX)}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-[10px] opacity-70">Y:</span>
              <span>{formatScalePrecise(displayScaleY)}</span>
            </span>
          </div>
        ) : (
          // Uniform scale display
          <span>{formatScale(scale)}</span>
        )}

        {/* Indicator for aspect ratio lock */}
        {isUniform && !isNonUniform && (
          <span className="text-[10px] opacity-60" title="Aspect ratio locked">
            🔒
          </span>
        )}

        {/* Constraint limit indicator */}
        {atLimit && (
          <span
            className="text-destructive ml-1 text-[10px]"
            title="At scale limit"
          >
            (limit)
          </span>
        )}
      </div>
    </div>
  );
}

export const ScaleTooltip = memo(ScaleTooltipComponent);
ScaleTooltip.displayName = "ScaleTooltip";

export default ScaleTooltip;
