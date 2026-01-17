/**
 * Monaco Editor Components Barrel Export
 * Re-exports all Monaco editor related components and utilities
 */

// Main component
export {
  MonacoExpressionEditor,
  default as MonacoExpressionEditorDefault,
} from "./MonacoExpressionEditor";

// Types
export type {
  MonacoExpressionEditorProps,
  DataField,
  ExpressionError,
} from "./MonacoExpressionEditor";

// Validation utilities
export {
  validateExpressions,
  validateSingleExpression,
  createExpressionValidator,
  MAX_EXPRESSION_LENGTH,
  MAX_NESTING_DEPTH,
  FORBIDDEN_PATTERNS,
} from "./ExpressionValidator";

export type { ValidationResult } from "./ExpressionValidator";

// Autocomplete utilities
export {
  registerExpressionAutocomplete,
  registerExpressionHoverProvider,
  extractDataFieldsFromSampleData,
  BUILTIN_FUNCTIONS,
  EXPRESSION_KEYWORDS,
} from "./ExpressionAutocomplete";

export type { AutocompleteConfig } from "./ExpressionAutocomplete";
