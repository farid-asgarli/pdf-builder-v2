/**
 * General-purpose validators
 * Utility functions for validation
 */

import { layoutNodeSchema, type LayoutNodeSchemaType } from "./layout-node";
import { validateComponentProperties } from "./component-properties";
import {
  type ComponentType,
  isContainerComponent,
  isWrapperComponent,
  isLeafComponent,
} from "@/types/component";

/**
 * Validation error interface
 */
export interface ValidationError {
  path: string;
  message: string;
  code: string;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

/**
 * Validate a complete layout tree structure
 */
export function validateLayoutTree(root: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Schema validation
  const schemaResult = layoutNodeSchema.safeParse(root);
  if (!schemaResult.success) {
    schemaResult.error.issues.forEach((issue) => {
      errors.push({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      });
    });
    return { valid: false, errors, warnings };
  }

  // Deep structure validation
  validateNode(schemaResult.data, "", errors, warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Recursively validate a node and its children
 */
function validateNode(
  node: LayoutNodeSchemaType,
  path: string,
  errors: ValidationError[],
  warnings: string[]
): void {
  const nodePath = path
    ? `${path}.${node.id || node.type}`
    : node.id || node.type;
  const componentType = node.type as ComponentType;

  // Validate component properties
  if (node.properties) {
    const propResult = validateComponentProperties(
      componentType,
      node.properties
    );
    if (!propResult.success && propResult.errors) {
      propResult.errors.issues.forEach((issue) => {
        errors.push({
          path: `${nodePath}.properties.${issue.path.join(".")}`,
          message: issue.message,
          code: issue.code,
        });
      });
    }
  }

  // Validate structure rules
  const isContainer = isContainerComponent(componentType);
  const isWrapper = isWrapperComponent(componentType);
  const isLeaf = isLeafComponent(componentType);

  // Leaf components should not have children or child
  if (isLeaf) {
    if (node.children && node.children.length > 0) {
      errors.push({
        path: nodePath,
        message: `Leaf component '${componentType}' cannot have children`,
        code: "invalid_structure",
      });
    }
    if (node.child) {
      errors.push({
        path: nodePath,
        message: `Leaf component '${componentType}' cannot have a child`,
        code: "invalid_structure",
      });
    }
  }

  // Wrapper components should use 'child' not 'children'
  if (isWrapper) {
    if (node.children && node.children.length > 0) {
      warnings.push(
        `Wrapper component '${componentType}' at '${nodePath}' should use 'child' instead of 'children'`
      );
      // Validate first child only
      if (node.children[0]) {
        validateNode(node.children[0], nodePath, errors, warnings);
      }
      if (node.children.length > 1) {
        errors.push({
          path: nodePath,
          message: `Wrapper component '${componentType}' can only have one child`,
          code: "invalid_structure",
        });
      }
    }
    if (node.child) {
      validateNode(node.child, nodePath, errors, warnings);
    }
  }

  // Container components should use 'children' not 'child'
  if (isContainer) {
    if (node.child) {
      warnings.push(
        `Container component '${componentType}' at '${nodePath}' should use 'children' instead of 'child'`
      );
      validateNode(node.child, nodePath, errors, warnings);
    }
    if (node.children) {
      node.children.forEach((child, index) => {
        validateNode(child, `${nodePath}.children[${index}]`, errors, warnings);
      });
    }
  }

  // Validate repeatFor/repeatAs consistency
  if (node.repeatFor && !node.repeatAs) {
    warnings.push(
      `Node at '${nodePath}' has repeatFor but no repeatAs - will default to 'item'`
    );
  }

  // Validate expression syntax in visible field
  if (node.visible) {
    const expressionRegex = /\{\{.*?\}\}/g;
    if (!expressionRegex.test(node.visible)) {
      warnings.push(
        `Visible expression at '${nodePath}' should use {{ expression }} syntax`
      );
    }
  }
}

/**
 * Check if a string contains expression syntax
 */
export function containsExpression(value: string): boolean {
  return /\{\{.*?\}\}/.test(value);
}

/**
 * Extract expressions from a string
 */
export function extractExpressions(value: string): string[] {
  const matches = value.match(/\{\{(.*?)\}\}/g);
  return matches ? matches.map((m) => m.slice(2, -2).trim()) : [];
}

/**
 * Validate expression syntax (basic check)
 */
export function isValidExpression(expression: string): boolean {
  // Basic validation - check for balanced braces and valid content
  const content = expression.replace(/\{\{|\}\}/g, "").trim();
  if (!content) return false;

  // Check for valid identifier start
  if (!/^[a-zA-Z_$]/.test(content)) return false;

  // Check for obviously invalid patterns
  if (/\{\{|\}\}/.test(content)) return false;

  return true;
}

/**
 * Collect all node IDs in a tree
 */
export function collectNodeIds(root: LayoutNodeSchemaType): Set<string> {
  const ids = new Set<string>();

  function collect(node: LayoutNodeSchemaType): void {
    if (node.id) {
      ids.add(node.id);
    }
    if (node.children) {
      node.children.forEach(collect);
    }
    if (node.child) {
      collect(node.child);
    }
  }

  collect(root);
  return ids;
}

/**
 * Check for duplicate IDs in a tree
 */
export function findDuplicateIds(root: LayoutNodeSchemaType): string[] {
  const seen = new Map<string, number>();
  const duplicates: string[] = [];

  function traverse(node: LayoutNodeSchemaType): void {
    if (node.id) {
      const count = (seen.get(node.id) || 0) + 1;
      seen.set(node.id, count);
      if (count === 2) {
        duplicates.push(node.id);
      }
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
    if (node.child) {
      traverse(node.child);
    }
  }

  traverse(root);
  return duplicates;
}

/**
 * Calculate tree depth
 */
export function calculateTreeDepth(root: LayoutNodeSchemaType): number {
  function getDepth(node: LayoutNodeSchemaType): number {
    let maxChildDepth = 0;

    if (node.children) {
      for (const child of node.children) {
        maxChildDepth = Math.max(maxChildDepth, getDepth(child));
      }
    }
    if (node.child) {
      maxChildDepth = Math.max(maxChildDepth, getDepth(node.child));
    }

    return 1 + maxChildDepth;
  }

  return getDepth(root);
}

/**
 * Count total nodes in a tree
 */
export function countNodes(root: LayoutNodeSchemaType): number {
  let count = 1;

  if (root.children) {
    for (const child of root.children) {
      count += countNodes(child);
    }
  }
  if (root.child) {
    count += countNodes(root.child);
  }

  return count;
}
