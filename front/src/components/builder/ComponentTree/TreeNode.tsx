/**
 * TreeNode
 * Recursive tree node component for the component tree
 * Displays a component with expand/collapse, selection, and drag support
 */

"use client";

import React, { useMemo, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRight, ChevronDown, GripVertical } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import type { LayoutNode, ComponentType } from "@/types/component";
import { isContainerComponent, isWrapperComponent } from "@/types/component";
import { COMPONENT_ICONS } from "@/lib/constants/icons";
import { getCategoryMetadata } from "@/lib/constants/categories";
import { COMPONENT_REGISTRY } from "@/lib/constants/components";
import { TreeActions } from "./TreeActions";

export interface TreeNodeProps {
  /** The layout node to render */
  node: LayoutNode;
  /** Nesting depth (0 = root level) */
  depth: number;
  /** Whether this node is selected */
  isSelected: boolean;
  /** IDs of all expanded nodes */
  expandedIds: Set<string>;
  /** Callback when node is clicked (for selection) */
  onSelect: (id: string, event: React.MouseEvent) => void;
  /** Callback to toggle expand/collapse */
  onToggleExpand: (id: string) => void;
  /** Callback for delete action */
  onDelete: (id: string) => void;
  /** Callback for duplicate action */
  onDuplicate: (id: string) => void;
  /** Callback for copy action */
  onCopy: (id: string) => void;
  /** Callback for paste action */
  onPaste: (id: string) => void;
  /** Whether paste is available (something in clipboard) */
  canPaste: boolean;
  /** Parent node ID (null for root) */
  parentId: string | null;
  /** Index in parent's children array */
  index: number;
}

/**
 * Get display name for a node
 * Uses custom name from properties if available, otherwise uses type name
 */
function getNodeDisplayName(node: LayoutNode): string {
  // Check if node has a custom name property
  if (node.properties?.name && typeof node.properties.name === "string") {
    return node.properties.name;
  }
  // Check if it's a text node with content
  if (node.type === "Text" && node.properties?.content) {
    const content = String(node.properties.content);
    // Truncate if too long
    return content.length > 20 ? content.substring(0, 20) + "..." : content;
  }
  // Fall back to component type name
  const metadata = COMPONENT_REGISTRY[node.type as ComponentType];
  return metadata?.name || node.type;
}

/**
 * Check if a node has children
 */
function hasChildren(node: LayoutNode): boolean {
  if (node.children && node.children.length > 0) {
    return true;
  }
  if (node.child) {
    return true;
  }
  return false;
}

/**
 * Get all children of a node (both children array and single child)
 */
function getChildren(node: LayoutNode): LayoutNode[] {
  const children: LayoutNode[] = [];

  if (node.children) {
    children.push(...node.children);
  }

  if (node.child) {
    children.push(node.child);
  }

  return children;
}

/**
 * TreeNode - Recursive tree node component
 * Renders a single node with expand/collapse and nested children
 */
export function TreeNode({
  node,
  depth,
  isSelected,
  expandedIds,
  onSelect,
  onToggleExpand,
  onDelete,
  onDuplicate,
  onCopy,
  onPaste,
  canPaste,
  parentId,
  index,
}: TreeNodeProps) {
  // Get component metadata
  const componentMetadata = useMemo(
    () => COMPONENT_REGISTRY[node.type as ComponentType],
    [node.type]
  );

  const categoryMeta = useMemo(
    () => getCategoryMetadata(componentMetadata?.category || "content"),
    [componentMetadata?.category]
  );

  // Get icon component
  const IconComponent = COMPONENT_ICONS[node.type as ComponentType];

  // Check if node can be expanded
  const canExpand = useMemo(() => hasChildren(node), [node]);
  const isExpanded = expandedIds.has(node.id);

  // Get children
  const children = useMemo(() => getChildren(node), [node]);

  // Sortable setup for drag and drop reordering
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: node.id,
    data: {
      type: "tree-node",
      node,
      parentId,
      index,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Handle click on the node
  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onSelect(node.id, event);
    },
    [node.id, onSelect]
  );

  // Handle expand/collapse toggle
  const handleToggleExpand = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onToggleExpand(node.id);
    },
    [node.id, onToggleExpand]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case "Enter":
        case " ":
          event.preventDefault();
          onSelect(node.id, event as unknown as React.MouseEvent);
          break;
        case "ArrowRight":
          if (canExpand && !isExpanded) {
            event.preventDefault();
            onToggleExpand(node.id);
          }
          break;
        case "ArrowLeft":
          if (canExpand && isExpanded) {
            event.preventDefault();
            onToggleExpand(node.id);
          }
          break;
        case "Delete":
        case "Backspace":
          event.preventDefault();
          onDelete(node.id);
          break;
      }
    },
    [node.id, canExpand, isExpanded, onSelect, onToggleExpand, onDelete]
  );

  // Display name
  const displayName = useMemo(() => getNodeDisplayName(node), [node]);

  // Whether this is a container/wrapper that can accept children
  const isContainer = isContainerComponent(node.type as ComponentType);
  const isWrapper = isWrapperComponent(node.type as ComponentType);
  const acceptsChildren = isContainer || isWrapper;

  return (
    <Collapsible open={isExpanded} onOpenChange={() => onToggleExpand(node.id)}>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={setNodeRef}
            style={style}
            className={cn(
              "group flex items-center gap-1 rounded-sm py-0.5 pr-2 select-none",
              "transition-colors duration-100",
              "hover:bg-accent/50",
              isSelected && "bg-accent text-accent-foreground",
              isDragging && "z-50 shadow-lg"
            )}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="treeitem"
            aria-expanded={canExpand ? isExpanded : undefined}
            aria-selected={isSelected}
            aria-level={depth + 1}
          >
            {/* Indentation */}
            <div
              style={{ width: depth * 16 }}
              className="shrink-0"
              aria-hidden="true"
            />

            {/* Drag handle */}
            <div
              {...attributes}
              {...listeners}
              className={cn(
                "cursor-grab opacity-0 group-hover:opacity-50 hover:opacity-100",
                "focus:opacity-100 active:cursor-grabbing",
                isDragging && "opacity-100"
              )}
              aria-label="Drag to reorder"
            >
              <GripVertical className="text-muted-foreground h-3 w-3" />
            </div>

            {/* Expand/collapse toggle */}
            {canExpand ? (
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm",
                    "hover:bg-accent focus:ring-ring focus:ring-1 focus:outline-none"
                  )}
                  onClick={handleToggleExpand}
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
              </CollapsibleTrigger>
            ) : (
              <div className="w-4 shrink-0" aria-hidden="true" />
            )}

            {/* Component icon */}
            <IconComponent
              className="h-4 w-4 shrink-0"
              style={{ color: categoryMeta.color }}
              aria-hidden="true"
            />

            {/* Component name */}
            <span className="truncate text-xs font-medium">{displayName}</span>

            {/* Type indicator for containers/wrappers */}
            {acceptsChildren && (
              <span className="text-muted-foreground text-[10px] opacity-70">
                {isWrapper && !node.child && "(empty)"}
                {isContainer &&
                  (!node.children || node.children.length === 0) &&
                  "(empty)"}
              </span>
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <TreeActions
            nodeId={node.id}
            nodeName={displayName}
            canDelete={depth > 0} // Don't allow deleting root
            canDuplicate={depth > 0} // Don't allow duplicating root
            canPaste={canPaste && acceptsChildren}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onCopy={onCopy}
            onPaste={onPaste}
          />
        </ContextMenuContent>
      </ContextMenu>

      {/* Render children */}
      {canExpand && (
        <CollapsibleContent>
          <div role="group" aria-label={`Children of ${displayName}`}>
            {children.map((child, childIndex) => (
              <TreeNode
                key={child.id}
                node={child}
                depth={depth + 1}
                isSelected={false} // Selection state passed from parent
                expandedIds={expandedIds}
                onSelect={onSelect}
                onToggleExpand={onToggleExpand}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onCopy={onCopy}
                onPaste={onPaste}
                canPaste={canPaste}
                parentId={node.id}
                index={childIndex}
              />
            ))}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

TreeNode.displayName = "TreeNode";
