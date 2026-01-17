/**
 * useDropZone Hook
 * Hook for managing drop zone state and detection in the canvas
 *
 * Features:
 * - Drop zone position detection
 * - Validation of drop targets
 * - Integration with canvas store
 * - Insertion position calculation
 * - Memoized for performance
 */

"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import type { Active, Over } from "@dnd-kit/core";
import type { ComponentType } from "@/types/component";
import type {
  DropZonePosition,
  DropZoneInfo,
  DropValidationResult,
} from "@/types/canvas";
import { useCanvasStore } from "@/store/canvas-store";
import {
  validateDrop,
  extractDragItem,
  calculateInsertionPosition,
  isValidDropPosition,
  getDropValidationMessage,
  type DragItem,
} from "@/lib/canvas/dnd";

// ============================================================================
// Types
// ============================================================================

export interface UseDropZoneOptions {
  /** Callback when drop zone becomes active */
  onDropZoneActive?: (info: DropZoneInfo | null) => void;
  /** Callback when a valid drop occurs */
  onDrop?: (info: DropZoneInfo, dragItem: DragItem) => void;
}

export interface UseDropZoneReturn {
  /** Current active drop zone info */
  activeDropZone: DropZoneInfo | null;
  /** Validation result for current drag */
  validation: DropValidationResult | null;
  /** Whether a drag is currently active */
  isDragging: boolean;
  /** The currently dragged item */
  dragItem: DragItem | null;
  /** Handle drag start event */
  handleDragStart: (event: { active: Active }) => void;
  /** Handle drag over event */
  handleDragOver: (event: { active: Active; over: Over | null }) => void;
  /** Handle drag end event */
  handleDragEnd: (event: { active: Active; over: Over | null }) => void;
  /** Handle drag cancel event */
  handleDragCancel: () => void;
  /** Set active drop zone manually */
  setActiveDropZone: (info: DropZoneInfo | null) => void;
  /** Validate a potential drop */
  validateDropTarget: (
    targetId: string,
    position: DropZonePosition
  ) => DropValidationResult;
  /** Get insertion position for a drop */
  getInsertionPosition: (
    targetId: string,
    position: DropZonePosition
  ) => {
    parentId: string;
    index: number;
  } | null;
  /** Get human-readable validation message */
  getValidationMessage: (targetId: string) => string;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * useDropZone - Manages drop zone state and validation
 */
export function useDropZone(
  options: UseDropZoneOptions = {}
): UseDropZoneReturn {
  const { onDropZoneActive, onDrop } = options;

  // Canvas store selectors - memoized
  const root = useCanvasStore((state) => state.root);
  const getComponent = useCanvasStore((state) => state.getComponent);

  // Local state
  const [isDragging, setIsDragging] = useState(false);
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [activeDropZone, setActiveDropZoneState] =
    useState<DropZoneInfo | null>(null);
  const [validation, setValidation] = useState<DropValidationResult | null>(
    null
  );

  // Ref to track if we've notified about the current drop zone
  const lastNotifiedDropZone = useRef<string | null>(null);

  // Stable setActiveDropZone that also notifies callbacks
  const setActiveDropZone = useCallback(
    (info: DropZoneInfo | null) => {
      setActiveDropZoneState(info);

      // Only notify if the drop zone actually changed
      const currentKey = info ? `${info.targetId}-${info.position}` : null;
      if (currentKey !== lastNotifiedDropZone.current) {
        lastNotifiedDropZone.current = currentKey;
        onDropZoneActive?.(info);
      }
    },
    [onDropZoneActive]
  );

  // Handle drag start
  const handleDragStart = useCallback((event: { active: Active }) => {
    const item = extractDragItem(event.active.data?.current);
    setDragItem(item);
    setIsDragging(true);
  }, []);

  // Handle drag over with improved edge case handling
  const handleDragOver = useCallback(
    (event: { active: Active; over: Over | null }) => {
      const { over } = event;

      // Clear state when not over any target
      if (!over || !dragItem || !root) {
        if (activeDropZone) {
          setActiveDropZone(null);
          setValidation(null);
        }
        return;
      }

      // Extract target info from over data
      const overData = over.data?.current;
      if (!overData) {
        return;
      }

      const targetId = overData.targetId as string | undefined;
      const targetType = overData.targetType as ComponentType | undefined;
      const position = (overData.position as DropZonePosition) || "inside";
      const parentId = overData.parentId as string | null | undefined;
      const indexInParent = (overData.indexInParent as number) || 0;

      if (!targetId || !targetType) {
        return;
      }

      // Validate the drop
      const validationResult = validateDrop(root, dragItem, targetId);
      setValidation(validationResult);

      // Calculate insertion position
      const insertionInfo = calculateInsertionPosition(
        root,
        targetId,
        position
      );

      // Create drop zone info
      const dropZoneInfo: DropZoneInfo = {
        targetId,
        targetType,
        position,
        parentId: parentId ?? insertionInfo?.parentId ?? null,
        index: insertionInfo?.index ?? indexInParent,
        isValid:
          validationResult.canDrop &&
          isValidDropPosition(validationResult, position),
        message: validationResult.reason,
      };

      // Only update if actually changed (deep comparison of key fields)
      if (
        !activeDropZone ||
        activeDropZone.targetId !== dropZoneInfo.targetId ||
        activeDropZone.position !== dropZoneInfo.position ||
        activeDropZone.isValid !== dropZoneInfo.isValid
      ) {
        setActiveDropZone(dropZoneInfo);
      }
    },
    [dragItem, root, activeDropZone, setActiveDropZone]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: { active: Active; over: Over | null }) => {
      const { over } = event;

      if (
        over &&
        dragItem &&
        activeDropZone &&
        activeDropZone.isValid &&
        validation?.canDrop
      ) {
        onDrop?.(activeDropZone, dragItem);
      }

      // Reset all state
      setIsDragging(false);
      setDragItem(null);
      setActiveDropZone(null);
      setValidation(null);
      lastNotifiedDropZone.current = null;
    },
    [dragItem, activeDropZone, validation, onDrop, setActiveDropZone]
  );

  // Handle drag cancel
  const handleDragCancel = useCallback(() => {
    setIsDragging(false);
    setDragItem(null);
    setActiveDropZone(null);
    setValidation(null);
    lastNotifiedDropZone.current = null;
  }, [setActiveDropZone]);

  // Validate a potential drop target - memoized for performance
  const validateDropTarget = useCallback(
    (targetId: string, position: DropZonePosition): DropValidationResult => {
      if (!dragItem || !root) {
        return {
          canDrop: false,
          reason: "No active drag or canvas root",
          validPositions: [],
        };
      }

      const validationResult = validateDrop(root, dragItem, targetId);

      // Also check if the specific position is valid
      if (
        validationResult.canDrop &&
        !isValidDropPosition(validationResult, position)
      ) {
        return {
          ...validationResult,
          canDrop: false,
          reason: `Position "${position}" is not valid for this component`,
        };
      }

      return validationResult;
    },
    [dragItem, root]
  );

  // Get insertion position for a drop - memoized
  const getInsertionPosition = useCallback(
    (
      targetId: string,
      position: DropZonePosition
    ): { parentId: string; index: number } | null => {
      if (!root) return null;

      const insertionInfo = calculateInsertionPosition(
        root,
        targetId,
        position
      );
      if (!insertionInfo) return null;

      return {
        parentId: insertionInfo.parentId,
        index: insertionInfo.index,
      };
    },
    [root]
  );

  // Get human-readable validation message - memoized
  const getValidationMessage = useCallback(
    (targetId: string): string => {
      if (!dragItem || !root) {
        return "Drag a component to drop here";
      }

      const target = getComponent(targetId);
      if (!target) {
        return "Invalid drop target";
      }

      const currentValidation = validateDrop(root, dragItem, targetId);
      return getDropValidationMessage(
        dragItem.componentType,
        target.type,
        currentValidation
      );
    },
    [dragItem, root, getComponent]
  );

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(
    () => ({
      activeDropZone,
      validation,
      isDragging,
      dragItem,
      handleDragStart,
      handleDragOver,
      handleDragEnd,
      handleDragCancel,
      setActiveDropZone,
      validateDropTarget,
      getInsertionPosition,
      getValidationMessage,
    }),
    [
      activeDropZone,
      validation,
      isDragging,
      dragItem,
      handleDragStart,
      handleDragOver,
      handleDragEnd,
      handleDragCancel,
      setActiveDropZone,
      validateDropTarget,
      getInsertionPosition,
      getValidationMessage,
    ]
  );
}

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Hook to check if a specific component is a valid drop target
 */
export function useIsValidDropTarget(
  componentId: string,
  draggedType: ComponentType | null
): boolean {
  const root = useCanvasStore((state) => state.root);

  return useMemo(() => {
    if (!root || !draggedType) return false;

    const dragItem: DragItem = {
      type: "palette",
      componentType: draggedType,
    };

    const validation = validateDrop(root, dragItem, componentId);
    return validation.canDrop;
  }, [root, draggedType, componentId]);
}

/**
 * Hook to get valid drop positions for a component
 */
export function useValidDropPositions(
  componentId: string,
  draggedType: ComponentType | null
): DropZonePosition[] {
  const root = useCanvasStore((state) => state.root);

  return useMemo(() => {
    if (!root || !draggedType) return [];

    const dragItem: DragItem = {
      type: "palette",
      componentType: draggedType,
    };

    const validation = validateDrop(root, dragItem, componentId);
    return validation.validPositions;
  }, [root, draggedType, componentId]);
}

export default useDropZone;
