/**
 * Line Renderer
 * Visual renderer for Line components in the canvas
 *
 * Features:
 * - Horizontal and vertical line visualization
 * - Configurable thickness and color
 * - Selection state handling
 * - Visual distinction between orientations
 */
"use client";

import React, { memo, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { RendererProps } from "./types";
import { RENDERER_CONTAINER_STYLES, COMPONENT_CATEGORY_COLORS } from "./types";
import { ComponentLabel } from "./ComponentRenderer";
import { registerRenderer } from "./registry";
import type { LineProperties } from "@/types/properties";
import { ComponentType } from "@/types/component";
import { Minus, SeparatorVertical } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended props specific to Line renderer
 */
export interface LineRendererProps extends RendererProps {
  /** Override line properties (for preview purposes) */
  overrideProperties?: Partial<LineProperties>;
}

// ============================================================================
// Constants
// ============================================================================

/** Default line thickness in pixels */
const DEFAULT_THICKNESS = 1;

/** Default line color */
const DEFAULT_COLOR = "#000000";

/** Minimum length for line display in canvas */
const MIN_LINE_LENGTH = 40;

/** Padding around the line for easier selection */
const LINE_PADDING = 8;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the effective line properties with defaults
 */
function getEffectiveProperties(
  nodeProperties: Record<string, unknown> | undefined,
  overrideProperties?: Partial<LineProperties>
): LineProperties {
  const props = (nodeProperties || {}) as Partial<LineProperties>;

  return {
    orientation:
      overrideProperties?.orientation ?? props.orientation ?? "horizontal",
    thickness:
      overrideProperties?.thickness ?? props.thickness ?? DEFAULT_THICKNESS,
    color: overrideProperties?.color ?? props.color ?? DEFAULT_COLOR,
  };
}

/**
 * Calculate line container dimensions based on orientation
 */
function getLineDimensions(
  orientation: "horizontal" | "vertical",
  thickness: number
): { width: string; height: string; minWidth?: string; minHeight?: string } {
  if (orientation === "horizontal") {
    return {
      width: "100%",
      height: `${Math.max(thickness, 1) + LINE_PADDING * 2}px`,
      minWidth: `${MIN_LINE_LENGTH}px`,
    };
  } else {
    return {
      width: `${Math.max(thickness, 1) + LINE_PADDING * 2}px`,
      height: "100%",
      minHeight: `${MIN_LINE_LENGTH}px`,
    };
  }
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * The actual line element
 */
const LineElement = memo(function LineElement({
  orientation,
  thickness,
  color,
}: {
  orientation: "horizontal" | "vertical";
  thickness: number;
  color: string;
}) {
  const isHorizontal = orientation === "horizontal";

  return (
    <div
      className="absolute"
      style={{
        backgroundColor: color,
        ...(isHorizontal
          ? {
              left: 0,
              right: 0,
              top: "50%",
              height: `${Math.max(thickness, 0.5)}px`,
              transform: "translateY(-50%)",
            }
          : {
              top: 0,
              bottom: 0,
              left: "50%",
              width: `${Math.max(thickness, 0.5)}px`,
              transform: "translateX(-50%)",
            }),
      }}
    />
  );
});

LineElement.displayName = "LineElement";

/**
 * Orientation indicator badge
 */
const OrientationBadge = memo(function OrientationBadge({
  orientation,
}: {
  orientation: "horizontal" | "vertical";
}) {
  const isHorizontal = orientation === "horizontal";
  const Icon = isHorizontal ? Minus : SeparatorVertical;

  return (
    <div
      className={cn(
        "absolute flex items-center gap-1 rounded px-1 py-0.5",
        "bg-green-500/10 text-[9px] text-green-600",
        isHorizontal ? "-top-5 left-0" : "top-0 -left-5"
      )}
    >
      <Icon className="h-3 w-3" />
      <span className="capitalize">{orientation}</span>
    </div>
  );
});

OrientationBadge.displayName = "OrientationBadge";

/**
 * Line properties display (thickness & color)
 */
const LinePropertiesDisplay = memo(function LinePropertiesDisplay({
  thickness,
  color,
}: {
  thickness: number;
  color: string;
}) {
  return (
    <div className="absolute -bottom-5 left-0 flex items-center gap-2 text-[9px]">
      <span className="text-muted-foreground">{thickness}px</span>
      <div
        className="h-3 w-3 rounded border border-gray-300"
        style={{ backgroundColor: color }}
        title={color}
      />
    </div>
  );
});

LinePropertiesDisplay.displayName = "LinePropertiesDisplay";

// ============================================================================
// Main Component
// ============================================================================

/**
 * Line Renderer Component
 * Renders a visual representation of a Line component in the canvas
 */
export const LineRenderer = memo(function LineRenderer({
  node,
  depth,
  isSelected,
  isPrimarySelection,
  isHovered,
  isDropTarget,
  onClick,
  onContextMenu,
  className,
  overrideProperties,
}: LineRendererProps) {
  // Get effective properties
  const effectiveProps = useMemo(
    () => getEffectiveProperties(node.properties, overrideProperties),
    [node.properties, overrideProperties]
  );

  const { orientation, thickness, color } = effectiveProps;

  // Calculate container dimensions
  const dimensions = useMemo(
    () =>
      getLineDimensions(
        orientation ?? "horizontal",
        thickness ?? DEFAULT_THICKNESS
      ),
    [orientation, thickness]
  );

  // Event handlers
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClick?.(e, node.id);
    },
    [onClick, node.id]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu?.(e, node.id);
    },
    [onContextMenu, node.id]
  );

  const isHorizontal = orientation === "horizontal";

  return (
    <div
      className={cn(
        RENDERER_CONTAINER_STYLES.container,
        COMPONENT_CATEGORY_COLORS.content,
        "relative flex items-center justify-center border border-green-500/30",
        isHorizontal ? "w-full" : "h-full",
        isSelected && RENDERER_CONTAINER_STYLES.selected,
        isPrimarySelection && RENDERER_CONTAINER_STYLES.primarySelected,
        isHovered && !isSelected && RENDERER_CONTAINER_STYLES.hovered,
        isDropTarget && RENDERER_CONTAINER_STYLES.dropTarget,
        className
      )}
      style={{
        ...dimensions,
        marginLeft: depth > 0 ? 4 : 0,
      }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      data-component-type={node.type}
      data-component-id={node.id}
      role="button"
      tabIndex={0}
      aria-label={`Line component: ${orientation} line, ${thickness}px thick`}
    >
      {/* Component label */}
      <ComponentLabel type={ComponentType.Line} />

      {/* The actual line element */}
      <LineElement
        orientation={orientation ?? "horizontal"}
        thickness={thickness ?? DEFAULT_THICKNESS}
        color={color ?? DEFAULT_COLOR}
      />

      {/* Show orientation badge when selected or hovered */}
      {(isSelected || isHovered) && (
        <OrientationBadge orientation={orientation ?? "horizontal"} />
      )}

      {/* Show properties display when selected */}
      {isSelected && (
        <LinePropertiesDisplay
          thickness={thickness ?? DEFAULT_THICKNESS}
          color={color ?? DEFAULT_COLOR}
        />
      )}
    </div>
  );
});

LineRenderer.displayName = "LineRenderer";

// ============================================================================
// Registration
// ============================================================================

// Self-register with the renderer registry
registerRenderer(ComponentType.Line, LineRenderer);
