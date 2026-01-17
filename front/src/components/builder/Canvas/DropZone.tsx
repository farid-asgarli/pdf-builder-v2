/**
 * DropZone Component
 * Wrapper component that provides drop zone functionality for containers
 *
 * Features:
 * - Drop zone detection based on mouse position
 * - Visual indicators for valid/invalid drops
 * - Support for container, wrapper, and leaf components
 * - Integration with @dnd-kit
 * - Accessibility support with proper ARIA attributes
 */

"use client";

import { memo, useState, useCallback, useMemo, useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import type { ComponentType } from "@/types/component";
import type { DropZonePosition, DropValidationResult } from "@/types/canvas";
import { isContainerComponent, isWrapperComponent } from "@/types/component";
import {
  getDropZonePosition,
  validateDrop,
  isValidDropPosition,
  extractDragItem,
} from "@/lib/canvas/dnd";
import { useCanvasStore } from "@/store/canvas-store";
import { DropIndicator } from "./DropIndicator";

// ============================================================================
// Types
// ============================================================================

export interface DropZoneProps {
  /** Unique ID for this drop zone (usually component ID) */
  id: string;
  /** Component type of this drop zone */
  componentType: ComponentType;
  /** Children to render inside the drop zone */
  children: React.ReactNode;
  /** Whether this drop zone is disabled */
  disabled?: boolean;
  /** Callback when a valid drop occurs */
  onDrop?: (position: DropZonePosition, index: number) => void;
  /** Callback when drop zone becomes active */
  onDropZoneActive?: (position: DropZonePosition | null) => void;
  /** Additional class name */
  className?: string;
  /** Depth in the tree (for visual nesting) */
  depth?: number;
  /** Whether this is an empty container */
  isEmpty?: boolean;
  /** Parent ID for context */
  parentId?: string | null;
  /** Index in parent's children array */
  indexInParent?: number;
}

export interface DropZoneState {
  /** Current drop position being hovered */
  activePosition: DropZonePosition | null;
  /** Validation result for current drag */
  validation: DropValidationResult | null;
}

// ============================================================================
// Component
// ============================================================================

/**
 * DropZone - Provides drop zone functionality for canvas components
 *
 * Wraps components to enable drag and drop interactions with proper
 * visual feedback and validation.
 */
function DropZoneComponent({
  id,
  componentType,
  children,
  disabled = false,
  onDrop: _onDrop,
  onDropZoneActive,
  className,
  depth = 0,
  isEmpty = false,
  parentId,
  indexInParent = 0,
}: DropZoneProps) {
  // Use a single ref that we'll merge with dnd-kit's ref
  const internalRef = useRef<HTMLDivElement>(null);

  // Local state for drop position
  const [dropState, setDropState] = useState<DropZoneState>({
    activePosition: null,
    validation: null,
  });

  // Get canvas root for validation
  const root = useCanvasStore((state) => state.root);

  // Determine if this component can receive children
  const canReceiveChildren = useMemo(() => {
    return (
      isContainerComponent(componentType) || isWrapperComponent(componentType)
    );
  }, [componentType]);

  // Configure droppable with all necessary data
  const { isOver, active, setNodeRef } = useDroppable({
    id: `dropzone-${id}`,
    disabled,
    data: {
      type: "drop-zone",
      targetId: id,
      targetType: componentType,
      parentId,
      indexInParent,
      canReceiveChildren,
      isEmpty,
    },
  });

  // Merge refs: combine dnd-kit's setNodeRef with our internal ref
  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      // Set the dnd-kit ref
      setNodeRef(node);
      // Also keep our internal ref updated
      (internalRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
    },
    [setNodeRef]
  );

  // Extract drag item from active data
  const activeData = active?.data?.current;
  const dragItem = useMemo(() => {
    if (!activeData) return null;
    return extractDragItem(activeData);
  }, [activeData]);

  // Validate drop when drag is active
  const validation = useMemo(() => {
    if (!dragItem || !isOver) return null;
    return validateDrop(root, dragItem, id);
  }, [root, dragItem, id, isOver]);

  // Handle mouse move for position detection
  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!isOver || !internalRef.current || !validation?.canDrop) {
        // Reset state when conditions aren't met
        if (dropState.activePosition !== null) {
          setDropState({ activePosition: null, validation: null });
          onDropZoneActive?.(null);
        }
        return;
      }

      const position = getDropZonePosition(
        internalRef.current,
        event.clientY,
        canReceiveChildren
      );

      // Check if this position is valid
      const isValid = isValidDropPosition(validation, position);

      // Find the actual valid position if current is invalid
      let finalPosition = position;
      if (!isValid && validation.validPositions.length > 0) {
        // Fall back to nearest valid position based on cursor location
        if (position === "inside") {
          // If inside is invalid, prefer after, then before
          if (validation.validPositions.includes("after")) {
            finalPosition = "after";
          } else if (validation.validPositions.includes("before")) {
            finalPosition = "before";
          } else {
            finalPosition = validation.validPositions[0];
          }
        } else if (
          position === "before" &&
          !validation.validPositions.includes("before")
        ) {
          finalPosition = validation.validPositions.includes("inside")
            ? "inside"
            : "after";
        } else if (
          position === "after" &&
          !validation.validPositions.includes("after")
        ) {
          finalPosition = validation.validPositions.includes("inside")
            ? "inside"
            : "before";
        }
      }

      // Only update if position changed
      if (dropState.activePosition !== finalPosition) {
        setDropState({ activePosition: finalPosition, validation });
        onDropZoneActive?.(finalPosition);
      }
    },
    [
      isOver,
      validation,
      canReceiveChildren,
      dropState.activePosition,
      onDropZoneActive,
    ]
  );

  // Handle mouse leave - reset state when mouse leaves the drop zone
  const handleMouseLeave = useCallback(() => {
    if (dropState.activePosition !== null) {
      setDropState({ activePosition: null, validation: null });
      onDropZoneActive?.(null);
    }
  }, [dropState.activePosition, onDropZoneActive]);

  // Determine if we should show the indicator
  const showIndicator =
    isOver && dropState.activePosition !== null && validation?.canDrop;
  const isValidPosition = validation
    ? isValidDropPosition(validation, dropState.activePosition!)
    : false;

  // Calculate the container classes
  const containerClasses = cn(
    "relative transition-all duration-150",
    // Show hover state when being dragged over
    isOver && validation?.canDrop && "ring-2 ring-primary/50 ring-offset-1",
    isOver &&
      !validation?.canDrop &&
      "ring-2 ring-destructive/50 ring-offset-1",
    // Empty container placeholder styling
    isEmpty &&
      canReceiveChildren &&
      "min-h-12 border-2 border-dashed border-muted-foreground/25",
    className
  );

  return (
    <div
      ref={mergedRef}
      className={containerClasses}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      data-dropzone-id={id}
      data-dropzone-type={componentType}
      data-dropzone-active={isOver}
      data-dropzone-valid={validation?.canDrop ?? false}
      role="region"
      aria-label={`Drop zone for ${componentType}`}
      aria-dropeffect={isOver && validation?.canDrop ? "move" : "none"}
    >
      {/* Drop indicator */}
      {showIndicator && dropState.activePosition && (
        <DropIndicator
          position={dropState.activePosition}
          isValid={isValidPosition}
          isActive={true}
          depth={depth}
        />
      )}

      {/* Children */}
      {children}

      {/* Empty container placeholder */}
      {isEmpty && canReceiveChildren && (
        <div
          className={cn(
            "flex h-full min-h-12 items-center justify-center",
            isOver ? "opacity-100" : "opacity-50"
          )}
        >
          <span className="text-muted-foreground text-xs">
            {isOver
              ? validation?.canDrop
                ? "Drop component here"
                : "Cannot drop here"
              : "Drag component here"}
          </span>
        </div>
      )}
    </div>
  );
}

export const DropZone = memo(DropZoneComponent);
DropZone.displayName = "DropZone";

// ============================================================================
// Simple Drop Target (for non-container components)
// ============================================================================

export interface SimpleDropTargetProps {
  /** Unique ID */
  id: string;
  /** Component type */
  componentType: ComponentType;
  /** Children */
  children: React.ReactNode;
  /** Class name */
  className?: string;
  /** Parent ID */
  parentId?: string | null;
  /** Index in parent */
  indexInParent?: number;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * SimpleDropTarget - For leaf/non-container components
 * Only allows dropping before/after, not inside
 */
function SimpleDropTargetComponent({
  id,
  componentType,
  children,
  className,
  parentId,
  indexInParent = 0,
  disabled = false,
}: SimpleDropTargetProps) {
  const internalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<"before" | "after" | null>(null);

  const root = useCanvasStore((state) => state.root);

  const { isOver, active, setNodeRef } = useDroppable({
    id: `simple-dropzone-${id}`,
    disabled,
    data: {
      type: "simple-drop-zone",
      targetId: id,
      targetType: componentType,
      parentId,
      indexInParent,
      canReceiveChildren: false,
    },
  });

  // Merge refs
  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      (internalRef as React.MutableRefObject<HTMLDivElement | null>).current =
        node;
    },
    [setNodeRef]
  );

  const simpleActiveData = active?.data?.current;
  const dragItem = useMemo(() => {
    if (!simpleActiveData) return null;
    return extractDragItem(simpleActiveData);
  }, [simpleActiveData]);

  const validation = useMemo(() => {
    if (!dragItem || !isOver) return null;
    return validateDrop(root, dragItem, id);
  }, [root, dragItem, id, isOver]);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!isOver || !internalRef.current) {
        // Reset when not over
        if (position !== null) {
          setPosition(null);
        }
        return;
      }

      const rect = internalRef.current.getBoundingClientRect();
      const relativeY = event.clientY - rect.top;
      const newPosition = relativeY < rect.height / 2 ? "before" : "after";

      if (position !== newPosition) {
        setPosition(newPosition);
      }
    },
    [isOver, position]
  );

  const handleMouseLeave = useCallback(() => {
    setPosition(null);
  }, []);

  const showIndicator = isOver && position !== null && validation?.canDrop;

  return (
    <div
      ref={mergedRef}
      className={cn(
        "relative transition-all duration-150",
        isOver && validation?.canDrop && "ring-primary/30 ring-2",
        isOver && !validation?.canDrop && "ring-destructive/30 ring-2",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      data-simple-dropzone-id={id}
      data-dropzone-valid={validation?.canDrop ?? false}
      role="region"
      aria-label={`Drop target for ${componentType}`}
      aria-dropeffect={isOver && validation?.canDrop ? "move" : "none"}
    >
      {showIndicator && position && (
        <DropIndicator position={position} isValid={true} isActive={true} />
      )}
      {children}
    </div>
  );
}

export const SimpleDropTarget = memo(SimpleDropTargetComponent);
SimpleDropTarget.displayName = "SimpleDropTarget";

export default DropZone;
