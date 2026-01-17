/**
 * LayersPanel Component
 * Property panel for managing z-index and layer order within a Layers component
 *
 * Features:
 * - Visual list of all layers in order
 * - Drag and drop to reorder layers
 * - Set primary layer (isPrimary flag)
 * - Move layer up/down buttons
 * - Visual indication of layer type (background/primary/foreground)
 * - Real-time two-way binding with canvas store
 */
"use client";

import { memo, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useSelectionStore } from "@/store/selection-store";
import { useCanvasStore } from "@/store/canvas-store";
import type { LayoutNode, ComponentType } from "@/types/component";
import {
  Layers,
  ChevronUp,
  ChevronDown,
  Star,
  GripVertical,
  Type,
  Image as ImageIcon,
  Table2,
  Columns,
  Rows,
  Square,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for LayersPanel component
 */
export interface LayersPanelProps {
  /** Component ID to display properties for (overrides selection) */
  componentId?: string;
  /** Whether to use selection store for component ID */
  useSelection?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Layer item data for display
 */
interface LayerItem {
  id: string;
  index: number;
  type: ComponentType;
  isPrimary: boolean;
  layerType: "background" | "primary" | "foreground";
  label: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Layer type colors for visual distinction
 */
const LAYER_TYPE_COLORS: Record<
  "background" | "primary" | "foreground",
  {
    bg: string;
    text: string;
    border: string;
  }
> = {
  background: {
    bg: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-400/40",
  },
  primary: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-600 dark:text-yellow-400",
    border: "border-yellow-500/50",
  },
  foreground: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-400/40",
  },
};

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Renders an icon for a component type
 */
function ComponentIcon({
  type,
  className,
}: {
  type: ComponentType;
  className?: string;
}) {
  switch (type) {
    case "Column":
      return <Columns className={className} />;
    case "Row":
      return <Rows className={className} />;
    case "Table":
      return <Table2 className={className} />;
    case "Text":
      return <Type className={className} />;
    case "Image":
      return <ImageIcon className={className} />;
    case "Layers":
      return <Layers className={className} />;
    default:
      return <Square className={className} />;
  }
}

/**
 * Get display name for component type
 */
function getDisplayName(type: ComponentType): string {
  return type.replace(/([A-Z])/g, " $1").trim();
}

/**
 * Find primary layer index from children
 */
function findPrimaryLayerIndex(children: LayoutNode[] | undefined): number {
  if (!children || children.length === 0) return 0; // Default to first

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (
      child.properties &&
      (child.properties as Record<string, unknown>).isPrimary === true
    ) {
      return i;
    }
  }

  return 0; // Default to first if no explicit primary
}

/**
 * Get layer type based on position relative to primary
 */
function getLayerType(
  index: number,
  primaryIndex: number
): "primary" | "background" | "foreground" {
  if (index === primaryIndex) {
    return "primary";
  }
  return index < primaryIndex ? "background" : "foreground";
}

/**
 * Generate layer items from children
 */
function generateLayerItems(children: LayoutNode[] | undefined): LayerItem[] {
  if (!children || children.length === 0) return [];

  const primaryIndex = findPrimaryLayerIndex(children);

  return children.map((child, index) => {
    const isPrimary =
      (child.properties as Record<string, unknown>)?.isPrimary === true ||
      index === primaryIndex;
    const layerType = getLayerType(index, primaryIndex);

    let label: string;
    if (layerType === "primary") {
      label = "Primary";
    } else if (layerType === "background") {
      label = `Background ${index + 1}`;
    } else {
      label = `Foreground ${index - primaryIndex}`;
    }

    return {
      id: child.id,
      index,
      type: child.type,
      isPrimary,
      layerType,
      label,
    };
  });
}

// ============================================================================
// Sub-components
// ============================================================================

interface LayerRowProps {
  layer: LayerItem;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSetPrimary: () => void;
  onSelect: () => void;
  isSelected: boolean;
}

const LayerRow = memo(function LayerRow({
  layer,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onSetPrimary,
  onSelect,
  isSelected,
}: LayerRowProps) {
  const colors = LAYER_TYPE_COLORS[layer.layerType];

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-md border p-2 transition-colors",
        colors.border,
        colors.bg,
        isSelected && "ring-primary ring-2 ring-offset-1",
        "hover:bg-accent/50 cursor-pointer"
      )}
      onClick={onSelect}
      role="listitem"
      aria-label={`Layer ${layer.index + 1}: ${getDisplayName(layer.type)}`}
      data-layer-id={layer.id}
      data-layer-index={layer.index}
    >
      {/* Drag handle */}
      <div className="text-muted-foreground cursor-grab opacity-50 group-hover:opacity-100">
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Layer index badge */}
      <Badge
        variant="outline"
        className={cn(
          "h-5 min-w-6 justify-center px-1 text-[10px]",
          colors.text
        )}
      >
        {layer.index + 1}
      </Badge>

      {/* Component icon */}
      <ComponentIcon type={layer.type} className={cn("h-4 w-4", colors.text)} />

      {/* Component type and label */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-xs font-medium">
          {getDisplayName(layer.type)}
        </span>
        <span className={cn("text-[10px]", colors.text)}>{layer.label}</span>
      </div>

      {/* Primary indicator */}
      {layer.isPrimary && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Primary Layer</p>
          </TooltipContent>
        </Tooltip>
      )}

      {/* Action buttons - show on hover */}
      <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        {/* Set as primary */}
        {!layer.isPrimary && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetPrimary();
                }}
              >
                <Star className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Set as Primary</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Move up */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              disabled={isFirst}
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp();
              }}
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Move Up (to back)</p>
          </TooltipContent>
        </Tooltip>

        {/* Move down */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              disabled={isLast}
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown();
              }}
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Move Down (to front)</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
});

LayerRow.displayName = "LayerRow";

// ============================================================================
// Main Component
// ============================================================================

/**
 * LayersPanel - Panel for managing layer z-index and order
 */
function LayersPanelComponent({
  componentId,
  useSelection = true,
  className,
}: LayersPanelProps) {
  // Get selected component from stores
  const selectedId = useSelectionStore((state) => state.selectedIds[0] ?? null);
  const selectionSelectedIds = useSelectionStore((state) => state.selectedIds);
  const selectComponent = useSelectionStore((state) => state.select);
  const getComponent = useCanvasStore((state) => state.getComponent);
  const reorderComponent = useCanvasStore((state) => state.reorderComponent);
  const updateComponentProperty = useCanvasStore(
    (state) => state.updateComponentProperty
  );
  // Subscribe to root to detect changes
  const _root = useCanvasStore((state) => state.root);

  // Determine which component ID to use
  const targetId = componentId ?? (useSelection ? selectedId : null);

  // Get the Layers component
  const layersComponent = useMemo(() => {
    if (!targetId) return null;
    const component = getComponent(targetId);
    if (component?.type !== "Layers") return null;
    return component;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, getComponent, _root]);

  // Generate layer items from children
  const layerItems = useMemo(() => {
    return generateLayerItems(layersComponent?.children);
  }, [layersComponent?.children]);

  // Find primary layer index
  const primaryIndex = useMemo(() => {
    return findPrimaryLayerIndex(layersComponent?.children);
  }, [layersComponent?.children]);

  // Handle moving a layer up (towards back)
  const handleMoveUp = useCallback(
    (layerId: string, currentIndex: number) => {
      if (currentIndex === 0) return;
      reorderComponent(layerId, currentIndex - 1);
    },
    [reorderComponent]
  );

  // Handle moving a layer down (towards front)
  const handleMoveDown = useCallback(
    (layerId: string, currentIndex: number, totalLayers: number) => {
      if (currentIndex >= totalLayers - 1) return;
      reorderComponent(layerId, currentIndex + 1);
    },
    [reorderComponent]
  );

  // Handle setting a layer as primary
  const handleSetPrimary = useCallback(
    (layerId: string) => {
      if (!layersComponent?.children) return;

      // First, unset isPrimary on all other layers
      layersComponent.children.forEach((child) => {
        if (child.id !== layerId) {
          const isPrimary = (child.properties as Record<string, unknown>)
            ?.isPrimary;
          if (isPrimary === true) {
            updateComponentProperty(child.id, "isPrimary", false);
          }
        }
      });

      // Then set isPrimary on the selected layer
      updateComponentProperty(layerId, "isPrimary", true);
    },
    [layersComponent, updateComponentProperty]
  );

  // Handle selecting a layer in the canvas
  const handleSelectLayer = useCallback(
    (layerId: string) => {
      selectComponent(layerId);
    },
    [selectComponent]
  );

  // Don't render if no Layers component
  if (!layersComponent) {
    return null;
  }

  const layerCount = layerItems.length;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-center gap-2">
        <Layers className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">Layer Management</Label>
      </div>

      {/* Info box */}
      <div className="bg-muted/50 rounded-md p-2 text-[10px]">
        <p className="text-muted-foreground">
          <strong>Draw Order:</strong> Layers are drawn from top to bottom.
        </p>
        <ul className="text-muted-foreground mt-1 space-y-0.5">
          <li className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-slate-400" />
            <span>Background: Drawn first (behind primary)</span>
          </li>
          <li className="flex items-center gap-1">
            <Star className="h-2 w-2 fill-yellow-500 text-yellow-500" />
            <span>Primary: Main content layer</span>
          </li>
          <li className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-indigo-400" />
            <span>Foreground: Drawn last (on top)</span>
          </li>
        </ul>
      </div>

      {/* Layer list */}
      {layerCount === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-4 text-center">
          <Layers className="text-muted-foreground/50 mb-2 h-8 w-8" />
          <p className="text-muted-foreground text-xs">No layers yet</p>
          <p className="text-muted-foreground/70 mt-1 text-[10px]">
            Drop components into the Layers container
          </p>
        </div>
      ) : (
        <div className="space-y-1.5" role="list" aria-label="Layer order">
          {layerItems.map((layer, index) => (
            <LayerRow
              key={layer.id}
              layer={layer}
              isFirst={index === 0}
              isLast={index === layerCount - 1}
              onMoveUp={() => handleMoveUp(layer.id, index)}
              onMoveDown={() => handleMoveDown(layer.id, index, layerCount)}
              onSetPrimary={() => handleSetPrimary(layer.id)}
              onSelect={() => handleSelectLayer(layer.id)}
              isSelected={selectionSelectedIds.includes(layer.id)}
            />
          ))}
        </div>
      )}

      {/* Layer count and z-index info */}
      {layerCount > 0 && (
        <div className="flex items-center justify-between border-t pt-2 text-[10px]">
          <span className="text-muted-foreground">
            {layerCount} layer{layerCount !== 1 ? "s" : ""}
          </span>
          <span className="text-muted-foreground">
            Primary at z-index {primaryIndex}
          </span>
        </div>
      )}
    </div>
  );
}

export const LayersPanel = memo(LayersPanelComponent);
LayersPanel.displayName = "LayersPanel";

export default LayersPanel;
