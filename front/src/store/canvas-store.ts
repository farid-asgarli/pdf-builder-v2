/**
 * Canvas Store
 * Manages the layout tree state for the canvas builder
 *
 * Features:
 * - Layout tree state (LayoutNode hierarchy)
 * - Separate trees for header, content, and footer
 * - Editing mode switching (content/header/footer)
 * - Component CRUD operations (add, update, delete, move)
 * - Tree traversal utilities
 * - Validation on state mutations
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";
import type { LayoutNode, ComponentType } from "@/types/component";
import {
  isContainerComponent,
  isWrapperComponent,
  isLeafComponent,
} from "@/types/component";
import type {
  NodePath,
  TreeTraversalCallback,
  EditingMode,
} from "@/types/canvas";

// ============================================================================
// Types
// ============================================================================

/**
 * Result of a validation check
 */
export interface ValidationCheckResult {
  valid: boolean;
  error?: string;
}

/**
 * Result of a mutation operation
 */
export interface MutationResult {
  success: boolean;
  error?: string;
  nodeId?: string;
}

/**
 * Canvas store state and actions
 */
interface CanvasState {
  // Layout trees (separate trees for header, content, footer)
  root: LayoutNode | null; // Alias for content (backward compatibility)
  header: LayoutNode | null;
  content: LayoutNode | null;
  footer: LayoutNode | null;

  // Current editing mode
  editingMode: EditingMode;

  // Dirty flag for tracking unsaved changes
  isDirty: boolean;

  // Last operation timestamp
  lastModified: number | null;

  // Editing Mode Actions
  setEditingMode: (mode: EditingMode) => void;
  getActiveTree: () => LayoutNode | null;
  setActiveTree: (tree: LayoutNode | null) => void;

  // Actions - CRUD Operations
  setRoot: (root: LayoutNode | null) => void;
  setHeader: (header: LayoutNode | null) => void;
  setContent: (content: LayoutNode | null) => void;
  setFooter: (footer: LayoutNode | null) => void;
  addComponent: (
    parentId: string,
    component: LayoutNode,
    index?: number
  ) => MutationResult;
  addComponentAsChild: (
    parentId: string,
    component: LayoutNode
  ) => MutationResult;
  updateComponent: (id: string, updates: Partial<LayoutNode>) => MutationResult;
  updateComponentProperty: (
    id: string,
    property: string,
    value: unknown
  ) => MutationResult;
  updateComponentProperties: (
    id: string,
    properties: Record<string, unknown>
  ) => MutationResult;
  deleteComponent: (id: string) => MutationResult;
  moveComponent: (
    id: string,
    newParentId: string,
    index: number
  ) => MutationResult;
  duplicateComponent: (id: string) => MutationResult;
  reorderComponent: (id: string, newIndex: number) => MutationResult;

  // Tree Traversal Utilities
  getComponent: (id: string) => LayoutNode | null;
  getParent: (id: string) => LayoutNode | null;
  getChildren: (parentId: string) => LayoutNode[];
  getPath: (id: string) => NodePath | null;
  getAncestors: (id: string) => string[];
  getDescendants: (id: string) => string[];
  getAllNodeIds: () => string[];
  getNodeCount: () => number;
  getTreeDepth: () => number;
  traverse: (callback: TreeTraversalCallback) => void;

  // Validation Utilities
  canAddChild: (
    parentId: string,
    childType: ComponentType
  ) => ValidationCheckResult;
  canMove: (nodeId: string, newParentId: string) => ValidationCheckResult;
  validateTree: () => ValidationCheckResult;
  hasNode: (id: string) => boolean;

  // State Management
  clear: () => void;
  clearHeader: () => void;
  clearFooter: () => void;
  loadFromJson: (json: LayoutNode) => void;
  exportToJson: () => LayoutNode | null;
  markClean: () => void;
  markDirty: () => void;
}

// ============================================================================
// Tree Traversal Helpers
// ============================================================================

/**
 * Find a node by ID in the tree
 */
function findNode(root: LayoutNode | null, id: string): LayoutNode | null {
  if (!root) return null;
  if (root.id === id) return root;

  // Check children array
  if (root.children) {
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }

  // Check single child (for wrapper components)
  if (root.child) {
    const found = findNode(root.child, id);
    if (found) return found;
  }

  return null;
}

/**
 * Find the parent of a node by ID
 */
function findParent(root: LayoutNode | null, id: string): LayoutNode | null {
  if (!root) return null;

  // Check children array
  if (root.children) {
    for (const child of root.children) {
      if (child.id === id) return root;
      const found = findParent(child, id);
      if (found) return found;
    }
  }

  // Check single child (for wrapper components)
  if (root.child) {
    if (root.child.id === id) return root;
    const found = findParent(root.child, id);
    if (found) return found;
  }

  return null;
}

/**
 * Find path to a node by ID
 */
function findPath(
  root: LayoutNode | null,
  id: string,
  currentPath: NodePath = []
): NodePath | null {
  if (!root) return null;
  if (root.id === id) return currentPath;

  if (root.children) {
    for (let i = 0; i < root.children.length; i++) {
      const found = findPath(root.children[i], id, [...currentPath, i]);
      if (found) return found;
    }
  }

  if (root.child) {
    const found = findPath(root.child, id, [...currentPath, 0]);
    if (found) return found;
  }

  return null;
}

/**
 * Traverse the tree and call callback for each node
 */
function traverseTree(
  root: LayoutNode,
  callback: TreeTraversalCallback,
  path: NodePath = [],
  parentId: string | null = null,
  depth: number = 0
): boolean {
  const shouldContinue = callback(root, path, parentId, depth);
  if (shouldContinue === false) return false;

  if (root.children) {
    for (let i = 0; i < root.children.length; i++) {
      const continueTraversal = traverseTree(
        root.children[i],
        callback,
        [...path, i],
        root.id,
        depth + 1
      );
      if (!continueTraversal) return false;
    }
  }

  if (root.child) {
    const continueTraversal = traverseTree(
      root.child,
      callback,
      [...path, 0],
      root.id,
      depth + 1
    );
    if (!continueTraversal) return false;
  }

  return true;
}

/**
 * Get all ancestor IDs from root to the node
 */
function getAncestorIds(root: LayoutNode, nodeId: string): string[] {
  const ancestors: string[] = [];

  function findPathToNode(node: LayoutNode, targetId: string): boolean {
    if (node.id === targetId) return true;

    if (node.children) {
      for (const child of node.children) {
        if (findPathToNode(child, targetId)) {
          ancestors.unshift(node.id);
          return true;
        }
      }
    }

    if (node.child) {
      if (findPathToNode(node.child, targetId)) {
        ancestors.unshift(node.id);
        return true;
      }
    }

    return false;
  }

  findPathToNode(root, nodeId);
  return ancestors;
}

/**
 * Get all descendant IDs of a node
 */
function getDescendantIds(node: LayoutNode): string[] {
  const descendants: string[] = [];

  traverseTree(node, (n) => {
    if (n.id !== node.id) {
      descendants.push(n.id);
    }
  });

  return descendants;
}

/**
 * Collect all node IDs in the tree
 */
function collectAllIds(root: LayoutNode): string[] {
  const ids: string[] = [];
  traverseTree(root, (node) => {
    ids.push(node.id);
  });
  return ids;
}

/**
 * Count total nodes in the tree
 */
function countNodes(root: LayoutNode): number {
  let count = 0;
  traverseTree(root, () => {
    count++;
  });
  return count;
}

/**
 * Get the maximum depth of the tree
 */
function getMaxDepth(root: LayoutNode): number {
  let maxDepth = 0;
  traverseTree(root, (_node, _path, _parentId, depth) => {
    maxDepth = Math.max(maxDepth, depth);
  });
  return maxDepth;
}

/**
 * Clone a node with new IDs (deep clone)
 */
function cloneNodeWithNewIds(node: LayoutNode): LayoutNode {
  const cloned: LayoutNode = {
    ...node,
    id: generateId(),
    properties: { ...node.properties },
    style: node.style ? { ...node.style } : undefined,
  };

  if (node.children) {
    cloned.children = node.children.map((child) => cloneNodeWithNewIds(child));
  }

  if (node.child) {
    cloned.child = cloneNodeWithNewIds(node.child);
  }

  return cloned;
}

/**
 * Check if moving a node would create a cycle
 */
function wouldCreateCycle(
  root: LayoutNode,
  nodeId: string,
  newParentId: string
): boolean {
  if (nodeId === newParentId) return true;

  const node = findNode(root, nodeId);
  if (!node) return false;

  const descendants = getDescendantIds(node);
  return descendants.includes(newParentId);
}

/**
 * Check for duplicate IDs in the tree
 */
function findDuplicateIds(root: LayoutNode): string[] {
  const seen = new Map<string, number>();
  const duplicates: string[] = [];

  traverseTree(root, (node) => {
    const count = (seen.get(node.id) || 0) + 1;
    seen.set(node.id, count);
    if (count === 2) {
      duplicates.push(node.id);
    }
  });

  return duplicates;
}

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a unique ID for components
 */
export function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new component node with default structure
 */
export function createComponentNode(
  type: ComponentType,
  properties: Record<string, unknown> = {},
  options?: {
    id?: string;
    children?: LayoutNode[];
    child?: LayoutNode;
    style?: LayoutNode["style"];
    visible?: string;
    repeatFor?: string;
    repeatAs?: string;
    repeatIndex?: string;
  }
): LayoutNode {
  const isContainer = isContainerComponent(type);
  const isWrapper = isWrapperComponent(type);

  const node: LayoutNode = {
    id: options?.id ?? generateId(),
    type,
    properties,
  };

  // Add children array for container components
  if (isContainer) {
    node.children = options?.children ?? [];
  }

  // Add child for wrapper components
  if (isWrapper && options?.child) {
    node.child = options.child;
  }

  // Add optional properties
  if (options?.style) {
    node.style = options.style;
  }
  if (options?.visible) {
    node.visible = options.visible;
  }
  if (options?.repeatFor) {
    node.repeatFor = options.repeatFor;
    node.repeatAs = options?.repeatAs ?? "item";
    node.repeatIndex = options?.repeatIndex;
  }

  return node;
}

// ============================================================================
// Canvas Store
// ============================================================================

export const useCanvasStore = create<CanvasState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // Initial state
      root: null, // Alias for content (backward compatibility)
      header: null,
      content: null,
      footer: null,
      editingMode: "content" as EditingMode,
      isDirty: false,
      lastModified: null,

      // ========================================================================
      // Editing Mode Operations
      // ========================================================================

      setEditingMode: (mode: EditingMode) => {
        set((state) => {
          state.editingMode = mode;
        });
      },

      getActiveTree: () => {
        const state = get();
        switch (state.editingMode) {
          case "header":
            return state.header;
          case "footer":
            return state.footer;
          case "content":
          default:
            return state.content ?? state.root;
        }
      },

      setActiveTree: (tree: LayoutNode | null) => {
        const mode = get().editingMode;
        set((state) => {
          switch (mode) {
            case "header":
              state.header = tree;
              break;
            case "footer":
              state.footer = tree;
              break;
            case "content":
            default:
              state.content = tree;
              state.root = tree; // Keep root in sync for backward compatibility
              break;
          }
          state.isDirty = true;
          state.lastModified = Date.now();
        });
      },

      // ========================================================================
      // CRUD Operations
      // ========================================================================

      setRoot: (root) => {
        set((state) => {
          state.root = root;
          state.content = root; // Keep content in sync
          state.isDirty = true;
          state.lastModified = Date.now();
        });
      },

      setHeader: (header) => {
        set((state) => {
          state.header = header;
          state.isDirty = true;
          state.lastModified = Date.now();
        });
      },

      setContent: (content) => {
        set((state) => {
          state.content = content;
          state.root = content; // Keep root in sync for backward compatibility
          state.isDirty = true;
          state.lastModified = Date.now();
        });
      },

      setFooter: (footer) => {
        set((state) => {
          state.footer = footer;
          state.isDirty = true;
          state.lastModified = Date.now();
        });
      },

      addComponent: (parentId, component, index) => {
        const state = get();

        // Validation: Check if component can be added to parent
        if (state.root) {
          const parent = findNode(state.root, parentId);
          if (!parent) {
            return { success: false, error: `Parent not found: ${parentId}` };
          }

          const validation = get().canAddChild(parentId, component.type);
          if (!validation.valid) {
            return { success: false, error: validation.error };
          }

          // Check for duplicate ID
          if (findNode(state.root, component.id)) {
            return {
              success: false,
              error: `Duplicate ID: ${component.id}. Each component must have a unique ID.`,
            };
          }
        }

        set((state) => {
          if (!state.root) {
            // If no root, set the component as root
            state.root = component;
            state.isDirty = true;
            state.lastModified = Date.now();
            return;
          }

          const parent = findNode(state.root, parentId);
          if (parent) {
            // For container components, use children array
            if (isContainerComponent(parent.type)) {
              if (!parent.children) {
                parent.children = [];
              }
              if (index !== undefined && index >= 0) {
                parent.children.splice(index, 0, component);
              } else {
                parent.children.push(component);
              }
            }
            // For wrapper components, set as child (with validation already done)
            else if (isWrapperComponent(parent.type)) {
              if (!parent.children) {
                parent.children = [];
              }
              parent.children.push(component);
            }
            state.isDirty = true;
            state.lastModified = Date.now();
          }
        });

        return { success: true, nodeId: component.id };
      },

      addComponentAsChild: (parentId, component) => {
        const state = get();

        if (!state.root) {
          return { success: false, error: "No root node exists" };
        }

        const parent = findNode(state.root, parentId);
        if (!parent) {
          return { success: false, error: `Parent not found: ${parentId}` };
        }

        if (!isWrapperComponent(parent.type)) {
          return {
            success: false,
            error: `Parent ${parent.type} is not a wrapper component`,
          };
        }

        if (parent.child) {
          return {
            success: false,
            error: `Wrapper component already has a child`,
          };
        }

        // Check for duplicate ID
        if (findNode(state.root, component.id)) {
          return {
            success: false,
            error: `Duplicate ID: ${component.id}. Each component must have a unique ID.`,
          };
        }

        set((state) => {
          const parent = findNode(state.root!, parentId);
          if (parent) {
            parent.child = component;
            state.isDirty = true;
            state.lastModified = Date.now();
          }
        });

        return { success: true, nodeId: component.id };
      },

      updateComponent: (id, updates) => {
        const state = get();

        if (!state.root) {
          return { success: false, error: "No root node exists" };
        }

        const node = findNode(state.root, id);
        if (!node) {
          return { success: false, error: `Component not found: ${id}` };
        }

        // Prevent updating the ID to a duplicate
        if (updates.id && updates.id !== id) {
          if (findNode(state.root, updates.id)) {
            return {
              success: false,
              error: `Cannot update ID: ${updates.id} already exists`,
            };
          }
        }

        set((state) => {
          const node = findNode(state.root!, id);
          if (node) {
            // Don't allow changing the type of a node
            const { type: _type, ...safeUpdates } = updates;
            Object.assign(node, safeUpdates);
            state.isDirty = true;
            state.lastModified = Date.now();
          }
        });

        return { success: true, nodeId: id };
      },

      updateComponentProperty: (id, property, value) => {
        const state = get();

        if (!state.root) {
          return { success: false, error: "No root node exists" };
        }

        const node = findNode(state.root, id);
        if (!node) {
          return { success: false, error: `Component not found: ${id}` };
        }

        set((state) => {
          const node = findNode(state.root!, id);
          if (node) {
            if (!node.properties) {
              node.properties = {};
            }
            node.properties[property] = value;
            state.isDirty = true;
            state.lastModified = Date.now();
          }
        });

        return { success: true, nodeId: id };
      },

      updateComponentProperties: (id, properties) => {
        const state = get();

        if (!state.root) {
          return { success: false, error: "No root node exists" };
        }

        const node = findNode(state.root, id);
        if (!node) {
          return { success: false, error: `Component not found: ${id}` };
        }

        set((state) => {
          const node = findNode(state.root!, id);
          if (node) {
            node.properties = { ...node.properties, ...properties };
            state.isDirty = true;
            state.lastModified = Date.now();
          }
        });

        return { success: true, nodeId: id };
      },

      deleteComponent: (id) => {
        const state = get();

        if (!state.root) {
          return { success: false, error: "No root node exists" };
        }

        if (state.root.id === id) {
          set((state) => {
            state.root = null;
            state.isDirty = true;
            state.lastModified = Date.now();
          });
          return { success: true, nodeId: id };
        }

        const parent = findParent(state.root, id);
        if (!parent) {
          return { success: false, error: `Component not found: ${id}` };
        }

        set((state) => {
          const parent = findParent(state.root!, id);
          if (parent) {
            // Handle children array
            if (parent.children) {
              parent.children = parent.children.filter(
                (child) => child.id !== id
              );
            }
            // Handle single child (wrapper components)
            if (parent.child?.id === id) {
              parent.child = undefined;
            }
            state.isDirty = true;
            state.lastModified = Date.now();
          }
        });

        return { success: true, nodeId: id };
      },

      moveComponent: (id, newParentId, index) => {
        const state = get();

        if (!state.root) {
          return { success: false, error: "No root node exists" };
        }

        // Validate the move
        const validation = get().canMove(id, newParentId);
        if (!validation.valid) {
          return { success: false, error: validation.error };
        }

        const node = findNode(state.root, id);
        const newParent = findNode(state.root, newParentId);

        if (!node) {
          return { success: false, error: `Component not found: ${id}` };
        }

        if (!newParent) {
          return {
            success: false,
            error: `New parent not found: ${newParentId}`,
          };
        }

        set((state) => {
          const node = findNode(state.root!, id);
          const currentParent = findParent(state.root!, id);
          const newParent = findNode(state.root!, newParentId);

          if (!node || !newParent) return;

          // Remove from current parent
          if (currentParent) {
            if (currentParent.children) {
              currentParent.children = currentParent.children.filter(
                (child) => child.id !== id
              );
            }
            if (currentParent.child?.id === id) {
              currentParent.child = undefined;
            }
          }

          // Add to new parent
          if (isContainerComponent(newParent.type)) {
            if (!newParent.children) {
              newParent.children = [];
            }
            if (index >= 0 && index <= newParent.children.length) {
              newParent.children.splice(index, 0, node);
            } else {
              newParent.children.push(node);
            }
          } else if (isWrapperComponent(newParent.type)) {
            // For wrappers, only add if no child exists
            if (!newParent.child) {
              newParent.child = node;
            }
          }

          state.isDirty = true;
          state.lastModified = Date.now();
        });

        return { success: true, nodeId: id };
      },

      duplicateComponent: (id) => {
        const state = get();

        if (!state.root) {
          return { success: false, error: "No root node exists" };
        }

        const node = findNode(state.root, id);
        if (!node) {
          return { success: false, error: `Component not found: ${id}` };
        }

        const parent = findParent(state.root, id);
        if (!parent) {
          // Can't duplicate root
          return { success: false, error: "Cannot duplicate root component" };
        }

        // Create a deep clone with new IDs
        const clonedNode = cloneNodeWithNewIds(node);

        // Find the index of the original node
        let insertIndex: number | undefined;
        if (parent.children) {
          const originalIndex = parent.children.findIndex((c) => c.id === id);
          if (originalIndex !== -1) {
            insertIndex = originalIndex + 1;
          }
        }

        // Add the cloned node after the original
        return get().addComponent(parent.id, clonedNode, insertIndex);
      },

      reorderComponent: (id, newIndex) => {
        const state = get();

        if (!state.root) {
          return { success: false, error: "No root node exists" };
        }

        // Can't reorder root
        if (state.root.id === id) {
          return { success: false, error: "Cannot reorder root component" };
        }

        const node = findNode(state.root, id);
        if (!node) {
          return { success: false, error: `Component not found: ${id}` };
        }

        const parent = findParent(state.root, id);
        if (!parent) {
          return { success: false, error: "Parent not found" };
        }

        // Can only reorder within container components with children array
        if (!parent.children || !isContainerComponent(parent.type)) {
          return {
            success: false,
            error: "Can only reorder children of container components",
          };
        }

        const currentIndex = parent.children.findIndex((c) => c.id === id);
        if (currentIndex === -1) {
          return { success: false, error: "Component not found in parent" };
        }

        // Validate new index
        if (newIndex < 0 || newIndex >= parent.children.length) {
          return { success: false, error: "Invalid index" };
        }

        // No change needed if same index
        if (currentIndex === newIndex) {
          return { success: true, nodeId: id };
        }

        set((state) => {
          const parent = findParent(state.root!, id);
          if (parent && parent.children) {
            // Remove from current position
            const [removed] = parent.children.splice(currentIndex, 1);
            // Insert at new position
            parent.children.splice(newIndex, 0, removed);
            state.isDirty = true;
            state.lastModified = Date.now();
          }
        });

        return { success: true, nodeId: id };
      },

      // ========================================================================
      // Tree Traversal Utilities
      // ========================================================================

      getComponent: (id) => {
        return findNode(get().root, id);
      },

      getParent: (id) => {
        return findParent(get().root, id);
      },

      getChildren: (parentId) => {
        const parent = findNode(get().root, parentId);
        if (!parent) return [];

        // Return both children array and child
        const children: LayoutNode[] = [];
        if (parent.children) {
          children.push(...parent.children);
        }
        if (parent.child) {
          children.push(parent.child);
        }
        return children;
      },

      getPath: (id) => {
        return findPath(get().root, id);
      },

      getAncestors: (id) => {
        const root = get().root;
        if (!root) return [];
        return getAncestorIds(root, id);
      },

      getDescendants: (id) => {
        const node = findNode(get().root, id);
        if (!node) return [];
        return getDescendantIds(node);
      },

      getAllNodeIds: () => {
        const root = get().root;
        if (!root) return [];
        return collectAllIds(root);
      },

      getNodeCount: () => {
        const root = get().root;
        if (!root) return 0;
        return countNodes(root);
      },

      getTreeDepth: () => {
        const root = get().root;
        if (!root) return 0;
        return getMaxDepth(root);
      },

      traverse: (callback) => {
        const root = get().root;
        if (root) {
          traverseTree(root, callback);
        }
      },

      // ========================================================================
      // Validation Utilities
      // ========================================================================

      canAddChild: (parentId) => {
        const root = get().root;

        if (!root) {
          // If no root, any component can be added
          return { valid: true };
        }

        const parent = findNode(root, parentId);
        if (!parent) {
          return { valid: false, error: `Parent not found: ${parentId}` };
        }

        const parentType = parent.type;

        // Leaf components cannot have children
        if (isLeafComponent(parentType)) {
          return {
            valid: false,
            error: `${parentType} is a leaf component and cannot have children`,
          };
        }

        // Wrapper components can only have one child
        if (isWrapperComponent(parentType)) {
          if (parent.child) {
            return {
              valid: false,
              error: `${parentType} is a wrapper component and already has a child. Use addComponentAsChild instead.`,
            };
          }
          // For wrappers, allow adding via children array as fallback
        }

        // Container components can have multiple children
        if (isContainerComponent(parentType)) {
          // Any component can be added to a container
          return { valid: true };
        }

        return { valid: true };
      },

      canMove: (nodeId, newParentId) => {
        const root = get().root;

        if (!root) {
          return { valid: false, error: "No root node exists" };
        }

        // Cannot move root
        if (root.id === nodeId) {
          return { valid: false, error: "Cannot move the root component" };
        }

        const node = findNode(root, nodeId);
        if (!node) {
          return { valid: false, error: `Component not found: ${nodeId}` };
        }

        const newParent = findNode(root, newParentId);
        if (!newParent) {
          return {
            valid: false,
            error: `New parent not found: ${newParentId}`,
          };
        }

        // Check for cycle
        if (wouldCreateCycle(root, nodeId, newParentId)) {
          return {
            valid: false,
            error: "Cannot move a component into itself or its descendants",
          };
        }

        // Check if new parent can accept children
        if (isLeafComponent(newParent.type)) {
          return {
            valid: false,
            error: `${newParent.type} is a leaf component and cannot have children`,
          };
        }

        // Check if wrapper already has a child
        if (isWrapperComponent(newParent.type) && newParent.child) {
          return {
            valid: false,
            error: `${newParent.type} is a wrapper component and already has a child`,
          };
        }

        return { valid: true };
      },

      validateTree: () => {
        const root = get().root;

        if (!root) {
          return { valid: true }; // Empty tree is valid
        }

        // Check for duplicate IDs
        const duplicates = findDuplicateIds(root);
        if (duplicates.length > 0) {
          return {
            valid: false,
            error: `Duplicate IDs found: ${duplicates.join(", ")}`,
          };
        }

        // Check structure rules
        let structureError: string | null = null;

        traverseTree(root, (node) => {
          // Leaf components should not have children
          if (isLeafComponent(node.type)) {
            if ((node.children && node.children.length > 0) || node.child) {
              structureError = `Leaf component ${node.type} (${node.id}) cannot have children`;
              return false;
            }
          }

          // Wrapper components should have at most one child
          if (isWrapperComponent(node.type)) {
            const childCount =
              (node.children?.length || 0) + (node.child ? 1 : 0);
            if (childCount > 1) {
              structureError = `Wrapper component ${node.type} (${node.id}) can only have one child`;
              return false;
            }
          }
        });

        if (structureError) {
          return { valid: false, error: structureError };
        }

        return { valid: true };
      },

      hasNode: (id) => {
        return findNode(get().root, id) !== null;
      },

      // ========================================================================
      // State Management
      // ========================================================================

      clear: () => {
        set((state) => {
          state.root = null;
          state.header = null;
          state.content = null;
          state.footer = null;
          state.editingMode = "content";
          state.isDirty = false;
          state.lastModified = null;
        });
      },

      clearHeader: () => {
        set((state) => {
          state.header = null;
          state.isDirty = true;
          state.lastModified = Date.now();
        });
      },

      clearFooter: () => {
        set((state) => {
          state.footer = null;
          state.isDirty = true;
          state.lastModified = Date.now();
        });
      },

      loadFromJson: (json) => {
        // Validate the JSON structure before loading
        // This is a basic check - more comprehensive validation can be done
        if (!json || typeof json !== "object") {
          console.error("Invalid JSON structure");
          return;
        }

        set((state) => {
          state.root = json;
          state.content = json; // Keep content in sync
          state.isDirty = false;
          state.lastModified = Date.now();
        });
      },

      exportToJson: () => {
        const root = get().root;
        if (!root) return null;

        // Return a deep clone to prevent external mutations
        return JSON.parse(JSON.stringify(root));
      },

      markClean: () => {
        set((state) => {
          state.isDirty = false;
        });
      },

      markDirty: () => {
        set((state) => {
          state.isDirty = true;
          state.lastModified = Date.now();
        });
      },
    }))
  )
);

// ============================================================================
// Selector Hooks for Performance Optimization
// ============================================================================

/**
 * Subscribe to root changes only
 */
export const useCanvasRoot = () => useCanvasStore((state) => state.root);

/**
 * Subscribe to header tree changes only
 */
export const useCanvasHeader = () => useCanvasStore((state) => state.header);

/**
 * Subscribe to content tree changes only
 */
export const useCanvasContent = () => useCanvasStore((state) => state.content);

/**
 * Subscribe to footer tree changes only
 */
export const useCanvasFooter = () => useCanvasStore((state) => state.footer);

/**
 * Subscribe to editing mode changes only
 */
export const useEditingMode = () =>
  useCanvasStore((state) => state.editingMode);

/**
 * Subscribe to dirty state only
 */
export const useCanvasIsDirty = () => useCanvasStore((state) => state.isDirty);

/**
 * Subscribe to last modified timestamp
 */
export const useCanvasLastModified = () =>
  useCanvasStore((state) => state.lastModified);

/**
 * Get a specific component by ID (with shallow comparison)
 */
export const useComponent = (id: string) =>
  useCanvasStore((state) => findNode(state.root, id));
