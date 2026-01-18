/**
 * EmptyCanvasDropZone Component
 * Provides a drop zone for when the canvas is empty (no root component)
 *
 * Features:
 * - Full canvas drop target when no components exist
 * - Visual feedback during drag operations
 * - Integration with @dnd-kit
 * - Creates root component on drop
 */

"use client";

import { memo, useMemo, useCallback, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { Layers, Plus } from "lucide-react";
import { isContainerComponent } from "@/types/component";
import { extractDragItem, type DragItem } from "@/lib/canvas/dnd";

// ============================================================================
// Types
// ============================================================================

export interface EmptyCanvasDropZoneProps {
  /** Additional class name */
  className?: string;
  /** Whether the drop zone is disabled */
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * EmptyCanvasDropZone - Provides drop zone for empty canvas
 *
 * When the canvas has no root component, this provides a large drop target
 * that accepts container components to become the root.
 */
function EmptyCanvasDropZoneComponent({
  className,
  disabled = false,
}: EmptyCanvasDropZoneProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Configure droppable with special ID for empty canvas
  const { isOver, active, setNodeRef } = useDroppable({
    id: "empty-canvas-dropzone",
    disabled,
    data: {
      type: "empty-canvas",
      targetId: "root",
      targetType: null, // No existing type - this is the canvas root
      canReceiveChildren: true,
      isEmpty: true,
    },
  });

  // Extract drag item from active data
  const activeData = active?.data?.current;
  const dragItem = useMemo((): DragItem | null => {
    if (!activeData) return null;
    return extractDragItem(activeData);
  }, [activeData]);

  // Validate - only containers can be dropped as root
  const validation = useMemo(() => {
    if (!dragItem) {
      return { canDrop: false, reason: "No drag item" };
    }

    // Only container components can be the root
    if (!isContainerComponent(dragItem.componentType)) {
      return {
        canDrop: false,
        reason:
          "Only container components (Column, Row, Table) can be the root element",
      };
    }

    // Tree nodes (existing components) can also become root if they're containers
    if (dragItem.type === "tree" && dragItem.nodeId) {
      return {
        canDrop: true,
        reason: "Move to root",
      };
    }

    return { canDrop: true, reason: "Valid drop" };
  }, [dragItem]);

  const canDrop = validation.canDrop;
  const showDropIndicator = isOver && dragItem;

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-full flex-col items-center justify-center p-8 transition-all duration-200",
        // Normal state
        !showDropIndicator && "bg-transparent",
        // Dragging over - valid drop
        showDropIndicator &&
          canDrop &&
          "bg-primary/5 ring-primary ring-2 ring-inset",
        // Dragging over - invalid drop
        showDropIndicator &&
          !canDrop &&
          "bg-destructive/5 ring-destructive ring-2 ring-inset",
        // Hovered (no drag)
        isHovered && !showDropIndicator && "bg-muted/30",
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-empty-canvas-dropzone="true"
      data-dropzone-valid={canDrop}
      role="region"
      aria-label="Empty canvas - drop a container component to start building"
      aria-dropeffect={canDrop ? "copy" : "none"}
    >
      {/* Icon */}
      <div
        className={cn(
          "mb-4 rounded-full p-4 transition-colors duration-200",
          showDropIndicator && canDrop && "bg-primary/10 text-primary",
          showDropIndicator && !canDrop && "bg-destructive/10 text-destructive",
          !showDropIndicator && "bg-muted text-muted-foreground"
        )}
      >
        {showDropIndicator && canDrop ? (
          <Plus className="h-8 w-8" />
        ) : (
          <Layers className="h-8 w-8" />
        )}
      </div>

      {/* Main text */}
      <h3
        className={cn(
          "mb-2 text-lg font-medium transition-colors duration-200",
          showDropIndicator && canDrop && "text-primary",
          showDropIndicator && !canDrop && "text-destructive",
          !showDropIndicator && "text-foreground"
        )}
      >
        {showDropIndicator
          ? canDrop
            ? "Drop to create root component"
            : "Cannot drop here"
          : "Start Building"}
      </h3>

      {/* Subtitle / error message */}
      <p
        className={cn(
          "max-w-sm text-center text-sm transition-colors duration-200",
          showDropIndicator && !canDrop && "text-destructive",
          (!showDropIndicator || canDrop) && "text-muted-foreground"
        )}
      >
        {showDropIndicator && !canDrop
          ? validation.reason
          : "Drag a Column or Row from the component palette to create your first component"}
      </p>

      {/* Hint badges */}
      {!showDropIndicator && (
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
            Column
          </span>
          <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600 dark:text-green-400">
            Row
          </span>
          <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-600 dark:text-purple-400">
            Table
          </span>
        </div>
      )}
    </div>
  );
}

export const EmptyCanvasDropZone = memo(EmptyCanvasDropZoneComponent);
EmptyCanvasDropZone.displayName = "EmptyCanvasDropZone";

export default EmptyCanvasDropZone;
