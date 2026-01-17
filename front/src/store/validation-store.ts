/**
 * Validation Store
 * Manages validation state for the canvas builder
 *
 * Features:
 * - Track validation errors and warnings
 * - Map errors to node IDs for tree highlighting
 * - Track validation status (idle, validating, valid, invalid)
 * - Support pre-validation before PDF generation
 */
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  ValidationErrorDto,
  ValidationWarningDto,
  LayoutStatistics,
  ValidationResponse,
} from "@/types/api";

// ============================================================================
// Types
// ============================================================================

/**
 * Validation status
 */
export type ValidationStatus = "idle" | "validating" | "valid" | "invalid";

/**
 * Node validation info - aggregates errors/warnings for a specific node
 */
export interface NodeValidationInfo {
  nodeId: string;
  errors: ValidationErrorDto[];
  warnings: ValidationWarningDto[];
  hasErrors: boolean;
  hasWarnings: boolean;
  severity: "error" | "warning" | "none";
}

/**
 * Validation store state and actions
 */
interface ValidationState {
  // ========================================
  // State
  // ========================================

  /** Current validation status */
  status: ValidationStatus;

  /** Whether validation is in progress */
  isValidating: boolean;

  /** Whether the layout is valid (no errors) */
  isValid: boolean;

  /** Validation errors from the last validation */
  errors: ValidationErrorDto[];

  /** Validation warnings from the last validation */
  warnings: ValidationWarningDto[];

  /** Layout statistics from the last validation */
  statistics: LayoutStatistics | null;

  /** Validation time in milliseconds */
  validationTimeMs: number | null;

  /** Last validation timestamp */
  lastValidatedAt: number | null;

  /** Error message if validation request failed */
  requestError: string | null;

  /** Map of node IDs to their validation info for quick lookup */
  nodeValidationMap: Map<string, NodeValidationInfo>;

  /** Set of node IDs that have errors */
  nodesWithErrors: Set<string>;

  /** Set of node IDs that have warnings */
  nodesWithWarnings: Set<string>;

  // ========================================
  // Actions
  // ========================================

  /**
   * Set validation as in progress
   */
  setValidating: () => void;

  /**
   * Update store with validation response
   */
  setValidationResult: (response: ValidationResponse) => void;

  /**
   * Set validation request error
   */
  setRequestError: (error: string | null) => void;

  /**
   * Clear all validation state
   */
  clearValidation: () => void;

  /**
   * Reset to idle state
   */
  reset: () => void;

  // ========================================
  // Query Utilities
  // ========================================

  /**
   * Get validation info for a specific node
   */
  getNodeValidation: (nodeId: string) => NodeValidationInfo | null;

  /**
   * Check if a node has validation errors
   */
  hasNodeError: (nodeId: string) => boolean;

  /**
   * Check if a node has validation warnings
   */
  hasNodeWarning: (nodeId: string) => boolean;

  /**
   * Get the severity for a node (error > warning > none)
   */
  getNodeSeverity: (nodeId: string) => "error" | "warning" | "none";

  /**
   * Get error count
   */
  getErrorCount: () => number;

  /**
   * Get warning count
   */
  getWarningCount: () => number;

  /**
   * Get errors grouped by severity
   */
  getErrorsBySeverity: () => Record<string, ValidationErrorDto[]>;

  /**
   * Get warnings grouped by category
   */
  getWarningsByCategory: () => Record<string, ValidationWarningDto[]>;

  /**
   * Get errors for a specific node
   */
  getNodeErrors: (nodeId: string) => ValidationErrorDto[];

  /**
   * Get warnings for a specific node
   */
  getNodeWarnings: (nodeId: string) => ValidationWarningDto[];
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Build the node validation map from errors and warnings
 */
function buildNodeValidationMap(
  errors: ValidationErrorDto[],
  warnings: ValidationWarningDto[]
): Map<string, NodeValidationInfo> {
  const map = new Map<string, NodeValidationInfo>();

  // Helper to get or create node info
  const getOrCreate = (nodeId: string): NodeValidationInfo => {
    let info = map.get(nodeId);
    if (!info) {
      info = {
        nodeId,
        errors: [],
        warnings: [],
        hasErrors: false,
        hasWarnings: false,
        severity: "none",
      };
      map.set(nodeId, info);
    }
    return info;
  };

  // Add errors to nodes
  for (const error of errors) {
    const nodeId = error.nodeId || "unknown";
    const info = getOrCreate(nodeId);
    info.errors.push(error);
    info.hasErrors = true;
    info.severity = "error";
  }

  // Add warnings to nodes
  for (const warning of warnings) {
    const nodeId = warning.nodeId || "unknown";
    const info = getOrCreate(nodeId);
    info.warnings.push(warning);
    info.hasWarnings = true;
    // Only upgrade to warning if no errors
    if (!info.hasErrors) {
      info.severity = "warning";
    }
  }

  return map;
}

/**
 * Extract node IDs that have errors
 */
function extractNodesWithErrors(errors: ValidationErrorDto[]): Set<string> {
  const set = new Set<string>();
  for (const error of errors) {
    if (error.nodeId) {
      set.add(error.nodeId);
    }
  }
  return set;
}

/**
 * Extract node IDs that have warnings
 */
function extractNodesWithWarnings(
  warnings: ValidationWarningDto[]
): Set<string> {
  const set = new Set<string>();
  for (const warning of warnings) {
    if (warning.nodeId) {
      set.add(warning.nodeId);
    }
  }
  return set;
}

// ============================================================================
// Store Creation
// ============================================================================

export const useValidationStore = create<ValidationState>()(
  subscribeWithSelector((set, get) => ({
    // ========================================
    // Initial State
    // ========================================
    status: "idle",
    isValidating: false,
    isValid: true,
    errors: [],
    warnings: [],
    statistics: null,
    validationTimeMs: null,
    lastValidatedAt: null,
    requestError: null,
    nodeValidationMap: new Map(),
    nodesWithErrors: new Set(),
    nodesWithWarnings: new Set(),

    // ========================================
    // Actions
    // ========================================

    setValidating: () => {
      set({
        status: "validating",
        isValidating: true,
        requestError: null,
      });
    },

    setValidationResult: (response: ValidationResponse) => {
      const nodeValidationMap = buildNodeValidationMap(
        response.errors,
        response.warnings
      );
      const nodesWithErrors = extractNodesWithErrors(response.errors);
      const nodesWithWarnings = extractNodesWithWarnings(response.warnings);

      set({
        status: response.isValid ? "valid" : "invalid",
        isValidating: false,
        isValid: response.isValid,
        errors: response.errors,
        warnings: response.warnings,
        statistics: response.statistics ?? null,
        validationTimeMs: response.validationTimeMs,
        lastValidatedAt: Date.now(),
        requestError: null,
        nodeValidationMap,
        nodesWithErrors,
        nodesWithWarnings,
      });
    },

    setRequestError: (error: string | null) => {
      set({
        status: "idle",
        isValidating: false,
        requestError: error,
      });
    },

    clearValidation: () => {
      set({
        status: "idle",
        isValidating: false,
        isValid: true,
        errors: [],
        warnings: [],
        statistics: null,
        validationTimeMs: null,
        lastValidatedAt: null,
        requestError: null,
        nodeValidationMap: new Map(),
        nodesWithErrors: new Set(),
        nodesWithWarnings: new Set(),
      });
    },

    reset: () => {
      get().clearValidation();
    },

    // ========================================
    // Query Utilities
    // ========================================

    getNodeValidation: (nodeId: string) => {
      return get().nodeValidationMap.get(nodeId) ?? null;
    },

    hasNodeError: (nodeId: string) => {
      return get().nodesWithErrors.has(nodeId);
    },

    hasNodeWarning: (nodeId: string) => {
      return get().nodesWithWarnings.has(nodeId);
    },

    getNodeSeverity: (nodeId: string) => {
      const state = get();
      if (state.nodesWithErrors.has(nodeId)) return "error";
      if (state.nodesWithWarnings.has(nodeId)) return "warning";
      return "none";
    },

    getErrorCount: () => {
      return get().errors.length;
    },

    getWarningCount: () => {
      return get().warnings.length;
    },

    getErrorsBySeverity: () => {
      const errors = get().errors;
      const grouped: Record<string, ValidationErrorDto[]> = {};

      for (const error of errors) {
        const severity = error.severity || "Error";
        if (!grouped[severity]) {
          grouped[severity] = [];
        }
        grouped[severity].push(error);
      }

      return grouped;
    },

    getWarningsByCategory: () => {
      const warnings = get().warnings;
      const grouped: Record<string, ValidationWarningDto[]> = {};

      for (const warning of warnings) {
        const category = warning.category || "General";
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(warning);
      }

      return grouped;
    },

    getNodeErrors: (nodeId: string) => {
      return get().errors.filter((e) => e.nodeId === nodeId);
    },

    getNodeWarnings: (nodeId: string) => {
      return get().warnings.filter((w) => w.nodeId === nodeId);
    },
  }))
);

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Select validation status
 */
export function useValidationStatus() {
  return useValidationStore((state) => state.status);
}

/**
 * Select whether validation is in progress
 */
export function useIsValidating() {
  return useValidationStore((state) => state.isValidating);
}

/**
 * Select whether the layout is valid
 */
export function useIsLayoutValid() {
  return useValidationStore((state) => state.isValid);
}

/**
 * Select validation errors
 */
export function useValidationErrors() {
  return useValidationStore((state) => state.errors);
}

/**
 * Select validation warnings
 */
export function useValidationWarnings() {
  return useValidationStore((state) => state.warnings);
}

/**
 * Select error and warning counts
 */
export function useValidationCounts() {
  return useValidationStore((state) => ({
    errorCount: state.errors.length,
    warningCount: state.warnings.length,
  }));
}

/**
 * Select whether a specific node has errors
 */
export function useNodeHasError(nodeId: string) {
  return useValidationStore((state) => state.nodesWithErrors.has(nodeId));
}

/**
 * Select whether a specific node has warnings
 */
export function useNodeHasWarning(nodeId: string) {
  return useValidationStore((state) => state.nodesWithWarnings.has(nodeId));
}

/**
 * Select the severity for a specific node
 */
export function useNodeSeverity(nodeId: string) {
  return useValidationStore((state) => {
    if (state.nodesWithErrors.has(nodeId)) return "error";
    if (state.nodesWithWarnings.has(nodeId)) return "warning";
    return "none";
  });
}

/**
 * Select validation statistics
 */
export function useValidationStatistics() {
  return useValidationStore((state) => state.statistics);
}

/**
 * Select validation time
 */
export function useValidationTime() {
  return useValidationStore((state) => state.validationTimeMs);
}

/**
 * Select request error
 */
export function useValidationRequestError() {
  return useValidationStore((state) => state.requestError);
}

/**
 * Select nodes with errors set
 */
export function useNodesWithErrors() {
  return useValidationStore((state) => state.nodesWithErrors);
}

/**
 * Select nodes with warnings set
 */
export function useNodesWithWarnings() {
  return useValidationStore((state) => state.nodesWithWarnings);
}

export default useValidationStore;
