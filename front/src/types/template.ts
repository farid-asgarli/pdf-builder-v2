/**
 * Template-related TypeScript types
 *
 * These are frontend-specific template types used for UI state management.
 * For API-level types, see api.ts (TemplateDto, TemplateSummaryDto, etc.)
 */

import type { SaveTemplateRequest, TemplateDto } from "@/types/api";
import {
  ComponentType,
  type LayoutNode,
  type StyleProperties,
} from "./component";
import type { LayoutNodeDto, PageSettingsDto, TemplateLayoutDto } from "./dto";
import type { PageSettings, TemplateStructure } from "@/store/canvas-store";

/**
 * Template status for frontend UI
 * Note: Backend uses isActive boolean instead of status enum
 */
export type TemplateStatus = "draft" | "published" | "archived";

/**
 * Frontend template model with full layout for the builder
 * This is the working model used in the canvas builder.
 */
export interface Template {
  id: string;
  name: string;
  description?: string;
  status: TemplateStatus;
  category?: string;
  tags?: string[];
  layout: LayoutNode;
  pageSettings?: PageSettingsDto;
  testData?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  version: number;
}

/**
 * Template list item (without full layout) for template listing
 */
export interface TemplateListItem {
  id: string;
  name: string;
  description?: string;
  status: TemplateStatus;
  category?: string;
  tags?: string[];
  thumbnailUrl?: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

/**
 * Create template request (frontend model)
 */
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  layout: LayoutNode;
  pageSettings?: PageSettingsDto;
  testData?: Record<string, unknown>;
}

/**
 * Update template request (frontend model)
 * Note: For API requests, use UpdateTemplateRequest from api.ts
 */
export interface FrontendUpdateTemplateRequest {
  name?: string;
  description?: string;
  status?: TemplateStatus;
  category?: string;
  tags?: string[];
  layout?: LayoutNode;
  pageSettings?: PageSettingsDto;
  testData?: Record<string, unknown>;
}

// ============================================================================
// CONVERSION UTILITIES
// ============================================================================

/**
 * Convert frontend Template to backend LayoutNodeDto format
 */
export function toLayoutNodeDto(node: LayoutNode): LayoutNodeDto {
  const dto: LayoutNodeDto = {
    id: node.id,
    type: node.type,
    properties: node.properties,
    style: node.style,
    visible: node.visible,
    repeatFor: node.repeatFor,
    repeatAs: node.repeatAs,
    repeatIndex: node.repeatIndex,
  };

  if (node.children && node.children.length > 0) {
    dto.children = node.children.map(toLayoutNodeDto);
  }

  if (node.child) {
    dto.child = toLayoutNodeDto(node.child);
  }

  return dto;
}

/**
 * Convert backend LayoutNodeDto to frontend LayoutNode format
 */
export function fromLayoutNodeDto(dto: LayoutNodeDto): LayoutNode {
  const node: LayoutNode = {
    id: dto.id || generateNodeId(),
    type: dto.type as LayoutNode["type"],
    properties: dto.properties || {},
    style: dto.style as unknown as StyleProperties | undefined,
    visible: dto.visible,
    repeatFor: dto.repeatFor,
    repeatAs: dto.repeatAs,
    repeatIndex: dto.repeatIndex,
    children: [],
    parentId: undefined,
  };

  if (dto.children && dto.children.length > 0) {
    node.children = dto.children.map((child) => {
      const childNode = fromLayoutNodeDto(child);
      childNode.parentId = node.id;
      return childNode;
    });
  }

  if (dto.child) {
    node.child = fromLayoutNodeDto(dto.child);
    node.child.parentId = node.id;
  }

  return node;
}

/**
 * Generate a unique node ID for new nodes
 */
function generateNodeId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Map backend isActive to frontend status
 */
export function mapBackendStatus(isActive: boolean): TemplateStatus {
  return isActive ? "published" : "draft";
}

/**
 * Map frontend status to backend isActive
 */
export function mapFrontendStatus(status: TemplateStatus): boolean {
  return status === "published";
}

/**
 * Convert backend TemplateDto to frontend Template model
 * Extracts testData from metadata.testData
 */
export function fromTemplateDto(dto: TemplateDto): Template {
  // Extract testData from metadata if present
  const testData =
    dto.metadata &&
    typeof dto.metadata === "object" &&
    "testData" in dto.metadata
      ? (dto.metadata.testData as Record<string, unknown>)
      : undefined;

  // Create default layout if not present
  const defaultLayout: LayoutNode = {
    id: "root",
    type: ComponentType.Column,
    properties: {},
    children: [],
    parentId: undefined,
  };

  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    status: mapBackendStatus(dto.isActive),
    category: dto.category,
    tags: dto.tags ? dto.tags.split(",").filter(Boolean) : undefined,
    layout: dto.layout ? fromLayoutNodeDto(dto.layout) : defaultLayout,
    testData,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    createdBy: dto.createdBy,
    version: dto.version,
  };
}

/**
 * Convert frontend Template to backend SaveTemplateRequest
 * Stores testData in metadata.testData
 */
export function toSaveTemplateRequest(template: Template): SaveTemplateRequest {
  // Build metadata with testData if present
  const metadata: Record<string, unknown> = {};
  if (template.testData && Object.keys(template.testData).length > 0) {
    metadata.testData = template.testData;
  }

  return {
    name: template.name,
    description: template.description,
    category: template.category,
    layout: toLayoutNodeDto(template.layout),
    tags: template.tags?.join(","),
    ...(Object.keys(metadata).length > 0 && { metadata }),
  };
}
// ============================================================================
// TEMPLATE LAYOUT CONVERSION
// ============================================================================

/**
 * Convert frontend PageSettings to backend PageSettingsDto
 */
export function toPageSettingsDto(settings: PageSettings): PageSettingsDto {
  return {
    pageSize: settings.size,
    orientation: settings.orientation === "portrait" ? "Portrait" : "Landscape",
    marginTop: settings.margins.top,
    marginRight: settings.margins.right,
    marginBottom: settings.margins.bottom,
    marginLeft: settings.margins.left,
    backgroundColor: settings.backgroundColor,
  };
}

/**
 * Convert canvas store TemplateStructure to backend TemplateLayoutDto
 * This is the main conversion function for PDF generation.
 */
export function toTemplateLayoutDto(
  structure: TemplateStructure
): TemplateLayoutDto {
  if (!structure.content) {
    throw new Error("Content layout is required for PDF generation");
  }

  return {
    pageSettings: toPageSettingsDto(structure.pageSettings),
    header: structure.header ? toLayoutNodeDto(structure.header) : null,
    content: toLayoutNodeDto(structure.content),
    footer: structure.footer ? toLayoutNodeDto(structure.footer) : null,
    background: null,
    foreground: null,
  };
}

/**
 * Create a TemplateLayoutDto from individual parts
 * Useful when building the layout from separate components
 */
export function createTemplateLayoutDto(params: {
  content: LayoutNode;
  header?: LayoutNode | null;
  footer?: LayoutNode | null;
  pageSettings?: PageSettings;
}): TemplateLayoutDto {
  const defaultPageSettings: PageSettings = {
    size: "A4",
    orientation: "portrait",
    margins: { top: 36, right: 36, bottom: 36, left: 36 },
  };

  return {
    pageSettings: toPageSettingsDto(params.pageSettings ?? defaultPageSettings),
    header: params.header ? toLayoutNodeDto(params.header) : null,
    content: toLayoutNodeDto(params.content),
    footer: params.footer ? toLayoutNodeDto(params.footer) : null,
    background: null,
    foreground: null,
  };
}
