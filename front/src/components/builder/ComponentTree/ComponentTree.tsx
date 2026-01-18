/**
 * ComponentTree
 * Hierarchical tree view of components in the canvas
 * Displays the layout tree structure with expand/collapse and drag-to-reorder
 *
 * Features:
 * - Recursive tree rendering
 * - Expand/collapse functionality
 * - Show component type and name
 * - Drag to reorder in tree
 * - Right-click context menu (delete, duplicate, copy/paste)
 * - Keyboard navigation
 * - Validation error highlighting
 */

"use client";

import React, {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Layers,
  ChevronDown,
  ChevronRight,
  FolderTree,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ComponentTreeEmptyState } from "@/components/common";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/store/canvas-store";
import { useSelectionStore } from "@/store/selection-store";
import { useHistoryStore } from "@/store/history-store";
import { useValidationSummary } from "@/hooks/useValidation";
import type { LayoutNode, ComponentType } from "@/types/component";
import { TreeNode } from "./TreeNode";
import { COMPONENT_ICONS } from "@/lib/constants/icons";
import { getCategoryMetadata } from "@/lib/constants/categories";
import { COMPONENT_REGISTRY } from "@/lib/constants/components";

export interface ComponentTreeProps {
  /** Optional class name */
  className?: string;
  /** Whether the tree panel is collapsed */
  collapsed?: boolean;
}

/**
 * Clipboard state for copy/paste operations
 */
interface ClipboardState {
  node: LayoutNode | null;
  operation: "copy" | "cut" | null;
}

/**
 * Collect all node IDs in a tree for sortable context
 */
function collectAllIds(node: LayoutNode | null): string[] {
  if (!node) return [];

  const ids: string[] = [node.id];

  if (node.children) {
    for (const child of node.children) {
      ids.push(...collectAllIds(child));
    }
  }

  if (node.child) {
    ids.push(...collectAllIds(node.child));
  }

  return ids;
}

/**
 * Get display name for a node
 */
function getNodeDisplayName(node: LayoutNode): string {
  if (node.properties?.name && typeof node.properties.name === "string") {
    return node.properties.name;
  }
  if (node.type === "Text" && node.properties?.content) {
    const content = String(node.properties.content);
    return content.length > 20 ? content.substring(0, 20) + "..." : content;
  }
  const metadata = COMPONENT_REGISTRY[node.type as ComponentType];
  return metadata?.name || node.type;
}

/**
 * ComponentTree - Main component tree panel
 * Shows hierarchical structure of components with tree operations
 */
export function ComponentTree({
  className,
  collapsed = false,
}: ComponentTreeProps) {
  // Canvas store
  const root = useCanvasStore((state) => state.root);
  const deleteComponent = useCanvasStore((state) => state.deleteComponent);
  const duplicateComponent = useCanvasStore(
    (state) => state.duplicateComponent
  );
  const moveComponent = useCanvasStore((state) => state.moveComponent);
  const reorderComponent = useCanvasStore((state) => state.reorderComponent);
  const addComponent = useCanvasStore((state) => state.addComponent);
  const getComponent = useCanvasStore((state) => state.getComponent);
  const getParent = useCanvasStore((state) => state.getParent);

  // Selection store
  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const select = useSelectionStore((state) => state.select);
  const selectWithOptions = useSelectionStore(
    (state) => state.selectWithOptions
  );

  // History store
  const pushState = useHistoryStore((state) => state.pushState);

  // Validation summary
  const validationSummary = useValidationSummary();

  // Local state - initialize expandedIds with root if available
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    return root ? new Set([root.id]) : new Set();
  });
  const [clipboard, setClipboard] = useState<ClipboardState>({
    node: null,
    operation: null,
  });
  const [draggedNode, setDraggedNode] = useState<LayoutNode | null>(null);
  const [isTreeExpanded, setIsTreeExpanded] = useState(true);

  // Track previous root id to detect changes
  const prevRootIdRef = useRef<string | null>(root?.id ?? null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Collect all sortable IDs
  const sortableIds = useMemo(() => collectAllIds(root), [root]);

  // Expand root node when root changes (e.g., loading a new document)
  // This runs synchronously during render, not in an effect
  const rootId = root?.id ?? null;
  if (rootId !== prevRootIdRef.current) {
    prevRootIdRef.current = rootId;
    if (rootId && !expandedIds.has(rootId)) {
      // Schedule state update for next render cycle to avoid render-during-render
      Promise.resolve().then(() => {
        setExpandedIds((prev) => {
          if (prev.has(rootId)) return prev;
          return new Set([...prev, rootId]);
        });
      });
    }
  }

  // Handle node selection
  const handleSelect = useCallback(
    (id: string, event: React.MouseEvent) => {
      if (event.ctrlKey || event.metaKey) {
        // Toggle selection with Ctrl/Cmd
        selectWithOptions(id, { toggle: true });
      } else if (event.shiftKey) {
        // Range selection with Shift - pass ordered IDs for range calculation
        selectWithOptions(id, { range: true, orderedIds: sortableIds });
      } else {
        // Single selection
        select(id);
      }
    },
    [select, selectWithOptions, sortableIds]
  );

  // Handle expand/collapse toggle
  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Handle delete action
  const handleDelete = useCallback(
    (id: string) => {
      if (root) {
        pushState(root, { action: "Delete component" });
      }
      const result = deleteComponent(id);
      if (!result.success) {
        console.error("Failed to delete component:", result.error);
      }
    },
    [root, pushState, deleteComponent]
  );

  // Handle duplicate action
  const handleDuplicate = useCallback(
    (id: string) => {
      if (root) {
        pushState(root, { action: "Duplicate component" });
      }
      const result = duplicateComponent(id);
      if (!result.success) {
        console.error("Failed to duplicate component:", result.error);
      } else if (result.nodeId) {
        // Select the duplicated node
        select(result.nodeId);
      }
    },
    [root, pushState, duplicateComponent, select]
  );

  // Handle copy action
  const handleCopy = useCallback(
    (id: string) => {
      const node = getComponent(id);
      if (node) {
        // Deep clone the node for clipboard
        setClipboard({
          node: JSON.parse(JSON.stringify(node)),
          operation: "copy",
        });
      }
    },
    [getComponent]
  );

  // Handle cut action
  const handleCut = useCallback(
    (id: string) => {
      const node = getComponent(id);
      if (node) {
        setClipboard({
          node: JSON.parse(JSON.stringify(node)),
          operation: "cut",
        });
      }
    },
    [getComponent]
  );

  // Handle paste action
  const handlePaste = useCallback(
    (targetId: string) => {
      if (!clipboard.node || !root) return;

      pushState(root, { action: "Paste component" });

      // Generate new IDs for the pasted node and all its children
      const generateNewIds = (node: LayoutNode): LayoutNode => {
        const newNode: LayoutNode = {
          ...node,
          id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          properties: { ...node.properties },
        };

        if (node.children) {
          newNode.children = node.children.map(generateNewIds);
        }

        if (node.child) {
          newNode.child = generateNewIds(node.child);
        }

        return newNode;
      };

      const newNode = generateNewIds(clipboard.node);
      const result = addComponent(targetId, newNode);

      if (result.success) {
        // If it was a cut operation, delete the original
        if (clipboard.operation === "cut") {
          deleteComponent(clipboard.node.id);
          setClipboard({ node: null, operation: null });
        }

        // Select the pasted node
        if (result.nodeId) {
          select(result.nodeId);
        }

        // Expand the target to show the pasted node
        setExpandedIds((prev) => new Set([...prev, targetId]));
      } else {
        console.error("Failed to paste component:", result.error);
      }
    },
    [clipboard, root, pushState, addComponent, deleteComponent, select]
  );

  // Handle move up action (reorder within parent)
  const handleMoveUp = useCallback(
    (id: string) => {
      if (!root) return;

      const parent = getParent(id);
      if (!parent?.children) return;

      const currentIndex = parent.children.findIndex((c) => c.id === id);
      if (currentIndex <= 0) return;

      pushState(root, { action: "Move component up" });
      reorderComponent(id, currentIndex - 1);
    },
    [root, getParent, pushState, reorderComponent]
  );

  // Handle move down action (reorder within parent)
  const handleMoveDown = useCallback(
    (id: string) => {
      if (!root) return;

      const parent = getParent(id);
      if (!parent?.children) return;

      const currentIndex = parent.children.findIndex((c) => c.id === id);
      if (currentIndex < 0 || currentIndex >= parent.children.length - 1)
        return;

      pushState(root, { action: "Move component down" });
      reorderComponent(id, currentIndex + 1);
    },
    [root, getParent, pushState, reorderComponent]
  );

  // Handle move to first position
  const handleMoveFirst = useCallback(
    (id: string) => {
      if (!root) return;

      const parent = getParent(id);
      if (!parent?.children) return;

      const currentIndex = parent.children.findIndex((c) => c.id === id);
      if (currentIndex <= 0) return;

      pushState(root, { action: "Move component to top" });
      reorderComponent(id, 0);
    },
    [root, getParent, pushState, reorderComponent]
  );

  // Handle move to last position
  const handleMoveLast = useCallback(
    (id: string) => {
      if (!root) return;

      const parent = getParent(id);
      if (!parent?.children) return;

      const currentIndex = parent.children.findIndex((c) => c.id === id);
      if (currentIndex < 0 || currentIndex >= parent.children.length - 1)
        return;

      pushState(root, { action: "Move component to bottom" });
      reorderComponent(id, parent.children.length - 1);
    },
    [root, getParent, pushState, reorderComponent]
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const node = getComponent(active.id as string);
      setDraggedNode(node);
    },
    [getComponent]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setDraggedNode(null);

      if (!over || active.id === over.id || !root) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      if (activeData?.type === "tree-node" && overData?.type === "tree-node") {
        const activeParentId = activeData.parentId;
        const overParentId = overData.parentId;
        const overIndex = overData.index;

        // Only allow reordering within the same parent for now
        if (activeParentId === overParentId && activeParentId) {
          pushState(root, { action: "Reorder component" });
          moveComponent(active.id as string, activeParentId, overIndex);
        }
      }
    },
    [root, pushState, moveComponent]
  );

  // Handle expand all
  const handleExpandAll = useCallback(() => {
    const allIds = collectAllIds(root);
    setExpandedIds(new Set(allIds));
  }, [root]);

  // Handle collapse all
  const handleCollapseAll = useCallback(() => {
    // Keep root expanded
    setExpandedIds(root ? new Set([root.id]) : new Set());
  }, [root]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle if component tree has focus
      const target = event.target as HTMLElement;
      if (!target.closest("[data-component-tree]")) return;

      const selectedId = selectedIds[0];
      if (!selectedId) return;

      // Copy (Ctrl+C)
      if ((event.ctrlKey || event.metaKey) && event.key === "c") {
        event.preventDefault();
        handleCopy(selectedId);
      }

      // Cut (Ctrl+X)
      if ((event.ctrlKey || event.metaKey) && event.key === "x") {
        event.preventDefault();
        handleCut(selectedId);
      }

      // Paste (Ctrl+V)
      if ((event.ctrlKey || event.metaKey) && event.key === "v") {
        event.preventDefault();
        handlePaste(selectedId);
      }

      // Duplicate (Ctrl+D)
      if ((event.ctrlKey || event.metaKey) && event.key === "d") {
        event.preventDefault();
        handleDuplicate(selectedId);
      }

      // Delete (Delete or Backspace)
      if (event.key === "Delete" || event.key === "Backspace") {
        // Don't delete if user is typing in an input
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }
        event.preventDefault();
        handleDelete(selectedId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedIds,
    handleCopy,
    handleCut,
    handlePaste,
    handleDuplicate,
    handleDelete,
  ]);

  // Check if clipboard has content
  const canPaste = clipboard.node !== null;

  // Render empty state
  if (!root) {
    return (
      <div
        className={cn(
          "bg-background flex flex-col border-r",
          collapsed ? "w-0" : "w-64",
          className
        )}
        data-component-tree
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            <span className="text-sm font-medium">Components</span>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <ComponentTreeEmptyState />
        </div>
      </div>
    );
  }

  // Get root icon and color
  const RootIcon = COMPONENT_ICONS[root.type as ComponentType];
  const rootCategoryMeta = getCategoryMetadata(
    COMPONENT_REGISTRY[root.type as ComponentType]?.category || "content"
  );

  return (
    <div
      className={cn(
        "bg-background flex flex-col border-r",
        collapsed ? "w-0 overflow-hidden" : "w-64",
        className
      )}
      data-component-tree
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4" />
          <span className="text-sm font-medium">Components</span>
          {/* Validation summary badges */}
          {validationSummary.hasIssues && (
            <div className="flex items-center gap-1">
              {validationSummary.errorCount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="destructive"
                        className="flex h-4 items-center gap-1 px-1 py-0 text-[10px]"
                      >
                        <AlertCircle className="h-2.5 w-2.5" />
                        {validationSummary.errorCount}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {validationSummary.errorCount} validation{" "}
                        {validationSummary.errorCount === 1
                          ? "error"
                          : "errors"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {validationSummary.warningCount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="flex h-4 items-center gap-1 border-yellow-300 bg-yellow-50 px-1 py-0 text-[10px] text-yellow-700 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-400"
                      >
                        <AlertTriangle className="h-2.5 w-2.5" />
                        {validationSummary.warningCount}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {validationSummary.warningCount} validation{" "}
                        {validationSummary.warningCount === 1
                          ? "warning"
                          : "warnings"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleExpandAll}
            title="Expand all"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCollapseAll}
            title="Collapse all"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Tree content */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          <Collapsible open={isTreeExpanded} onOpenChange={setIsTreeExpanded}>
            {/* Document root indicator */}
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left",
                  "hover:bg-accent/50",
                  "focus:ring-ring focus:ring-1 focus:outline-none"
                )}
              >
                {isTreeExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                <Layers className="text-muted-foreground h-4 w-4" />
                <span className="text-muted-foreground text-xs font-medium">
                  Document
                </span>
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortableIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="pl-4" role="tree" aria-label="Component tree">
                    <TreeNode
                      node={root}
                      depth={0}
                      isSelected={selectedIds.includes(root.id)}
                      expandedIds={expandedIds}
                      onSelect={handleSelect}
                      onToggleExpand={handleToggleExpand}
                      onDelete={handleDelete}
                      onDuplicate={handleDuplicate}
                      onCopy={handleCopy}
                      onPaste={handlePaste}
                      onCut={handleCut}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                      onMoveFirst={handleMoveFirst}
                      onMoveLast={handleMoveLast}
                      canPaste={canPaste}
                      canMoveUp={false}
                      canMoveDown={false}
                      parentId={null}
                      index={0}
                      siblingsCount={1}
                    />
                  </div>
                </SortableContext>

                {/* Drag overlay */}
                <DragOverlay>
                  {draggedNode && (
                    <div className="bg-accent flex items-center gap-2 rounded-md px-3 py-1.5 shadow-lg">
                      <RootIcon
                        className="h-4 w-4"
                        style={{ color: rootCategoryMeta.color }}
                      />
                      <span className="text-xs font-medium">
                        {getNodeDisplayName(draggedNode)}
                      </span>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ScrollArea>

      {/* Footer with clipboard indicator */}
      {canPaste && (
        <div className="border-t px-3 py-1.5">
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <span>
              📋 {clipboard.operation === "cut" ? "Cut" : "Copied"}:{" "}
              {getNodeDisplayName(clipboard.node!)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

ComponentTree.displayName = "ComponentTree";
