"use client";

/**
 * FooterEditor Component
 *
 * Provides a dedicated editing area for document footers.
 * Footers repeat on every page of the generated PDF.
 *
 * Features:
 * - Separate canvas area for footer components
 * - Shows footer layout tree
 * - Height constraint (max 100px by default)
 * - Page number helper UI with expression snippets
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
  PanelBottom,
  RefreshCw,
  Plus,
  Trash2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Layers,
  Hash,
  Copy,
  Check,
  FileText,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  useCanvasStore,
  useCanvasFooter,
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

export interface FooterEditorProps {
  /** Maximum height for the footer area in pixels */
  maxHeight?: number;
  /** Minimum height for the footer area in pixels */
  minHeight?: number;
  /** Whether to show the tree view */
  showTreeView?: boolean;
  /** Whether the footer section is collapsed */
  collapsed?: boolean;
  /** Callback when collapsed state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Page variable definition for the helper UI
 */
interface PageVariable {
  /** Expression syntax to use */
  expression: string;
  /** User-friendly label */
  label: string;
  /** Description of what this variable represents */
  description: string;
  /** Example output */
  example: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_HEIGHT = 100;
const DEFAULT_MIN_HEIGHT = 30;

// Components recommended for footers
import { ComponentType as ComponentTypeEnum } from "@/types/component";

const FOOTER_RECOMMENDED_COMPONENTS: ComponentType[] = [
  ComponentTypeEnum.Column,
  ComponentTypeEnum.Row,
  ComponentTypeEnum.Text,
  ComponentTypeEnum.Image,
  ComponentTypeEnum.Padding,
  ComponentTypeEnum.Background,
  ComponentTypeEnum.Line,
];

/**
 * Page variables available for footers
 * These are evaluated by the backend during PDF generation
 */
const PAGE_VARIABLES: PageVariable[] = [
  {
    expression: "{{ page.current }}",
    label: "Current Page",
    description: "The current page number",
    example: "3",
  },
  {
    expression: "{{ page.total }}",
    label: "Total Pages",
    description: "The total number of pages in the document",
    example: "10",
  },
  {
    expression: "Page {{ page.current }} of {{ page.total }}",
    label: "Page X of Y",
    description: "Common page number format",
    example: "Page 3 of 10",
  },
  {
    expression: "{{ page.current }}/{{ page.total }}",
    label: "X/Y Format",
    description: "Compact page number format",
    example: "3/10",
  },
];

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Repeats indicator badge for footer
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
              "flex items-center gap-1 border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
              className
            )}
          >
            <RefreshCw className="h-3 w-3" />
            <span className="text-xs">Repeats on every page</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>This footer content will appear at the bottom of every page</p>
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
              Footer exceeds maximum height. Content may be clipped.
            </p>
          ) : isNearLimit ? (
            <p>Footer is approaching maximum height limit</p>
          ) : (
            <p>
              Footer height: {currentHeight}px (max: {maxHeight}px)
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

/**
 * Page Number Helper UI - Provides quick access to page variables
 */
const PageNumberHelper = memo(function PageNumberHelper({
  onInsert,
}: {
  onInsert?: (expression: string) => void;
}) {
  const [copiedExpression, setCopiedExpression] = useState<string | null>(null);

  const handleCopy = useCallback(
    async (expression: string) => {
      try {
        await navigator.clipboard.writeText(expression);
        setCopiedExpression(expression);

        // Call onInsert callback if provided
        if (onInsert) {
          onInsert(expression);
        }

        // Reset copied state after 2 seconds
        setTimeout(() => {
          setCopiedExpression(null);
        }, 2000);
      } catch (err) {
        console.error("Failed to copy expression:", err);
      }
    },
    [onInsert]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Hash className="h-3.5 w-3.5" />
          <span className="text-xs">Page Numbers</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3">
          <div className="mb-2 flex items-center gap-2">
            <FileText className="text-muted-foreground h-4 w-4" />
            <span className="text-sm font-medium">Page Variables</span>
          </div>
          <p className="text-muted-foreground mb-3 text-xs">
            Click to copy an expression. Use in Text components to display page
            numbers.
          </p>

          <div className="space-y-2">
            {PAGE_VARIABLES.map((variable) => (
              <button
                key={variable.expression}
                onClick={() => handleCopy(variable.expression)}
                className={cn(
                  "hover:bg-muted/50 flex w-full items-start gap-3 rounded-md border p-2 text-left transition-colors",
                  copiedExpression === variable.expression &&
                    "border-green-500/50 bg-green-500/10"
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">
                      {variable.label}
                    </span>
                    {copiedExpression === variable.expression && (
                      <Badge
                        variant="outline"
                        className="border-green-500/50 bg-green-500/10 px-1 text-[10px] text-green-600"
                      >
                        <Check className="mr-0.5 h-2.5 w-2.5" />
                        Copied
                      </Badge>
                    )}
                  </div>
                  <code className="text-muted-foreground mt-1 block truncate font-mono text-[10px]">
                    {variable.expression}
                  </code>
                  <p className="text-muted-foreground/70 mt-0.5 text-[10px]">
                    {variable.description}
                    <span className="text-foreground/50 ml-1">
                      → {variable.example}
                    </span>
                  </p>
                </div>
                <Copy className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
              </button>
            ))}
          </div>
        </div>

        <Separator />

        <div className="bg-muted/30 p-3">
          <p className="text-muted-foreground text-[10px]">
            <strong>Tip:</strong> Add a Text component to your footer, then
            paste a page variable expression into its content field.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
});

/**
 * Empty state component when no footer is set
 */
const EmptyFooterState = memo(function EmptyFooterState({
  onAddComponent,
}: {
  onAddComponent?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6">
      <div className="bg-muted/50 flex h-10 w-10 items-center justify-center rounded-full">
        <PanelBottom className="text-muted-foreground h-5 w-5" />
      </div>
      <div className="text-center">
        <p className="text-muted-foreground text-sm font-medium">
          No footer content
        </p>
        <p className="text-muted-foreground/70 mt-1 text-xs">
          Add components to create a document footer
        </p>
      </div>
      {onAddComponent && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAddComponent}
          className="mt-1"
        >
          <Plus className="mr-1 h-4 w-4" />
          Add Footer Content
        </Button>
      )}
    </div>
  );
});

/**
 * Mini tree view for footer layout
 */
const FooterTreeView = memo(function FooterTreeView({
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
            <FooterTreeView
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
 * FooterEditor - Dedicated editor for document footers
 */
export const FooterEditor = memo(function FooterEditor({
  maxHeight = DEFAULT_MAX_HEIGHT,
  minHeight = DEFAULT_MIN_HEIGHT,
  showTreeView = true,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  className,
}: FooterEditorProps) {
  // State
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed ?? internalCollapsed;
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Store hooks
  const footer = useCanvasFooter();
  const editingMode = useEditingMode();
  const setEditingMode = useCanvasStore((state) => state.setEditingMode);
  const _setFooter = useCanvasStore((state) => state.setFooter);
  const clearFooter = useCanvasStore((state) => state.clearFooter);

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

  const handleActivateFooterMode = useCallback(() => {
    setEditingMode("footer");
  }, [setEditingMode]);

  const handleClearFooter = useCallback(() => {
    clearFooter();
    clearSelection();
  }, [clearFooter, clearSelection]);

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

  // Handler when a page variable expression is copied/inserted
  const handlePageVariableInsert = useCallback((_expression: string) => {
    // This could be extended to auto-insert the expression into a selected Text component
    // For now, the expression is just copied to clipboard via the PageNumberHelper
  }, []);

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

  // Whether this footer editor is active
  const isActive = editingMode === "footer";

  return (
    <div
      className={cn(
        "rounded-lg border transition-all",
        isActive
          ? "border-blue-500/50 ring-1 ring-blue-500/20"
          : "border-border",
        className
      )}
    >
      {/* Footer Section Title Bar */}
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
              <PanelBottom className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium">Footer</span>
            </button>
          </CollapsibleTrigger>

          <div className="flex items-center gap-2">
            <RepeatsIndicator />
            {!collapsed && footer && (
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
            {showTreeView && footer && (
              <>
                <div className="w-40 border-r p-2">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-muted-foreground text-xs font-medium uppercase">
                      Structure
                    </span>
                  </div>
                  <ScrollArea className="h-24">
                    <FooterTreeView
                      node={footer}
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
                      ? "border-blue-500/50"
                      : "border-border hover:border-muted-foreground/30",
                    !footer && "cursor-pointer"
                  )}
                  style={{
                    minHeight: `${minHeight}px`,
                    maxHeight: `${maxHeight}px`,
                    overflow: "auto",
                  }}
                  role="region"
                  aria-label="Footer canvas area"
                >
                  {footer ? (
                    <div className="p-2">
                      <ComponentRenderer node={footer} depth={0} />
                    </div>
                  ) : (
                    <EmptyFooterState
                      onAddComponent={handleActivateFooterMode}
                    />
                  )}

                  {/* Height warning overlay */}
                  {contentHeight > maxHeight && (
                    <div className="from-destructive/10 pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-linear-to-t to-transparent" />
                  )}
                </div>

                {/* Page Number Helper & Recommended Components */}
                {isActive && (
                  <div className="mt-2 space-y-2">
                    {/* Page Number Helper */}
                    <div className="flex items-center gap-2">
                      <PageNumberHelper onInsert={handlePageVariableInsert} />
                      <span className="text-muted-foreground/60 text-xs">
                        Quick insert page number expressions
                      </span>
                    </div>

                    {/* Recommended components hint */}
                    {!footer && (
                      <div>
                        <p className="text-muted-foreground mb-1 text-xs">
                          Recommended components for footers:
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {FOOTER_RECOMMENDED_COMPONENTS.map((type) => {
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
                  </div>
                )}
              </DndContext>
            </div>
          </div>

          {/* Actions */}
          {footer && (
            <>
              <Separator />
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleActivateFooterMode}
                    className={cn(isActive && "bg-blue-500/10 text-blue-600")}
                  >
                    {isActive ? "Currently Editing" : "Edit Footer"}
                  </Button>
                  {isActive && (
                    <PageNumberHelper onInsert={handlePageVariableInsert} />
                  )}
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFooter}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Remove footer</p>
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

FooterEditor.displayName = "FooterEditor";

export default FooterEditor;
