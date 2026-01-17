/**
 * Padding Renderer
 * Visual renderer for Padding components in the canvas
 *
 * Features:
 * - Visual padding indicators on all sides
 * - Support for all padding modes: all, horizontal, vertical, individual sides
 * - Interactive padding visualization with measurement labels
 * - Selection state handling
 * - Child content rendering with padding applied
 * - Visual guides showing padding boundaries
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
import type { PaddingProperties } from "@/types/properties";
import { ComponentType } from "@/types/component";
import { Square, BoxSelect } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended props specific to Padding renderer
 */
export interface PaddingRendererProps extends RendererProps {
  /** Override padding values (for preview) */
  previewPadding?: PaddingProperties;
  /** Whether to show measurement labels */
  showMeasurements?: boolean;
}

/**
 * Resolved padding values for each side
 */
interface ResolvedPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Minimum visual padding for display (even when padding is 0) */
const MIN_VISUAL_PADDING = 2;

/** Maximum visual padding to prevent excessive display sizes */
const MAX_VISUAL_PADDING = 60;

/** Scale factor for converting points to visual pixels */
const POINTS_TO_PIXELS = 1.33;

/** Padding indicator color (purple for styling category) */
const PADDING_COLOR = "rgba(168, 85, 247, 0.15)"; // purple-500/15
const PADDING_BORDER_COLOR = "rgba(168, 85, 247, 0.4)"; // purple-500/40

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolve padding properties into individual side values
 * Follows CSS-like precedence: individual > axis > all
 */
function resolvePadding(properties: PaddingProperties): ResolvedPadding {
  const all = properties.all ?? 0;
  const horizontal = properties.horizontal ?? all;
  const vertical = properties.vertical ?? all;

  return {
    top: properties.top ?? vertical,
    right: properties.right ?? horizontal,
    bottom: properties.bottom ?? vertical,
    left: properties.left ?? horizontal,
  };
}

/**
 * Convert points to visual pixels with constraints
 */
function pointsToVisualPixels(points: number): number {
  const pixels = Math.round(points * POINTS_TO_PIXELS);
  return Math.min(Math.max(pixels, MIN_VISUAL_PADDING), MAX_VISUAL_PADDING);
}

/**
 * Check if all padding values are equal
 */
function isUniformPadding(padding: ResolvedPadding): boolean {
  return (
    padding.top === padding.right &&
    padding.right === padding.bottom &&
    padding.bottom === padding.left
  );
}

/**
 * Check if horizontal padding is uniform
 */
function isHorizontalUniform(padding: ResolvedPadding): boolean {
  return padding.left === padding.right;
}

/**
 * Check if vertical padding is uniform
 */
function isVerticalUniform(padding: ResolvedPadding): boolean {
  return padding.top === padding.bottom;
}

/**
 * Format padding value for display
 */
function formatPaddingValue(value: number): string {
  return value === 0 ? "0" : `${value}pt`;
}

/**
 * Get summary text for padding configuration
 */
function getPaddingSummary(padding: ResolvedPadding): string {
  if (isUniformPadding(padding)) {
    return padding.top === 0 ? "none" : `${padding.top}pt`;
  }

  if (isHorizontalUniform(padding) && isVerticalUniform(padding)) {
    return `${padding.top}pt / ${padding.left}pt`;
  }

  // Show all four values
  return `${padding.top} ${padding.right} ${padding.bottom} ${padding.left}`;
}

/**
 * Check if any padding is applied
 */
function hasPadding(padding: ResolvedPadding): boolean {
  return (
    padding.top > 0 ||
    padding.right > 0 ||
    padding.bottom > 0 ||
    padding.left > 0
  );
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Padding measurement label component
 */
const PaddingLabel = memo(function PaddingLabel({
  value,
  position,
  isVisible,
}: {
  value: number;
  position: "top" | "right" | "bottom" | "left";
  isVisible: boolean;
}) {
  if (value === 0 || !isVisible) return null;

  const positionClasses: Record<string, string> = {
    top: "top-0 left-1/2 -translate-x-1/2 -translate-y-full",
    right: "right-0 top-1/2 translate-x-full -translate-y-1/2",
    bottom: "bottom-0 left-1/2 -translate-x-1/2 translate-y-full",
    left: "left-0 top-1/2 -translate-x-full -translate-y-1/2",
  };

  return (
    <span
      className={cn(
        "absolute rounded bg-purple-500/90 px-1 py-0.5 text-[8px] font-medium whitespace-nowrap text-white",
        "pointer-events-none opacity-0 transition-opacity group-hover:opacity-100",
        positionClasses[position]
      )}
    >
      {formatPaddingValue(value)}
    </span>
  );
});

PaddingLabel.displayName = "PaddingLabel";

/**
 * Padding indicator edge component
 * Renders the visual indicator for a single padding side
 */
const PaddingEdge = memo(function PaddingEdge({
  side,
  value,
  visualValue,
  showLabel,
}: {
  side: "top" | "right" | "bottom" | "left";
  value: number;
  visualValue: number;
  showLabel: boolean;
}) {
  if (value === 0) return null;

  const isVertical = side === "top" || side === "bottom";

  const edgeStyles: React.CSSProperties = {
    position: "absolute",
    backgroundColor: PADDING_COLOR,
    ...(side === "top" && {
      top: 0,
      left: 0,
      right: 0,
      height: visualValue,
      borderBottom: `1px dashed ${PADDING_BORDER_COLOR}`,
    }),
    ...(side === "bottom" && {
      bottom: 0,
      left: 0,
      right: 0,
      height: visualValue,
      borderTop: `1px dashed ${PADDING_BORDER_COLOR}`,
    }),
    ...(side === "left" && {
      top: 0,
      bottom: 0,
      left: 0,
      width: visualValue,
      borderRight: `1px dashed ${PADDING_BORDER_COLOR}`,
    }),
    ...(side === "right" && {
      top: 0,
      bottom: 0,
      right: 0,
      width: visualValue,
      borderLeft: `1px dashed ${PADDING_BORDER_COLOR}`,
    }),
  };

  return (
    <div className="pointer-events-none" style={edgeStyles} aria-hidden="true">
      {showLabel && (
        <span
          className={cn(
            "absolute text-[8px] font-medium text-purple-600/80",
            "opacity-0 transition-opacity group-hover:opacity-100",
            isVertical
              ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          )}
        >
          {formatPaddingValue(value)}
        </span>
      )}
    </div>
  );
});

PaddingEdge.displayName = "PaddingEdge";

// ============================================================================
// Component
// ============================================================================

/**
 * Padding Renderer Component
 * Renders a padding wrapper component with visual padding indicators
 */
function PaddingRendererComponent({
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
  previewPadding,
  showMeasurements = true,
}: PaddingRendererProps) {
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

  const properties = previewPadding ?? (node.properties as PaddingProperties);

  // Resolve padding values
  const padding = useMemo(() => resolvePadding(properties), [properties]);

  // Convert to visual pixels
  const visualPadding = useMemo(
    () => ({
      top: pointsToVisualPixels(padding.top),
      right: pointsToVisualPixels(padding.right),
      bottom: pointsToVisualPixels(padding.bottom),
      left: pointsToVisualPixels(padding.left),
    }),
    [padding]
  );

  const hasAnyPadding = hasPadding(padding);
  const summary = getPaddingSummary(padding);
  const hasChild = node.child !== undefined;

  // ========================================
  // Render
  // ========================================

  return (
    <div
      className={cn(
        RENDERER_CONTAINER_STYLES.container,
        "group relative rounded border",
        COMPONENT_CATEGORY_COLORS.styling,
        isSelected && RENDERER_CONTAINER_STYLES.selected,
        isPrimarySelection && RENDERER_CONTAINER_STYLES.primarySelected,
        isHovered && !isSelected && RENDERER_CONTAINER_STYLES.hovered,
        isDropTarget && RENDERER_CONTAINER_STYLES.dropTarget,
        className
      )}
      style={{
        marginLeft: depth > 0 ? 4 : 0,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      data-component-id={node.id}
      data-component-type={node.type}
      data-depth={depth}
      role="region"
      aria-label={`Padding wrapper: ${summary}`}
    >
      {/* Component label shown on hover */}
      <ComponentLabel type="Padding" />

      {/* Padding header with icon and info */}
      <div className="flex items-center gap-1.5 border-b border-purple-500/20 px-2 py-1.5">
        <BoxSelect className="h-3.5 w-3.5 text-purple-500/70" />
        <span className="text-[10px] font-medium tracking-wide text-purple-600/80 uppercase">
          Padding
        </span>

        {/* Padding summary */}
        <span className="text-muted-foreground ml-auto text-[9px]">
          {hasAnyPadding ? summary : "none"}
        </span>

        {/* Uniform indicator */}
        {hasAnyPadding && isUniformPadding(padding) && (
          <Square className="h-3 w-3 text-purple-400/60" />
        )}
      </div>

      {/* Content area with visual padding */}
      <div className="relative">
        {/* Padding edge indicators */}
        {hasAnyPadding && (
          <>
            <PaddingEdge
              side="top"
              value={padding.top}
              visualValue={visualPadding.top}
              showLabel={showMeasurements}
            />
            <PaddingEdge
              side="right"
              value={padding.right}
              visualValue={visualPadding.right}
              showLabel={showMeasurements}
            />
            <PaddingEdge
              side="bottom"
              value={padding.bottom}
              visualValue={visualPadding.bottom}
              showLabel={showMeasurements}
            />
            <PaddingEdge
              side="left"
              value={padding.left}
              visualValue={visualPadding.left}
              showLabel={showMeasurements}
            />
          </>
        )}

        {/* Content with padding applied */}
        <div
          className="relative"
          style={{
            paddingTop: hasAnyPadding ? visualPadding.top : 8,
            paddingRight: hasAnyPadding ? visualPadding.right : 8,
            paddingBottom: hasAnyPadding ? visualPadding.bottom : 8,
            paddingLeft: hasAnyPadding ? visualPadding.left : 8,
          }}
        >
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
                <EmptyContainerPlaceholder message="Drop a component to apply padding" />
              )}
            </>
          )}
        </div>
      </div>

      {/* Padding values indicator (shown when selected) */}
      {isSelected && hasAnyPadding && !isUniformPadding(padding) && (
        <div className="text-muted-foreground absolute right-0 -bottom-5 left-0 flex justify-center text-[8px]">
          <span className="rounded bg-purple-500/80 px-1.5 py-0.5 text-white">
            T:{padding.top} R:{padding.right} B:{padding.bottom} L:
            {padding.left}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Exports & Registration
// ============================================================================

export const PaddingRenderer = memo(PaddingRendererComponent);
PaddingRenderer.displayName = "PaddingRenderer";

// Self-register this renderer to avoid circular dependencies
registerRenderer(ComponentType.Padding, PaddingRenderer);

export default PaddingRenderer;
