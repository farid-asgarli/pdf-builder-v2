/**
 * API Converter Utilities
 * Functions for converting between frontend canvas store format and backend API DTO format
 *
 * The frontend uses a slightly different structure for page settings than the backend.
 * This module provides conversion functions to ensure proper data transformation.
 */

import type { LayoutNode } from "@/types/component";
import type {
  LayoutNodeDto,
  PageSettingsDto,
  TemplateLayoutDto,
  StylePropertiesDto,
} from "@/types/dto";
import type {
  PageSettings,
  TemplateStructure,
  PageSize,
  PageOrientation,
} from "@/store/canvas-store";

// ============================================================================
// Type Mapping Constants
// ============================================================================

/**
 * Map frontend page size values to backend format
 */
const PAGE_SIZE_MAP: Record<PageSize, string> = {
  A4: "A4",
  A3: "A3",
  A5: "A5",
  Letter: "Letter",
  Legal: "Legal",
  Tabloid: "Tabloid",
  Custom: "Custom",
};

/**
 * Map frontend orientation to backend format (backend uses PascalCase)
 */
const ORIENTATION_MAP: Record<PageOrientation, "Portrait" | "Landscape"> = {
  portrait: "Portrait",
  landscape: "Landscape",
};

// ============================================================================
// LayoutNode Conversion
// ============================================================================

/**
 * Convert frontend LayoutNode to backend LayoutNodeDto
 * The main difference is removing frontend-only fields like parentId
 */
export function layoutNodeToDto(node: LayoutNode): LayoutNodeDto {
  const dto: LayoutNodeDto = {
    id: node.id,
    type: node.type,
    properties: node.properties,
  };

  // Convert children recursively
  if (node.children && node.children.length > 0) {
    dto.children = node.children.map(layoutNodeToDto);
  }

  // Convert single child for wrapper components
  if (node.child) {
    dto.child = layoutNodeToDto(node.child);
  }

  // Convert style properties
  if (node.style) {
    dto.style = styleToDto(node.style);
  }

  // Copy conditional and repeat bindings
  if (node.visible) {
    dto.visible = node.visible;
  }
  if (node.repeatFor) {
    dto.repeatFor = node.repeatFor;
    dto.repeatAs = node.repeatAs;
    dto.repeatIndex = node.repeatIndex;
  }

  return dto;
}

/**
 * Convert frontend StyleProperties to backend StylePropertiesDto
 * Backend uses PascalCase for some enum values
 */
export function styleToDto(
  style: LayoutNode["style"]
): StylePropertiesDto | undefined {
  if (!style) return undefined;

  return {
    // Text Styling
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    fontWeight: mapFontWeight(style.fontWeight),
    fontStyle: mapFontStyle(style.fontStyle),
    color: style.color,
    textDecoration: mapTextDecoration(style.textDecoration),
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    textAlignment: mapTextAlignment(style.textAlignment),

    // Layout
    horizontalAlignment: mapHorizontalAlignment(style.horizontalAlignment),
    verticalAlignment: mapVerticalAlignment(style.verticalAlignment),

    // Spacing
    padding: style.padding,
    paddingTop: style.paddingTop,
    paddingRight: style.paddingRight,
    paddingBottom: style.paddingBottom,
    paddingLeft: style.paddingLeft,
    paddingHorizontal: style.paddingHorizontal,
    paddingVertical: style.paddingVertical,

    // Visual
    backgroundColor: style.backgroundColor,
    borderColor: style.borderColor,
    borderWidth: style.borderWidth,
    borderTop: style.borderTop,
    borderRight: style.borderRight,
    borderBottom: style.borderBottom,
    borderLeft: style.borderLeft,
    borderRadius: style.borderRadius,
    opacity: style.opacity,
  };
}

// ============================================================================
// Page Settings Conversion
// ============================================================================

/**
 * Convert frontend PageSettings to backend PageSettingsDto
 * Frontend uses nested margins object, backend uses individual margin properties
 */
export function pageSettingsToDto(settings: PageSettings): PageSettingsDto {
  return {
    pageSize: PAGE_SIZE_MAP[settings.size] ?? settings.size,
    orientation: ORIENTATION_MAP[settings.orientation],
    marginTop: settings.margins.top,
    marginRight: settings.margins.right,
    marginBottom: settings.margins.bottom,
    marginLeft: settings.margins.left,
    headerHeight: settings.headerHeight,
    footerHeight: settings.footerHeight,
    backgroundColor: settings.backgroundColor,
    // Custom dimensions for Custom page size
    ...(settings.size === "Custom" && {
      width: settings.customWidth,
      height: settings.customHeight,
    }),
  };
}

/**
 * Convert backend PageSettingsDto to frontend PageSettings
 */
export function dtoToPageSettings(dto: PageSettingsDto): PageSettings {
  return {
    size: (dto.pageSize as PageSize) ?? "A4",
    orientation: dto.orientation === "Landscape" ? "landscape" : "portrait",
    margins: {
      top: dto.marginTop ?? dto.margin ?? 36,
      right: dto.marginRight ?? dto.margin ?? 36,
      bottom: dto.marginBottom ?? dto.margin ?? 36,
      left: dto.marginLeft ?? dto.margin ?? 36,
    },
    headerHeight: dto.headerHeight,
    footerHeight: dto.footerHeight,
    backgroundColor: dto.backgroundColor,
    customWidth: dto.width,
    customHeight: dto.height,
  };
}

// ============================================================================
// Template Structure Conversion
// ============================================================================

/**
 * Convert frontend TemplateStructure to backend TemplateLayoutDto
 * This is the main conversion function used when sending data to the API
 */
export function templateStructureToDto(
  template: TemplateStructure
): TemplateLayoutDto {
  // Content is required by the backend
  if (!template.content) {
    throw new Error("Template content is required");
  }

  return {
    pageSettings: pageSettingsToDto(template.pageSettings),
    header: template.header ? layoutNodeToDto(template.header) : null,
    content: layoutNodeToDto(template.content),
    footer: template.footer ? layoutNodeToDto(template.footer) : null,
    background: template.background
      ? layoutNodeToDto(template.background)
      : null,
    foreground: template.foreground
      ? layoutNodeToDto(template.foreground)
      : null,
  };
}

/**
 * Convert backend TemplateLayoutDto to frontend TemplateStructure
 * This is used when loading data from the API
 */
export function dtoToTemplateStructure(
  dto: TemplateLayoutDto
): TemplateStructure {
  return {
    pageSettings: dto.pageSettings
      ? dtoToPageSettings(dto.pageSettings)
      : {
          size: "A4",
          orientation: "portrait",
          margins: { top: 36, right: 36, bottom: 36, left: 36 },
        },
    header: dto.header ? dtoToLayoutNode(dto.header) : null,
    content: dto.content ? dtoToLayoutNode(dto.content) : null,
    footer: dto.footer ? dtoToLayoutNode(dto.footer) : null,
    background: dto.background ? dtoToLayoutNode(dto.background) : null,
    foreground: dto.foreground ? dtoToLayoutNode(dto.foreground) : null,
  };
}

/**
 * Convert backend LayoutNodeDto to frontend LayoutNode
 */
export function dtoToLayoutNode(dto: LayoutNodeDto): LayoutNode {
  const node: LayoutNode = {
    id: dto.id ?? generateNodeId(),
    type: dto.type as LayoutNode["type"],
    properties: dto.properties ?? {},
  };

  if (dto.children && dto.children.length > 0) {
    node.children = dto.children.map(dtoToLayoutNode);
  }

  if (dto.child) {
    node.child = dtoToLayoutNode(dto.child);
  }

  if (dto.style) {
    node.style = dtoToStyle(dto.style);
  }

  if (dto.visible) {
    node.visible = dto.visible;
  }

  if (dto.repeatFor) {
    node.repeatFor = dto.repeatFor;
    node.repeatAs = dto.repeatAs;
    node.repeatIndex = dto.repeatIndex;
  }

  return node;
}

/**
 * Convert backend StylePropertiesDto to frontend StyleProperties
 */
export function dtoToStyle(
  dto: StylePropertiesDto
): LayoutNode["style"] | undefined {
  if (!dto) return undefined;

  const style: NonNullable<LayoutNode["style"]> = {
    fontFamily: dto.fontFamily,
    fontSize: dto.fontSize,
    fontWeight: dto.fontWeight?.toLowerCase() as NonNullable<
      LayoutNode["style"]
    >["fontWeight"],
    fontStyle: dto.fontStyle?.toLowerCase() as NonNullable<
      LayoutNode["style"]
    >["fontStyle"],
    color: dto.color,
    textDecoration: dto.textDecoration?.toLowerCase() as NonNullable<
      LayoutNode["style"]
    >["textDecoration"],
    lineHeight: dto.lineHeight,
    letterSpacing: dto.letterSpacing,
    textAlignment: dto.textAlignment?.toLowerCase() as NonNullable<
      LayoutNode["style"]
    >["textAlignment"],
    horizontalAlignment: dto.horizontalAlignment?.toLowerCase() as NonNullable<
      LayoutNode["style"]
    >["horizontalAlignment"],
    verticalAlignment: dto.verticalAlignment?.toLowerCase() as NonNullable<
      LayoutNode["style"]
    >["verticalAlignment"],
    padding: dto.padding,
    paddingTop: dto.paddingTop,
    paddingRight: dto.paddingRight,
    paddingBottom: dto.paddingBottom,
    paddingLeft: dto.paddingLeft,
    paddingHorizontal: dto.paddingHorizontal,
    paddingVertical: dto.paddingVertical,
    backgroundColor: dto.backgroundColor,
    borderColor: dto.borderColor,
    borderWidth: dto.borderWidth,
    borderTop: dto.borderTop,
    borderRight: dto.borderRight,
    borderBottom: dto.borderBottom,
    borderLeft: dto.borderLeft,
    borderRadius: dto.borderRadius,
    opacity: dto.opacity,
  };

  return style;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a unique node ID (same as in canvas store)
 */
function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Map font weight to backend format (PascalCase)
 */
function mapFontWeight(weight?: string): string | undefined {
  if (!weight) return undefined;
  const weightMap: Record<string, string> = {
    thin: "Thin",
    extraLight: "ExtraLight",
    light: "Light",
    normal: "Normal",
    medium: "Medium",
    semiBold: "SemiBold",
    bold: "Bold",
    extraBold: "ExtraBold",
    black: "Black",
    "100": "Thin",
    "200": "ExtraLight",
    "300": "Light",
    "400": "Normal",
    "500": "Medium",
    "600": "SemiBold",
    "700": "Bold",
    "800": "ExtraBold",
    "900": "Black",
  };
  return weightMap[weight] ?? weight;
}

/**
 * Map font style to backend format
 */
function mapFontStyle(style?: string): string | undefined {
  if (!style) return undefined;
  const styleMap: Record<string, string> = {
    normal: "Normal",
    italic: "Italic",
    oblique: "Oblique",
  };
  return styleMap[style] ?? style;
}

/**
 * Map text decoration to backend format
 */
function mapTextDecoration(decoration?: string): string | undefined {
  if (!decoration) return undefined;
  const decorationMap: Record<string, string> = {
    none: "None",
    underline: "Underline",
    strikethrough: "Strikethrough",
  };
  return decorationMap[decoration] ?? decoration;
}

/**
 * Map text alignment to backend format
 */
function mapTextAlignment(alignment?: string): string | undefined {
  if (!alignment) return undefined;
  const alignmentMap: Record<string, string> = {
    left: "Left",
    center: "Center",
    right: "Right",
    justify: "Justify",
    start: "Start",
    end: "End",
  };
  return alignmentMap[alignment] ?? alignment;
}

/**
 * Map horizontal alignment to backend format
 */
function mapHorizontalAlignment(alignment?: string): string | undefined {
  if (!alignment) return undefined;
  const alignmentMap: Record<string, string> = {
    left: "Left",
    center: "Center",
    right: "Right",
    start: "Start",
    end: "End",
  };
  return alignmentMap[alignment] ?? alignment;
}

/**
 * Map vertical alignment to backend format
 */
function mapVerticalAlignment(alignment?: string): string | undefined {
  if (!alignment) return undefined;
  const alignmentMap: Record<string, string> = {
    top: "Top",
    middle: "Middle",
    center: "Middle",
    bottom: "Bottom",
  };
  return alignmentMap[alignment] ?? alignment;
}
