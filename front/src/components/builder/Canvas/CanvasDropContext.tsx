/**
 * CanvasDropContext Component
 * Provides drag and drop context for the canvas builder
 *
 * Features:
 * - DndContext wrapper for the entire canvas
 * - Integration with canvas store for component insertion
 * - Handles drops from palette and tree reordering
 * - Visual drag overlay
 * - Accessibility announcements for screen readers
 * - Optimized collision detection for nested containers
 */

"use client";

import { memo, useCallback, useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  MeasuringStrategy,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragCancelEvent,
  type DragMoveEvent,
  closestCenter,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type Announcements,
  type ScreenReaderInstructions,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import type {
  ComponentType,
  LayoutNode,
  ComponentMetadata,
} from "@/types/component";
import { useCanvasStore } from "@/store/canvas-store";
import { useSelectionStore } from "@/store/selection-store";
import { useHistoryStore } from "@/store/history-store";
import { useDropZone } from "@/hooks/useDropZone";
import { calculateInsertionPosition } from "@/lib/canvas/dnd";
import { generateNodeId } from "@/lib/canvas/tree-utils";
import {
  COMPONENT_REGISTRY,
  getDefaultProperties,
} from "@/lib/constants/components";

// ============================================================================
// Types
// ============================================================================

export interface CanvasDropContextProps {
  /** Children to render inside the context */
  children: React.ReactNode;
  /** Callback when a component is dropped from the palette */
  onComponentAdded?: (
    node: LayoutNode,
    parentId: string,
    index: number
  ) => void;
  /** Callback when a component is moved/reordered */
  onComponentMoved?: (
    nodeId: string,
    newParentId: string,
    newIndex: number
  ) => void;
  /** Custom drag overlay render function */
  renderDragOverlay?: (
    metadata: ComponentMetadata | null,
    node: LayoutNode | null
  ) => React.ReactNode;
  /** Whether drag and drop is disabled */
  disabled?: boolean;
  /** Custom accessibility announcements */
  customAnnouncements?: Partial<Announcements>;
}

interface DragState {
  isDragging: boolean;
  dragSource: "palette" | "tree" | null;
  draggedMetadata: ComponentMetadata | null;
  draggedNode: LayoutNode | null;
  activeId: UniqueIdentifier | null;
}

// ============================================================================
// Accessibility Configuration
// ============================================================================

/**
 * Default screen reader instructions for drag and drop operations
 */
const defaultScreenReaderInstructions: ScreenReaderInstructions = {
  draggable: `
    To pick up a component, press space or enter.
    While dragging, use arrow keys to move the component.
    Press space or enter again to drop the component in its new position,
    or press escape to cancel.
  `,
};

/**
 * Create accessibility announcements for drag events
 */
function createAnnouncements(
  getComponentName: (id: UniqueIdentifier) => string
): Announcements {
  return {
    onDragStart({ active }) {
      const name = getComponentName(active.id);
      return `Picked up ${name}. Use arrow keys to move. Press space to drop or escape to cancel.`;
    },
    onDragOver({ active, over }) {
      const name = getComponentName(active.id);
      if (over) {
        const targetName = getComponentName(over.id);
        return `${name} is over ${targetName}. Release to drop here.`;
      }
      return `${name} is no longer over a drop target.`;
    },
    onDragEnd({ active, over }) {
      const name = getComponentName(active.id);
      if (over) {
        const targetName = getComponentName(over.id);
        return `${name} was dropped on ${targetName}.`;
      }
      return `${name} was dropped.`;
    },
    onDragCancel({ active }) {
      const name = getComponentName(active.id);
      return `Dragging was cancelled. ${name} was not moved.`;
    },
  };
}

// ============================================================================
// Custom Collision Detection
// ============================================================================

/**
 * Custom collision detection that prioritizes drop zones for nested containers.
 *
 * Strategy:
 * 1. First check pointer-within collisions (best for nested containers)
 * 2. Filter to prioritize actual drop zones over generic droppables
 * 3. Fall back to rect intersection and closest center
 */
const customCollisionDetection: CollisionDetection = (args) => {
  // First, try pointer within (best for nested containers)
  const pointerCollisions = pointerWithin(args);

  if (pointerCollisions.length > 0) {
    // Prioritize drop zones over other droppables
    const dropZoneCollisions = pointerCollisions.filter((collision) => {
      const data = collision.data?.droppableContainer?.data?.current;
      return data?.type === "drop-zone" || data?.type === "simple-drop-zone";
    });

    if (dropZoneCollisions.length > 0) {
      // Return the first (deepest) drop zone collision
      return dropZoneCollisions.slice(0, 1);
    }

    return pointerCollisions;
  }

  // Then try rect intersection for when pointer is on the edge
  const rectCollisions = rectIntersection(args);
  if (rectCollisions.length > 0) {
    // Similarly prioritize drop zones
    const dropZoneCollisions = rectCollisions.filter((collision) => {
      const data = collision.data?.droppableContainer?.data?.current;
      return data?.type === "drop-zone" || data?.type === "simple-drop-zone";
    });

    if (dropZoneCollisions.length > 0) {
      return dropZoneCollisions.slice(0, 1);
    }

    return rectCollisions;
  }

  // Fall back to closest center
  return closestCenter(args);
};

// ============================================================================
// Layout Measuring Configuration
// ============================================================================

/**
 * Configure how droppable elements are measured.
 * For nested containers, we need to measure frequently for accurate drops.
 */
const measuringConfig = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
};

// ============================================================================
// Component
// ============================================================================

/**
 * CanvasDropContext - Provides DnD context for the canvas
 *
 * Wraps the canvas and its contents to enable drag and drop from
 * the palette to the canvas, and reordering within the tree.
 */
function CanvasDropContextComponent({
  children,
  onComponentAdded,
  onComponentMoved,
  renderDragOverlay,
  disabled: _disabled = false,
  customAnnouncements,
}: CanvasDropContextProps) {
  // Local drag state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragSource: null,
    draggedMetadata: null,
    draggedNode: null,
    activeId: null,
  });

  // Canvas store
  const addComponent = useCanvasStore((state) => state.addComponent);
  const moveComponent = useCanvasStore((state) => state.moveComponent);
  const getComponent = useCanvasStore((state) => state.getComponent);
  const root = useCanvasStore((state) => state.root);

  // Selection store
  const select = useSelectionStore((state) => state.select);

  // History store
  const pushState = useHistoryStore((state) => state.pushState);

  // Drop zone hook
  const { activeDropZone, validation, handleDragOver, setActiveDropZone } =
    useDropZone({
      onDropZoneActive: (_info) => {
        // Optional: handle drop zone active state changes
      },
    });

  // Configure sensors with proper activation constraints
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
        tolerance: 5, // 5px tolerance for accidental movement
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Helper to get component name for accessibility announcements
  const getComponentName = useCallback(
    (id: UniqueIdentifier): string => {
      const idStr = String(id);

      // Check if it's a palette drag
      if (idStr.startsWith("palette-")) {
        const componentType = idStr.replace("palette-", "") as ComponentType;
        const metadata = COMPONENT_REGISTRY[componentType];
        return metadata?.name || componentType;
      }

      // Check if it's a drop zone
      if (
        idStr.startsWith("dropzone-") ||
        idStr.startsWith("simple-dropzone-")
      ) {
        const nodeId = idStr.replace(/^(dropzone-|simple-dropzone-)/, "");
        const node = getComponent(nodeId);
        if (node) {
          const metadata = COMPONENT_REGISTRY[node.type as ComponentType];
          return metadata?.name || node.type;
        }
        return "drop zone";
      }

      // Try to find the node directly
      const node = getComponent(idStr);
      if (node) {
        const metadata = COMPONENT_REGISTRY[node.type as ComponentType];
        return metadata?.name || node.type;
      }

      return "component";
    },
    [getComponent]
  );

  // Create accessibility announcements
  const announcements = useMemo(() => {
    const defaultAnnouncements = createAnnouncements(getComponentName);
    return customAnnouncements
      ? { ...defaultAnnouncements, ...customAnnouncements }
      : defaultAnnouncements;
  }, [getComponentName, customAnnouncements]);

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const data = active.data?.current;

      if (!data) return;

      const type = data.type as string;

      if (type === "palette-component") {
        // Dragging from palette
        const metadata = data.metadata as ComponentMetadata;
        setDragState({
          isDragging: true,
          dragSource: "palette",
          draggedMetadata: metadata,
          draggedNode: null,
          activeId: active.id,
        });
      } else if (type === "tree-node") {
        // Dragging from tree (reorder)
        const nodeId = data.nodeId as string;
        const node = getComponent(nodeId);
        setDragState({
          isDragging: true,
          dragSource: "tree",
          draggedMetadata: node
            ? COMPONENT_REGISTRY[node.type as ComponentType]
            : null,
          draggedNode: node,
          activeId: active.id,
        });
      }
    },
    [getComponent]
  );

  // Handle drag move - for visual feedback during drag
  const handleDragMove = useCallback((_event: DragMoveEvent) => {
    // This can be used to update visual feedback during drag
    // Currently the drop zone handles this via mouse events
    // but this provides a fallback for keyboard navigation
  }, []);

  // Handle drag over
  const handleDragOverEvent = useCallback(
    (event: DragOverEvent) => {
      handleDragOver({
        active: event.active,
        over: event.over,
      });
    },
    [handleDragOver]
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Reset drag state first
      setDragState({
        isDragging: false,
        dragSource: null,
        draggedMetadata: null,
        draggedNode: null,
        activeId: null,
      });
      setActiveDropZone(null);

      // No drop target or invalid drop
      if (!over || !validation?.canDrop || !activeDropZone?.isValid) {
        return;
      }

      const data = active.data?.current;
      if (!data) return;

      const type = data.type as string;

      // Get insertion position
      const targetId = activeDropZone.targetId;
      const position = activeDropZone.position;

      if (!root) return;

      const insertionInfo = calculateInsertionPosition(
        root,
        targetId,
        position
      );
      if (!insertionInfo) return;

      const { parentId, index } = insertionInfo;

      // Save state for undo before making changes
      pushState(root, {
        action:
          type === "palette-component"
            ? `Add component to ${parentId}`
            : `Move component to ${parentId}`,
      });

      if (type === "palette-component") {
        // Create new node from palette component
        const componentType = data.componentType as ComponentType;
        const metadata = data.metadata as ComponentMetadata;

        const newNode: LayoutNode = {
          id: generateNodeId(),
          type: componentType,
          properties: getDefaultProperties(componentType),
          children:
            metadata.allowsChildren && !metadata.isWrapper ? [] : undefined,
        };

        // Add to canvas
        const result = addComponent(parentId, newNode, index);

        if (result.success) {
          // Select the new component
          select(newNode.id);
          onComponentAdded?.(newNode, parentId, index);
        }
      } else if (type === "tree-node") {
        // Move existing node
        const nodeId = data.nodeId as string;

        // Don't allow dropping onto self or same position
        if (nodeId === parentId) return;

        // Check if moving to same parent at same or adjacent index
        const sourceResult = getComponent(nodeId);
        if (sourceResult) {
          // Additional safety check - would be better to check actual position
          // but this requires parent info which we don't have here
        }

        const result = moveComponent(nodeId, parentId, index);

        if (result.success) {
          onComponentMoved?.(nodeId, parentId, index);
        }
      }
    },
    [
      root,
      validation,
      activeDropZone,
      addComponent,
      moveComponent,
      getComponent,
      select,
      pushState,
      onComponentAdded,
      onComponentMoved,
      setActiveDropZone,
    ]
  );

  // Handle drag cancel
  const handleDragCancel = useCallback(
    (_event: DragCancelEvent) => {
      setDragState({
        isDragging: false,
        dragSource: null,
        draggedMetadata: null,
        draggedNode: null,
        activeId: null,
      });
      setActiveDropZone(null);
    },
    [setActiveDropZone]
  );

  // Default drag overlay render with improved styling
  const defaultDragOverlay = useCallback(
    (metadata: ComponentMetadata | null, node: LayoutNode | null) => {
      if (!metadata) return null;

      return (
        <div
          className={cn(
            "bg-background/95 flex items-center gap-2 rounded-md border px-3 py-2 shadow-lg",
            "backdrop-blur-sm",
            "ring-primary ring-2",
            "pointer-events-none" // Ensure overlay doesn't interfere with drops
          )}
          role="status"
          aria-live="polite"
        >
          <span className="text-sm font-medium">{metadata.name}</span>
          {node && (
            <span className="text-muted-foreground text-xs">(moving)</span>
          )}
        </div>
      );
    },
    []
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      measuring={measuringConfig}
      accessibility={{
        announcements,
        screenReaderInstructions: defaultScreenReaderInstructions,
      }}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragOver={handleDragOverEvent}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {children}

      {/* Drag overlay - rendered in portal by dnd-kit */}
      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        }}
        zIndex={1000}
      >
        {dragState.isDragging &&
          (renderDragOverlay
            ? renderDragOverlay(
                dragState.draggedMetadata,
                dragState.draggedNode
              )
            : defaultDragOverlay(
                dragState.draggedMetadata,
                dragState.draggedNode
              ))}
      </DragOverlay>
    </DndContext>
  );
}

export const CanvasDropContext = memo(CanvasDropContextComponent);
CanvasDropContext.displayName = "CanvasDropContext";

export default CanvasDropContext;
