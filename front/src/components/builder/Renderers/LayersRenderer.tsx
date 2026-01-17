/**
 * Layers Renderer
 * Visual renderer for Layers components in the canvas
 *
 * Features:
 * - Visual stacking/layer representation
 * - Primary layer indication
 * - Z-order visualization (layer numbering)
 * - Selection state handling
 * - Drag and drop target
 * - Empty state placeholder
 * - Layer opacity indicators
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
import { ComponentType } from "@/types/component";
import { Layers, Star } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Extended props specific to Layers renderer
 */
export interface LayersRendererProps extends RendererProps {
  /** Override to show all layers as expanded */
  expandAllLayers?: boolean;
}

/**
 * Layer information for visualization
 */
interface LayerInfo {
  index: number;
  isPrimary: boolean;
  label: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Minimum height for the layers container when empty */
const MIN_LAYERS_HEIGHT = 80;

/** Visual offset for each layer (to create stacking effect) */
const LAYER_VISUAL_OFFSET = 4;

/** Max layers before simplified visualization */
const MAX_VISIBLE_LAYER_OFFSET = 8;

/** Layer color configuration */
interface LayerColors {
  border: string;
  bg: string;
  badge: string;
  glow: string;
}

/** Layer type badge colors */
const LAYER_COLORS: Record<
  "primary" | "background" | "foreground",
  LayerColors
> = {
  primary: {
    border: "border-yellow-500/50",
    bg: "bg-yellow-500/10",
    badge: "bg-yellow-500 text-yellow-950",
    glow: "shadow-yellow-500/20",
  },
  background: {
    border: "border-slate-400/40",
    bg: "bg-slate-400/5",
    badge: "bg-slate-500 text-white",
    glow: "",
  },
  foreground: {
    border: "border-indigo-400/40",
    bg: "bg-indigo-400/5",
    badge: "bg-indigo-500 text-white",
    glow: "",
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Find the primary layer index from children
 */
function findPrimaryLayerIndex(
  children: RendererProps["node"]["children"]
): number {
  if (!children || children.length === 0) return -1;

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (
      child.properties &&
      (child.properties as Record<string, unknown>).isPrimary === true
    ) {
      return i;
    }
  }

  return -1;
}

/**
 * Get layer type based on position relative to primary
 */
function getLayerType(
  index: number,
  primaryIndex: number
): "primary" | "background" | "foreground" {
  if (index === primaryIndex || (primaryIndex === -1 && index === 0)) {
    return "primary";
  }
  // If no explicit primary, first is primary, rest are foreground
  if (primaryIndex === -1) {
    return "foreground";
  }
  // Layers before primary are background, after are foreground
  return index < primaryIndex ? "background" : "foreground";
}

/**
 * Generate layer info for each child
 */
function getLayerInfos(
  children: RendererProps["node"]["children"]
): LayerInfo[] {
  if (!children || children.length === 0) return [];

  const primaryIndex = findPrimaryLayerIndex(children);

  return children.map((_, index) => {
    const type = getLayerType(index, primaryIndex);
    const isPrimary = type === "primary";

    let label: string;
    if (isPrimary) {
      label = "Primary";
    } else if (type === "background") {
      label = `BG ${index + 1}`;
    } else {
      label = `FG ${index + 1}`;
    }

    return {
      index,
      isPrimary,
      label,
    };
  });
}

// ============================================================================
// Component
// ============================================================================

/**
 * Layers Renderer Component
 * Renders a layers container with visual stacking representation
 */
function LayersRendererComponent({
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
  expandAllLayers: _expandAllLayers = false,
}: LayersRendererProps) {
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
  const layerCount = node.children?.length ?? 0;

  // Get layer information for all children
  const layerInfos = useMemo(
    () => getLayerInfos(node.children),
    [node.children]
  );

  // Check if there's a valid primary layer
  const primaryLayerIndex = useMemo(
    () => findPrimaryLayerIndex(node.children),
    [node.children]
  );
  const hasPrimaryLayer = primaryLayerIndex >= 0;

  // Calculate visual offset for stacking effect (limited to prevent overflow)
  const visualOffset = useMemo(() => {
    const count = Math.min(layerCount, MAX_VISIBLE_LAYER_OFFSET);
    return count * LAYER_VISUAL_OFFSET;
  }, [layerCount]);

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
        minHeight: hasChildren ? "auto" : MIN_LAYERS_HEIGHT,
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
      aria-label={`Layers container with ${layerCount} layers`}
    >
      {/* Component label shown on hover */}
      <ComponentLabel type="Layers" />

      {/* Layers header with icon and info */}
      <div className="mb-2 flex items-center gap-1.5 border-b border-blue-500/20 pb-1.5">
        <Layers className="h-3.5 w-3.5 text-blue-500/70" />
        <span className="text-[10px] font-medium tracking-wide text-blue-600/80 uppercase">
          Layers
        </span>

        {/* Warning if no primary layer set explicitly */}
        {hasChildren && !hasPrimaryLayer && (
          <span
            className="ml-1 rounded bg-amber-100 px-1 text-[9px] text-amber-600 dark:bg-amber-900/30"
            title="First layer will be used as primary. Set isPrimary=true on a child to specify."
          >
            No primary set
          </span>
        )}

        {hasChildren && (
          <span className="text-muted-foreground bg-muted ml-auto rounded px-1 text-[9px]">
            {layerCount} layer{layerCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Layers visualization area */}
      {!hideChildren && (
        <div className="relative">
          {hasChildren ? (
            <div
              className="relative"
              style={{
                // Add extra padding on bottom-right for stacking visual effect
                paddingRight: visualOffset,
                paddingBottom: visualOffset,
              }}
            >
              {/* Stacked layer cards */}
              {node.children!.map((child, index) => {
                const layerInfo = layerInfos[index];
                const layerType = getLayerType(
                  index,
                  primaryLayerIndex === -1 ? 0 : primaryLayerIndex
                );
                const colors = LAYER_COLORS[layerType];

                return (
                  <LayerCard
                    key={child.id}
                    layerInfo={layerInfo}
                    layerType={layerType}
                    colors={colors}
                    isLast={index === layerCount - 1}
                    totalLayers={layerCount}
                  >
                    <ChildRenderer
                      node={child}
                      depth={depth + 1}
                      onClick={onClick}
                      onDoubleClick={onDoubleClick}
                      onContextMenu={onContextMenu}
                    />
                  </LayerCard>
                );
              })}
            </div>
          ) : (
            <EmptyContainerPlaceholder message="Drop components to create stacked layers. First child is primary by default." />
          )}
        </div>
      )}

      {/* Z-index legend when selected and has multiple layers */}
      {isSelected && layerCount > 1 && (
        <div className="mt-2 flex items-center gap-2 border-t border-blue-500/20 pt-2 text-[9px]">
          <span className="text-muted-foreground">Draw order:</span>
          <span className="text-slate-500">BG (bottom)</span>
          <span className="text-muted-foreground">→</span>
          <span className="flex items-center gap-0.5 font-medium text-yellow-600">
            <Star className="h-2.5 w-2.5" />
            Primary
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="text-indigo-500">FG (top)</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Individual layer card within the Layers container
 * Provides visual stacking effect and layer type indication
 */
interface LayerCardProps {
  children: React.ReactNode;
  layerInfo: LayerInfo;
  layerType: "primary" | "background" | "foreground";
  colors: LayerColors;
  isLast: boolean;
  totalLayers: number;
}

const LayerCard = memo(function LayerCard({
  children,
  layerInfo,
  layerType,
  colors,
  isLast,
  totalLayers,
}: LayerCardProps) {
  // Only show visual stacking offset for non-last items
  const shouldShowOffset = !isLast && totalLayers > 1;

  return (
    <div
      className={cn(
        "relative rounded-sm border transition-all",
        colors.border,
        colors.bg,
        layerInfo.isPrimary && "ring-1 ring-yellow-500/30",
        layerInfo.isPrimary && colors.glow && "shadow-sm"
      )}
      style={{
        // Create visual stacking effect
        marginBottom: shouldShowOffset ? LAYER_VISUAL_OFFSET : 0,
        zIndex: layerInfo.index + 1,
      }}
      data-layer-index={layerInfo.index}
      data-layer-type={layerType}
      data-is-primary={layerInfo.isPrimary}
    >
      {/* Layer badge */}
      <div className="absolute -top-2.5 left-2 z-10 flex items-center gap-1">
        <span
          className={cn(
            "rounded-sm px-1.5 py-0.5 text-[8px] font-semibold shadow-sm",
            colors.badge
          )}
        >
          {layerInfo.isPrimary && (
            <Star
              className="-mt-0.5 mr-0.5 inline h-2 w-2"
              fill="currentColor"
            />
          )}
          {layerInfo.label}
        </span>
        <span className="text-muted-foreground text-[8px]">
          z:{layerInfo.index}
        </span>
      </div>

      {/* Layer content */}
      <div className="px-1 pt-3 pb-1">{children}</div>

      {/* Visual stacking shadow effect for multiple layers */}
      {shouldShowOffset && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 rounded-sm border opacity-30",
            colors.border
          )}
          style={{
            transform: `translate(${LAYER_VISUAL_OFFSET}px, ${LAYER_VISUAL_OFFSET}px)`,
            zIndex: -1,
          }}
        />
      )}
    </div>
  );
});

LayerCard.displayName = "LayerCard";

// ============================================================================
// Exports & Registration
// ============================================================================

export const LayersRenderer = memo(LayersRendererComponent);
LayersRenderer.displayName = "LayersRenderer";

// Self-register this renderer to avoid circular dependencies
registerRenderer(ComponentType.Layers, LayersRenderer);

export default LayersRenderer;
