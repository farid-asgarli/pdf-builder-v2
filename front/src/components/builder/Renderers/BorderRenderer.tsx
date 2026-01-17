/**
 * Border Renderer
 * Visual renderer for Border components in the canvas
 *
 * Features:
 * - Visual border indicators on all sides
 * - Support for all border modes: all sides, individual sides
 * - Interactive border visualization with thickness labels
 * - Selection state handling
 * - Child content rendering with border applied
 * - Visual guides showing border styles and colors
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
import type { BorderProperties } from "@/types/properties";
import { ComponentType } from "@/types/component";
import { Frame, Square } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended props specific to Border renderer
 */
export interface BorderRendererProps extends RendererProps {
  /** Override border values (for preview) */
  previewBorder?: BorderProperties;
  /** Whether to show measurement labels */
  showMeasurements?: boolean;
}

/**
 * Resolved border values for each side
 */
interface ResolvedBorder {
  top: number;
  right: number;
  bottom: number;
  left: number;
  color: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Default border thickness */
const DEFAULT_BORDER_THICKNESS = 1;

/** Default border color */
const DEFAULT_BORDER_COLOR = "#000000";

/** Minimum visual border for display */
const MIN_VISUAL_BORDER = 1;

/** Maximum visual border to prevent excessive display sizes */
const MAX_VISUAL_BORDER = 20;

/** Scale factor for converting points to visual pixels */
const POINTS_TO_PIXELS = 1.33;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolve border properties into individual side values
 * Individual sides take precedence over uniform thickness
 */
function resolveBorder(properties: BorderProperties): ResolvedBorder {
  const thickness = properties.thickness ?? DEFAULT_BORDER_THICKNESS;
  const color = properties.color ?? DEFAULT_BORDER_COLOR;

  return {
    top: properties.top ?? thickness,
    right: properties.right ?? thickness,
    bottom: properties.bottom ?? thickness,
    left: properties.left ?? thickness,
    color,
  };
}

/**
 * Convert points to visual pixels with constraints
 */
function pointsToVisualPixels(points: number): number {
  if (points === 0) return 0;
  const pixels = Math.round(points * POINTS_TO_PIXELS);
  return Math.min(Math.max(pixels, MIN_VISUAL_BORDER), MAX_VISUAL_BORDER);
}

/**
 * Check if all border values are equal
 */
function isUniformBorder(border: ResolvedBorder): boolean {
  return (
    border.top === border.right &&
    border.right === border.bottom &&
    border.bottom === border.left
  );
}

/**
 * Format border value for display
 */
function formatBorderValue(value: number): string {
  return value === 0 ? "0" : `${value}pt`;
}

/**
 * Get summary text for border configuration
 */
function getBorderSummary(border: ResolvedBorder): string {
  if (!hasBorder(border)) {
    return "none";
  }

  if (isUniformBorder(border)) {
    return `${border.top}pt`;
  }

  // Show all four values
  return `${border.top} ${border.right} ${border.bottom} ${border.left}`;
}

/**
 * Check if any border is applied
 */
function hasBorder(border: ResolvedBorder): boolean {
  return (
    border.top > 0 || border.right > 0 || border.bottom > 0 || border.left > 0
  );
}

/**
 * Format hex color for display (truncate if too long)
 */
function formatColorDisplay(color: string): string {
  if (color.length > 9) {
    return color.substring(0, 9) + "…";
  }
  return color;
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Border thickness label component
 */
const BorderLabel = memo(function BorderLabel({
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
      {formatBorderValue(value)}
    </span>
  );
});

BorderLabel.displayName = "BorderLabel";

/**
 * Color swatch component
 */
const ColorSwatch = memo(function ColorSwatch({
  color,
  size = "sm",
}: {
  color: string;
  size?: "sm" | "md";
}) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
  };

  return (
    <span
      className={cn(
        "inline-block rounded-sm border border-white/30 shadow-sm",
        sizeClasses[size]
      )}
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
});

ColorSwatch.displayName = "ColorSwatch";

// ============================================================================
// Component
// ============================================================================

/**
 * Border Renderer Component
 * Renders a border wrapper component with visual border indicators
 */
function BorderRendererComponent({
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
  previewBorder,
  showMeasurements = true,
}: BorderRendererProps) {
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

  const properties = previewBorder ?? (node.properties as BorderProperties);

  // Resolve border values
  const border = useMemo(() => resolveBorder(properties), [properties]);

  // Convert to visual pixels
  const visualBorder = useMemo(
    () => ({
      top: pointsToVisualPixels(border.top),
      right: pointsToVisualPixels(border.right),
      bottom: pointsToVisualPixels(border.bottom),
      left: pointsToVisualPixels(border.left),
    }),
    [border]
  );

  const hasAnyBorder = hasBorder(border);
  const summary = getBorderSummary(border);
  const hasChild = node.child !== undefined;

  // ========================================
  // Render
  // ========================================

  return (
    <div
      className={cn(
        RENDERER_CONTAINER_STYLES.container,
        "group relative rounded",
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
      aria-label={`Border wrapper: ${summary}`}
    >
      {/* Component label shown on hover */}
      <ComponentLabel type="Border" />

      {/* Border header with icon and info */}
      <div className="flex items-center gap-1.5 border-b border-purple-500/20 px-2 py-1.5">
        <Frame className="h-3.5 w-3.5 text-purple-500/70" />
        <span className="text-[10px] font-medium tracking-wide text-purple-600/80 uppercase">
          Border
        </span>

        {/* Border color swatch */}
        {hasAnyBorder && <ColorSwatch color={border.color} />}

        {/* Border summary */}
        <span className="text-muted-foreground ml-auto text-[9px]">
          {hasAnyBorder ? summary : "none"}
        </span>

        {/* Uniform indicator */}
        {hasAnyBorder && isUniformBorder(border) && (
          <Square className="h-3 w-3 text-purple-400/60" />
        )}
      </div>

      {/* Content area with visual border */}
      <div
        className="relative p-2"
        style={{
          // Apply visual border to content area
          borderTopWidth: visualBorder.top,
          borderRightWidth: visualBorder.right,
          borderBottomWidth: visualBorder.bottom,
          borderLeftWidth: visualBorder.left,
          borderStyle: hasAnyBorder ? "solid" : "none",
          borderColor: hasAnyBorder ? border.color : "transparent",
        }}
      >
        {/* Border measurement labels (shown on hover) */}
        {showMeasurements && hasAnyBorder && (
          <div className="pointer-events-none absolute inset-0">
            {border.top > 0 && (
              <span
                className={cn(
                  "absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[calc(100%+2px)]",
                  "rounded bg-purple-500/80 px-1 py-0.5 text-[8px] font-medium text-white",
                  "opacity-0 transition-opacity group-hover:opacity-100"
                )}
              >
                {formatBorderValue(border.top)}
              </span>
            )}
            {border.bottom > 0 && (
              <span
                className={cn(
                  "absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[calc(100%+2px)]",
                  "rounded bg-purple-500/80 px-1 py-0.5 text-[8px] font-medium text-white",
                  "opacity-0 transition-opacity group-hover:opacity-100"
                )}
              >
                {formatBorderValue(border.bottom)}
              </span>
            )}
            {border.left > 0 && (
              <span
                className={cn(
                  "absolute top-1/2 left-0 -translate-x-[calc(100%+2px)] -translate-y-1/2",
                  "rounded bg-purple-500/80 px-1 py-0.5 text-[8px] font-medium text-white",
                  "opacity-0 transition-opacity group-hover:opacity-100"
                )}
              >
                {formatBorderValue(border.left)}
              </span>
            )}
            {border.right > 0 && (
              <span
                className={cn(
                  "absolute top-1/2 right-0 translate-x-[calc(100%+2px)] -translate-y-1/2",
                  "rounded bg-purple-500/80 px-1 py-0.5 text-[8px] font-medium text-white",
                  "opacity-0 transition-opacity group-hover:opacity-100"
                )}
              >
                {formatBorderValue(border.right)}
              </span>
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
              <EmptyContainerPlaceholder message="Drop a component to apply border" />
            )}
          </>
        )}
      </div>

      {/* Border details indicator (shown when selected) */}
      {isSelected && hasAnyBorder && (
        <div className="text-muted-foreground absolute right-0 -bottom-5 left-0 flex justify-center text-[8px]">
          <span className="flex items-center gap-1 rounded bg-purple-500/80 px-1.5 py-0.5 text-white">
            <ColorSwatch color={border.color} size="sm" />
            {!isUniformBorder(border) && (
              <span>
                T:{border.top} R:{border.right} B:{border.bottom} L:
                {border.left}
              </span>
            )}
            {isUniformBorder(border) && (
              <span>{formatColorDisplay(border.color)}</span>
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

export const BorderRenderer = memo(BorderRendererComponent);
BorderRenderer.displayName = "BorderRenderer";

// Self-register this renderer to avoid circular dependencies
registerRenderer(ComponentType.Border, BorderRenderer);

export default BorderRenderer;
