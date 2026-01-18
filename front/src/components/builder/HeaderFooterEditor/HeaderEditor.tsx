"use client";

/**
 * HeaderEditor Component
 *
 * Provides a dedicated editing area for document headers.
 * Headers repeat on every page of the generated PDF.
 *
 * Features:
 * - Separate canvas area for header components
 * - Shows header layout tree
 * - Height constraint (max 150px by default)
 * - Visual "Repeats on every page" indicator
 * - Drop zone for adding components
 * - Component selection and editing
 */

import React, {
  memo,
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";
import {
  DndContext,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import {
  PanelTop,
  RefreshCw,
  Plus,
  Trash2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import {
  useCanvasStore,
  useCanvasHeader,
  useEditingMode,
} from "@/store/canvas-store";
import { useSelectionStore } from "@/store/selection-store";
import { ComponentRenderer } from "../Renderers/ComponentRenderer";
import type { LayoutNode, ComponentType } from "@/types/component";
import { COMPONENT_ICONS } from "@/lib/constants/icons";
import { COMPONENT_REGISTRY } from "@/lib/constants/components";

// ============================================================================
// Types
// ============================================================================

export interface HeaderEditorProps {
  /** Maximum height for the header area in pixels */
  maxHeight?: number;
  /** Minimum height for the header area in pixels */
  minHeight?: number;
  /** Whether to show the tree view */
  showTreeView?: boolean;
  /** Whether the header section is collapsed */
  collapsed?: boolean;
  /** Callback when collapsed state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_HEIGHT = 150;
const DEFAULT_MIN_HEIGHT = 40;

// Components recommended for headers
import { ComponentType as ComponentTypeEnum } from "@/types/component";

const HEADER_RECOMMENDED_COMPONENTS: ComponentType[] = [
  ComponentTypeEnum.Column,
  ComponentTypeEnum.Row,
  ComponentTypeEnum.Text,
  ComponentTypeEnum.Image,
  ComponentTypeEnum.Padding,
  ComponentTypeEnum.Background,
];

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Repeats indicator badge
 */
const RepeatsIndicator = memo(function RepeatsIndicator({
  className,
}: {
  className?: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "flex items-center gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              className
            )}
          >
            <RefreshCw className="h-3 w-3" />
            <span className="text-xs">Repeats on every page</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>This header content will appear at the top of every page</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

/**
 * Height constraint indicator
 */
const HeightIndicator = memo(function HeightIndicator({
  currentHeight,
  maxHeight,
  className,
}: {
  currentHeight: number;
  maxHeight: number;
  className?: string;
}) {
  const isNearLimit = currentHeight > maxHeight * 0.8;
  const isOverLimit = currentHeight > maxHeight;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1 text-xs",
              isOverLimit
                ? "text-destructive"
                : isNearLimit
                  ? "text-yellow-600 dark:text-yellow-400"
                  : "text-muted-foreground",
              className
            )}
          >
            {isOverLimit && <AlertCircle className="h-3 w-3" />}
            <span>
              {currentHeight}px / {maxHeight}px
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          {isOverLimit ? (
            <p className="text-destructive">
              Header exceeds maximum height. Content may be clipped.
            </p>
          ) : isNearLimit ? (
            <p>Header is approaching maximum height limit</p>
          ) : (
            <p>
              Header height: {currentHeight}px (max: {maxHeight}px)
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

/**
 * Empty state component when no header is set
 */
const EmptyHeaderState = memo(function EmptyHeaderState({
  onAddComponent,
}: {
  onAddComponent?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className="bg-muted/50 flex h-12 w-12 items-center justify-center rounded-full">
        <PanelTop className="text-muted-foreground h-6 w-6" />
      </div>
      <div className="text-center">
        <p className="text-muted-foreground text-sm font-medium">
          No header content
        </p>
        <p className="text-muted-foreground/70 mt-1 text-xs">
          Add components to create a document header
        </p>
      </div>
      {onAddComponent && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAddComponent}
          className="mt-2"
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Header Content
        </Button>
      )}
    </div>
  );
});

/**
 * Mini tree view for header layout
 */
const HeaderTreeView = memo(function HeaderTreeView({
  node,
  depth = 0,
  selectedId,
  onSelect,
}: {
  node: LayoutNode;
  depth?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = (node.children && node.children.length > 0) || node.child;

  const IconComponent = COMPONENT_ICONS[node.type as ComponentType];
  const metadata = COMPONENT_REGISTRY[node.type as ComponentType];
  const displayName = metadata?.name || node.type;

  const children = useMemo(() => {
    const childNodes: LayoutNode[] = [];
    if (node.children) childNodes.push(...node.children);
    if (node.child) childNodes.push(node.child);
    return childNodes;
  }, [node.children, node.child]);

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-1 rounded-sm px-1 py-0.5 text-xs",
          "cursor-pointer transition-colors",
          selectedId === node.id
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted/50",
          depth > 0 && "ml-3"
        )}
        onClick={() => onSelect(node.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex h-4 w-4 items-center justify-center"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {IconComponent ? (
          <IconComponent className="text-muted-foreground h-3 w-3" />
        ) : (
          <Layers className="text-muted-foreground h-3 w-3" />
        )}

        <span className="truncate">{displayName}</span>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-0.5">
          {children.map((child) => (
            <HeaderTreeView
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

/**
 * HeaderEditor - Dedicated editor for document headers
 */
export const HeaderEditor = memo(function HeaderEditor({
  maxHeight = DEFAULT_MAX_HEIGHT,
  minHeight = DEFAULT_MIN_HEIGHT,
  showTreeView = true,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  className,
}: HeaderEditorProps) {
  // State
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed ?? internalCollapsed;
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Store hooks
  const header = useCanvasHeader();
  const editingMode = useEditingMode();
  const setEditingMode = useCanvasStore((state) => state.setEditingMode);
  const _setHeader = useCanvasStore((state) => state.setHeader);
  const clearHeader = useCanvasStore((state) => state.clearHeader);

  // Selection
  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const select = useSelectionStore((state) => state.select);
  const clearSelection = useSelectionStore((state) => state.clearSelection);

  const primarySelectedId =
    selectedIds.length > 0 ? selectedIds[selectedIds.length - 1] : null;

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Track content height
  useEffect(() => {
    if (!contentRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContentHeight(entry.contentRect.height);
      }
    });

    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);

  // Handlers
  const handleCollapsedChange = useCallback(
    (newCollapsed: boolean) => {
      if (onCollapsedChange) {
        onCollapsedChange(newCollapsed);
      } else {
        setInternalCollapsed(newCollapsed);
      }
    },
    [onCollapsedChange]
  );

  const handleActivateHeaderMode = useCallback(() => {
    setEditingMode("header");
  }, [setEditingMode]);

  const handleClearHeader = useCallback(() => {
    clearHeader();
    clearSelection();
  }, [clearHeader, clearSelection]);

  const handleSelectNode = useCallback(
    (id: string) => {
      select(id);
    },
    [select]
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        clearSelection();
      }
    },
    [clearSelection]
  );

  // DnD handlers
  const handleDragStart = useCallback((_event: DragStartEvent) => {
    // Handle drag start if needed
  }, []);

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Handle drag over for visual feedback
  }, []);

  const handleDragEnd = useCallback((_event: DragEndEvent) => {
    // Handle drop to add/reorder components
  }, []);

  // Whether this header editor is active
  const isActive = editingMode === "header";

  return (
    <div
      className={cn(
        "rounded-lg border transition-all",
        isActive
          ? "border-emerald-500/50 ring-1 ring-emerald-500/20"
          : "border-border",
        className
      )}
    >
      {/* Header Section Title Bar */}
      <Collapsible
        open={!collapsed}
        onOpenChange={(open) => handleCollapsedChange(!open)}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2">
              {collapsed ? (
                <ChevronRight className="text-muted-foreground h-4 w-4" />
              ) : (
                <ChevronDown className="text-muted-foreground h-4 w-4" />
              )}
              <PanelTop className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium">Header</span>
            </button>
          </CollapsibleTrigger>

          <div className="flex items-center gap-2">
            <RepeatsIndicator />
            {!collapsed && header && (
              <HeightIndicator
                currentHeight={contentHeight}
                maxHeight={maxHeight}
              />
            )}
          </div>
        </div>

        <CollapsibleContent>
          <Separator />

          <div className="flex">
            {/* Tree View (optional) */}
            {showTreeView && header && (
              <>
                <div className="w-40 border-r p-2">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-medium uppercase">
                      Structure
                    </span>
                  </div>
                  <ScrollArea className="h-30">
                    <HeaderTreeView
                      node={header}
                      selectedId={primarySelectedId}
                      onSelect={handleSelectNode}
                    />
                  </ScrollArea>
                </div>
              </>
            )}

            {/* Canvas Area */}
            <div className="flex-1 p-2">
              <DndContext
                id="header-editor-dnd"
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
              >
                <div
                  ref={contentRef}
                  onClick={handleCanvasClick}
                  className={cn(
                    "relative rounded-md border border-dashed transition-all",
                    "bg-muted/20",
                    isActive
                      ? "border-emerald-500/50"
                      : "border-border hover:border-muted-foreground/30",
                    !header && "cursor-pointer"
                  )}
                  style={{
                    minHeight: `${minHeight}px`,
                    maxHeight: `${maxHeight}px`,
                    overflow: "auto",
                  }}
                  role="region"
                  aria-label="Header canvas area"
                >
                  {header ? (
                    <div className="p-2">
                      <ComponentRenderer node={header} depth={0} />
                    </div>
                  ) : (
                    <EmptyHeaderState
                      onAddComponent={handleActivateHeaderMode}
                    />
                  )}

                  {/* Height warning overlay */}
                  {contentHeight > maxHeight && (
                    <div className="from-destructive/10 pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t to-transparent" />
                  )}
                </div>

                {/* Recommended components hint */}
                {isActive && !header && (
                  <div className="mt-2">
                    <p className="text-muted-foreground mb-1 text-xs">
                      Recommended components for headers:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {HEADER_RECOMMENDED_COMPONENTS.map((type) => {
                        const Icon = COMPONENT_ICONS[type];
                        const meta = COMPONENT_REGISTRY[type];
                        return (
                          <TooltipProvider key={type}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="secondary"
                                  className="cursor-help gap-1 text-xs"
                                >
                                  {Icon && <Icon className="h-3 w-3" />}
                                  {meta?.name || type}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{meta?.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })}
                    </div>
                  </div>
                )}
              </DndContext>
            </div>
          </div>

          {/* Actions */}
          {header && (
            <>
              <Separator />
              <div className="flex items-center justify-between px-3 py-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleActivateHeaderMode}
                  className={cn(
                    isActive && "bg-emerald-500/10 text-emerald-600"
                  )}
                >
                  {isActive ? "Currently Editing" : "Edit Header"}
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearHeader}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Remove header</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
});

HeaderEditor.displayName = "HeaderEditor";

export default HeaderEditor;
