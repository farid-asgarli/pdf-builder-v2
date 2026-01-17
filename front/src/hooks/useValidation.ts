/**
 * Validation Hook
 *
 * React Query-based hook for layout validation with:
 * - Pre-validation before PDF generation
 * - POST to /api/validation/validate
 * - Integration with validation store for UI state
 * - Error highlighting support for component tree
 */
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { validationApi } from "@/lib/api/endpoints/validation";
import { useCanvasStore } from "@/store/canvas-store";
import { useTemplateStore } from "@/store/template-store";
import {
  useValidationStore,
  type ValidationStatus,
} from "@/store/validation-store";
import { toLayoutNodeDto } from "@/types/template";
import type { LayoutNode } from "@/types/component";
import type { PageSettingsDto } from "@/types/dto";
import type {
  ValidateLayoutRequest,
  ValidationOptionsDto,
  ValidationErrorDto,
  ValidationWarningDto,
} from "@/types/api";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Validation options for the hook
 */
export interface ValidationOptions {
  /** Sample data for expression validation */
  sampleData?: Record<string, unknown>;
  /** Page settings to validate */
  pageSettings?: PageSettingsDto;
  /** Validation options */
  options?: ValidationOptionsDto;
  /** Whether to skip updating the store (for silent validation) */
  silent?: boolean;
}

/**
 * Result of validation
 */
export interface ValidationResult {
  /** Whether the layout is valid */
  isValid: boolean;
  /** Validation errors */
  errors: ValidationErrorDto[];
  /** Validation warnings */
  warnings: ValidationWarningDto[];
  /** Whether validation was successful (request didn't fail) */
  success: boolean;
  /** Error message if request failed */
  errorMessage?: string;
}

/**
 * Return type for the useValidation hook
 */
export interface UseValidationReturn {
  // State
  /** Current validation status */
  status: ValidationStatus;
  /** Whether validation is in progress */
  isValidating: boolean;
  /** Whether the layout is valid */
  isValid: boolean;
  /** Validation errors */
  errors: ValidationErrorDto[];
  /** Validation warnings */
  warnings: ValidationWarningDto[];
  /** Error count */
  errorCount: number;
  /** Warning count */
  warningCount: number;
  /** Request error if validation failed */
  requestError: string | null;

  // Actions
  /** Validate the current canvas layout */
  validate: (options?: ValidationOptions) => Promise<ValidationResult>;
  /** Validate layout before PDF generation (returns boolean) */
  validateBeforeGeneration: (
    options?: ValidationOptions
  ) => Promise<ValidationResult>;
  /** Validate in strict mode (warnings treated as errors) */
  validateStrict: (options?: ValidationOptions) => Promise<ValidationResult>;
  /** Validate expressions only */
  validateExpressions: (
    sampleData: Record<string, unknown>
  ) => Promise<ValidationResult>;
  /** Clear validation state */
  clearValidation: () => void;
  /** Reset validation state */
  reset: () => void;

  // Utilities
  /** Check if a node has errors */
  hasNodeError: (nodeId: string) => boolean;
  /** Check if a node has warnings */
  hasNodeWarning: (nodeId: string) => boolean;
  /** Get severity for a node */
  getNodeSeverity: (nodeId: string) => "error" | "warning" | "none";
  /** Get errors for a specific node */
  getNodeErrors: (nodeId: string) => ValidationErrorDto[];
  /** Get warnings for a specific node */
  getNodeWarnings: (nodeId: string) => ValidationWarningDto[];
  /** Get nodes with errors */
  nodesWithErrors: Set<string>;
  /** Get nodes with warnings */
  nodesWithWarnings: Set<string>;
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const validationKeys = {
  all: ["validation"] as const,
  validate: () => [...validationKeys.all, "validate"] as const,
  validateStrict: () => [...validationKeys.all, "validate-strict"] as const,
  validateExpressions: () =>
    [...validationKeys.all, "validate-expressions"] as const,
};

// ============================================================================
// PAYLOAD BUILDER
// ============================================================================

/**
 * Build the validation request payload from a layout node
 */
function buildValidationRequest(
  layout: LayoutNode,
  options: ValidationOptions = {}
): ValidateLayoutRequest {
  const { sampleData, pageSettings, options: validationOptions } = options;

  // Convert frontend LayoutNode to backend LayoutNodeDto
  const layoutDto = toLayoutNodeDto(layout);

  const request: ValidateLayoutRequest = {
    layout: layoutDto,
  };

  // Add optional fields only if provided
  if (sampleData && Object.keys(sampleData).length > 0) {
    request.sampleData = sampleData;
  }

  if (pageSettings) {
    request.pageSettings = pageSettings;
  }

  if (validationOptions) {
    request.options = validationOptions;
  }

  return request;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook for layout validation
 *
 * Provides methods to validate layouts before PDF generation and
 * integrates with the validation store for UI state management.
 *
 * @example
 * ```tsx
 * function ValidateButton() {
 *   const { validate, isValidating, errors, errorCount } = useValidation();
 *
 *   const handleValidate = async () => {
 *     const result = await validate();
 *     if (!result.isValid) {
 *       console.log('Validation errors:', result.errors);
 *     }
 *   };
 *
 *   return (
 *     <Button onClick={handleValidate} disabled={isValidating}>
 *       {isValidating ? 'Validating...' : `Validate (${errorCount} errors)`}
 *     </Button>
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Pre-validation before PDF generation
 * function ExportButton() {
 *   const { validateBeforeGeneration } = useValidation();
 *   const { generateAndDownload } = usePdfGeneration();
 *
 *   const handleExport = async () => {
 *     const validation = await validateBeforeGeneration();
 *     if (!validation.isValid) {
 *       toast.error('Please fix validation errors before exporting');
 *       return;
 *     }
 *     await generateAndDownload();
 *   };
 *
 *   return <Button onClick={handleExport}>Export PDF</Button>;
 * }
 * ```
 */
export function useValidation(): UseValidationReturn {
  const queryClient = useQueryClient();

  // Get canvas state
  const root = useCanvasStore((state) => state.root);

  // Get template state for page settings and test data
  const template = useTemplateStore((state) => state.template);

  // Validation store
  const validationStore = useValidationStore();

  // ========================================
  // Validate Mutation
  // ========================================
  const validateMutation = useMutation({
    mutationKey: validationKeys.validate(),
    mutationFn: async (request: ValidateLayoutRequest) => {
      return validationApi.validate(request);
    },
    onMutate: () => {
      validationStore.setValidating();
    },
    onSuccess: (response) => {
      validationStore.setValidationResult(response);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Validation failed";
      validationStore.setRequestError(message);
      console.error("[useValidation] Validation failed:", error);
    },
  });

  // ========================================
  // Validate Strict Mutation
  // ========================================
  const validateStrictMutation = useMutation({
    mutationKey: validationKeys.validateStrict(),
    mutationFn: async (request: ValidateLayoutRequest) => {
      return validationApi.validate({
        ...request,
        options: {
          ...request.options,
          strictMode: true,
        },
      });
    },
    onMutate: () => {
      validationStore.setValidating();
    },
    onSuccess: (response) => {
      validationStore.setValidationResult(response);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Validation failed";
      validationStore.setRequestError(message);
      console.error("[useValidation] Strict validation failed:", error);
    },
  });

  // ========================================
  // Validate Expressions Mutation
  // ========================================
  const validateExpressionsMutation = useMutation({
    mutationKey: validationKeys.validateExpressions(),
    mutationFn: async (request: ValidateLayoutRequest) => {
      return validationApi.validate({
        ...request,
        options: {
          validateExpressions: true,
          validateFonts: false,
          validateImageUrls: false,
          checkDeprecations: false,
          includePerformanceWarnings: false,
        },
      });
    },
    onMutate: () => {
      validationStore.setValidating();
    },
    onSuccess: (response) => {
      validationStore.setValidationResult(response);
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Expression validation failed";
      validationStore.setRequestError(message);
      console.error("[useValidation] Expression validation failed:", error);
    },
  });

  // ========================================
  // Validate
  // ========================================
  const validate = useCallback(
    async (options: ValidationOptions = {}): Promise<ValidationResult> => {
      if (!root) {
        return {
          isValid: false,
          errors: [
            {
              code: "NO_LAYOUT",
              message: "No layout found. Add components to the canvas first.",
              severity: "Error",
            },
          ],
          warnings: [],
          success: false,
          errorMessage: "No layout found",
        };
      }

      try {
        // Merge template settings with provided options
        const mergedOptions: ValidationOptions = {
          ...options,
          pageSettings: options.pageSettings ?? template?.pageSettings,
          sampleData: options.sampleData ?? template?.testData,
        };

        const request = buildValidationRequest(root, mergedOptions);
        const response = await validateMutation.mutateAsync(request);

        return {
          isValid: response.isValid,
          errors: response.errors,
          warnings: response.warnings,
          success: true,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Validation failed";
        return {
          isValid: false,
          errors: [],
          warnings: [],
          success: false,
          errorMessage: message,
        };
      }
    },
    [root, template, validateMutation]
  );

  // ========================================
  // Validate Before Generation
  // ========================================
  const validateBeforeGeneration = useCallback(
    async (options: ValidationOptions = {}): Promise<ValidationResult> => {
      // Use standard validation with default options optimized for pre-generation
      return validate({
        ...options,
        options: {
          validateExpressions: true,
          validateFonts: true,
          checkDeprecations: true,
          includePerformanceWarnings: true,
          ...options.options,
        },
      });
    },
    [validate]
  );

  // ========================================
  // Validate Strict
  // ========================================
  const validateStrict = useCallback(
    async (options: ValidationOptions = {}): Promise<ValidationResult> => {
      if (!root) {
        return {
          isValid: false,
          errors: [
            {
              code: "NO_LAYOUT",
              message: "No layout found. Add components to the canvas first.",
              severity: "Error",
            },
          ],
          warnings: [],
          success: false,
          errorMessage: "No layout found",
        };
      }

      try {
        const mergedOptions: ValidationOptions = {
          ...options,
          pageSettings: options.pageSettings ?? template?.pageSettings,
          sampleData: options.sampleData ?? template?.testData,
        };

        const request = buildValidationRequest(root, mergedOptions);
        const response = await validateStrictMutation.mutateAsync(request);

        return {
          isValid: response.isValid,
          errors: response.errors,
          warnings: response.warnings,
          success: true,
        };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Validation failed";
        return {
          isValid: false,
          errors: [],
          warnings: [],
          success: false,
          errorMessage: message,
        };
      }
    },
    [root, template, validateStrictMutation]
  );

  // ========================================
  // Validate Expressions
  // ========================================
  const validateExpressionsAction = useCallback(
    async (sampleData: Record<string, unknown>): Promise<ValidationResult> => {
      if (!root) {
        return {
          isValid: false,
          errors: [
            {
              code: "NO_LAYOUT",
              message: "No layout found. Add components to the canvas first.",
              severity: "Error",
            },
          ],
          warnings: [],
          success: false,
          errorMessage: "No layout found",
        };
      }

      try {
        const request = buildValidationRequest(root, { sampleData });
        const response = await validateExpressionsMutation.mutateAsync(request);

        return {
          isValid: response.isValid,
          errors: response.errors,
          warnings: response.warnings,
          success: true,
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Expression validation failed";
        return {
          isValid: false,
          errors: [],
          warnings: [],
          success: false,
          errorMessage: message,
        };
      }
    },
    [root, validateExpressionsMutation]
  );

  // ========================================
  // Clear Validation
  // ========================================
  const clearValidation = useCallback(() => {
    validationStore.clearValidation();
    validateMutation.reset();
    validateStrictMutation.reset();
    validateExpressionsMutation.reset();
  }, [
    validationStore,
    validateMutation,
    validateStrictMutation,
    validateExpressionsMutation,
  ]);

  // ========================================
  // Reset
  // ========================================
  const reset = useCallback(() => {
    clearValidation();
    queryClient.removeQueries({ queryKey: validationKeys.all });
  }, [clearValidation, queryClient]);

  // ========================================
  // Utility Functions
  // ========================================
  const hasNodeError = useCallback(
    (nodeId: string) => validationStore.hasNodeError(nodeId),
    [validationStore]
  );

  const hasNodeWarning = useCallback(
    (nodeId: string) => validationStore.hasNodeWarning(nodeId),
    [validationStore]
  );

  const getNodeSeverity = useCallback(
    (nodeId: string) => validationStore.getNodeSeverity(nodeId),
    [validationStore]
  );

  const getNodeErrors = useCallback(
    (nodeId: string) => validationStore.getNodeErrors(nodeId),
    [validationStore]
  );

  const getNodeWarnings = useCallback(
    (nodeId: string) => validationStore.getNodeWarnings(nodeId),
    [validationStore]
  );

  // ========================================
  // Computed State
  // ========================================
  const state = useValidationStore();

  return {
    // State
    status: state.status,
    isValidating: state.isValidating,
    isValid: state.isValid,
    errors: state.errors,
    warnings: state.warnings,
    errorCount: state.errors.length,
    warningCount: state.warnings.length,
    requestError: state.requestError,

    // Actions
    validate,
    validateBeforeGeneration,
    validateStrict,
    validateExpressions: validateExpressionsAction,
    clearValidation,
    reset,

    // Utilities
    hasNodeError,
    hasNodeWarning,
    getNodeSeverity,
    getNodeErrors,
    getNodeWarnings,
    nodesWithErrors: state.nodesWithErrors,
    nodesWithWarnings: state.nodesWithWarnings,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook to check if there are validation errors
 */
export function useHasValidationErrors(): boolean {
  return useValidationStore((state) => state.errors.length > 0);
}

/**
 * Hook to check if there are validation warnings
 */
export function useHasValidationWarnings(): boolean {
  return useValidationStore((state) => state.warnings.length > 0);
}

/**
 * Hook to get validation summary
 */
export function useValidationSummary() {
  const state = useValidationStore();

  return useMemo(
    () => ({
      status: state.status,
      isValid: state.isValid,
      errorCount: state.errors.length,
      warningCount: state.warnings.length,
      hasIssues: state.errors.length > 0 || state.warnings.length > 0,
    }),
    [state.status, state.isValid, state.errors.length, state.warnings.length]
  );
}

/**
 * Hook to check if a node has validation issues
 */
export function useNodeValidation(nodeId: string) {
  const hasError = useValidationStore((state) =>
    state.nodesWithErrors.has(nodeId)
  );
  const hasWarning = useValidationStore((state) =>
    state.nodesWithWarnings.has(nodeId)
  );
  const severity = hasError ? "error" : hasWarning ? "warning" : "none";

  return { hasError, hasWarning, severity };
}

export default useValidation;
