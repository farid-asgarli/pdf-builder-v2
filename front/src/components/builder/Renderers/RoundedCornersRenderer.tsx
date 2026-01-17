/**
 * RoundedCorners Renderer
 * Visual renderer for RoundedCorners components in the canvas
 *
 * Features:
 * - Visual corner radius indicators on all four corners
 * - Support for all radius modes: uniform (all) and individual corners
 * - Interactive corner visualization with radius labels
 * - Selection state handling
 * - Child content rendering with rounded corners applied
 * - Visual guides showing corner radius values
 */
"use client";

import React, { memo, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { RendererProps } from "./types";
import { RENDERER_CONTAINER_STYLES, COMPONENT_CATEGORY_COLORS } from "./types";
import {
  ChildRenderer,
  EmptyContainerPlaceholder,
  ComponentLabel,
} from "./ComponentRenderer";
import { registerRenderer } from "./registry";
import type { RoundedCornersProperties } from "@/types/properties";
import { ComponentType } from "@/types/component";
import { RectangleHorizontal, Circle } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended props specific to RoundedCorners renderer
 */
export interface RoundedCornersRendererProps extends RendererProps {
  /** Override corner radius values (for preview) */
  previewCorners?: RoundedCornersProperties;
  /** Whether to show radius labels */
  showRadiusLabels?: boolean;
}

/**
 * Resolved corner radius values for each corner
 */
interface ResolvedCorners {
  topLeft: number;
  topRight: number;
  bottomLeft: number;
  bottomRight: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Default corner radius */
const DEFAULT_CORNER_RADIUS = 0;

/** Minimum visual radius for display */
const MIN_VISUAL_RADIUS = 2;

/** Maximum visual radius to prevent excessive display sizes */
const MAX_VISUAL_RADIUS = 40;

/** Scale factor for converting points to visual pixels */
const POINTS_TO_PIXELS = 1.33;

/** Corner indicator color (purple for styling category) */
const CORNER_COLOR = "rgba(168, 85, 247, 0.3)"; // purple-500/30
const CORNER_BORDER_COLOR = "rgba(168, 85, 247, 0.6)"; // purple-500/60

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolve corner radius properties into individual corner values
 * Individual corners take precedence over uniform radius
 */
function resolveCorners(properties: RoundedCornersProperties): ResolvedCorners {
  const all = properties.all ?? DEFAULT_CORNER_RADIUS;

  return {
    topLeft: properties.topLeft ?? all,
    topRight: properties.topRight ?? all,
    bottomLeft: properties.bottomLeft ?? all,
    bottomRight: properties.bottomRight ?? all,
  };
}

/**
 * Convert points to visual pixels with constraints
 */
function pointsToVisualPixels(points: number): number {
  if (points === 0) return 0;
  const pixels = Math.round(points * POINTS_TO_PIXELS);
  return Math.min(Math.max(pixels, MIN_VISUAL_RADIUS), MAX_VISUAL_RADIUS);
}

/**
 * Check if all corner radius values are equal
 */
function isUniformCorners(corners: ResolvedCorners): boolean {
  return (
    corners.topLeft === corners.topRight &&
    corners.topRight === corners.bottomLeft &&
    corners.bottomLeft === corners.bottomRight
  );
}

/**
 * Format corner radius value for display
 */
function formatRadiusValue(value: number): string {
  return value === 0 ? "0" : `${value}pt`;
}

/**
 * Get summary text for corner configuration
 */
function getCornersSummary(corners: ResolvedCorners): string {
  if (!hasCorners(corners)) {
    return "none";
  }

  if (isUniformCorners(corners)) {
    return `${corners.topLeft}pt`;
  }

  // Show all four values
  return `TL:${corners.topLeft} TR:${corners.topRight} BL:${corners.bottomLeft} BR:${corners.bottomRight}`;
}

/**
 * Check if any corner radius is applied
 */
function hasCorners(corners: ResolvedCorners): boolean {
  return (
    corners.topLeft > 0 ||
    corners.topRight > 0 ||
    corners.bottomLeft > 0 ||
    corners.bottomRight > 0
  );
}

/**
 * Get CSS border-radius string from resolved corners
 */
function getCssBorderRadius(corners: ResolvedCorners): string {
  const tl = pointsToVisualPixels(corners.topLeft);
  const tr = pointsToVisualPixels(corners.topRight);
  const br = pointsToVisualPixels(corners.bottomRight);
  const bl = pointsToVisualPixels(corners.bottomLeft);

  return `${tl}px ${tr}px ${br}px ${bl}px`;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Corner radius indicator component
 * Renders a visual arc indicator for a corner
 */
const CornerIndicator = memo(function CornerIndicator({
  corner,
  radius,
  visualRadius,
  showLabel,
}: {
  corner: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
  radius: number;
  visualRadius: number;
  showLabel: boolean;
}) {
  if (radius === 0) return null;

  const size = Math.max(visualRadius, 8);

  // Position styles for each corner
  const positionStyles: Record<string, React.CSSProperties> = {
    topLeft: {
      position: "absolute",
      top: 0,
      left: 0,
      borderTopLeftRadius: size,
    },
    topRight: {
      position: "absolute",
      top: 0,
      right: 0,
      borderTopRightRadius: size,
    },
    bottomLeft: {
      position: "absolute",
      bottom: 0,
      left: 0,
      borderBottomLeftRadius: size,
    },
    bottomRight: {
      position: "absolute",
      bottom: 0,
      right: 0,
      borderBottomRightRadius: size,
    },
  };

  // Label position classes for each corner
  const labelPositions: Record<string, string> = {
    topLeft: "-top-5 -left-1",
    topRight: "-top-5 -right-1",
    bottomLeft: "-bottom-5 -left-1",
    bottomRight: "-bottom-5 -right-1",
  };

  return (
    <div
      style={{
        ...positionStyles[corner],
        width: size,
        height: size,
        backgroundColor: CORNER_COLOR,
        border: `1px dashed ${CORNER_BORDER_COLOR}`,
      }}
      className="pointer-events-none transition-all"
    >
      {showLabel && (
        <span
          className={cn(
            "absolute rounded bg-purple-500/90 px-1 py-0.5 text-[8px] font-medium whitespace-nowrap text-white",
            "pointer-events-none opacity-0 transition-opacity group-hover:opacity-100",
            labelPositions[corner]
          )}
        >
          {formatRadiusValue(radius)}
        </span>
      )}
    </div>
  );
});

CornerIndicator.displayName = "CornerIndicator";

/**
 * Corner icon component for the header
 */
const CornerIcon = memo(function CornerIcon({
  hasRadius,
}: {
  hasRadius: boolean;
}) {
  return hasRadius ? (
    <RectangleHorizontal className="h-3.5 w-3.5 text-purple-500/70" />
  ) : (
    <Circle className="h-3.5 w-3.5 text-purple-500/70" />
  );
});

CornerIcon.displayName = "CornerIcon";

// ============================================================================
// Component
// ============================================================================

/**
 * RoundedCorners Renderer Component
 * Renders a rounded corners wrapper component with visual corner indicators
 */
function RoundedCornersRendererComponent({
  node,
  depth,
  isSelected,
  isPrimarySelection,
  isHovered,
  isDropTarget,
  onClick,
  onDoubleClick,
  onContextMenu,
  className,
  hideChildren,
  previewCorners,
  showRadiusLabels = true,
}: RoundedCornersRendererProps) {
  // ========================================
  // Event Handlers
  // ========================================

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(e, node.id);
    },
    [onClick, node.id]
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDoubleClick?.(e, node.id);
    },
    [onDoubleClick, node.id]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu?.(e, node.id);
    },
    [onContextMenu, node.id]
  );

  // ========================================
  // Computed Values
  // ========================================

  const properties =
    previewCorners ?? (node.properties as RoundedCornersProperties);

  // Resolve corner radius values
  const corners = useMemo(() => resolveCorners(properties), [properties]);

  // Convert to visual pixels
  const visualCorners = useMemo(
    () => ({
      topLeft: pointsToVisualPixels(corners.topLeft),
      topRight: pointsToVisualPixels(corners.topRight),
      bottomLeft: pointsToVisualPixels(corners.bottomLeft),
      bottomRight: pointsToVisualPixels(corners.bottomRight),
    }),
    [corners]
  );

  const hasAnyCorners = hasCorners(corners);
  const summary = getCornersSummary(corners);
  const hasChild = node.child !== undefined;
  const cssRadius = getCssBorderRadius(corners);

  // ========================================
  // Render
  // ========================================

  return (
    <div
      className={cn(
        RENDERER_CONTAINER_STYLES.container,
        "group relative",
        COMPONENT_CATEGORY_COLORS.styling,
        isSelected && RENDERER_CONTAINER_STYLES.selected,
        isPrimarySelection && RENDERER_CONTAINER_STYLES.primarySelected,
        isHovered && !isSelected && RENDERER_CONTAINER_STYLES.hovered,
        isDropTarget && RENDERER_CONTAINER_STYLES.dropTarget,
        className
      )}
      style={{
        marginLeft: depth > 0 ? 4 : 0,
        borderRadius: hasAnyCorners ? cssRadius : undefined,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      data-component-id={node.id}
      data-component-type={node.type}
      data-depth={depth}
      role="region"
      aria-label={`Rounded corners wrapper: ${summary}`}
    >
      {/* Component label shown on hover */}
      <ComponentLabel type="RoundedCorners" />

      {/* Header with icon and info */}
      <div className="flex items-center gap-1.5 border-b border-purple-500/20 px-2 py-1.5">
        <CornerIcon hasRadius={hasAnyCorners} />
        <span className="text-[10px] font-medium tracking-wide text-purple-600/80 uppercase">
          Rounded
        </span>

        {/* Corner summary */}
        <span className="text-muted-foreground ml-auto text-[9px]">
          {summary}
        </span>

        {/* Uniform indicator */}
        {hasAnyCorners && isUniformCorners(corners) && (
          <Circle className="h-3 w-3 text-purple-400/60" />
        )}
      </div>

      {/* Content area with visual corners */}
      <div
        className="relative overflow-hidden p-2"
        style={{
          borderRadius: hasAnyCorners ? cssRadius : undefined,
        }}
      >
        {/* Corner radius visual indicators (shown on hover) */}
        {hasAnyCorners && (
          <div className="pointer-events-none absolute inset-0">
            {corners.topLeft > 0 && (
              <CornerIndicator
                corner="topLeft"
                radius={corners.topLeft}
                visualRadius={visualCorners.topLeft}
                showLabel={showRadiusLabels}
              />
            )}
            {corners.topRight > 0 && (
              <CornerIndicator
                corner="topRight"
                radius={corners.topRight}
                visualRadius={visualCorners.topRight}
                showLabel={showRadiusLabels}
              />
            )}
            {corners.bottomLeft > 0 && (
              <CornerIndicator
                corner="bottomLeft"
                radius={corners.bottomLeft}
                visualRadius={visualCorners.bottomLeft}
                showLabel={showRadiusLabels}
              />
            )}
            {corners.bottomRight > 0 && (
              <CornerIndicator
                corner="bottomRight"
                radius={corners.bottomRight}
                visualRadius={visualCorners.bottomRight}
                showLabel={showRadiusLabels}
              />
            )}
          </div>
        )}

        {/* Content */}
        {!hideChildren && (
          <>
            {hasChild ? (
              <ChildRenderer
                node={node.child!}
                depth={depth + 1}
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                onContextMenu={onContextMenu}
              />
            ) : (
              <EmptyContainerPlaceholder message="Drop a component to apply rounded corners" />
            )}
          </>
        )}
      </div>

      {/* Corner details indicator (shown when selected) */}
      {isSelected && hasAnyCorners && (
        <div className="text-muted-foreground absolute right-0 -bottom-5 left-0 flex justify-center text-[8px]">
          <span className="flex items-center gap-1 rounded bg-purple-500/80 px-1.5 py-0.5 text-white">
            {isUniformCorners(corners) ? (
              <span>Radius: {formatRadiusValue(corners.topLeft)}</span>
            ) : (
              <span>
                TL:{corners.topLeft} TR:{corners.topRight} BL:
                {corners.bottomLeft} BR:{corners.bottomRight}
              </span>
            )}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exports & Registration
// ============================================================================

export const RoundedCornersRenderer = memo(RoundedCornersRendererComponent);
RoundedCornersRenderer.displayName = "RoundedCornersRenderer";

// Self-register this renderer to avoid circular dependencies
registerRenderer(ComponentType.RoundedCorners, RoundedCornersRenderer);

export default RoundedCornersRenderer;
