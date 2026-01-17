/**
 * Column Renderer
 * Visual renderer for Column components in the canvas
 *
 * Features:
 * - Vertical stacking visualization
 * - Configurable spacing between children
 * - Selection state handling
 * - Drag and drop target
 * - Empty state placeholder
 * - Visual indicators for column properties
 */
"use client";

import React, { memo, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { RendererProps } from "./types";
import {
  RENDERER_CONTAINER_STYLES,
  COMPONENT_CATEGORY_COLORS,
  MIN_CONTAINER_SIZE,
} from "./types";
import {
  ChildRenderer,
  EmptyContainerPlaceholder,
  ComponentLabel,
} from "./ComponentRenderer";
import { registerRenderer } from "./registry";
import type { ColumnProperties } from "@/types/properties";
import { ComponentType } from "@/types/component";
import { Columns } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended props specific to Column renderer
 */
export interface ColumnRendererProps extends RendererProps {
  /** Override spacing value (for preview) */
  previewSpacing?: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Default spacing between column items in pixels (visual representation) */
const DEFAULT_VISUAL_SPACING = 4;

/** Maximum spacing to display (to prevent excessive gaps) */
const MAX_VISUAL_SPACING = 40;

/** Minimum column height when empty */
const MIN_COLUMN_HEIGHT = 60;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert points to pixels for visual representation
 * Using approximate conversion (1pt ≈ 1.33px at 96dpi)
 */
function pointsToPixels(points: number): number {
  return Math.round(points * 1.33);
}

/**
 * Get visual spacing from column properties
 */
function getVisualSpacing(properties: Record<string, unknown>): number {
  const spacing = (properties as ColumnProperties).spacing;
  if (typeof spacing === "number" && spacing > 0) {
    const visualSpacing = pointsToPixels(spacing);
    return Math.min(visualSpacing, MAX_VISUAL_SPACING);
  }
  return DEFAULT_VISUAL_SPACING;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Column Renderer Component
 * Renders a column container with vertical stacking of children
 */
function ColumnRendererComponent({
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
  previewSpacing,
}: ColumnRendererProps) {
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

  const hasChildren = node.children && node.children.length > 0;

  // Get spacing from properties or use override
  const visualSpacing = useMemo(() => {
    if (previewSpacing !== undefined) {
      return Math.min(pointsToPixels(previewSpacing), MAX_VISUAL_SPACING);
    }
    return getVisualSpacing(node.properties);
  }, [node.properties, previewSpacing]);

  // Get the spacing value in points for display
  const spacingInPoints = (node.properties as ColumnProperties).spacing;

  // ========================================
  // Render
  // ========================================

  return (
    <div
      className={cn(
        RENDERER_CONTAINER_STYLES.container,
        "rounded-sm border",
        COMPONENT_CATEGORY_COLORS.container,
        isSelected && RENDERER_CONTAINER_STYLES.selected,
        isPrimarySelection && RENDERER_CONTAINER_STYLES.primarySelected,
        isHovered && !isSelected && RENDERER_CONTAINER_STYLES.hovered,
        isDropTarget && RENDERER_CONTAINER_STYLES.dropTarget,
        className
      )}
      style={{
        minWidth: MIN_CONTAINER_SIZE.width,
        minHeight: hasChildren ? "auto" : MIN_COLUMN_HEIGHT,
        marginLeft: depth > 0 ? 4 : 0,
        padding: 8,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      data-component-id={node.id}
      data-component-type={node.type}
      data-depth={depth}
      role="region"
      aria-label={`Column container with ${node.children?.length ?? 0} children`}
    >
      {/* Component label shown on hover */}
      <ComponentLabel type="Column" />

      {/* Column header with icon and info */}
      <div className="mb-2 flex items-center gap-1.5 border-b border-blue-500/20 pb-1.5">
        <Columns className="h-3.5 w-3.5 text-blue-500/70" />
        <span className="text-[10px] font-medium tracking-wide text-blue-600/80 uppercase">
          Column
        </span>
        {spacingInPoints !== undefined && spacingInPoints > 0 && (
          <span className="text-muted-foreground ml-auto text-[9px]">
            spacing: {spacingInPoints}pt
          </span>
        )}
        {hasChildren && (
          <span className="text-muted-foreground bg-muted rounded px-1 text-[9px]">
            {node.children!.length} item{node.children!.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Children area */}
      {!hideChildren && (
        <div className="flex flex-col" style={{ gap: visualSpacing }}>
          {hasChildren ? (
            node.children!.map((child, index) => (
              <ColumnChildWrapper
                key={child.id}
                index={index}
                isLast={index === node.children!.length - 1}
              >
                {/* Recursive render of child using context-based ChildRenderer */}
                <ChildRenderer
                  node={child}
                  depth={depth + 1}
                  onClick={onClick}
                  onDoubleClick={onDoubleClick}
                  onContextMenu={onContextMenu}
                />
              </ColumnChildWrapper>
            ))
          ) : (
            <EmptyContainerPlaceholder message="Drop components to stack vertically" />
          )}
        </div>
      )}

      {/* Spacing indicator on hover */}
      {isSelected && visualSpacing > DEFAULT_VISUAL_SPACING && hasChildren && (
        <div className="absolute right-1 bottom-1 rounded bg-blue-500/90 px-1 py-0.5 text-[9px] text-white">
          ↕ {spacingInPoints ?? 0}pt
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Wrapper for column children with visual indicators
 */
const ColumnChildWrapper = memo(function ColumnChildWrapper({
  children,
  index,
  isLast: _isLast,
}: {
  children: React.ReactNode;
  index: number;
  isLast: boolean;
}) {
  return (
    <div className="relative" data-child-index={index}>
      {/* Index indicator for debugging (shown on hover) */}
      <span className="text-muted-foreground/40 absolute top-1/2 -left-4 -translate-y-1/2 text-[8px] opacity-0 transition-opacity group-hover:opacity-100">
        {index}
      </span>
      {children}
    </div>
  );
});

ColumnChildWrapper.displayName = "ColumnChildWrapper";

// ============================================================================
// Exports & Registration
// ============================================================================

export const ColumnRenderer = memo(ColumnRendererComponent);
ColumnRenderer.displayName = "ColumnRenderer";

// Self-register this renderer to avoid circular dependencies
registerRenderer(ComponentType.Column, ColumnRenderer);

export default ColumnRenderer;
