/**
 * useTestData Hook
 *
 * Provides test data management functionality for PDF template expressions.
 * Features:
 * - Access and update test data
 * - Load sample data templates
 * - Resolve expressions with test data
 * - Validate data against expected schema
 */
"use client";

import { useCallback, useMemo } from "react";
import { useTemplateStore, useTemplateTestData } from "@/store/template-store";
import {
  getSampleDataById,
  sampleDataTemplates,
  type SampleDataTemplate,
} from "@/lib/constants/sample-data-templates";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Expression resolution result
 */
export interface ExpressionResolution {
  /** The original expression */
  expression: string;
  /** The resolved value (if found) */
  value: unknown;
  /** Whether the expression was successfully resolved */
  resolved: boolean;
  /** Error message if resolution failed */
  error?: string;
  /** The path extracted from the expression */
  path: string;
}

/**
 * Return type for useTestData hook
 */
export interface UseTestDataReturn {
  /** Current test data */
  testData: Record<string, unknown>;
  /** Whether test data is available */
  hasTestData: boolean;
  /** Update test data */
  updateTestData: (data: Record<string, unknown>) => void;
  /** Clear test data */
  clearTestData: () => void;
  /** Merge new data with existing test data */
  mergeTestData: (data: Record<string, unknown>) => void;
  /** Load a sample data template */
  loadSampleTemplate: (templateId: string) => boolean;
  /** Get all available sample templates */
  sampleTemplates: SampleDataTemplate[];
  /** Resolve an expression using test data */
  resolveExpression: (expression: string) => ExpressionResolution;
  /** Resolve multiple expressions */
  resolveExpressions: (expressions: string[]) => ExpressionResolution[];
  /** Get value at a specific path */
  getValueAtPath: (path: string) => unknown;
  /** Check if a path exists in test data */
  pathExists: (path: string) => boolean;
  /** Get all available paths in test data */
  availablePaths: string[];
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Extract path from expression (e.g., "{{ customer.name }}" -> "customer.name")
 */
function extractPathFromExpression(expression: string): string | null {
  const match = expression.match(/\{\{\s*([^}]+)\s*\}\}/);
  return match ? match[1].trim() : null;
}

/**
 * Get value from object at a given path
 */
function getValueAtPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Handle array access like "items[0]"
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, indexStr] = arrayMatch;
      const index = parseInt(indexStr, 10);
      current = (current as Record<string, unknown>)[key];
      if (Array.isArray(current)) {
        current = current[index];
      } else {
        return undefined;
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

/**
 * Check if a path exists in an object
 */
function pathExists(obj: Record<string, unknown>, path: string): boolean {
  return getValueAtPath(obj, path) !== undefined;
}

/**
 * Get all paths in an object
 */
function getAllPaths(
  obj: Record<string, unknown>,
  prefix: string = "",
  maxDepth: number = 5
): string[] {
  if (maxDepth <= 0) return [];

  const paths: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    paths.push(currentPath);

    if (value && typeof value === "object" && !Array.isArray(value)) {
      paths.push(
        ...getAllPaths(
          value as Record<string, unknown>,
          currentPath,
          maxDepth - 1
        )
      );
    } else if (Array.isArray(value) && value.length > 0) {
      paths.push(`${currentPath}[0]`);
      if (value[0] && typeof value[0] === "object") {
        paths.push(
          ...getAllPaths(
            value[0] as Record<string, unknown>,
            `${currentPath}[0]`,
            maxDepth - 1
          )
        );
      }
    }
  }

  return paths;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for managing test data in PDF templates
 *
 * @example
 * ```tsx
 * function ExpressionPreview() {
 *   const {
 *     testData,
 *     hasTestData,
 *     resolveExpression,
 *     loadSampleTemplate
 *   } = useTestData();
 *
 *   // Load sample data
 *   loadSampleTemplate("insurance-contract");
 *
 *   // Resolve an expression
 *   const result = resolveExpression("{{ policyholder.name }}");
 *   // result.value = "John Smith"
 * }
 * ```
 */
export function useTestData(): UseTestDataReturn {
  const testData = useTemplateTestData();
  const updateTestDataStore = useTemplateStore((state) => state.updateTestData);

  // Check if test data exists
  const hasTestData = useMemo(
    () => testData && Object.keys(testData).length > 0,
    [testData]
  );

  // Update test data
  const updateTestData = useCallback(
    (data: Record<string, unknown>) => {
      updateTestDataStore(data);
    },
    [updateTestDataStore]
  );

  // Clear test data
  const clearTestData = useCallback(() => {
    updateTestDataStore({});
  }, [updateTestDataStore]);

  // Merge new data with existing
  const mergeTestData = useCallback(
    (data: Record<string, unknown>) => {
      updateTestDataStore({ ...testData, ...data });
    },
    [testData, updateTestDataStore]
  );

  // Load sample template
  const loadSampleTemplate = useCallback(
    (templateId: string): boolean => {
      const template = getSampleDataById(templateId);
      if (template) {
        updateTestDataStore(template.data);
        return true;
      }
      return false;
    },
    [updateTestDataStore]
  );

  // Resolve a single expression
  const resolveExpression = useCallback(
    (expression: string): ExpressionResolution => {
      const path = extractPathFromExpression(expression);

      if (!path) {
        return {
          expression,
          value: undefined,
          resolved: false,
          error: "Invalid expression format. Use {{ path.to.field }}",
          path: "",
        };
      }

      const value = getValueAtPath(testData, path);
      const resolved = value !== undefined;

      return {
        expression,
        value,
        resolved,
        error: resolved ? undefined : `Path "${path}" not found in test data`,
        path,
      };
    },
    [testData]
  );

  // Resolve multiple expressions
  const resolveExpressions = useCallback(
    (expressions: string[]): ExpressionResolution[] => {
      return expressions.map((expr) => resolveExpression(expr));
    },
    [resolveExpression]
  );

  // Get value at path
  const getValueAtPathFn = useCallback(
    (path: string): unknown => {
      return getValueAtPath(testData, path);
    },
    [testData]
  );

  // Check if path exists
  const pathExistsFn = useCallback(
    (path: string): boolean => {
      return pathExists(testData, path);
    },
    [testData]
  );

  // Get all available paths
  const availablePaths = useMemo(
    () => (hasTestData ? getAllPaths(testData) : []),
    [testData, hasTestData]
  );

  return {
    testData,
    hasTestData,
    updateTestData,
    clearTestData,
    mergeTestData,
    loadSampleTemplate,
    sampleTemplates: sampleDataTemplates,
    resolveExpression,
    resolveExpressions,
    getValueAtPath: getValueAtPathFn,
    pathExists: pathExistsFn,
    availablePaths,
  };
}

// Default export
export default useTestData;
