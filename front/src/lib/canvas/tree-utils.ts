/**
 * Tree Utilities for LayoutNode Traversal
 * Functions for traversing, finding, and manipulating the layout tree
 */

import type { LayoutNode } from "@/types/component";
import type {
  NodePath,
  NodeWithPath,
  FindNodeResult,
  TreeTraversalCallback,
} from "@/types/canvas";
import { isContainerComponent, isWrapperComponent } from "@/types/component";

// ============================================================================
// Tree Traversal
// ============================================================================

/**
 * Traverse the layout tree depth-first
 * @param root Root node to start traversal
 * @param callback Called for each node, return false to stop traversal
 */
export function traverseTree(
  root: LayoutNode,
  callback: TreeTraversalCallback
): void {
  traverseNode(root, [], null, 0, callback);
}

function traverseNode(
  node: LayoutNode,
  path: NodePath,
  parentId: string | null,
  depth: number,
  callback: TreeTraversalCallback
): boolean {
  // Call callback and check if we should continue
  const shouldContinue = callback(node, path, parentId, depth);
  if (shouldContinue === false) {
    return false;
  }

  // Traverse children if it's a container
  if (node.children && node.children.length > 0) {
    for (let i = 0; i < node.children.length; i++) {
      const childContinue = traverseNode(
        node.children[i],
        [...path, i],
        node.id,
        depth + 1,
        callback
      );
      if (!childContinue) {
        return false;
      }
    }
  }

  // Traverse single child if it's a wrapper
  if (node.child) {
    const childContinue = traverseNode(
      node.child,
      [...path, 0],
      node.id,
      depth + 1,
      callback
    );
    if (!childContinue) {
      return false;
    }
  }

  return true;
}

/**
 * Get all nodes as a flat array with path information
 */
export function flattenTree(root: LayoutNode): NodeWithPath[] {
  const nodes: NodeWithPath[] = [];
  traverseTree(root, (node, path, parentId, depth) => {
    nodes.push({ node, path, parentId, depth });
  });
  return nodes;
}

// ============================================================================
// Node Finding
// ============================================================================

/**
 * Find a node by ID
 */
export function findNodeById(
  root: LayoutNode,
  id: string
): FindNodeResult | null {
  let result: FindNodeResult | null = null;

  traverseTree(root, (node, path, parentId, _depth) => {
    if (node.id === id) {
      result = {
        node,
        path,
        parentId,
        parent: parentId ? (findNodeById(root, parentId)?.node ?? null) : null,
        index: path.length > 0 ? path[path.length - 1] : 0,
      };
      return false; // Stop traversal
    }
  });

  return result;
}

/**
 * Find a node by path
 */
export function findNodeByPath(
  root: LayoutNode,
  path: NodePath
): LayoutNode | null {
  if (path.length === 0) {
    return root;
  }

  let current: LayoutNode = root;
  for (const index of path) {
    if (current.children && current.children[index]) {
      current = current.children[index];
    } else if (current.child && index === 0) {
      current = current.child;
    } else {
      return null;
    }
  }

  return current;
}

/**
 * Find parent of a node by ID
 */
export function findParentNode(
  root: LayoutNode,
  childId: string
): FindNodeResult | null {
  const result = findNodeById(root, childId);
  if (!result || !result.parentId) {
    return null;
  }
  return findNodeById(root, result.parentId);
}

/**
 * Get all ancestor IDs from root to the node
 */
export function getAncestorIds(root: LayoutNode, nodeId: string): string[] {
  const ancestors: string[] = [];

  function findPath(node: LayoutNode, targetId: string): boolean {
    if (node.id === targetId) {
      return true;
    }

    if (node.children) {
      for (const child of node.children) {
        if (findPath(child, targetId)) {
          ancestors.unshift(node.id);
          return true;
        }
      }
    }

    if (node.child) {
      if (findPath(node.child, targetId)) {
        ancestors.unshift(node.id);
        return true;
      }
    }

    return false;
  }

  findPath(root, nodeId);
  return ancestors;
}

/**
 * Get all descendant IDs of a node
 */
export function getDescendantIds(node: LayoutNode): string[] {
  const descendants: string[] = [];

  traverseTree(node, (n) => {
    if (n.id !== node.id) {
      descendants.push(n.id);
    }
  });

  return descendants;
}

// ============================================================================
// Node Counting
// ============================================================================

/**
 * Count total nodes in the tree
 */
export function countTreeNodes(root: LayoutNode): number {
  let count = 0;
  traverseTree(root, () => {
    count++;
  });
  return count;
}

/**
 * Get the maximum depth of the tree
 */
export function getTreeMaxDepth(root: LayoutNode): number {
  let maxDepth = 0;
  traverseTree(root, (_node, _path, _parentId, depth) => {
    maxDepth = Math.max(maxDepth, depth);
  });
  return maxDepth;
}

// ============================================================================
// Node Manipulation (Immutable)
// ============================================================================

/**
 * Deep clone a layout node
 */
export function cloneNode(node: LayoutNode): LayoutNode {
  return JSON.parse(JSON.stringify(node));
}

/**
 * Clone a node with new IDs
 */
export function cloneNodeWithNewIds(
  node: LayoutNode,
  idGenerator: () => string
): LayoutNode {
  const cloned: LayoutNode = {
    ...node,
    id: idGenerator(),
    properties: { ...node.properties },
    style: node.style ? { ...node.style } : undefined,
  };

  if (node.children) {
    cloned.children = node.children.map((child) =>
      cloneNodeWithNewIds(child, idGenerator)
    );
  }

  if (node.child) {
    cloned.child = cloneNodeWithNewIds(node.child, idGenerator);
  }

  return cloned;
}

/**
 * Update a node by ID (returns new tree)
 */
export function updateNode(
  root: LayoutNode,
  id: string,
  updates: Partial<LayoutNode>
): LayoutNode {
  if (root.id === id) {
    return { ...root, ...updates };
  }

  const newRoot = { ...root };

  if (root.children) {
    newRoot.children = root.children.map((child) =>
      updateNode(child, id, updates)
    );
  }

  if (root.child) {
    newRoot.child = updateNode(root.child, id, updates);
  }

  return newRoot;
}

/**
 * Update node properties by ID
 */
export function updateNodeProperties(
  root: LayoutNode,
  id: string,
  properties: Record<string, unknown>
): LayoutNode {
  return updateNode(root, id, {
    properties: {
      ...findNodeById(root, id)?.node.properties,
      ...properties,
    },
  });
}

/**
 * Delete a node by ID (returns new tree)
 */
export function deleteNode(root: LayoutNode, id: string): LayoutNode | null {
  // Can't delete root
  if (root.id === id) {
    return null;
  }

  const newRoot = { ...root };

  if (root.children) {
    newRoot.children = root.children
      .filter((child) => child.id !== id)
      .map((child) => deleteNode(child, id) || child)
      .filter((child): child is LayoutNode => child !== null);
  }

  if (root.child && root.child.id === id) {
    newRoot.child = undefined;
  } else if (root.child) {
    newRoot.child = deleteNode(root.child, id) || root.child;
  }

  return newRoot;
}

/**
 * Add a child node to a parent
 */
export function addChildNode(
  root: LayoutNode,
  parentId: string,
  child: LayoutNode,
  index?: number
): LayoutNode {
  return updateNode(root, parentId, {
    children: addToChildren(
      findNodeById(root, parentId)?.node.children || [],
      child,
      index
    ),
  });
}

/**
 * Set the single child of a wrapper node
 */
export function setWrapperChild(
  root: LayoutNode,
  parentId: string,
  child: LayoutNode
): LayoutNode {
  return updateNode(root, parentId, { child });
}

/**
 * Move a node to a new parent
 */
export function moveNode(
  root: LayoutNode,
  nodeId: string,
  newParentId: string,
  newIndex: number
): LayoutNode {
  const nodeResult = findNodeById(root, nodeId);
  if (!nodeResult) {
    return root;
  }

  // Remove from current location
  const withoutNode = deleteNode(root, nodeId);
  if (!withoutNode) {
    return root;
  }

  // Add to new location
  return addChildNode(withoutNode, newParentId, nodeResult.node, newIndex);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Add item to children array at index
 */
function addToChildren(
  children: LayoutNode[],
  child: LayoutNode,
  index?: number
): LayoutNode[] {
  const newChildren = [...children];
  if (index !== undefined && index >= 0 && index <= children.length) {
    newChildren.splice(index, 0, child);
  } else {
    newChildren.push(child);
  }
  return newChildren;
}

/**
 * Check if a node can accept children
 */
export function canAcceptChildren(node: LayoutNode): boolean {
  return isContainerComponent(node.type) || isWrapperComponent(node.type);
}

/**
 * Check if moving a node would create a cycle
 */
export function wouldCreateCycle(
  root: LayoutNode,
  nodeId: string,
  newParentId: string
): boolean {
  // Can't move a node into itself or its descendants
  const foundNode = findNodeById(root, nodeId);
  const descendants = foundNode?.node ? getDescendantIds(foundNode.node) : [];
  return nodeId === newParentId || descendants.includes(newParentId);
}

/**
 * Generate a unique ID
 */
export function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
