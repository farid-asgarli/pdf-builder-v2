/**
 * Drag and Drop Utilities
 * Functions for handling drag and drop operations in the canvas
 *
 * Features:
 * - Drop zone detection for containers
 * - Drop target validation
 * - Component insertion position calculation
 * - Drag source type detection
 * - Comprehensive validation rules
 */

import type { LayoutNode, ComponentType } from "@/types/component";
import {
  isContainerComponent,
  isWrapperComponent,
  isLeafComponent,
} from "@/types/component";
import type { DropZoneInfo, DropValidationResult } from "@/types/canvas";
import { findNodeById, wouldCreateCycle } from "./tree-utils";

// ============================================================================
// Types
// ============================================================================

/**
 * Drop zone position within a container
 */
export type DropZonePosition = "before" | "after" | "inside" | "start" | "end";

/**
 * Information about the dragged item
 */
export interface DragItem {
  type: "palette" | "tree";
  componentType: ComponentType;
  nodeId?: string; // Only for tree drags (existing nodes)
}

/**
 * Result of insertion index calculation
 */
export interface InsertionInfo {
  parentId: string;
  index: number;
  position: DropZonePosition;
}

// ============================================================================
// Drop Zone Detection
// ============================================================================

/**
 * Determines the drop zone based on mouse position relative to an element
 * Returns position indicator for visual feedback
 *
 * For containers (can receive children):
 * - Top 25%: "before" (insert before this element)
 * - Middle 50%: "inside" (insert as child)
 * - Bottom 25%: "after" (insert after this element)
 *
 * For non-containers:
 * - Top 50%: "before"
 * - Bottom 50%: "after"
 */
export function getDropZonePosition(
  element: HTMLElement,
  mouseY: number,
  isContainer: boolean
): DropZonePosition {
  const rect = element.getBoundingClientRect();
  const relativeY = mouseY - rect.top;
  const height = rect.height;

  // For containers, we have three zones: top 25%, middle 50%, bottom 25%
  if (isContainer) {
    const topThreshold = height * 0.25;
    const bottomThreshold = height * 0.75;

    if (relativeY < topThreshold) {
      return "before";
    } else if (relativeY > bottomThreshold) {
      return "after";
    } else {
      return "inside";
    }
  }

  // For non-containers, split in half
  if (relativeY < height / 2) {
    return "before";
  } else {
    return "after";
  }
}

/**
 * Get drop zone position with horizontal support (for Row containers)
 */
export function getDropZonePositionXY(
  element: HTMLElement,
  mouseX: number,
  mouseY: number,
  isContainer: boolean,
  isHorizontalLayout: boolean = false
): DropZonePosition {
  const rect = element.getBoundingClientRect();

  if (isHorizontalLayout) {
    const relativeX = mouseX - rect.left;
    const width = rect.width;

    if (isContainer) {
      const leftThreshold = width * 0.25;
      const rightThreshold = width * 0.75;

      if (relativeX < leftThreshold) {
        return "before";
      } else if (relativeX > rightThreshold) {
        return "after";
      } else {
        return "inside";
      }
    }

    return relativeX < width / 2 ? "before" : "after";
  }

  // Fall back to vertical positioning
  return getDropZonePosition(element, mouseY, isContainer);
}

/**
 * Calculate insertion position based on drop zone
 */
export function calculateInsertionPosition(
  root: LayoutNode,
  targetId: string,
  position: DropZonePosition
): InsertionInfo | null {
  const targetResult = findNodeById(root, targetId);
  if (!targetResult) {
    return null;
  }

  const { node: targetNode, parentId, index: targetIndex } = targetResult;

  // Dropping inside a container
  if (position === "inside" || position === "start" || position === "end") {
    if (isContainerComponent(targetNode.type)) {
      const childrenCount = targetNode.children?.length ?? 0;
      return {
        parentId: targetId,
        index: position === "start" ? 0 : childrenCount,
        position,
      };
    }
    // If it's a wrapper that doesn't have a child yet
    if (isWrapperComponent(targetNode.type) && !targetNode.child) {
      return {
        parentId: targetId,
        index: 0,
        position: "inside",
      };
    }
    // Fall back to after for non-containers
    return calculateInsertionPosition(root, targetId, "after");
  }

  // Dropping before/after - need parent context
  if (!parentId) {
    // Target is root, can only drop inside
    if (isContainerComponent(targetNode.type)) {
      return {
        parentId: targetId,
        index: position === "before" ? 0 : (targetNode.children?.length ?? 0),
        position: position === "before" ? "start" : "end",
      };
    }
    return null;
  }

  // Insert relative to the target's position in parent
  return {
    parentId,
    index: position === "before" ? targetIndex : targetIndex + 1,
    position,
  };
}

// ============================================================================
// Drop Validation
// ============================================================================

/**
 * Components that can only be dropped inside specific parent types
 */
const PARENT_RESTRICTIONS: Partial<Record<ComponentType, ComponentType[]>> = {
  // Table cells can only be in Tables (if we have TableCell component)
  // ListItem can only be in List (if we have ListItem component)
};

/**
 * Validate if a component type can be dropped on a target
 *
 * Rules:
 * 1. Leaf components cannot receive children
 * 2. Wrappers can only receive one child (and only if empty)
 * 3. Containers can receive multiple children
 * 4. Cannot drop a node into itself or its descendants
 * 5. Some components have required parent types
 * 6. Cannot drop a parent into its own child (cycle prevention)
 */
export function validateDrop(
  root: LayoutNode | null,
  dragItem: DragItem,
  targetId: string
): DropValidationResult {
  if (!root) {
    return {
      canDrop: false,
      reason: "No canvas root exists",
      validPositions: [],
    };
  }

  const targetResult = findNodeById(root, targetId);
  if (!targetResult) {
    return {
      canDrop: false,
      reason: "Target component not found",
      validPositions: [],
    };
  }

  const { node: targetNode, parentId: targetParentId } = targetResult;
  const targetType = targetNode.type;
  const draggedType = dragItem.componentType;

  // Rule 5: Check parent restrictions for the dragged component
  const requiredParents = PARENT_RESTRICTIONS[draggedType];
  if (requiredParents && requiredParents.length > 0) {
    // When dropping "inside", the target becomes the parent
    // When dropping "before/after", the target's parent becomes the parent
    const wouldBeParentForInside = targetType;
    const wouldBeParentForBeforeAfter = targetParentId
      ? findNodeById(root, targetParentId)?.node.type
      : null;

    const canDropInside = requiredParents.includes(
      wouldBeParentForInside as ComponentType
    );
    const canDropBeforeAfter = wouldBeParentForBeforeAfter
      ? requiredParents.includes(wouldBeParentForBeforeAfter as ComponentType)
      : false;

    if (!canDropInside && !canDropBeforeAfter) {
      return {
        canDrop: false,
        reason: `${draggedType} can only be placed inside ${requiredParents.join(" or ")}`,
        validPositions: [],
      };
    }

    // Restrict positions based on what's valid
    const validPositions: DropZonePosition[] = [];
    if (canDropInside) validPositions.push("inside", "start", "end");
    if (canDropBeforeAfter) validPositions.push("before", "after");

    return {
      canDrop: true,
      validPositions,
      restrictedPositions: canDropInside
        ? undefined
        : ["inside", "start", "end"],
    };
  }

  // Rule 4: Check for circular reference when dragging existing node
  if (dragItem.nodeId) {
    // Cannot drop onto self
    if (dragItem.nodeId === targetId) {
      return {
        canDrop: false,
        reason: "Cannot drop a component onto itself",
        validPositions: [],
      };
    }

    // Cannot drop into descendants (cycle prevention)
    if (wouldCreateCycle(root, dragItem.nodeId, targetId)) {
      return {
        canDrop: false,
        reason: "Cannot drop a component into its own children",
        validPositions: [],
      };
    }

    // Also check if we're dropping adjacent to self (no-op)
    const draggedNode = findNodeById(root, dragItem.nodeId);
    if (draggedNode && draggedNode.parentId === targetParentId) {
      // They share the same parent - this might be a reorder
      // Still allow it, but mark it for potential optimization
    }
  }

  // Rule 1: Check if dropping into a leaf component
  if (isLeafComponent(targetType)) {
    // Can only drop before/after leaf components, not inside
    return {
      canDrop: true,
      reason: undefined,
      validPositions: ["before", "after"],
      restrictedPositions: ["inside", "start", "end"],
    };
  }

  // Rule 2: Check wrapper component constraints
  if (isWrapperComponent(targetType)) {
    if (targetNode.child) {
      // Wrapper already has a child - can only drop before/after
      return {
        canDrop: true,
        reason: undefined,
        validPositions: ["before", "after"],
        restrictedPositions: ["inside", "start", "end"],
      };
    }
    // Wrapper is empty - can drop inside
    return {
      canDrop: true,
      reason: undefined,
      validPositions: ["before", "after", "inside"],
    };
  }

  // Rule 3: Container components can receive children
  if (isContainerComponent(targetType)) {
    return {
      canDrop: true,
      reason: undefined,
      validPositions: ["before", "after", "inside", "start", "end"],
    };
  }

  // Default: allow before/after but not inside
  return {
    canDrop: true,
    reason: undefined,
    validPositions: ["before", "after"],
    restrictedPositions: ["inside", "start", "end"],
  };
}

/**
 * Check if a specific position is valid for dropping
 */
export function isValidDropPosition(
  validation: DropValidationResult,
  position: DropZonePosition
): boolean {
  if (!validation.canDrop) {
    return false;
  }

  if (validation.restrictedPositions?.includes(position)) {
    return false;
  }

  return validation.validPositions.includes(position);
}

/**
 * Get a human-readable drop validation message
 */
export function getDropValidationMessage(
  draggedType: ComponentType,
  targetType: ComponentType,
  validation: DropValidationResult
): string {
  if (!validation.canDrop) {
    return validation.reason || `Cannot drop ${draggedType} here`;
  }

  if (
    validation.restrictedPositions?.includes("inside") &&
    isLeafComponent(targetType)
  ) {
    return `${targetType} cannot contain children. Drop before or after.`;
  }

  if (
    validation.restrictedPositions?.includes("inside") &&
    isWrapperComponent(targetType)
  ) {
    return `${targetType} already has a child. Drop before or after.`;
  }

  return `Drop ${draggedType} ${validation.validPositions.includes("inside") ? "inside, before, or after" : "before or after"} ${targetType}`;
}

// ============================================================================
// Drop Zone Helpers
// ============================================================================

/**
 * Create DropZoneInfo for a component
 */
export function createDropZoneInfo(
  targetId: string,
  targetType: ComponentType,
  position: DropZonePosition,
  parentId: string | null,
  index: number
): DropZoneInfo {
  return {
    targetId,
    targetType,
    position,
    parentId,
    index,
    isValid: true,
  };
}

/**
 * Check if target accepts multiple children
 */
export function acceptsMultipleChildren(type: ComponentType): boolean {
  return isContainerComponent(type);
}

/**
 * Check if target accepts any children at all
 */
export function acceptsChildren(type: ComponentType): boolean {
  return isContainerComponent(type) || isWrapperComponent(type);
}

/**
 * Get the appropriate drop indicator style based on position
 */
export function getDropIndicatorStyle(position: DropZonePosition): {
  placement: "top" | "bottom" | "fill";
  thickness: "thin" | "thick";
} {
  switch (position) {
    case "before":
    case "start":
      return { placement: "top", thickness: "thin" };
    case "after":
    case "end":
      return { placement: "bottom", thickness: "thin" };
    case "inside":
      return { placement: "fill", thickness: "thick" };
  }
}

// ============================================================================
// Drag Data Helpers
// ============================================================================

/**
 * Create drag data for palette components
 */
export function createPaletteDragData(componentType: ComponentType): DragItem {
  return {
    type: "palette",
    componentType,
  };
}

/**
 * Create drag data for tree nodes (reordering)
 */
export function createTreeDragData(
  nodeId: string,
  componentType: ComponentType
): DragItem {
  return {
    type: "tree",
    componentType,
    nodeId,
  };
}

/**
 * Extract drag item from dnd-kit active data
 */
export function extractDragItem(
  data: Record<string, unknown> | undefined
): DragItem | null {
  if (!data) return null;

  const type = data.type as string;

  if (type === "palette-component") {
    return {
      type: "palette",
      componentType: data.componentType as ComponentType,
    };
  }

  if (type === "tree-node") {
    return {
      type: "tree",
      componentType: data.componentType as ComponentType,
      nodeId: data.nodeId as string,
    };
  }

  return null;
}
