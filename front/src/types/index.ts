/**
 * Type exports
 *
 * This barrel file exports all TypeScript types used in the PDF Builder frontend.
 * Types are organized by domain:
 * - api.ts: API request/response types (from backend OpenAPI)
 * - dto.ts: Data transfer objects (LayoutNodeDto, StylePropertiesDto, PageSettingsDto)
 * - canvas.ts: Canvas-related types (visual builder)
 * - component.ts: Component types and metadata
 * - template.ts: Template types
 * - properties.ts: Property definition types
 */

// Core DTOs from backend
export * from "./dto";

// API request/response types
export * from "./api";

// Canvas and builder types
export * from "./canvas";

// Component types and metadata
export * from "./component";

// Template types
export * from "./template";

// Property types
export * from "./properties";
