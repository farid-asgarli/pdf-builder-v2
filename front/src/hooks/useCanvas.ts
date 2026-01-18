/**
 * useCanvas Hook
 * Composite hook for canvas state management
 *
 * Provides a unified interface for:
 * - Layout tree operations (header, content, footer)
 * - Editing mode switching
 * - Page settings management
 * - Component CRUD operations
 * - Tree utilities
 *
 * This is a convenience hook that combines multiple canvas store selectors
 * and actions into a single interface for component usage.
 */

import { useCallback, useMemo } from "react";
import {
  useCanvasStore,
  useCanvasHeader,
  useCanvasContent,
  useCanvasFooter,
  useEditingMode,
  usePageSettings,
  useActiveTree,
  useCanvasIsDirty,
  useCanvasLastModified,
  generateId,
  createComponentNode,
  type PageSettings,
  type TemplateStructure,
} from "@/store";
import type { LayoutNode, ComponentType } from "@/types/component";
import type { EditingMode } from "@/types/canvas";

// ============================================================================
// Types
// ============================================================================

export interface UseCanvasReturn {
  // Layout Trees
  /** Header layout tree (null if no header) */
  header: LayoutNode | null;
  /** Main content layout tree */
  content: LayoutNode | null;
  /** Footer layout tree (null if no footer) */
  footer: LayoutNode | null;
  /** Currently active tree based on editing mode */
  activeTree: LayoutNode | null;

  // Editing Mode
  /** Current editing mode: 'content' | 'header' | 'footer' */
  editingMode: EditingMode;
  /** Switch to a different editing mode */
  setEditingMode: (mode: EditingMode) => void;
  /** Check if currently editing the specified mode */
  isEditing: (mode: EditingMode) => boolean;

  // Page Settings
  /** Current page settings */
  pageSettings: PageSettings;
  /** Update page settings (partial update) */
  updatePageSettings: (settings: Partial<PageSettings>) => void;

  // Component Operations
  /** Add a component to a parent */
  addComponent: (
    parentId: string,
    component: LayoutNode,
    index?: number
  ) => { success: boolean; error?: string; nodeId?: string };
  /** Update a component's properties */
  updateComponent: (
    id: string,
    updates: Partial<LayoutNode>
  ) => { success: boolean; error?: string };
  /** Delete a component */
  deleteComponent: (id: string) => { success: boolean; error?: string };
  /** Move a component to a new parent */
  moveComponent: (
    id: string,
    newParentId: string,
    index: number
  ) => { success: boolean; error?: string };
  /** Duplicate a component */
  duplicateComponent: (id: string) => {
    success: boolean;
    error?: string;
    nodeId?: string;
  };

  // Header/Footer Operations
  /** Update the header tree */
  updateHeader: (header: LayoutNode | null) => void;
  /** Update the footer tree */
  updateFooter: (footer: LayoutNode | null) => void;
  /** Clear the header */
  clearHeader: () => void;
  /** Clear the footer */
  clearFooter: () => void;
  /** Check if document has a header */
  hasHeader: boolean;
  /** Check if document has a footer */
  hasFooter: boolean;

  // Tree Utilities
  /** Get a component by ID */
  getComponent: (id: string) => LayoutNode | null;
  /** Get parent of a component */
  getParent: (id: string) => LayoutNode | null;
  /** Get children of a component */
  getChildren: (parentId: string) => LayoutNode[];
  /** Check if a component exists */
  hasComponent: (id: string) => boolean;
  /** Get all node IDs in the tree */
  getAllNodeIds: () => string[];
  /** Get total node count */
  getNodeCount: () => number;

  // State Management
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Last modification timestamp */
  lastModified: number | null;
  /** Clear all canvas state */
  clear: () => void;
  /** Load from JSON/template structure */
  loadFromJson: (json: LayoutNode | TemplateStructure) => void;
  /** Export to template structure */
  exportToJson: () => TemplateStructure;
  /** Mark canvas as clean (saved) */
  markClean: () => void;

  // Component Creation Helpers
  /** Generate a unique component ID */
  generateId: () => string;
  /** Create a new component node */
  createComponent: (
    type: ComponentType,
    properties?: Record<string, unknown>,
    options?: {
      id?: string;
      children?: LayoutNode[];
      child?: LayoutNode;
    }
  ) => LayoutNode;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * useCanvas - Composite hook for canvas state management
 *
 * @example
 * ```tsx
 * function CanvasEditor() {
 *   const {
 *     activeTree,
 *     editingMode,
 *     setEditingMode,
 *     addComponent,
 *     deleteComponent,
 *     pageSettings,
 *   } = useCanvas();
 *
 *   const handleAddText = () => {
 *     const textNode = createComponent(ComponentType.Text, { text: 'Hello' });
 *     if (activeTree) {
 *       addComponent(activeTree.id, textNode);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={() => setEditingMode('header')}>Edit Header</button>
 *       <button onClick={() => setEditingMode('content')}>Edit Content</button>
 *       <button onClick={() => setEditingMode('footer')}>Edit Footer</button>
 *       <button onClick={handleAddText}>Add Text</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCanvas(): UseCanvasReturn {
  // Get reactive state from selectors
  const header = useCanvasHeader();
  const content = useCanvasContent();
  const footer = useCanvasFooter();
  const editingMode = useEditingMode();
  const pageSettings = usePageSettings();
  const activeTree = useActiveTree();
  const isDirty = useCanvasIsDirty();
  const lastModified = useCanvasLastModified();

  // Memoized callbacks for operations
  const setEditingMode = useCallback((mode: EditingMode) => {
    useCanvasStore.getState().setEditingMode(mode);
  }, []);

  const isEditing = useCallback(
    (mode: EditingMode) => editingMode === mode,
    [editingMode]
  );

  const updatePageSettings = useCallback((settings: Partial<PageSettings>) => {
    useCanvasStore.getState().updatePageSettings(settings);
  }, []);

  const addComponent = useCallback(
    (parentId: string, component: LayoutNode, index?: number) => {
      return useCanvasStore.getState().addComponent(parentId, component, index);
    },
    []
  );

  const updateComponent = useCallback(
    (id: string, updates: Partial<LayoutNode>) => {
      return useCanvasStore.getState().updateComponent(id, updates);
    },
    []
  );

  const deleteComponent = useCallback((id: string) => {
    return useCanvasStore.getState().deleteComponent(id);
  }, []);

  const moveComponent = useCallback(
    (id: string, newParentId: string, index: number) => {
      return useCanvasStore.getState().moveComponent(id, newParentId, index);
    },
    []
  );

  const duplicateComponent = useCallback((id: string) => {
    return useCanvasStore.getState().duplicateComponent(id);
  }, []);

  const updateHeader = useCallback((newHeader: LayoutNode | null) => {
    useCanvasStore.getState().updateHeader(newHeader);
  }, []);

  const updateFooter = useCallback((newFooter: LayoutNode | null) => {
    useCanvasStore.getState().updateFooter(newFooter);
  }, []);

  const clearHeader = useCallback(() => {
    useCanvasStore.getState().clearHeader();
  }, []);

  const clearFooter = useCallback(() => {
    useCanvasStore.getState().clearFooter();
  }, []);

  const getComponent = useCallback((id: string) => {
    return useCanvasStore.getState().getComponent(id);
  }, []);

  const getParent = useCallback((id: string) => {
    return useCanvasStore.getState().getParent(id);
  }, []);

  const getChildren = useCallback((parentId: string) => {
    return useCanvasStore.getState().getChildren(parentId);
  }, []);

  const hasComponent = useCallback((id: string) => {
    return useCanvasStore.getState().hasNode(id);
  }, []);

  const getAllNodeIds = useCallback(() => {
    return useCanvasStore.getState().getAllNodeIds();
  }, []);

  const getNodeCount = useCallback(() => {
    return useCanvasStore.getState().getNodeCount();
  }, []);

  const clear = useCallback(() => {
    useCanvasStore.getState().clear();
  }, []);

  const loadFromJson = useCallback((json: LayoutNode | TemplateStructure) => {
    useCanvasStore.getState().loadFromJson(json);
  }, []);

  const exportToJson = useCallback(() => {
    return useCanvasStore.getState().exportToJson();
  }, []);

  const markClean = useCallback(() => {
    useCanvasStore.getState().markClean();
  }, []);

  const createComponent = useCallback(
    (
      type: ComponentType,
      properties: Record<string, unknown> = {},
      options?: {
        id?: string;
        children?: LayoutNode[];
        child?: LayoutNode;
      }
    ) => {
      return createComponentNode(type, properties, options);
    },
    []
  );

  // Memoized computed values
  const hasHeader = useMemo(() => header !== null, [header]);
  const hasFooter = useMemo(() => footer !== null, [footer]);

  return {
    // Layout Trees
    header,
    content,
    footer,
    activeTree,

    // Editing Mode
    editingMode,
    setEditingMode,
    isEditing,

    // Page Settings
    pageSettings,
    updatePageSettings,

    // Component Operations
    addComponent,
    updateComponent,
    deleteComponent,
    moveComponent,
    duplicateComponent,

    // Header/Footer Operations
    updateHeader,
    updateFooter,
    clearHeader,
    clearFooter,
    hasHeader,
    hasFooter,

    // Tree Utilities
    getComponent,
    getParent,
    getChildren,
    hasComponent,
    getAllNodeIds,
    getNodeCount,

    // State Management
    isDirty,
    lastModified,
    clear,
    loadFromJson,
    exportToJson,
    markClean,

    // Component Creation Helpers
    generateId,
    createComponent,
  };
}

// ============================================================================
// Convenience Selector Hooks
// ============================================================================

/**
 * Hook to check if editing a specific mode
 */
export function useIsEditingMode(mode: EditingMode): boolean {
  const currentMode = useEditingMode();
  return currentMode === mode;
}

/**
 * Hook to get the tree for a specific mode
 */
export function useTreeForMode(mode: EditingMode): LayoutNode | null {
  const header = useCanvasHeader();
  const content = useCanvasContent();
  const footer = useCanvasFooter();

  return useMemo(() => {
    switch (mode) {
      case "header":
        return header;
      case "footer":
        return footer;
      case "content":
      default:
        return content;
    }
  }, [mode, header, content, footer]);
}

/**
 * Hook to check if document has header or footer
 */
export function useHasHeaderFooter(): {
  hasHeader: boolean;
  hasFooter: boolean;
  hasEither: boolean;
  hasBoth: boolean;
} {
  const header = useCanvasHeader();
  const footer = useCanvasFooter();

  return useMemo(
    () => ({
      hasHeader: header !== null,
      hasFooter: footer !== null,
      hasEither: header !== null || footer !== null,
      hasBoth: header !== null && footer !== null,
    }),
    [header, footer]
  );
}

export default useCanvas;
