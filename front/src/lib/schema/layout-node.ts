/**
 * LayoutNode Zod Schemas
 * Validates layout tree structure for PDF generation
 * Aligned with backend LayoutNodeDto validation
 */

import { z } from "zod";
import { ComponentType, isContainerComponent, isWrapperComponent, isLeafComponent } from "@/types/component";
import type { ComponentPropertiesMap } from "@/types/properties";

/**
 * Valid component type values
 */
export const componentTypeValues = Object.values(ComponentType) as [string, ...string[]];

/**
 * Style properties schema
 * Aligned with backend StylePropertiesDto
 */
export const stylePropertiesSchema = z.object({
  // Text Styling
  fontFamily: z.string().max(100).optional(),
  fontSize: z.number().min(1).max(1000).optional(),
  fontWeight: z.string().max(50).optional(),
  fontStyle: z.enum(["normal", "italic", "oblique"]).optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{3})$/).optional(),
  textDecoration: z.enum(["none", "underline", "strikethrough"]).optional(),
  lineHeight: z.number().min(0.1).max(10).optional(),
  letterSpacing: z.number().min(-100).max(100).optional(),
  textAlignment: z.enum(["left", "center", "right", "justify", "start", "end"]).optional(),
  
  // Layout
  horizontalAlignment: z.enum(["left", "center", "right", "start", "end"]).optional(),
  verticalAlignment: z.enum(["top", "middle", "center", "bottom"]).optional(),
  
  // Spacing
  padding: z.number().min(0).max(1000).optional(),
  paddingTop: z.number().min(0).max(1000).optional(),
  paddingRight: z.number().min(0).max(1000).optional(),
  paddingBottom: z.number().min(0).max(1000).optional(),
  paddingLeft: z.number().min(0).max(1000).optional(),
  paddingHorizontal: z.number().min(0).max(1000).optional(),
  paddingVertical: z.number().min(0).max(1000).optional(),
  
  // Visual
  backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{3})$/).optional(),
  borderColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{3})$/).optional(),
  borderWidth: z.number().min(0).max(100).optional(),
  borderTop: z.number().min(0).max(100).optional(),
  borderRight: z.number().min(0).max(100).optional(),
  borderBottom: z.number().min(0).max(100).optional(),
  borderLeft: z.number().min(0).max(100).optional(),
  borderRadius: z.number().min(0).max(500).optional(),
  opacity: z.number().min(0).max(1).optional(),
}).strict();

/**
 * Base layout node schema (without recursive children)
 */
export const baseLayoutNodeSchema = z.object({
  id: z.string().max(100).optional(),
  type: z.enum(componentTypeValues),
  properties: z.record(z.string(), z.unknown()).optional(),
  style: stylePropertiesSchema.optional(),
  visible: z.string().max(500).optional(),
  repeatFor: z.string().max(500).optional(),
  repeatAs: z.string().max(50).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/).optional(),
  repeatIndex: z.string().max(50).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/).optional(),
});

/**
 * Recursive layout node schema with children
 */
export type LayoutNodeSchemaType = z.infer<typeof baseLayoutNodeSchema> & {
  children?: LayoutNodeSchemaType[];
  child?: LayoutNodeSchemaType;
};

export const layoutNodeSchema: z.ZodType<LayoutNodeSchemaType> = baseLayoutNodeSchema.extend({
  children: z.lazy(() => layoutNodeSchema.array()).optional(),
  child: z.lazy(() => layoutNodeSchema).optional(),
});

/**
 * Validate a layout node structure
 */
export function validateLayoutNode(data: unknown): {
  success: boolean;
  data?: LayoutNodeSchemaType;
  errors?: z.ZodError;
} {
  const result = layoutNodeSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Type guard for LayoutNode
 */
export function isValidLayoutNode(data: unknown): data is LayoutNodeSchemaType {
  return layoutNodeSchema.safeParse(data).success;
}

// ============================================================================
// Typed LayoutNode Creation Helpers
// ============================================================================

/**
 * Create a typed layout node with proper properties
 * Uses the ComponentPropertiesMap for type-safe property definitions
 */
export interface TypedLayoutNode<T extends ComponentType = ComponentType> {
  id: string;
  type: T;
  properties: ComponentPropertiesMap[T];
  children?: TypedLayoutNode[];
  child?: TypedLayoutNode;
  style?: z.infer<typeof stylePropertiesSchema>;
  visible?: string;
  repeatFor?: string;
  repeatAs?: string;
  repeatIndex?: string;
}

/**
 * Create a new layout node with a unique ID
 */
export function createNode<T extends ComponentType>(
  type: T,
  properties: ComponentPropertiesMap[T],
  options?: {
    id?: string;
    style?: z.infer<typeof stylePropertiesSchema>;
    visible?: string;
    repeatFor?: string;
    repeatAs?: string;
    repeatIndex?: string;
  }
): TypedLayoutNode<T> {
  return {
    id: options?.id ?? generateNodeId(),
    type,
    properties,
    style: options?.style,
    visible: options?.visible,
    repeatFor: options?.repeatFor,
    repeatAs: options?.repeatAs,
    repeatIndex: options?.repeatIndex,
  };
}

/**
 * Generate a unique node ID
 */
export function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// Tree Utilities
// ============================================================================

/**
 * Find a node by ID in the tree
 */
export function findNodeById(
  root: LayoutNodeSchemaType,
  targetId: string
): LayoutNodeSchemaType | null {
  if (root.id === targetId) {
    return root;
  }

  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, targetId);
      if (found) return found;
    }
  }

  if (root.child) {
    const found = findNodeById(root.child, targetId);
    if (found) return found;
  }

  return null;
}

/**
 * Find parent of a node by ID
 */
export function findParentNode(
  root: LayoutNodeSchemaType,
  targetId: string
): { parent: LayoutNodeSchemaType; index: number } | null {
  if (root.children) {
    const index = root.children.findIndex((child) => child.id === targetId);
    if (index !== -1) {
      return { parent: root, index };
    }
    for (const child of root.children) {
      const found = findParentNode(child, targetId);
      if (found) return found;
    }
  }

  if (root.child && root.child.id === targetId) {
    return { parent: root, index: 0 };
  }

  if (root.child) {
    const found = findParentNode(root.child, targetId);
    if (found) return found;
  }

  return null;
}

/**
 * Get all descendant IDs of a node
 */
export function getDescendantIds(node: LayoutNodeSchemaType): string[] {
  const ids: string[] = [];

  function collect(n: LayoutNodeSchemaType): void {
    if (n.id) ids.push(n.id);
    if (n.children) n.children.forEach(collect);
    if (n.child) collect(n.child);
  }

  if (node.children) node.children.forEach(collect);
  if (node.child) collect(node.child);

  return ids;
}

/**
 * Deep clone a layout node
 */
export function cloneNode(
  node: LayoutNodeSchemaType,
  regenerateIds = true
): LayoutNodeSchemaType {
  const cloned: LayoutNodeSchemaType = {
    ...node,
    id: regenerateIds ? generateNodeId() : node.id,
    properties: node.properties ? { ...node.properties } : undefined,
    style: node.style ? { ...node.style } : undefined,
    children: node.children?.map((child) => cloneNode(child, regenerateIds)),
    child: node.child ? cloneNode(node.child, regenerateIds) : undefined,
  };
  return cloned;
}

/**
 * Flatten tree to array of nodes with depth info
 */
export function flattenTree(
  root: LayoutNodeSchemaType,
  depth = 0
): Array<{ node: LayoutNodeSchemaType; depth: number; parentId: string | null }> {
  const result: Array<{ node: LayoutNodeSchemaType; depth: number; parentId: string | null }> = [];

  function traverse(
    node: LayoutNodeSchemaType,
    currentDepth: number,
    parentId: string | null
  ): void {
    result.push({ node, depth: currentDepth, parentId });

    if (node.children) {
      for (const child of node.children) {
        traverse(child, currentDepth + 1, node.id ?? null);
      }
    }

    if (node.child) {
      traverse(node.child, currentDepth + 1, node.id ?? null);
    }
  }

  traverse(root, depth, null);
  return result;
}

/**
 * Check if a component type can accept children
 */
export function canAcceptChildren(type: ComponentType): boolean {
  return isContainerComponent(type) || isWrapperComponent(type);
}

/**
 * Check if a component type can accept multiple children
 */
export function canAcceptMultipleChildren(type: ComponentType): boolean {
  return isContainerComponent(type);
}

/**
 * Get the maximum number of children a component type can have
 */
export function getMaxChildren(type: ComponentType): number {
  if (isLeafComponent(type)) return 0;
  if (isWrapperComponent(type)) return 1;
  return Infinity; // Container components have no limit
}
