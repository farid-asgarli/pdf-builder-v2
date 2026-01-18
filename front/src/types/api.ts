/**
 * API request/response TypeScript types
 * Generated from backend OpenAPI contracts (PDFBuilder.Contracts)
 *
 * This file contains all API types that match the backend DTOs, Requests, and Responses.
 * Keep this file in sync with backend changes.
 */

import type { LayoutNodeDto, PageSettingsDto, TemplateLayoutDto } from "./dto";

// ============================================================================
// GENERIC API RESPONSE WRAPPER
// Matches: PDFBuilder.Contracts.Responses.ApiResponse<T>
// ============================================================================

/**
 * Standard API response wrapper for consistent error handling.
 */
export interface ApiResponse<T> {
  /** Whether the request was successful */
  success: boolean;
  /** The response data */
  data?: T;
  /** Error information if the request failed */
  error?: ApiError;
  /** Metadata about the response */
  metadata?: ResponseMetadata;
}

/**
 * Standard API error structure.
 */
export interface ApiError {
  /** Error code (e.g., "VALIDATION_ERROR") */
  code: string;
  /** Human-readable error message */
  message: string;
  /** HTTP status code */
  statusCode?: number;
  /** Detailed validation errors */
  details?: FieldError[];
  /** Unique trace ID for debugging */
  traceId?: string;
  /** Timestamp when the error occurred */
  timestamp: string;
}

/**
 * Represents a field-level error.
 */
export interface FieldError {
  /** Field name or path (e.g., "layout.children[0].type") */
  field: string;
  /** Error message for this field */
  message: string;
  /** The rejected value */
  rejectedValue?: unknown;
}

/**
 * Response metadata.
 */
export interface ResponseMetadata {
  /** Request processing time in milliseconds */
  processingTimeMs?: number;
  /** Server timestamp */
  timestamp: string;
  /** API version */
  apiVersion?: string;
  /** Request trace ID for debugging */
  traceId?: string;
}

// ============================================================================
// PAGINATION
// ============================================================================

/**
 * Pagination parameters for list requests.
 */
export interface PaginationParams {
  /** Page number (1-based) */
  page?: number;
  /** Number of items per page */
  pageSize?: number;
  /** Field to sort by */
  sortBy?: string;
  /** Sort direction */
  sortOrder?: "asc" | "desc";
}

/**
 * Generic paginated response.
 */
export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ============================================================================
// PDF GENERATION
// Matches: PDFBuilder.Contracts.Requests.GeneratePdfRequest
// Matches: PDFBuilder.Contracts.Responses.PdfGenerationResponse
// ============================================================================

/**
 * PDF document metadata.
 */
export interface PdfMetadataDto {
  /** Document title */
  title?: string;
  /** Document author */
  author?: string;
  /** Document subject */
  subject?: string;
  /** Document keywords */
  keywords?: string;
  /** Creator application */
  creator?: string;
  /** Producer */
  producer?: string;
}

/**
 * PDF generation options.
 */
export interface GenerationOptionsDto {
  /** Whether to compress images (default: true) */
  compressImages?: boolean;
  /** Image quality (1-100) when compression is enabled (default: 85) */
  imageQuality?: number;
  /** Whether to embed fonts in the PDF (default: true) */
  embedFonts?: boolean;
  /** Whether to generate PDF/A compliant output */
  pdfACompliant?: boolean;
  /** Maximum generation timeout in seconds (default: 60) */
  timeoutSeconds?: number;
  /** Whether to include debug information in the PDF */
  includeDebugInfo?: boolean;
}

/**
 * Request model for PDF generation.
 * Uses the full template layout structure with header, content, footer, and page settings.
 */
export interface GeneratePdfRequest {
  /**
   * Complete template layout with header, content, footer, and page settings.
   * Contains all layout trees for the PDF document.
   */
  templateLayout: TemplateLayoutDto;
  /** Data context for expression evaluation (available as 'data' in expressions) */
  data?: Record<string, unknown>;
  /** Output filename (without extension) */
  filename?: string;
  /** PDF metadata */
  metadata?: PdfMetadataDto;
  /** Generation options */
  options?: GenerationOptionsDto;
}

/**
 * Detailed error information for PDF generation failures.
 */
export interface ErrorDetails {
  /** Error code (e.g., "LAYOUT_INVALID") */
  code: string;
  /** Error message */
  message: string;
  /** Path to the component that caused the error */
  path?: string;
  /** Node ID if available */
  nodeId?: string;
  /** Component type */
  componentType?: string;
  /** Property name if the error is property-specific */
  propertyName?: string;
  /** Inner exception message if applicable */
  innerError?: string;
  /** Stack trace (only in development mode) */
  stackTrace?: string;
  /** Additional context data */
  context?: Record<string, unknown>;
}

/**
 * Response model for PDF generation.
 */
export interface PdfGenerationResponse {
  /** Whether the generation was successful */
  success: boolean;
  /** Generated PDF as base64 string (when not streaming) */
  pdfBytes?: string;
  /** Generated filename */
  filename?: string;
  /** MIME type of the response */
  contentType: string;
  /** Size of the generated PDF in bytes */
  fileSizeBytes?: number;
  /** Number of pages in the generated PDF */
  pageCount?: number;
  /** Generation time in milliseconds */
  generationTimeMs?: number;
  /** Operation ID for progress tracking (SignalR) */
  operationId?: string;
  /** Warnings that occurred during generation */
  warnings?: string[];
  /** Error message if generation failed */
  errorMessage?: string;
  /** Detailed error information if generation failed */
  error?: ErrorDetails;
}

/**
 * Request model for generating PDF from an existing template.
 */
export interface GenerateFromTemplateRequest {
  /** Data context for expression evaluation */
  data?: Record<string, unknown>;
  /** Page settings overrides */
  pageSettingsOverrides?: PageSettingsDto;
  /** Output filename (without extension) */
  filename?: string;
  /** Generation options */
  options?: GenerationOptionsDto;
}

// ============================================================================
// VALIDATION
// Matches: PDFBuilder.Contracts.Requests.ValidateLayoutRequest
// Matches: PDFBuilder.Contracts.Responses.ValidationResponse
// ============================================================================

/**
 * Options for layout validation.
 */
export interface ValidationOptionsDto {
  /** Whether to validate expressions (default: true) */
  validateExpressions?: boolean;
  /** Whether to validate image URLs are accessible (default: false) */
  validateImageUrls?: boolean;
  /** Whether to validate font availability (default: true) */
  validateFonts?: boolean;
  /** Whether to check for deprecated component usage (default: true) */
  checkDeprecations?: boolean;
  /** Whether to include performance warnings (default: true) */
  includePerformanceWarnings?: boolean;
  /** Maximum depth to validate in the layout tree (default: 100) */
  maxDepth?: number;
  /** Whether strict mode is enabled (warnings treated as errors) */
  strictMode?: boolean;
}

/**
 * Request model for layout validation.
 */
export interface ValidateLayoutRequest {
  /** Layout tree definition to validate */
  layout: LayoutNodeDto;
  /** Sample data for expression validation */
  sampleData?: Record<string, unknown>;
  /** Page settings to validate */
  pageSettings?: PageSettingsDto;
  /** Validation options */
  options?: ValidationOptionsDto;
}

/**
 * Validation error severity levels.
 */
export type ValidationSeverity = "Info" | "Warning" | "Error" | "Critical";

/**
 * Warning categories.
 */
export type WarningCategory =
  | "General"
  | "Performance"
  | "Deprecation"
  | "Accessibility"
  | "BestPractice";

/**
 * Represents a validation error.
 */
export interface ValidationErrorDto {
  /** Error code (e.g., "INVALID_COMPONENT_TYPE") */
  code: string;
  /** Error message */
  message: string;
  /** Severity of the error */
  severity: ValidationSeverity;
  /** JSON path to the error location */
  path?: string;
  /** Node ID if available */
  nodeId?: string;
  /** Property name if applicable */
  propertyName?: string;
  /** Actual value that caused the error */
  actualValue?: unknown;
  /** Expected value or format */
  expectedFormat?: string;
  /** Suggestions for fixing the error */
  suggestions?: string[];
}

/**
 * Represents a validation warning.
 */
export interface ValidationWarningDto {
  /** Warning code (e.g., "DEPRECATED_PROPERTY") */
  code: string;
  /** Warning message */
  message: string;
  /** Category of the warning */
  category: WarningCategory;
  /** JSON path to the warning location */
  path?: string;
  /** Node ID if available */
  nodeId?: string;
  /** Suggestions for addressing the warning */
  suggestions?: string[];
}

/**
 * Statistics about a layout tree.
 */
export interface LayoutStatistics {
  /** Total number of nodes in the tree */
  totalNodes: number;
  /** Maximum depth of the tree */
  maxDepth: number;
  /** Count of each component type */
  componentCounts: Record<string, number>;
  /** Number of expressions found */
  expressionCount: number;
  /** Number of images referenced */
  imageCount: number;
  /** Number of repeating nodes */
  repeatNodeCount: number;
  /** Number of conditional nodes */
  conditionalNodeCount: number;
  /** Estimated complexity score (1-10) */
  complexityScore: number;
}

/**
 * Response model for layout validation.
 */
export interface ValidationResponse {
  /** Whether the layout is valid */
  isValid: boolean;
  /** Validation errors */
  errors: ValidationErrorDto[];
  /** Validation warnings */
  warnings: ValidationWarningDto[];
  /** Statistics about the validated layout */
  statistics?: LayoutStatistics;
  /** Validation time in milliseconds */
  validationTimeMs: number;
}

// ============================================================================
// TEMPLATE MANAGEMENT
// Matches: PDFBuilder.Contracts.Requests.SaveTemplateRequest
// Matches: PDFBuilder.Contracts.Responses.TemplateResponse
// ============================================================================

/**
 * Request model for saving a new template.
 */
export interface SaveTemplateRequest {
  /** Template name (required) */
  name: string;
  /** Template description */
  description?: string;
  /** Template category */
  category?: string;
  /** Layout definition (required) */
  layout: LayoutNodeDto;
  /** Page settings for this template */
  pageSettings?: PageSettingsDto;
  /** Tags (comma-separated string) */
  tags?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Request model for updating an existing template.
 */
export interface UpdateTemplateRequest {
  /** Template name */
  name?: string;
  /** Template description */
  description?: string;
  /** Template category */
  category?: string;
  /** Layout definition */
  layout?: LayoutNodeDto;
  /** Page settings */
  pageSettings?: PageSettingsDto;
  /** Whether the template is active */
  isActive?: boolean;
  /** Tags (comma-separated string) */
  tags?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Request model for duplicating a template.
 */
export interface DuplicateTemplateRequest {
  /** New template name (default: original name + " (Copy)") */
  newName?: string;
  /** Category for the duplicated template */
  category?: string;
}

/**
 * Response model for template operations.
 */
export interface TemplateResponse {
  /** Whether the operation was successful */
  success: boolean;
  /** Template data */
  template?: TemplateDto;
  /** Error message if the operation failed */
  errorMessage?: string;
  /** Detailed error information */
  error?: ErrorDetails;
}

/**
 * Response model for listing templates.
 */
export interface TemplateListResponse {
  /** Whether the operation was successful */
  success: boolean;
  /** List of template summaries */
  templates: TemplateSummaryDto[];
  /** Total count of templates (before pagination) */
  totalCount: number;
  /** Current page number (1-based) */
  page: number;
  /** Page size */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there are more pages */
  hasNextPage: boolean;
  /** Whether there are previous pages */
  hasPreviousPage: boolean;
  /** Error message if the operation failed */
  errorMessage?: string;
}

/**
 * Response model for template deletion.
 */
export interface DeleteTemplateResponse {
  /** Whether the deletion was successful */
  success: boolean;
  /** ID of the deleted template */
  deletedTemplateId?: string;
  /** Error message if deletion failed */
  errorMessage?: string;
}

/**
 * Full template DTO with layout.
 */
export interface TemplateDto {
  /** Unique identifier */
  id: string;
  /** Template name */
  name: string;
  /** Template description */
  description?: string;
  /** Template category */
  category?: string;
  /** Layout definition */
  layout?: LayoutNodeDto;
  /** Template version number */
  version: number;
  /** Whether the template is active */
  isActive: boolean;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** User who created the template */
  createdBy?: string;
  /** User who last updated the template */
  updatedBy?: string;
  /** Tags (comma-separated string) */
  tags?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Template summary DTO (without full layout).
 */
export interface TemplateSummaryDto {
  /** Unique identifier */
  id: string;
  /** Template name */
  name: string;
  /** Template description */
  description?: string;
  /** Template category */
  category?: string;
  /** Template version */
  version: number;
  /** Whether the template is active */
  isActive: boolean;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Tags */
  tags?: string;
}

// ============================================================================
// IMAGE UPLOAD
// Matches: PDFBuilder.Contracts.Requests.ImageUploadRequest
// Matches: PDFBuilder.Contracts.Responses.ImageUploadResponse
// ============================================================================

/**
 * Request model for image upload processing options.
 */
export interface ImageUploadRequest {
  /** Whether to resize the image to fit within max dimensions */
  autoResize?: boolean;
  /** Maximum width for resizing */
  maxWidth?: number;
  /** Maximum height for resizing */
  maxHeight?: number;
  /** Compression quality (1-100) */
  quality?: number;
  /** Output format ("jpeg", "png", "webp") */
  outputFormat?: "jpeg" | "png" | "webp";
  /** Custom filename (without extension) */
  customFilename?: string;
}

/**
 * Response model for image upload operations.
 */
export interface ImageUploadResponse {
  /** Whether the upload was successful */
  success: boolean;
  /** Unique identifier for the uploaded image */
  imageId?: string;
  /** URL to access the uploaded image */
  url?: string;
  /** Original filename */
  originalFilename?: string;
  /** Stored filename */
  storedFilename?: string;
  /** Content type of the image */
  contentType?: string;
  /** File size in bytes */
  fileSizeBytes: number;
  /** Image width in pixels */
  width?: number;
  /** Image height in pixels */
  height?: number;
  /** Upload timestamp */
  uploadedAt: string;
  /** Error message if upload failed */
  errorMessage?: string;
}

/**
 * Response model for batch image upload operations.
 */
export interface BatchImageUploadResponse {
  /** Whether all uploads were successful */
  allSuccessful: boolean;
  /** Total number of files uploaded */
  totalFiles: number;
  /** Number of successful uploads */
  successfulUploads: number;
  /** Number of failed uploads */
  failedUploads: number;
  /** Individual upload results */
  results: ImageUploadResponse[];
}

// ============================================================================
// PROGRESS UPDATES (SignalR)
// Matches: PDFBuilder.Contracts.Responses.ProgressUpdate
// ============================================================================

/**
 * Type of operation being tracked.
 */
export type OperationType =
  | "PdfGeneration"
  | "ImageUpload"
  | "BatchImageProcessing"
  | "Validation"
  | "Other";

/**
 * Status of an operation.
 */
export type OperationStatus =
  | "Pending"
  | "InProgress"
  | "Completed"
  | "Failed"
  | "Cancelled";

/**
 * Progress update for long-running operations (SignalR).
 */
export interface ProgressUpdate {
  /** Unique operation identifier */
  operationId: string;
  /** Type of operation */
  operationType: OperationType;
  /** Current progress percentage (0-100) */
  progressPercentage: number;
  /** Current status of the operation */
  status: OperationStatus;
  /** Human-readable message describing current progress */
  message?: string;
  /** Current step description */
  currentStep?: string;
  /** Total number of steps (if known) */
  totalSteps?: number;
  /** Current step number (if known) */
  currentStepNumber?: number;
  /** Elapsed time in milliseconds */
  elapsedMilliseconds: number;
  /** Estimated time remaining in milliseconds */
  estimatedRemainingMilliseconds?: number;
  /** Timestamp of this progress update */
  timestamp: string;
  /** Additional data specific to the operation */
  additionalData?: Record<string, unknown>;
  /** Error message if the operation failed */
  errorMessage?: string;
}

// ============================================================================
// COMPONENT METADATA
// Matches: PDFBuilder.Contracts.DTOs.ComponentMetadataDto
// ============================================================================

/**
 * Metadata describing a single property definition for a component.
 */
export interface PropertyMetadataDto {
  /** Property name */
  name: string;
  /** Property type (e.g., "number", "string", "color") */
  type: string;
  /** Property description */
  description: string;
  /** Whether this property is required */
  isRequired: boolean;
  /** Default value if not specified */
  defaultValue?: unknown;
  /** Whether this property supports expression binding */
  supportsExpression: boolean;
  /** Validation constraints (min, max, pattern, etc.) */
  constraints?: Record<string, unknown>;
  /** Allowed values for enum-like properties */
  allowedValues?: string[];
}

/**
 * Metadata describing a component type and its available properties.
 */
export interface ComponentMetadataDto {
  /** Component type name */
  type: string;
  /** Component category */
  category: string;
  /** Component description */
  description: string;
  /** Whether this component accepts children */
  acceptsChildren: boolean;
  /** Whether this component accepts a single child */
  acceptsChild: boolean;
  /** List of available properties for this component */
  properties: PropertyMetadataDto[];
  /** Example usage JSON */
  exampleJson?: string;
}

/**
 * Represents a single component property with its value and metadata.
 */
export interface ComponentPropertyDto {
  /** Property name */
  name: string;
  /** Property value */
  value?: unknown;
  /** String representation of the value */
  valueString?: string;
  /** Expected type of this property */
  expectedType?: string;
  /** Whether this property is required */
  isRequired: boolean;
  /** Whether this property contains an expression */
  isExpression: boolean;
  /** Expression content if isExpression is true */
  expressionContent?: string;
}
