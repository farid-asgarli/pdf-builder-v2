/**
 * Alignment Renderer
 * Visual renderer for Alignment components in the canvas
 *
 * Features:
 * - Visual alignment guides showing 9 alignment positions (3x3 grid)
 * - Support for horizontal, vertical, and combined position alignment
 * - Interactive alignment visualization with position indicator
 * - Selection state handling
 * - Child content rendering with alignment applied
 * - Visual preview of content placement
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
import type { AlignmentProperties } from "@/types/properties";
import { ComponentType } from "@/types/component";
import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  Move,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended props specific to Alignment renderer
 */
export interface AlignmentRendererProps extends RendererProps {
  /** Override alignment values (for preview) */
  previewAlignment?: AlignmentProperties;
  /** Whether to show alignment grid */
  showAlignmentGrid?: boolean;
}

/**
 * Horizontal alignment values
 */
type HorizontalAlignment = "left" | "center" | "right" | "start" | "end";

/**
 * Vertical alignment values
 */
type VerticalAlignment = "top" | "middle" | "bottom";

/**
 * Resolved alignment values
 */
interface ResolvedAlignment {
  horizontal: HorizontalAlignment | null;
  vertical: VerticalAlignment | null;
}

/**
 * Position preset type
 */
type AlignmentPosition =
  | "topLeft"
  | "topCenter"
  | "topRight"
  | "middleLeft"
  | "middleCenter"
  | "middleRight"
  | "bottomLeft"
  | "bottomCenter"
  | "bottomRight";

// ============================================================================
// Constants
// ============================================================================

/** Position presets mapping to horizontal/vertical values */
const POSITION_PRESETS: Record<
  AlignmentPosition,
  { horizontal: HorizontalAlignment; vertical: VerticalAlignment }
> = {
  topLeft: { horizontal: "left", vertical: "top" },
  topCenter: { horizontal: "center", vertical: "top" },
  topRight: { horizontal: "right", vertical: "top" },
  middleLeft: { horizontal: "left", vertical: "middle" },
  middleCenter: { horizontal: "center", vertical: "middle" },
  middleRight: { horizontal: "right", vertical: "middle" },
  bottomLeft: { horizontal: "left", vertical: "bottom" },
  bottomCenter: { horizontal: "center", vertical: "bottom" },
  bottomRight: { horizontal: "right", vertical: "bottom" },
};

/** Display names for alignment values */
const HORIZONTAL_DISPLAY: Record<HorizontalAlignment, string> = {
  left: "Left",
  center: "Center",
  right: "Right",
  start: "Start",
  end: "End",
};

const VERTICAL_DISPLAY: Record<VerticalAlignment, string> = {
  top: "Top",
  middle: "Middle",
  bottom: "Bottom",
};

/** Grid cell size */
const GRID_CELL_SIZE = 20;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolve alignment properties into horizontal and vertical values
 * Position shorthand takes precedence over individual properties
 */
function resolveAlignment(properties: AlignmentProperties): ResolvedAlignment {
  // Position shorthand overrides individual properties
  if (properties.position && properties.position in POSITION_PRESETS) {
    const preset = POSITION_PRESETS[properties.position as AlignmentPosition];
    return {
      horizontal: preset.horizontal,
      vertical: preset.vertical,
    };
  }

  return {
    horizontal: (properties.horizontal as HorizontalAlignment) ?? null,
    vertical: (properties.vertical as VerticalAlignment) ?? null,
  };
}

/**
 * Get grid position (0-2) from alignment value
 */
function getGridPosition(alignment: ResolvedAlignment): {
  col: number;
  row: number;
} {
  let col = 1; // Default to center
  let row = 1; // Default to middle

  if (alignment.horizontal === "left" || alignment.horizontal === "start") {
    col = 0;
  } else if (
    alignment.horizontal === "right" ||
    alignment.horizontal === "end"
  ) {
    col = 2;
  }

  if (alignment.vertical === "top") {
    row = 0;
  } else if (alignment.vertical === "bottom") {
    row = 2;
  }

  return { col, row };
}

/**
 * Get summary text for alignment configuration
 */
function getAlignmentSummary(alignment: ResolvedAlignment): string {
  const parts: string[] = [];

  if (alignment.vertical) {
    parts.push(VERTICAL_DISPLAY[alignment.vertical]);
  }

  if (alignment.horizontal) {
    parts.push(HORIZONTAL_DISPLAY[alignment.horizontal]);
  }

  return parts.length > 0 ? parts.join(" ") : "none";
}

/**
 * Check if any alignment is applied
 */
function hasAlignment(alignment: ResolvedAlignment): boolean {
  return alignment.horizontal !== null || alignment.vertical !== null;
}

/**
 * Get CSS flexbox justify-content value
 */
function getJustifyContent(
  horizontal: HorizontalAlignment | null
): React.CSSProperties["justifyContent"] {
  switch (horizontal) {
    case "left":
    case "start":
      return "flex-start";
    case "center":
      return "center";
    case "right":
    case "end":
      return "flex-end";
    default:
      return "flex-start";
  }
}

/**
 * Get CSS flexbox align-items value
 */
function getAlignItems(
  vertical: VerticalAlignment | null
): React.CSSProperties["alignItems"] {
  switch (vertical) {
    case "top":
      return "flex-start";
    case "middle":
      return "center";
    case "bottom":
      return "flex-end";
    default:
      return "flex-start";
  }
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Alignment grid visualization component
 * Shows a 3x3 grid with the current alignment position highlighted
 */
const AlignmentGrid = memo(function AlignmentGrid({
  alignment,
  isVisible,
}: {
  alignment: ResolvedAlignment;
  isVisible: boolean;
}) {
  const { col, row } = getGridPosition(alignment);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-2 right-2 grid grid-cols-3 gap-0.5 rounded bg-orange-100/50 p-1",
        "opacity-0 transition-opacity group-hover:opacity-100"
      )}
      style={{
        width: GRID_CELL_SIZE * 3 + 8,
        height: GRID_CELL_SIZE * 3 + 8,
      }}
      aria-hidden="true"
    >
      {Array.from({ length: 9 }).map((_, index) => {
        const cellCol = index % 3;
        const cellRow = Math.floor(index / 3);
        const isActive = cellCol === col && cellRow === row;

        return (
          <div
            key={index}
            className={cn(
              "rounded-sm border transition-colors",
              isActive
                ? "border-orange-500 bg-orange-500/30"
                : "border-orange-300/50 bg-orange-200/20"
            )}
            style={{
              width: GRID_CELL_SIZE,
              height: GRID_CELL_SIZE,
            }}
          >
            {isActive && (
              <div className="flex h-full w-full items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-orange-500" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
});

AlignmentGrid.displayName = "AlignmentGrid";

/**
 * Alignment icon component for the header
 */
const AlignmentIcon = memo(function AlignmentIcon({
  alignment,
}: {
  alignment: ResolvedAlignment;
}) {
  if (alignment.horizontal && alignment.vertical) {
    return <Move className="h-3.5 w-3.5 text-orange-500/70" />;
  }
  if (alignment.horizontal) {
    return (
      <AlignHorizontalJustifyCenter className="h-3.5 w-3.5 text-orange-500/70" />
    );
  }
  if (alignment.vertical) {
    return (
      <AlignVerticalJustifyCenter className="h-3.5 w-3.5 text-orange-500/70" />
    );
  }
  return <Move className="h-3.5 w-3.5 text-orange-500/50" />;
});

AlignmentIcon.displayName = "AlignmentIcon";

/**
 * Visual alignment guide lines component
 * Shows dashed lines indicating alignment position
 */
const AlignmentGuideLines = memo(function AlignmentGuideLines({
  alignment,
  isVisible,
}: {
  alignment: ResolvedAlignment;
  isVisible: boolean;
}) {
  if (!isVisible || !hasAlignment(alignment)) return null;

  const showVerticalLine = alignment.horizontal !== null;
  const showHorizontalLine = alignment.vertical !== null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Vertical alignment line */}
      {showVerticalLine && (
        <div
          className={cn(
            "absolute top-0 bottom-0 w-px border-l border-dashed border-orange-400/60",
            "opacity-0 transition-opacity group-hover:opacity-100"
          )}
          style={{
            left:
              alignment.horizontal === "left" ||
              alignment.horizontal === "start"
                ? "0"
                : alignment.horizontal === "center"
                  ? "50%"
                  : "calc(100% - 1px)",
          }}
        />
      )}

      {/* Horizontal alignment line */}
      {showHorizontalLine && (
        <div
          className={cn(
            "absolute right-0 left-0 h-px border-t border-dashed border-orange-400/60",
            "opacity-0 transition-opacity group-hover:opacity-100"
          )}
          style={{
            top:
              alignment.vertical === "top"
                ? "0"
                : alignment.vertical === "middle"
                  ? "50%"
                  : "calc(100% - 1px)",
          }}
        />
      )}

      {/* Intersection dot */}
      {showVerticalLine && showHorizontalLine && (
        <div
          className={cn(
            "absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-orange-500 bg-orange-200",
            "opacity-0 transition-opacity group-hover:opacity-100"
          )}
          style={{
            left:
              alignment.horizontal === "left" ||
              alignment.horizontal === "start"
                ? "0"
                : alignment.horizontal === "center"
                  ? "50%"
                  : "100%",
            top:
              alignment.vertical === "top"
                ? "0"
                : alignment.vertical === "middle"
                  ? "50%"
                  : "100%",
          }}
        />
      )}
    </div>
  );
});

AlignmentGuideLines.displayName = "AlignmentGuideLines";

// ============================================================================
// Component
// ============================================================================

/**
 * Alignment Renderer Component
 * Renders an alignment wrapper component with visual alignment guides
 */
function AlignmentRendererComponent({
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
  previewAlignment,
  showAlignmentGrid = true,
}: AlignmentRendererProps) {
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
    previewAlignment ?? (node.properties as AlignmentProperties);

  // Resolve alignment values
  const alignment = useMemo(() => resolveAlignment(properties), [properties]);

  const hasAnyAlignment = hasAlignment(alignment);
  const summary = getAlignmentSummary(alignment);
  const hasChild = node.child !== undefined;

  // CSS for the content wrapper to demonstrate alignment
  const contentWrapperStyle: React.CSSProperties = useMemo(
    () => ({
      display: "flex",
      justifyContent: getJustifyContent(alignment.horizontal),
      alignItems: getAlignItems(alignment.vertical),
      minHeight: 60,
      width: "100%",
    }),
    [alignment]
  );

  // ========================================
  // Render
  // ========================================

  return (
    <div
      className={cn(
        RENDERER_CONTAINER_STYLES.container,
        "group relative",
        COMPONENT_CATEGORY_COLORS.sizing,
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
      aria-label={`Alignment wrapper: ${summary}`}
    >
      {/* Component label shown on hover */}
      <ComponentLabel type="Alignment" />

      {/* Header with icon and info */}
      <div className="flex items-center gap-1.5 border-b border-orange-500/20 px-2 py-1.5">
        <AlignmentIcon alignment={alignment} />
        <span className="text-[10px] font-medium tracking-wide text-orange-600/80 uppercase">
          Align
        </span>

        {/* Alignment summary */}
        <span className="text-muted-foreground ml-auto text-[9px]">
          {summary}
        </span>
      </div>

      {/* Content area with visual alignment */}
      <div className="relative p-2">
        {/* Alignment grid visualization (shown on hover) */}
        {showAlignmentGrid && hasAnyAlignment && (
          <AlignmentGrid alignment={alignment} isVisible />
        )}

        {/* Alignment guide lines (shown on hover) */}
        <AlignmentGuideLines alignment={alignment} isVisible />

        {/* Content with alignment applied */}
        {!hideChildren && (
          <div style={contentWrapperStyle}>
            {hasChild ? (
              <ChildRenderer
                node={node.child!}
                depth={depth + 1}
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                onContextMenu={onContextMenu}
              />
            ) : (
              <EmptyContainerPlaceholder message="Drop a component to align" />
            )}
          </div>
        )}
      </div>

      {/* Alignment details indicator (shown when selected) */}
      {isSelected && hasAnyAlignment && (
        <div className="text-muted-foreground absolute right-0 -bottom-5 left-0 flex justify-center text-[8px]">
          <span className="flex items-center gap-1 rounded bg-orange-500/80 px-1.5 py-0.5 text-white">
            {alignment.vertical && (
              <span>V: {VERTICAL_DISPLAY[alignment.vertical]}</span>
            )}
            {alignment.vertical && alignment.horizontal && <span>|</span>}
            {alignment.horizontal && (
              <span>H: {HORIZONTAL_DISPLAY[alignment.horizontal]}</span>
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

export const AlignmentRenderer = memo(AlignmentRendererComponent);
AlignmentRenderer.displayName = "AlignmentRenderer";

// Self-register this renderer to avoid circular dependencies
registerRenderer(ComponentType.Alignment, AlignmentRenderer);

export default AlignmentRenderer;
