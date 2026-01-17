/**
 * TreeActions
 * Context menu actions for tree nodes (delete, duplicate, copy/paste)
 * Provides the menu items used in the TreeNode context menu
 */

"use client";

import React from "react";
import { Copy, Clipboard, Trash2, CopyPlus, Scissors } from "lucide-react";
import {
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
} from "@/components/ui/context-menu";

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
  /** Callback for delete action */
  onDelete: (id: string) => void;
  /** Callback for duplicate action */
  onDuplicate: (id: string) => void;
  /** Callback for copy action */
  onCopy: (id: string) => void;
  /** Callback for paste action */
  onPaste: (id: string) => void;
  /** Callback for cut action (optional) */
  onCut?: (id: string) => void;
}

/**
 * TreeActions - Context menu items for tree node operations
 * Provides delete, duplicate, copy, and paste functionality
 */
export function TreeActions({
  nodeId,
  nodeName: _nodeName,
  canDelete,
  canDuplicate,
  canPaste,
  onDelete,
  onDuplicate,
  onCopy,
  onPaste,
  onCut,
}: TreeActionsProps) {
  // Handle copy
  const handleCopy = React.useCallback(() => {
    onCopy(nodeId);
  }, [nodeId, onCopy]);

  // Handle cut
  const handleCut = React.useCallback(() => {
    if (onCut) {
      onCut(nodeId);
    }
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

  return (
    <>
      {/* Copy action */}
      <ContextMenuItem onClick={handleCopy}>
        <Copy className="mr-2 h-4 w-4" />
        Copy
        <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
      </ContextMenuItem>

      {/* Cut action (if available) */}
      {onCut && canDelete && (
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
