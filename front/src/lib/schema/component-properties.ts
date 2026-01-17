/**
 * Component Properties Zod Schemas
 * Defines validation schemas for component-specific properties
 * Aligned with backend ComponentRegistry property definitions
 */

import { z } from "zod";

// ============================================================================
// Common Property Schemas
// ============================================================================

/**
 * Expression pattern for data binding (e.g., {{ data.field }})
 */
export const expressionPattern = /\{\{[^}]*\}\}/;

/**
 * Hex color validation
 */
export const hexColorSchema = z
  .string()
  .regex(
    /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{3})$/,
    "Must be a valid hex color (e.g., #333333)"
  );

/**
 * Size value in points
 */
export const sizeValueSchema = z.number().min(0).max(10000);

/**
 * Spacing value in points
 */
export const spacingSchema = z.number().min(0).max(1000);

/**
 * Unit type for measurements
 */
export const unitSchema = z.enum(["pt", "cm", "inch", "mm", "%"]);

// ============================================================================
// Container Component Properties
// ============================================================================

export const columnPropertiesSchema = z.object({
  spacing: spacingSchema.optional(),
});

export const rowPropertiesSchema = z.object({
  spacing: spacingSchema.optional(),
});

export const tableColumnSchema = z.object({
  type: z.enum(["relative", "constant"]),
  value: z.number().min(0),
});

export const tablePropertiesSchema = z.object({
  columns: z.array(tableColumnSchema).min(1),
  rows: z.array(z.unknown()).optional(),
  header: z.unknown().optional(),
  footer: z.unknown().optional(),
});

export const inlinedPropertiesSchema = z.object({
  spacing: spacingSchema.optional(),
  verticalSpacing: spacingSchema.optional(),
  baselineAlignment: z.boolean().optional(),
});

export const multiColumnPropertiesSchema = z.object({
  columnCount: z.number().min(1).max(10),
  spacing: spacingSchema.optional(),
});

export const listPropertiesSchema = z.object({
  listType: z.enum(["ordered", "unordered"]).optional(),
  spacing: spacingSchema.optional(),
  bulletCharacter: z.string().optional(),
});

// ============================================================================
// Content Component Properties
// ============================================================================

export const textPropertiesSchema = z.object({
  content: z.string(),
  spans: z.array(z.unknown()).optional(),
});

export const imagePropertiesSchema = z.object({
  source: z.string(),
  width: sizeValueSchema.optional(),
  height: sizeValueSchema.optional(),
  fit: z
    .enum([
      "fill",
      "contain",
      "cover",
      "width",
      "height",
      "area",
      "unproportional",
    ])
    .optional(),
});

export const linePropertiesSchema = z.object({
  orientation: z.enum(["horizontal", "vertical"]).optional(),
  thickness: z.number().min(0.1).max(100).optional(),
  color: hexColorSchema.optional(),
});

export const placeholderPropertiesSchema = z.object({
  label: z.string().optional(),
});

export const hyperlinkPropertiesSchema = z.object({
  url: z.url("Must be a valid URL"),
});

export const barcodePropertiesSchema = z.object({
  value: z.string(),
  format: z.enum([
    "code128",
    "ean8",
    "ean13",
    "upca",
    "code39",
    "dataMatrix",
    "pdf417",
  ]),
});

export const qrcodePropertiesSchema = z.object({
  value: z.string(),
  size: sizeValueSchema.optional(),
});

// ============================================================================
// Styling Component Properties
// ============================================================================

export const paddingPropertiesSchema = z.object({
  all: sizeValueSchema.optional(),
  top: sizeValueSchema.optional(),
  right: sizeValueSchema.optional(),
  bottom: sizeValueSchema.optional(),
  left: sizeValueSchema.optional(),
  horizontal: sizeValueSchema.optional(),
  vertical: sizeValueSchema.optional(),
});

export const borderPropertiesSchema = z.object({
  thickness: z.number().min(0).max(100).optional(),
  color: hexColorSchema.optional(),
  top: z.number().min(0).max(100).optional(),
  right: z.number().min(0).max(100).optional(),
  bottom: z.number().min(0).max(100).optional(),
  left: z.number().min(0).max(100).optional(),
});

export const backgroundPropertiesSchema = z.object({
  color: hexColorSchema,
});

export const roundedCornersPropertiesSchema = z.object({
  all: z.number().min(0).max(500).optional(),
  topLeft: z.number().min(0).max(500).optional(),
  topRight: z.number().min(0).max(500).optional(),
  bottomLeft: z.number().min(0).max(500).optional(),
  bottomRight: z.number().min(0).max(500).optional(),
});

export const shadowPropertiesSchema = z.object({
  color: hexColorSchema.optional(),
  blurRadius: z.number().min(0).max(100).optional(),
  offsetX: z.number().min(-100).max(100).optional(),
  offsetY: z.number().min(-100).max(100).optional(),
});

export const defaultTextStylePropertiesSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.number().min(1).max(1000).optional(),
  fontWeight: z.string().optional(),
  fontStyle: z.enum(["normal", "italic", "oblique"]).optional(),
  color: hexColorSchema.optional(),
  lineHeight: z.number().min(0.1).max(10).optional(),
  letterSpacing: z.number().min(-100).max(100).optional(),
});

// ============================================================================
// Sizing Component Properties
// ============================================================================

export const sizeWithUnitPropertiesSchema = z.object({
  value: sizeValueSchema,
  unit: unitSchema.optional(),
});

export const alignmentPropertiesSchema = z.object({
  horizontal: z.enum(["left", "center", "right", "start", "end"]).optional(),
  vertical: z.enum(["top", "middle", "bottom"]).optional(),
  position: z
    .enum([
      "topLeft",
      "topCenter",
      "topRight",
      "middleLeft",
      "middleCenter",
      "middleRight",
      "bottomLeft",
      "bottomCenter",
      "bottomRight",
    ])
    .optional(),
});

export const aspectRatioPropertiesSchema = z.object({
  ratio: z.number().min(0.1).max(10),
});

export const constrainedPropertiesSchema = z.object({
  minWidth: sizeValueSchema.optional(),
  maxWidth: sizeValueSchema.optional(),
  minHeight: sizeValueSchema.optional(),
  maxHeight: sizeValueSchema.optional(),
});

// ============================================================================
// Transformation Component Properties
// ============================================================================

export const rotatePropertiesSchema = z.object({
  angle: z.number().min(-360).max(360),
});

export const scalePropertiesSchema = z.object({
  factor: z.number().min(0.01).max(10).optional(),
  factorX: z.number().min(0.01).max(10).optional(),
  factorY: z.number().min(0.01).max(10).optional(),
});

export const translatePropertiesSchema = z.object({
  x: z.number().min(-10000).max(10000).optional(),
  y: z.number().min(-10000).max(10000).optional(),
});

export const flipPropertiesSchema = z.object({
  horizontal: z.boolean().optional(),
  vertical: z.boolean().optional(),
});

// ============================================================================
// Flow Control Component Properties
// ============================================================================

export const ensureSpacePropertiesSchema = z.object({
  minHeight: z.number().min(1).max(10000),
});

export const sectionPropertiesSchema = z.object({
  name: z.string().min(1),
});

export const repeatPropertiesSchema = z
  .object({
    // Repeat uses the LayoutNode's repeatFor, repeatAs, repeatIndex
    // No additional properties needed
  })
  .optional();

export const showOncePropertiesSchema = z.object({}).optional();

export const skipOncePropertiesSchema = z.object({}).optional();

export const showEntirePropertiesSchema = z.object({}).optional();

export const stopPagingPropertiesSchema = z.object({}).optional();

export const pageBreakPropertiesSchema = z.object({}).optional();

// ============================================================================
// Special/Conditional Component Properties
// ============================================================================

export const contentDirectionPropertiesSchema = z.object({
  direction: z.enum(["ltr", "rtl"]),
});

export const zIndexPropertiesSchema = z.object({
  index: z.number().min(-1000).max(1000),
});

export const debugPropertiesSchema = z.object({
  label: z.string().optional(),
  color: hexColorSchema.optional(),
});

export const showIfPropertiesSchema = z.object({
  condition: z.string().min(1),
});

export const preventPageBreakPropertiesSchema = z.object({}).optional();

// ============================================================================
// Container Components Without Properties
// ============================================================================

export const layersPropertiesSchema = z.object({}).optional();

export const decorationPropertiesSchema = z.object({
  before: z.unknown().optional(),
  after: z.unknown().optional(),
});

// ============================================================================
// Sizing Components Without Properties
// ============================================================================

export const extendPropertiesSchema = z.object({}).optional();

export const shrinkPropertiesSchema = z.object({}).optional();

export const unconstrainedPropertiesSchema = z.object({}).optional();

export const scaleToFitPropertiesSchema = z.object({}).optional();

// ============================================================================
// Canvas Component Properties
// ============================================================================

export const canvasDrawingCommandSchema = z.object({
  type: z.enum([
    "moveTo",
    "lineTo",
    "bezierCurveTo",
    "quadraticCurveTo",
    "arc",
    "rect",
    "fill",
    "stroke",
    "setFillColor",
    "setStrokeColor",
    "setLineWidth",
  ]),
  params: z.array(z.union([z.number(), z.string()])),
});

export const canvasPropertiesSchema = z.object({
  width: sizeValueSchema,
  height: sizeValueSchema,
  commands: z.array(canvasDrawingCommandSchema).optional(),
});

// ============================================================================
// Property Schema Registry
// ============================================================================

import { ComponentType } from "@/types/component";

/**
 * Map of component types to their property schemas
 * Complete registry covering all 53 component types
 */
export const componentPropertySchemas: Partial<
  Record<ComponentType, z.ZodSchema>
> = {
  // Container Components (7)
  [ComponentType.Column]: columnPropertiesSchema,
  [ComponentType.Row]: rowPropertiesSchema,
  [ComponentType.Table]: tablePropertiesSchema,
  [ComponentType.Layers]: layersPropertiesSchema,
  [ComponentType.Decoration]: decorationPropertiesSchema,
  [ComponentType.Inlined]: inlinedPropertiesSchema,
  [ComponentType.MultiColumn]: multiColumnPropertiesSchema,

  // Content Components (9)
  [ComponentType.Text]: textPropertiesSchema,
  [ComponentType.Image]: imagePropertiesSchema,
  [ComponentType.Line]: linePropertiesSchema,
  [ComponentType.Placeholder]: placeholderPropertiesSchema,
  [ComponentType.Hyperlink]: hyperlinkPropertiesSchema,
  [ComponentType.List]: listPropertiesSchema,
  [ComponentType.Canvas]: canvasPropertiesSchema,
  [ComponentType.Barcode]: barcodePropertiesSchema,
  [ComponentType.QRCode]: qrcodePropertiesSchema,

  // Styling Components (6)
  [ComponentType.Padding]: paddingPropertiesSchema,
  [ComponentType.Border]: borderPropertiesSchema,
  [ComponentType.Background]: backgroundPropertiesSchema,
  [ComponentType.RoundedCorners]: roundedCornersPropertiesSchema,
  [ComponentType.Shadow]: shadowPropertiesSchema,
  [ComponentType.DefaultTextStyle]: defaultTextStylePropertiesSchema,

  // Sizing Components (12)
  [ComponentType.Width]: sizeWithUnitPropertiesSchema,
  [ComponentType.Height]: sizeWithUnitPropertiesSchema,
  [ComponentType.MinWidth]: sizeWithUnitPropertiesSchema,
  [ComponentType.MaxWidth]: sizeWithUnitPropertiesSchema,
  [ComponentType.MinHeight]: sizeWithUnitPropertiesSchema,
  [ComponentType.MaxHeight]: sizeWithUnitPropertiesSchema,
  [ComponentType.Alignment]: alignmentPropertiesSchema,
  [ComponentType.AspectRatio]: aspectRatioPropertiesSchema,
  [ComponentType.Extend]: extendPropertiesSchema,
  [ComponentType.Shrink]: shrinkPropertiesSchema,
  [ComponentType.Unconstrained]: unconstrainedPropertiesSchema,
  [ComponentType.Constrained]: constrainedPropertiesSchema,

  // Transformation Components (5)
  [ComponentType.Rotate]: rotatePropertiesSchema,
  [ComponentType.Scale]: scalePropertiesSchema,
  [ComponentType.ScaleToFit]: scaleToFitPropertiesSchema,
  [ComponentType.Translate]: translatePropertiesSchema,
  [ComponentType.Flip]: flipPropertiesSchema,

  // Flow Control Components (8)
  [ComponentType.PageBreak]: pageBreakPropertiesSchema,
  [ComponentType.EnsureSpace]: ensureSpacePropertiesSchema,
  [ComponentType.ShowEntire]: showEntirePropertiesSchema,
  [ComponentType.StopPaging]: stopPagingPropertiesSchema,
  [ComponentType.Section]: sectionPropertiesSchema,
  [ComponentType.Repeat]: repeatPropertiesSchema,
  [ComponentType.ShowOnce]: showOncePropertiesSchema,
  [ComponentType.SkipOnce]: skipOncePropertiesSchema,

  // Special Components (4)
  [ComponentType.ContentDirection]: contentDirectionPropertiesSchema,
  [ComponentType.ZIndex]: zIndexPropertiesSchema,
  [ComponentType.DebugArea]: debugPropertiesSchema,
  [ComponentType.DebugPointer]: debugPropertiesSchema,

  // Conditional Components (2)
  [ComponentType.ShowIf]: showIfPropertiesSchema,
  [ComponentType.PreventPageBreak]: preventPageBreakPropertiesSchema,
};

/**
 * Validate component properties for a given component type
 */
export function validateComponentProperties(
  type: ComponentType,
  properties: unknown
): { success: boolean; data?: unknown; errors?: z.ZodError } {
  const schema = componentPropertySchemas[type];
  if (!schema) {
    // Components without specific schema validation pass through
    return { success: true, data: properties };
  }

  const result = schema.safeParse(properties);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
