/**
 * Validation API Endpoints
 * Aligned with backend PDFBuilder.API.Controllers.ValidationController
 */

import { api } from "../client";
import type {
  ValidateLayoutRequest,
  ValidationResponse,
  ValidationErrorDto,
  ValidationWarningDto,
} from "@/types/api";
import type { LayoutNodeDto } from "@/types/dto";

/**
 * Validation API base URL
 */
const VALIDATION_BASE = "/api/validation";

/**
 * Validation API
 */
export const validationApi = {
  /**
   * Validate a layout definition before PDF generation
   * POST /api/validation/validate
   *
   * @param request - Validation request with layout and options
   * @returns Validation results with errors, warnings, and statistics
   */
  validate: async (
    request: ValidateLayoutRequest
  ): Promise<ValidationResponse> => {
    return api.post<ValidationResponse>(`${VALIDATION_BASE}/validate`, request);
  },

  /**
   * Validate a layout with default options
   * POST /api/validation/validate
   *
   * @param layout - Layout to validate
   * @param sampleData - Optional sample data for expression validation
   * @returns Validation results
   */
  validateLayout: async (
    layout: LayoutNodeDto,
    sampleData?: Record<string, unknown>
  ): Promise<ValidationResponse> => {
    return validationApi.validate({
      layout,
      sampleData,
      options: {
        validateExpressions: true,
        validateFonts: true,
        checkDeprecations: true,
        includePerformanceWarnings: true,
      },
    });
  },

  /**
   * Validate a layout in strict mode (warnings treated as errors)
   * POST /api/validation/validate
   *
   * @param layout - Layout to validate
   * @param sampleData - Optional sample data
   * @returns Validation results
   */
  validateStrict: async (
    layout: LayoutNodeDto,
    sampleData?: Record<string, unknown>
  ): Promise<ValidationResponse> => {
    return validationApi.validate({
      layout,
      sampleData,
      options: {
        validateExpressions: true,
        validateFonts: true,
        checkDeprecations: true,
        includePerformanceWarnings: true,
        strictMode: true,
      },
    });
  },

  /**
   * Quick validation (expressions only)
   * POST /api/validation/validate
   *
   * @param layout - Layout to validate
   * @param sampleData - Sample data for expression validation
   * @returns Validation results
   */
  validateExpressions: async (
    layout: LayoutNodeDto,
    sampleData: Record<string, unknown>
  ): Promise<ValidationResponse> => {
    return validationApi.validate({
      layout,
      sampleData,
      options: {
        validateExpressions: true,
        validateFonts: false,
        validateImageUrls: false,
        checkDeprecations: false,
        includePerformanceWarnings: false,
      },
    });
  },

  /**
   * Get component metadata for a specific component type
   * GET /api/validation/components/{type}
   *
   * @param type - Component type
   * @returns Component metadata
   */
  getComponentMetadata: async (type: string): Promise<unknown> => {
    return api.get<unknown>(`${VALIDATION_BASE}/components/${type}`);
  },

  /**
   * Get all available component types
   * GET /api/validation/components
   *
   * @returns List of component types
   */
  getComponentTypes: async (): Promise<string[]> => {
    return api.get<string[]>(`${VALIDATION_BASE}/components`);
  },
};

/**
 * Helper function to check if validation passed
 */
export function isValidationSuccess(response: ValidationResponse): boolean {
  return response.isValid && response.errors.length === 0;
}

/**
 * Helper function to get error count by severity
 */
export function getErrorCountBySeverity(
  errors: ValidationErrorDto[]
): Record<string, number> {
  return errors.reduce(
    (acc, error) => {
      const severity = error.severity || "Error";
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
}

/**
 * Helper function to group errors by node ID
 */
export function groupErrorsByNode(
  errors: ValidationErrorDto[]
): Map<string, ValidationErrorDto[]> {
  const grouped = new Map<string, ValidationErrorDto[]>();

  for (const error of errors) {
    const nodeId = error.nodeId || "unknown";
    const existing = grouped.get(nodeId) || [];
    existing.push(error);
    grouped.set(nodeId, existing);
  }

  return grouped;
}

/**
 * Helper function to group warnings by category
 */
export function groupWarningsByCategory(
  warnings: ValidationWarningDto[]
): Map<string, ValidationWarningDto[]> {
  const grouped = new Map<string, ValidationWarningDto[]>();

  for (const warning of warnings) {
    const category = warning.category || "General";
    const existing = grouped.get(category) || [];
    existing.push(warning);
    grouped.set(category, existing);
  }

  return grouped;
}

/**
 * Helper function to format validation errors for display
 */
export function formatValidationError(error: ValidationErrorDto): string {
  let message = error.message;

  if (error.path) {
    message = `${error.path}: ${message}`;
  }

  if (error.propertyName) {
    message = `[${error.propertyName}] ${message}`;
  }

  return message;
}

/**
 * Helper function to get suggested fixes for common errors
 */
export function getErrorSuggestions(error: ValidationErrorDto): string[] {
  if (error.suggestions && error.suggestions.length > 0) {
    return error.suggestions;
  }

  // Provide default suggestions based on error code
  const defaultSuggestions: Record<string, string[]> = {
    INVALID_COMPONENT_TYPE: [
      "Check the component type spelling",
      "Verify the component is supported",
      "Review the available component types",
    ],
    INVALID_EXPRESSION: [
      "Check expression syntax: {{ data.field }}",
      "Verify the data path exists in your sample data",
      "Ensure expressions are properly closed with }}",
    ],
    MISSING_REQUIRED_PROPERTY: [
      "Add the required property to the component",
      "Check the property name spelling",
    ],
    INVALID_PROPERTY_VALUE: [
      "Check the expected type for this property",
      "Review allowed values in documentation",
    ],
  };

  return defaultSuggestions[error.code] || [];
}

export default validationApi;
