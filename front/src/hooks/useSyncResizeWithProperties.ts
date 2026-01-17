/**
 * useSyncResizeWithProperties Hook
 * Provides two-way binding between resize handles and properties panel
 *
 * Features:
 * - Sync resize state from interaction store to properties panel
 * - Sync property changes from panel back to canvas store
 * - Debounced updates to prevent race conditions
 * - Single source of truth: canvas store
 * - Real-time feedback during resize operations
 * - Parent-aware flow layout constraints
 */
"use client";

import { useEffect, useRef } from "react";
import { useInteractionStore, useResizeState } from "@/store/interaction-store";
import { useCanvasStore } from "@/store/canvas-store";
import { useSelectionStore } from "@/store/selection-store";
import type { Size } from "@/types/canvas";
import type { LayoutNode, ComponentType } from "@/types/component";

// ============================================================================
// Types
// ============================================================================

/**
 * Resize direction for flow layout constraints
 */
export type ResizeDirection = "both" | "horizontal" | "vertical" | "none";

/**
 * Component sizing properties
 */
export interface ComponentSizing {
  /** Current width value (from store or resize state) */
  width: number | undefined;
  /** Current height value (from store or resize state) */
  height: number | undefined;
  /** Min width constraint */
  minWidth?: number;
  /** Max width constraint */
  maxWidth?: number;
  /** Min height constraint */
  minHeight?: number;
  /** Max height constraint */
  maxHeight?: number;
  /** Aspect ratio (width/height) */
  aspectRatio?: number;
  /** Whether aspect ratio should be maintained */
  maintainAspectRatio?: boolean;
}

/**
 * Flow layout context based on parent
 */
export interface FlowLayoutContext {
  /** Parent component type (if any) */
  parentType: ComponentType | null;
  /** Resize direction based on parent (flow layout constraints) */
  resizeDirection: ResizeDirection;
  /** Whether width is resizable based on flow layout */
  widthResizable: boolean;
  /** Whether height is resizable based on flow layout */
  heightResizable: boolean;
  /** Reason for constraints (for tooltips) */
  constraintReason?: string;
}

/**
 * Resize synchronization state
 */
export interface ResizeSyncState {
  /** Whether a resize operation is in progress */
  isResizing: boolean;
  /** Component ID being resized (if any) */
  resizingComponentId: string | null;
  /** Current size during resize (real-time) */
  currentResizeSize: Size | null;
  /** Whether the synced component is currently being resized */
  isComponentBeingResized: boolean;
}

/**
 * Options for the hook
 */
export interface UseSyncResizeWithPropertiesOptions {
  /** Component ID to sync with (if not using selection) */
  componentId?: string;
  /** Debounce delay for property updates in ms */
  debounceDelay?: number;
  /** Whether to auto-sync with selected component */
  useSelection?: boolean;
}

/**
 * Return type for the hook
 */
export interface UseSyncResizeWithPropertiesReturn {
  /** Current component being synced */
  component: LayoutNode | null;
  /** Component ID being synced */
  componentId: string | null;
  /** Component type */
  componentType: ComponentType | null;
  /** Current sizing values (from store or resize state) */
  sizing: ComponentSizing;
  /** Resize synchronization state */
  syncState: ResizeSyncState;
  /** Flow layout context (parent-aware constraints) */
  flowContext: FlowLayoutContext;
  /** Update width property */
  setWidth: (width: number | undefined) => void;
  /** Update height property */
  setHeight: (height: number | undefined) => void;
  /** Update both width and height */
  setSize: (size: Partial<Size>) => void;
  /** Update constraints */
  setConstraints: (constraints: Partial<ComponentSizing>) => void;
  /** Toggle aspect ratio lock */
  toggleAspectRatioLock: () => void;
  /** Whether the component has sizing properties */
  hasSizingProperties: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DEBOUNCE_DELAY = 100; // 100ms debounce for property updates

/** Component types that don't support sizing */
const NO_SIZING_TYPES: readonly string[] = [
  "PageBreak",
  "ShowOnce",
  "SkipOnce",
] as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract sizing properties from a layout node
 */
function extractSizingFromNode(node: LayoutNode | null): ComponentSizing {
  if (!node) {
    return {
      width: undefined,
      height: undefined,
    };
  }

  const props = node.properties || {};

  return {
    width: typeof props.width === "number" ? props.width : undefined,
    height: typeof props.height === "number" ? props.height : undefined,
    minWidth: typeof props.minWidth === "number" ? props.minWidth : undefined,
    maxWidth: typeof props.maxWidth === "number" ? props.maxWidth : undefined,
    minHeight:
      typeof props.minHeight === "number" ? props.minHeight : undefined,
    maxHeight:
      typeof props.maxHeight === "number" ? props.maxHeight : undefined,
    aspectRatio:
      typeof props.aspectRatio === "number" ? props.aspectRatio : undefined,
    maintainAspectRatio:
      typeof props.maintainAspectRatio === "boolean"
        ? props.maintainAspectRatio
        : false,
  };
}

/**
 * Check if component type supports sizing properties
 */
function componentSupportsSizing(type: ComponentType | null): boolean {
  if (!type) return false;
  return !NO_SIZING_TYPES.includes(type);
}

/**
 * Calculate flow layout context based on component and parent types
 * Implements flow layout constraints:
 * - Column children: width resizable, height auto
 * - Row children: height resizable, width auto
 * - Text: width resizable (wraps), height auto
 * - Image: both resizable with aspect ratio option
 */
function calculateFlowContext(
  componentType: ComponentType | null,
  parentType: ComponentType | null
): FlowLayoutContext {
  // Default context
  const defaultContext: FlowLayoutContext = {
    parentType,
    resizeDirection: "both",
    widthResizable: true,
    heightResizable: true,
  };

  if (!componentType) {
    return {
      ...defaultContext,
      resizeDirection: "none",
      widthResizable: false,
      heightResizable: false,
    };
  }

  // Text: width resizable (wraps), height auto
  if (componentType === "Text") {
    return {
      parentType,
      resizeDirection: "horizontal",
      widthResizable: true,
      heightResizable: false,
      constraintReason: "Text height is determined by content",
    };
  }

  // Image: both resizable with aspect ratio option
  if (componentType === "Image") {
    return {
      parentType,
      resizeDirection: "both",
      widthResizable: true,
      heightResizable: true,
      constraintReason: "Use aspect ratio lock to maintain proportions",
    };
  }

  // Flow control components: no resize
  if (NO_SIZING_TYPES.includes(componentType)) {
    return {
      parentType,
      resizeDirection: "none",
      widthResizable: false,
      heightResizable: false,
      constraintReason: "This component does not have size properties",
    };
  }

  // Apply parent-based constraints
  if (parentType === "Column") {
    // Children of Column: width can be set, height determined by flow
    return {
      parentType,
      resizeDirection: "horizontal",
      widthResizable: true,
      heightResizable: true, // Can still set explicit height
      constraintReason: "Child of Column: width and explicit height can be set",
    };
  }

  if (parentType === "Row") {
    // Children of Row: height can be set, width determined by flow
    return {
      parentType,
      resizeDirection: "vertical",
      widthResizable: true, // Can still set explicit width
      heightResizable: true,
      constraintReason: "Child of Row: height and explicit width can be set",
    };
  }

  // Default: both dimensions resizable
  return defaultContext;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for syncing resize operations with properties panel
 * Provides two-way binding between visual resize and property inputs
 */
export function useSyncResizeWithProperties(
  options: UseSyncResizeWithPropertiesOptions = {}
): UseSyncResizeWithPropertiesReturn {
  const {
    componentId: explicitComponentId,
    debounceDelay = DEFAULT_DEBOUNCE_DELAY,
    useSelection = true,
  } = options;

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Get selected component ID if using selection
  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const primarySelectedId = selectedIds.length > 0 ? selectedIds[0] : null;

  // Determine which component ID to use
  const targetComponentId =
    explicitComponentId ?? (useSelection ? primarySelectedId : null);

  // Get resize state from interaction store
  const resizeState = useResizeState();
  const activeInteraction = useInteractionStore(
    (state) => state.activeInteraction
  );

  // Get component from canvas store - access store functions directly
  const component = useCanvasStore((state) =>
    targetComponentId ? state.getComponent(targetComponentId) : null
  );

  // Get parent component for flow layout context
  const parent = useCanvasStore((state) =>
    targetComponentId ? state.getParent(targetComponentId) : null
  );

  // Get store actions
  const updateComponentProperty = useCanvasStore(
    (state) => state.updateComponentProperty
  );
  const updateComponentProperties = useCanvasStore(
    (state) => state.updateComponentProperties
  );

  const componentType = component?.type ?? null;
  const parentType = parent?.type ?? null;

  // Calculate flow layout context based on parent
  const flowContext = calculateFlowContext(componentType, parentType);

  // Check if this component is currently being resized
  const isResizing = activeInteraction === "resize";
  const isComponentBeingResized = Boolean(
    isResizing &&
    resizeState?.componentId &&
    resizeState.componentId === targetComponentId
  );

  // Extract sizing from node
  const nodeSizing = extractSizingFromNode(component);

  // Calculate current sizing (prefer resize state during resize)
  let sizing: ComponentSizing;
  if (isComponentBeingResized && resizeState?.currentSize) {
    sizing = {
      ...nodeSizing,
      width: resizeState.currentSize.width,
      height: resizeState.currentSize.height,
    };
  } else {
    sizing = nodeSizing;
  }

  // Sync state
  const syncState: ResizeSyncState = {
    isResizing,
    resizingComponentId: resizeState?.componentId ?? null,
    currentResizeSize: resizeState?.currentSize ?? null,
    isComponentBeingResized,
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Debounced property update helper
  function debouncedUpdate(property: string, value: unknown): void {
    if (!targetComponentId) return;

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Don't debounce during resize - let resize handle its own updates
    if (isComponentBeingResized) {
      return;
    }

    // Set new timer for debounced update
    debounceTimerRef.current = setTimeout(() => {
      updateComponentProperty(targetComponentId, property, value);
    }, debounceDelay);
  }

  // Set width
  function setWidth(width: number | undefined): void {
    if (!targetComponentId) return;

    // During resize, don't update (resize handles that)
    if (isComponentBeingResized) return;

    if (width !== undefined) {
      debouncedUpdate("width", width);
    } else {
      // Remove width property immediately
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      updateComponentProperty(targetComponentId, "width", undefined);
    }
  }

  // Set height
  function setHeight(height: number | undefined): void {
    if (!targetComponentId) return;

    // During resize, don't update (resize handles that)
    if (isComponentBeingResized) return;

    if (height !== undefined) {
      debouncedUpdate("height", height);
    } else {
      // Remove height property immediately
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      updateComponentProperty(targetComponentId, "height", undefined);
    }
  }

  // Set both dimensions
  function setSize(size: Partial<Size>): void {
    if (!targetComponentId) return;

    // During resize, don't update (resize handles that)
    if (isComponentBeingResized) return;

    const updates: Record<string, unknown> = {};
    if (size.width !== undefined) {
      updates.width = size.width;
    }
    if (size.height !== undefined) {
      updates.height = size.height;
    }

    if (Object.keys(updates).length > 0) {
      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        updateComponentProperties(targetComponentId, updates);
      }, debounceDelay);
    }
  }

  // Set constraints
  function setConstraints(constraints: Partial<ComponentSizing>): void {
    if (!targetComponentId) return;

    const updates: Record<string, unknown> = {};

    if (constraints.minWidth !== undefined) {
      updates.minWidth = constraints.minWidth;
    }
    if (constraints.maxWidth !== undefined) {
      updates.maxWidth = constraints.maxWidth;
    }
    if (constraints.minHeight !== undefined) {
      updates.minHeight = constraints.minHeight;
    }
    if (constraints.maxHeight !== undefined) {
      updates.maxHeight = constraints.maxHeight;
    }
    if (constraints.aspectRatio !== undefined) {
      updates.aspectRatio = constraints.aspectRatio;
    }
    if (constraints.maintainAspectRatio !== undefined) {
      updates.maintainAspectRatio = constraints.maintainAspectRatio;
    }

    if (Object.keys(updates).length > 0) {
      updateComponentProperties(targetComponentId, updates);
    }
  }

  // Toggle aspect ratio lock
  function toggleAspectRatioLock(): void {
    if (!targetComponentId || !component) return;

    const currentValue = sizing.maintainAspectRatio ?? false;
    const newValue = !currentValue;

    // If enabling aspect ratio lock and no aspect ratio is set, calculate it
    const updates: Record<string, unknown> = {
      maintainAspectRatio: newValue,
    };

    if (newValue && !sizing.aspectRatio) {
      const width = sizing.width ?? 100;
      const height = sizing.height ?? 100;
      updates.aspectRatio = width / height;
    }

    updateComponentProperties(targetComponentId, updates);
  }

  return {
    component,
    componentId: targetComponentId,
    componentType,
    sizing,
    syncState,
    flowContext,
    setWidth,
    setHeight,
    setSize,
    setConstraints,
    toggleAspectRatioLock,
    hasSizingProperties: componentSupportsSizing(componentType),
  };
}

export default useSyncResizeWithProperties;
