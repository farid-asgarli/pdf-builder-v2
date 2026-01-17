/**
 * API Endpoints Index
 *
 * This file exports all API endpoint modules for easy consumption.
 * Each endpoint module corresponds to a backend controller.
 */

import { pdfApi } from "./pdf";
import { templateApi } from "./templates";
import { validationApi } from "./validation";
import { imagesApi } from "./images";

// PDF Generation
export { pdfApi, default as pdf } from "./pdf";

// Template Management
export {
  templateApi,
  default as templates,
  type TemplateFilterParams,
} from "./templates";

// Layout Validation
export {
  validationApi,
  default as validation,
  isValidationSuccess,
  getErrorCountBySeverity,
  groupErrorsByNode,
  groupWarningsByCategory,
  formatValidationError,
  getErrorSuggestions,
} from "./validation";

// Image Upload
export {
  imagesApi,
  default as images,
  validateImageFile,
  fileToBase64,
  getImageDimensions,
  type ImageUploadOptions,
  type BatchUploadOptions,
} from "./images";

/**
 * Unified API object with all endpoints
 */
export const endpoints = {
  pdf: pdfApi,
  templates: templateApi,
  validation: validationApi,
  images: imagesApi,
} as const;

export default endpoints;
