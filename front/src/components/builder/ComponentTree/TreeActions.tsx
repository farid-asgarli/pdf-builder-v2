/**
 * TreeActions
 * Context menu actions for tree nodes (delete, duplicate, copy/paste, move)
 * Provides the menu items used in the TreeNode context menu
 */

"use client";

import React from "react";
import {
  Copy,
  Clipboard,
  Trash2,
  CopyPlus,
  Scissors,
  ArrowUp,
  ArrowDown,
  ChevronsUp,
  ChevronsDown,
  FolderInput,
} from "lucide-react";
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@/components/ui/context-menu";
import type { LayoutNode } from "@/types/component";

export interface TreeActionsProps {
  /** Node ID for actions */
  nodeId: string;
  /** Node display name for confirmation messages */
  nodeName: string;
  /** Whether delete action is available */
  canDelete: boolean;
  /** Whether duplicate action is available */
  canDuplicate: boolean;
  /** Whether paste action is available */
  canPaste: boolean;
  /** Whether move up action is available */
  canMoveUp?: boolean;
  /** Whether move down action is available */
  canMoveDown?: boolean;
  /** Callback for delete action */
  onDelete: (id: string) => void;
  /** Callback for duplicate action */
  onDuplicate: (id: string) => void;
  /** Callback for copy action */
  onCopy: (id: string) => void;
  /** Callback for paste action */
  onPaste: (id: string) => void;
  /** Callback for cut action */
  onCut: (id: string) => void;
  /** Callback for move up action */
  onMoveUp?: (id: string) => void;
  /** Callback for move down action */
  onMoveDown?: (id: string) => void;
  /** Callback for move to first action */
  onMoveFirst?: (id: string) => void;
  /** Callback for move to last action */
  onMoveLast?: (id: string) => void;
  /** Callback for move to container action */
  onMoveToContainer?: (nodeId: string, containerId: string) => void;
  /** Available containers for move operation */
  availableContainers?: { id: string; name: string; node: LayoutNode }[];
}

/**
 * TreeActions - Context menu items for tree node operations
 * Provides delete, duplicate, copy, paste, cut, and move functionality
 */
export function TreeActions({
  nodeId,
  nodeName: _nodeName,
  canDelete,
  canDuplicate,
  canPaste,
  canMoveUp = false,
  canMoveDown = false,
  onDelete,
  onDuplicate,
  onCopy,
  onPaste,
  onCut,
  onMoveUp,
  onMoveDown,
  onMoveFirst,
  onMoveLast,
  onMoveToContainer,
  availableContainers,
}: TreeActionsProps) {
  // Handle copy
  const handleCopy = React.useCallback(() => {
    onCopy(nodeId);
  }, [nodeId, onCopy]);

  // Handle cut
  const handleCut = React.useCallback(() => {
    onCut(nodeId);
  }, [nodeId, onCut]);

  // Handle paste
  const handlePaste = React.useCallback(() => {
    onPaste(nodeId);
  }, [nodeId, onPaste]);

  // Handle duplicate
  const handleDuplicate = React.useCallback(() => {
    onDuplicate(nodeId);
  }, [nodeId, onDuplicate]);

  // Handle delete
  const handleDelete = React.useCallback(() => {
    onDelete(nodeId);
  }, [nodeId, onDelete]);

  // Handle move up
  const handleMoveUp = React.useCallback(() => {
    onMoveUp?.(nodeId);
  }, [nodeId, onMoveUp]);

  // Handle move down
  const handleMoveDown = React.useCallback(() => {
    onMoveDown?.(nodeId);
  }, [nodeId, onMoveDown]);

  // Handle move to first
  const handleMoveFirst = React.useCallback(() => {
    onMoveFirst?.(nodeId);
  }, [nodeId, onMoveFirst]);

  // Handle move to last
  const handleMoveLast = React.useCallback(() => {
    onMoveLast?.(nodeId);
  }, [nodeId, onMoveLast]);

  // Handle move to container
  const handleMoveToContainer = React.useCallback(
    (containerId: string) => {
      onMoveToContainer?.(nodeId, containerId);
    },
    [nodeId, onMoveToContainer]
  );

  // Check if any move action is available
  const hasMoveActions = canMoveUp || canMoveDown || onMoveFirst || onMoveLast;
  const hasMoveToContainer =
    onMoveToContainer && availableContainers && availableContainers.length > 0;

  return (
    <>
      {/* Copy action */}
      <ContextMenuItem onClick={handleCopy}>
        <Copy className="mr-2 h-4 w-4" />
        Copy
        <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
      </ContextMenuItem>

      {/* Cut action */}
      {canDelete && (
        <ContextMenuItem onClick={handleCut}>
          <Scissors className="mr-2 h-4 w-4" />
          Cut
          <ContextMenuShortcut>Ctrl+X</ContextMenuShortcut>
        </ContextMenuItem>
      )}

      {/* Paste action */}
      <ContextMenuItem onClick={handlePaste} disabled={!canPaste}>
        <Clipboard className="mr-2 h-4 w-4" />
        Paste Inside
        <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
      </ContextMenuItem>

      <ContextMenuSeparator />

      {/* Duplicate action */}
      <ContextMenuItem onClick={handleDuplicate} disabled={!canDuplicate}>
        <CopyPlus className="mr-2 h-4 w-4" />
        Duplicate
        <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut>
      </ContextMenuItem>

      {/* Move submenu */}
      {(hasMoveActions || hasMoveToContainer) && (
        <>
          <ContextMenuSeparator />

          {/* Move within parent */}
          {hasMoveActions && (
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <ArrowUp className="mr-2 h-4 w-4" />
                Reorder
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {onMoveFirst && (
                  <ContextMenuItem
                    onClick={handleMoveFirst}
                    disabled={!canMoveUp}
                  >
                    <ChevronsUp className="mr-2 h-4 w-4" />
                    Move to Top
                  </ContextMenuItem>
                )}
                <ContextMenuItem onClick={handleMoveUp} disabled={!canMoveUp}>
                  <ArrowUp className="mr-2 h-4 w-4" />
                  Move Up
                </ContextMenuItem>
                <ContextMenuItem
                  onClick={handleMoveDown}
                  disabled={!canMoveDown}
                >
                  <ArrowDown className="mr-2 h-4 w-4" />
                  Move Down
                </ContextMenuItem>
                {onMoveLast && (
                  <ContextMenuItem
                    onClick={handleMoveLast}
                    disabled={!canMoveDown}
                  >
                    <ChevronsDown className="mr-2 h-4 w-4" />
                    Move to Bottom
                  </ContextMenuItem>
                )}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}

          {/* Move to another container */}
          {hasMoveToContainer && (
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <FolderInput className="mr-2 h-4 w-4" />
                Move to Container
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="max-h-64 overflow-y-auto">
                {availableContainers!.map((container) => (
                  <ContextMenuItem
                    key={container.id}
                    onClick={() => handleMoveToContainer(container.id)}
                  >
                    {container.name}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          )}
        </>
      )}

      <ContextMenuSeparator />

      {/* Delete action */}
      <ContextMenuItem
        onClick={handleDelete}
        disabled={!canDelete}
        className="text-destructive focus:text-destructive"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
        <ContextMenuShortcut>Del</ContextMenuShortcut>
      </ContextMenuItem>
    </>
  );
}

TreeActions.displayName = "TreeActions";
