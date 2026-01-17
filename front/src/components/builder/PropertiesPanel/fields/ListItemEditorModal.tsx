/**
 * ListItemEditorModal Component
 * Modal dialog for editing list items with support for nested children
 *
 * Features:
 * - Add, edit, delete list items
 * - Nested children support (hierarchical lists)
 * - Drag and drop to reorder items
 * - Expression support in content ({{ data.field }})
 * - Item type override (ordered/unordered/none)
 * - Visual tree structure for nested items
 * - Keyboard shortcuts (Enter to add, Delete to remove)
 */
"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ListItemDto } from "@/types/properties";
import {
  List,
  ListOrdered,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Variable,
  CornerDownRight,
  Indent,
  Outdent,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for ListItemEditorModal
 */
export interface ListItemEditorModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal close is requested */
  onOpenChange: (open: boolean) => void;
  /** Current list items */
  items: ListItemDto[];
  /** Callback when items are saved */
  onSave: (items: ListItemDto[]) => void;
  /** List type (for display context) */
  listType?: "ordered" | "unordered" | "none";
  /** Optional title override */
  title?: string;
}

/**
 * Internal list item with unique ID for rendering
 */
interface InternalListItem extends ListItemDto {
  _id: string;
  _children?: InternalListItem[];
  _isExpanded?: boolean;
}

/**
 * Validation errors interface
 */
interface ValidationErrors {
  general?: string;
  items?: Record<string, string>;
}

// ============================================================================
// Constants
// ============================================================================

/** Maximum nesting depth allowed */
const MAX_NESTING_DEPTH = 6;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Convert external items to internal format with IDs
 */
function toInternalItems(items: ListItemDto[]): InternalListItem[] {
  return items.map((item) => ({
    ...item,
    _id: generateId(),
    _children: item.children ? toInternalItems(item.children) : undefined,
    _isExpanded: true,
  }));
}

/**
 * Convert internal items back to external format
 */
function toExternalItems(items: InternalListItem[]): ListItemDto[] {
  return items.map((item) => {
    const external: ListItemDto = {
      content: item.content,
    };
    if (item.type) {
      external.type = item.type;
    }
    if (item._children && item._children.length > 0) {
      external.children = toExternalItems(item._children);
    }
    return external;
  });
}

/**
 * Count total items including nested
 */
function countAllItems(items: InternalListItem[]): number {
  return items.reduce((count, item) => {
    return count + 1 + (item._children ? countAllItems(item._children) : 0);
  }, 0);
}

/**
 * Find max nesting depth
 */
function getMaxDepth(items: InternalListItem[], currentDepth = 0): number {
  if (items.length === 0) return currentDepth;

  return Math.max(
    currentDepth,
    ...items.map((item) =>
      item._children
        ? getMaxDepth(item._children, currentDepth + 1)
        : currentDepth
    )
  );
}

/**
 * Check if content contains expression
 */
function hasExpression(content: string): boolean {
  return /\{\{[^}]+\}\}/.test(content);
}

// ============================================================================
// Sub-components
// ============================================================================

interface ListItemRowProps {
  item: InternalListItem;
  depth: number;
  index: number;
  parentIndex?: string;
  onUpdate: (id: string, updates: Partial<InternalListItem>) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onIndent: (id: string) => void;
  onOutdent: (id: string) => void;
  onDuplicate: (id: string) => void;
  canIndent: boolean;
  canOutdent: boolean;
  listType?: "ordered" | "unordered" | "none";
  isEditing: string | null;
  setIsEditing: (id: string | null) => void;
}

function ListItemRow({
  item,
  depth,
  index,
  parentIndex,
  onUpdate,
  onDelete,
  onAddChild,
  onIndent,
  onOutdent,
  onDuplicate,
  canIndent,
  canOutdent,
  listType,
  isEditing,
  setIsEditing,
}: ListItemRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isExpanded = item._isExpanded ?? true;
  const hasChildren = item._children && item._children.length > 0;
  const isCurrentlyEditing = isEditing === item._id;

  // Focus input when editing starts
  useEffect(() => {
    if (isCurrentlyEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isCurrentlyEditing]);

  // Generate display index
  const displayIndex = parentIndex
    ? `${parentIndex}.${index + 1}`
    : `${index + 1}`;

  // Get bullet character based on depth and type
  const getBullet = () => {
    const effectiveType = item.type ?? listType ?? "unordered";
    if (effectiveType === "none") return "";
    if (effectiveType === "ordered") return `${displayIndex}.`;
    const bullets = ["•", "◦", "▪", "▫", "‣", "⁃"];
    return bullets[depth % bullets.length];
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setIsEditing(null);
    } else if (e.key === "Escape") {
      setIsEditing(null);
    }
  };

  const handleToggleExpand = () => {
    onUpdate(item._id, { _isExpanded: !isExpanded });
  };

  return (
    <>
      <div
        className={cn(
          "group flex items-start gap-2 rounded-md border p-2 transition-colors",
          "hover:bg-accent/50",
          isCurrentlyEditing && "ring-primary ring-2"
        )}
        style={{ marginLeft: depth * 20 }}
        data-item-id={item._id}
        data-depth={depth}
      >
        {/* Drag handle */}
        <div className="text-muted-foreground mt-1 cursor-grab opacity-50 group-hover:opacity-100">
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Expand/collapse for items with children */}
        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="mt-0.5 h-5 w-5 p-0"
            onClick={handleToggleExpand}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </Button>
        ) : (
          <div className="w-5" />
        )}

        {/* Bullet/number indicator */}
        <span className="text-muted-foreground mt-1 min-w-5 text-xs font-medium">
          {getBullet()}
        </span>

        {/* Content field */}
        <div className="min-w-0 flex-1">
          {isCurrentlyEditing ? (
            <Input
              ref={inputRef}
              value={item.content}
              onChange={(e) => onUpdate(item._id, { content: e.target.value })}
              onKeyDown={handleKeyDown}
              onBlur={() => setIsEditing(null)}
              placeholder="Enter item content..."
              className="h-7 text-sm"
            />
          ) : (
            <div
              className={cn(
                "min-h-7 cursor-text rounded px-2 py-1 text-sm",
                "hover:bg-accent",
                !item.content && "text-muted-foreground italic"
              )}
              onClick={() => setIsEditing(item._id)}
            >
              {item.content ? (
                hasExpression(item.content) ? (
                  <span className="flex items-center gap-1">
                    <Variable className="h-3 w-3 text-amber-500" />
                    <span>{item.content}</span>
                  </span>
                ) : (
                  item.content
                )
              ) : (
                "Click to edit..."
              )}
            </div>
          )}

          {/* Item type override (optional) */}
          {item.type && (
            <span className="bg-muted text-muted-foreground mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px]">
              Type: {item.type}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {/* Add child */}
          {depth < MAX_NESTING_DEPTH && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onAddChild(item._id)}
                >
                  <CornerDownRight className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Add child item</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Indent */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={!canIndent}
                onClick={() => onIndent(item._id)}
              >
                <Indent className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Indent (make child of previous)</p>
            </TooltipContent>
          </Tooltip>

          {/* Outdent */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                disabled={!canOutdent}
                onClick={() => onOutdent(item._id)}
              >
                <Outdent className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Outdent (move to parent level)</p>
            </TooltipContent>
          </Tooltip>

          {/* Duplicate */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onDuplicate(item._id)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Duplicate</p>
            </TooltipContent>
          </Tooltip>

          {/* Delete */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive h-6 w-6 p-0"
                onClick={() => onDelete(item._id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Delete</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Render children recursively */}
      {hasChildren && isExpanded && (
        <div className="space-y-1">
          {item._children!.map((child, childIndex) => (
            <ListItemRow
              key={child._id}
              item={child}
              depth={depth + 1}
              index={childIndex}
              parentIndex={displayIndex}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onAddChild={onAddChild}
              onIndent={onIndent}
              onOutdent={onOutdent}
              onDuplicate={onDuplicate}
              canIndent={childIndex > 0}
              canOutdent={true}
              listType={listType}
              isEditing={isEditing}
              setIsEditing={setIsEditing}
            />
          ))}
        </div>
      )}
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ListItemEditorModal({
  open,
  onOpenChange,
  items: initialItems,
  onSave,
  listType = "unordered",
  title = "Edit List Items",
}: ListItemEditorModalProps) {
  // Local state for editing
  const [items, setItems] = useState<InternalListItem[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Initialize items when modal opens
  useEffect(() => {
    if (open) {
      setItems(toInternalItems(initialItems));
      setErrors({});
      setIsEditing(null);
    }
  }, [open, initialItems]);

  // Stats
  const totalItems = useMemo(() => countAllItems(items), [items]);
  const maxDepth = useMemo(() => getMaxDepth(items), [items]);

  // ========================================
  // Item Operations
  // ========================================

  /**
   * Find and update an item by ID (recursively)
   */
  const updateItemById = useCallback(
    (
      itemList: InternalListItem[],
      id: string,
      updates: Partial<InternalListItem>
    ): InternalListItem[] => {
      return itemList.map((item) => {
        if (item._id === id) {
          return { ...item, ...updates };
        }
        if (item._children) {
          return {
            ...item,
            _children: updateItemById(item._children, id, updates),
          };
        }
        return item;
      });
    },
    []
  );

  /**
   * Delete an item by ID (recursively)
   */
  const deleteItemById = useCallback(
    (itemList: InternalListItem[], id: string): InternalListItem[] => {
      return itemList
        .filter((item) => item._id !== id)
        .map((item) => {
          if (item._children) {
            return {
              ...item,
              _children: deleteItemById(item._children, id),
            };
          }
          return item;
        });
    },
    []
  );

  /**
   * Add a child to a specific item
   */
  const addChildToItem = useCallback(
    (itemList: InternalListItem[], parentId: string): InternalListItem[] => {
      return itemList.map((item) => {
        if (item._id === parentId) {
          const newChild: InternalListItem = {
            content: "",
            _id: generateId(),
            _isExpanded: true,
          };
          return {
            ...item,
            _children: [...(item._children ?? []), newChild],
            _isExpanded: true,
          };
        }
        if (item._children) {
          return {
            ...item,
            _children: addChildToItem(item._children, parentId),
          };
        }
        return item;
      });
    },
    []
  );

  /**
   * Duplicate an item (including children)
   */
  const duplicateItemById = useCallback(
    (itemList: InternalListItem[], id: string): InternalListItem[] => {
      const result: InternalListItem[] = [];
      for (const item of itemList) {
        result.push(item);
        if (item._id === id) {
          // Deep clone the item with new IDs
          const cloneItem = (source: InternalListItem): InternalListItem => ({
            ...source,
            _id: generateId(),
            _children: source._children?.map(cloneItem),
          });
          result.push(cloneItem(item));
        } else if (item._children) {
          // Check children recursively
          const updatedChildren = duplicateItemById(item._children, id);
          if (updatedChildren.length !== item._children.length) {
            result[result.length - 1] = {
              ...item,
              _children: updatedChildren,
            };
          }
        }
      }
      return result;
    },
    []
  );

  // ========================================
  // Event Handlers
  // ========================================

  const handleUpdate = useCallback(
    (id: string, updates: Partial<InternalListItem>) => {
      setItems((prev) => updateItemById(prev, id, updates));
    },
    [updateItemById]
  );

  const handleDelete = useCallback(
    (id: string) => {
      setItems((prev) => deleteItemById(prev, id));
    },
    [deleteItemById]
  );

  const handleAddChild = useCallback(
    (parentId: string) => {
      setItems((prev) => addChildToItem(prev, parentId));
    },
    [addChildToItem]
  );

  const handleDuplicate = useCallback(
    (id: string) => {
      setItems((prev) => duplicateItemById(prev, id));
    },
    [duplicateItemById]
  );

  const handleAddTopLevel = useCallback(() => {
    const newItem: InternalListItem = {
      content: "",
      _id: generateId(),
      _isExpanded: true,
    };
    setItems((prev) => [...prev, newItem]);
    // Auto-focus the new item
    setTimeout(() => setIsEditing(newItem._id), 0);
  }, []);

  // Indent: Make item a child of the previous sibling
  const handleIndent = useCallback((id: string) => {
    setItems((prev) => {
      const indentInList = (list: InternalListItem[]): InternalListItem[] => {
        for (let i = 1; i < list.length; i++) {
          if (list[i]._id === id) {
            const itemToMove = list[i];
            const previousSibling = list[i - 1];
            const newList = list.filter((_, idx) => idx !== i);
            newList[i - 1] = {
              ...previousSibling,
              _children: [...(previousSibling._children ?? []), itemToMove],
              _isExpanded: true,
            };
            return newList;
          }
        }
        // Check children
        return list.map((item) => {
          if (item._children) {
            return {
              ...item,
              _children: indentInList(item._children),
            };
          }
          return item;
        });
      };
      return indentInList(prev);
    });
  }, []);

  // Outdent: Move item to parent's level
  const handleOutdent = useCallback((id: string) => {
    setItems((prev) => {
      const outdentInList = (
        list: InternalListItem[],
        _parent: InternalListItem | null = null,
        _parentList: InternalListItem[] | null = null,
        _parentIndex: number | null = null
      ): InternalListItem[] => {
        for (let i = 0; i < list.length; i++) {
          if (list[i]._children) {
            for (let j = 0; j < list[i]._children!.length; j++) {
              if (list[i]._children![j]._id === id) {
                // Found the item to outdent
                const itemToMove = list[i]._children![j];
                const newParentChildren = list[i]._children!.filter(
                  (_, idx) => idx !== j
                );

                // Update the parent to remove this child
                const newList = [...list];
                newList[i] = {
                  ...list[i],
                  _children:
                    newParentChildren.length > 0
                      ? newParentChildren
                      : undefined,
                };

                // Insert after the current parent
                newList.splice(i + 1, 0, itemToMove);
                return newList;
              }
            }
            // Recurse into children
            const updatedChildren = outdentInList(
              list[i]._children!,
              list[i],
              list,
              i
            );
            if (updatedChildren !== list[i]._children) {
              const newList = [...list];
              newList[i] = {
                ...list[i],
                _children:
                  updatedChildren.length > 0 ? updatedChildren : undefined,
              };
              return newList;
            }
          }
        }
        return list;
      };
      return outdentInList(prev);
    });
  }, []);

  const handleSave = useCallback(() => {
    // Validate
    const emptyItems = items.filter((item) => !item.content.trim());
    if (emptyItems.length > 0) {
      setErrors({
        general:
          "Some items have empty content. Please fill them in or remove them.",
      });
      return;
    }

    onSave(toExternalItems(items));
    onOpenChange(false);
  }, [items, onSave, onOpenChange]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // ========================================
  // Render
  // ========================================

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {listType === "ordered" ? (
              <ListOrdered className="h-5 w-5" />
            ) : (
              <List className="h-5 w-5" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>
            Add, edit, and organize list items. Use indentation to create nested
            lists.
          </DialogDescription>
        </DialogHeader>

        <Separator />

        {/* Error display */}
        {errors.general && (
          <div className="bg-destructive/10 text-destructive flex items-center gap-2 rounded-md p-2 text-sm">
            <AlertCircle className="h-4 w-4" />
            {errors.general}
          </div>
        )}

        {/* Items list */}
        <ScrollArea className="-mr-4 flex-1 pr-4">
          <div className="space-y-1.5 py-2">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
                <List className="text-muted-foreground/50 mb-2 h-10 w-10" />
                <p className="text-muted-foreground text-sm">
                  No list items yet
                </p>
                <p className="text-muted-foreground/70 mt-1 text-xs">
                  Click &quot;Add Item&quot; to create your first list item
                </p>
              </div>
            ) : (
              items.map((item, index) => (
                <ListItemRow
                  key={item._id}
                  item={item}
                  depth={0}
                  index={index}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  onAddChild={handleAddChild}
                  onIndent={handleIndent}
                  onOutdent={handleOutdent}
                  onDuplicate={handleDuplicate}
                  canIndent={index > 0}
                  canOutdent={false}
                  listType={listType}
                  isEditing={isEditing}
                  setIsEditing={setIsEditing}
                />
              ))
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Footer with stats and actions */}
        <DialogFooter className="flex-row items-center justify-between sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handleAddTopLevel}>
              <Plus className="mr-1 h-4 w-4" />
              Add Item
            </Button>

            <div className="text-muted-foreground text-xs">
              {totalItems} item{totalItems !== 1 ? "s" : ""}
              {maxDepth > 0 &&
                ` • ${maxDepth + 1} level${maxDepth > 0 ? "s" : ""}`}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DialogClose asChild>
              <Button variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleSave}>
              <Check className="mr-1 h-4 w-4" />
              Save Items
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ListItemEditorModal;
