/**
 * SpacingAdjuster Component
 * Visual gap handle for adjusting spacing between children in Column/Row containers
 *
 * Features:
 * - Appears between children in Column/Row containers
 * - Drag gap handle to adjust spacing
 * - Snaps to 5px increments
 * - Shows spacing value tooltip during drag
 * - Visual feedback for constraint limits
 * - Two-way binding with properties panel
 */
"use client";

import React, { memo, useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useSpacing } from "@/hooks/useSpacing";
import type { ComponentType } from "@/types/component";
import { GripVertical, GripHorizontal } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for SpacingAdjuster component
 */
export interface SpacingAdjusterProps {
  /** Container component ID */
  componentId: string;
  /** Component type (Column or Row) */
  componentType: ComponentType;
  /** Index of the gap (between children) */
  gapIndex: number;
  /** Current spacing value in points */
  spacing: number;
  /** Direction of the container (Column = vertical, Row = horizontal) */
  direction?: "vertical" | "horizontal";
  /** Whether the adjuster is enabled */
  enabled?: boolean;
  /** Snap increment in points (default: 5) */
  snapIncrement?: number;
  /** Minimum spacing value (default: 0) */
  minSpacing?: number;
  /** Maximum spacing value (default: 200) */
  maxSpacing?: number;
  /** Callback when spacing changes */
  onSpacingChange?: (spacing: number) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default snap increment for spacing (in points) */
const DEFAULT_SNAP_INCREMENT = 5;

/** Minimum visual height/width of the gap handle */
const MIN_GAP_SIZE = 8;

/** Points to pixels conversion factor */
const POINTS_TO_PIXELS = 1.33;

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Spacing tooltip showing current value during drag
 */
interface SpacingTooltipProps {
  value: number;
  visible: boolean;
  direction: "vertical" | "horizontal";
  isSnapped?: boolean;
  atLimit?: "min" | "max" | null;
  className?: string;
}

const SpacingTooltip = memo(function SpacingTooltip({
  value,
  visible,
  direction,
  isSnapped,
  atLimit,
  className,
}: SpacingTooltipProps) {
  if (!visible) return null;

  return (
    <div
      className={cn(
        // Base styles
        "pointer-events-none absolute z-100",
        "rounded-md px-2 py-1 shadow-lg",
        "text-xs font-medium whitespace-nowrap",
        "-translate-x-1/2 -translate-y-1/2 transform",
        "transition-opacity duration-100",
        // Position based on direction
        direction === "vertical" ? "-top-6 left-1/2" : "top-1/2 -left-10",
        // Color based on state
        atLimit === "min"
          ? "bg-red-500 text-white"
          : atLimit === "max"
            ? "bg-orange-500 text-white"
            : isSnapped
              ? "bg-primary text-primary-foreground"
              : "bg-gray-800 text-white",
        // Visibility
        visible ? "opacity-100" : "opacity-0",
        className
      )}
      role="tooltip"
      aria-live="polite"
    >
      <span className="flex items-center gap-1">
        {direction === "vertical" ? "↕" : "↔"} {Math.round(value)}pt
        {isSnapped && <span className="text-[10px] opacity-75">●</span>}
      </span>
    </div>
  );
});

SpacingTooltip.displayName = "SpacingTooltip";

// ============================================================================
// Main Component
// ============================================================================

/**
 * SpacingAdjuster Component
 * Provides a draggable handle between children to adjust container spacing
 */
function SpacingAdjusterComponent({
  componentId,
  componentType,
  gapIndex,
  spacing,
  direction: directionProp,
  enabled = true,
  snapIncrement = DEFAULT_SNAP_INCREMENT,
  minSpacing = 0,
  maxSpacing = 200,
  onSpacingChange,
  className,
}: SpacingAdjusterProps) {
  // Determine direction based on component type if not provided
  const direction = useMemo(() => {
    if (directionProp) return directionProp;
    return componentType === "Column" ? "vertical" : "horizontal";
  }, [directionProp, componentType]);

  // Local hover state
  const [isHovered, setIsHovered] = useState(false);

  // Use spacing adjustment hook
  const { state, handleMouseDown, atMinSpacing, atMaxSpacing, canAdjust } =
    useSpacing({
      componentId,
      componentType,
      currentSpacing: spacing,
      enabled,
      snapIncrement,
      minSpacing,
      maxSpacing,
      onAdjust: onSpacingChange,
    });

  const { isAdjusting, currentSpacing, activeGapIndex } = state;
  const isThisGapActive = isAdjusting && activeGapIndex === gapIndex;

  // Calculate if current spacing is snapped
  const isSnapped = useMemo(() => {
    return currentSpacing % snapIncrement === 0;
  }, [currentSpacing, snapIncrement]);

  // Calculate visual gap size
  const visualGapSize = useMemo(() => {
    const pixelSpacing = Math.round(currentSpacing * POINTS_TO_PIXELS);
    return Math.max(MIN_GAP_SIZE, pixelSpacing);
  }, [currentSpacing]);

  // Calculate at limit status
  const atLimit = useMemo(() => {
    if (atMinSpacing) return "min" as const;
    if (atMaxSpacing) return "max" as const;
    return null;
  }, [atMinSpacing, atMaxSpacing]);

  // ========================================
  // Event Handlers
  // ========================================

  const handleGapMouseDown = useCallback(
    (event: React.MouseEvent) => {
      if (!canAdjust) return;
      handleMouseDown(gapIndex, event);
    },
    [canAdjust, gapIndex, handleMouseDown]
  );

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // ========================================
  // Render
  // ========================================

  if (!canAdjust) return null;

  const isVertical = direction === "vertical";

  return (
    <div
      className={cn(
        // Base styles
        "relative flex items-center justify-center",
        "group transition-all duration-150",
        // Direction-based sizing
        isVertical ? "w-full cursor-ns-resize" : "h-full cursor-ew-resize",
        // Hover and active states
        isHovered && !isThisGapActive && "bg-primary/5",
        isThisGapActive && "bg-primary/10",
        className
      )}
      style={{
        [isVertical ? "height" : "width"]: visualGapSize,
        [isVertical ? "minHeight" : "minWidth"]: MIN_GAP_SIZE,
      }}
      onMouseDown={handleGapMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-gap-index={gapIndex}
      data-spacing={currentSpacing}
      role="slider"
      aria-label={`Adjust spacing between items ${gapIndex} and ${gapIndex + 1}`}
      aria-valuenow={currentSpacing}
      aria-valuemin={minSpacing}
      aria-valuemax={maxSpacing}
      tabIndex={0}
    >
      {/* Spacing tooltip */}
      <SpacingTooltip
        value={currentSpacing}
        visible={isThisGapActive}
        direction={direction}
        isSnapped={isSnapped}
        atLimit={atLimit}
      />

      {/* Gap handle visual indicator */}
      <div
        className={cn(
          // Base styles
          "absolute flex items-center justify-center",
          "rounded-full border-2 transition-all duration-150",
          // Size
          "h-6 w-6",
          // Default state
          "border-muted-foreground/30 bg-background",
          "opacity-0 group-hover:opacity-100",
          // Hover state
          "group-hover:border-primary/60 group-hover:bg-primary/10",
          // Active state
          isThisGapActive &&
            "border-primary bg-primary/20 opacity-100 shadow-md",
          // At limit state
          atLimit === "min" &&
            isThisGapActive &&
            "border-red-500 bg-red-500/20",
          atLimit === "max" &&
            isThisGapActive &&
            "border-orange-500 bg-orange-500/20"
        )}
      >
        {isVertical ? (
          <GripHorizontal
            className={cn(
              "h-4 w-4 transition-colors",
              isThisGapActive
                ? atLimit
                  ? atLimit === "min"
                    ? "text-red-600"
                    : "text-orange-600"
                  : "text-primary"
                : "text-muted-foreground/60 group-hover:text-primary/80"
            )}
          />
        ) : (
          <GripVertical
            className={cn(
              "h-4 w-4 transition-colors",
              isThisGapActive
                ? atLimit
                  ? atLimit === "min"
                    ? "text-red-600"
                    : "text-orange-600"
                  : "text-primary"
                : "text-muted-foreground/60 group-hover:text-primary/80"
            )}
          />
        )}
      </div>

      {/* Dashed line indicator */}
      <div
        className={cn(
          "absolute transition-all duration-150",
          isVertical
            ? "right-2 left-2 h-px border-t border-dashed"
            : "top-2 bottom-2 w-px border-l border-dashed",
          "border-muted-foreground/30",
          "opacity-0 group-hover:opacity-100",
          isThisGapActive && "border-primary opacity-100"
        )}
      />

      {/* Spacing value badge (shown on hover when not adjusting) */}
      {isHovered && !isThisGapActive && (
        <div
          className={cn(
            "pointer-events-none absolute z-50",
            "rounded px-1.5 py-0.5 text-[10px] font-medium",
            "bg-muted text-muted-foreground",
            isVertical ? "top-0 right-2" : "top-2 left-0"
          )}
        >
          {Math.round(spacing)}pt
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export const SpacingAdjuster = memo(SpacingAdjusterComponent);
SpacingAdjuster.displayName = "SpacingAdjuster";

export default SpacingAdjuster;
