/**
 * Component Metadata Registry
 * Defines all 54 PDF components with their properties, defaults, and UI configuration
 * Aligned with backend PDFBuilder.Engine.Services.ComponentRegistry
 */

import {
  ComponentType,
  type ComponentMetadata,
  type ComponentRegistry,
  type ComponentCategory,
  type PropertyDefinition,
  type LayoutNode,
} from "@/types/component";

// ============================================================================
// Property Definitions (Reusable)
// ============================================================================

const spacingProperty: PropertyDefinition = {
  name: "spacing",
  type: "number",
  label: "Spacing",
  description: "Space between child elements in points",
  defaultValue: 0,
  min: 0,
  max: 1000,
  unit: "pt",
  supportsExpression: true,
};

const colorProperty = (
  name: string,
  label: string,
  description: string,
  defaultValue = "#000000"
): PropertyDefinition => ({
  name,
  type: "color",
  label,
  description,
  defaultValue,
  required: false,
  supportsExpression: true,
});

const sizeProperty = (
  name: string,
  label: string,
  description: string,
  defaultValue?: number
): PropertyDefinition => ({
  name,
  type: "number",
  label,
  description,
  defaultValue,
  min: 0,
  max: 10000,
  unit: "pt",
  supportsExpression: true,
});

// ============================================================================
// Container Components (8)
// ============================================================================

const columnMetadata: ComponentMetadata = {
  id: ComponentType.Column,
  name: "Column",
  category: "container",
  icon: "Rows3",
  description: "Vertical stacking container with optional spacing",
  defaultProperties: { spacing: 0 },
  propertySchema: [spacingProperty],
  allowsChildren: true,
  isWrapper: false,
  priorityTier: 1,
  questPdfApi: "container.Column(col => ...)",
};

const rowMetadata: ComponentMetadata = {
  id: ComponentType.Row,
  name: "Row",
  category: "container",
  icon: "Columns3",
  description: "Horizontal arrangement container with optional spacing",
  defaultProperties: { spacing: 0 },
  propertySchema: [spacingProperty],
  allowsChildren: true,
  isWrapper: false,
  priorityTier: 1,
  questPdfApi: "container.Row(row => ...)",
};

const tableMetadata: ComponentMetadata = {
  id: ComponentType.Table,
  name: "Table",
  category: "container",
  icon: "Table",
  description: "Grid layout with rows, columns, and cell spanning",
  defaultProperties: {
    columns: [{ type: "relative", value: 1 }],
  },
  propertySchema: [
    {
      name: "columns",
      type: "array",
      label: "Columns",
      description: "Column definitions specifying width for each column",
      defaultValue: [{ type: "relative", value: 1 }],
      required: true,
    },
    {
      name: "rows",
      type: "array",
      label: "Rows",
      description: "Table row definitions containing cells",
      defaultValue: [],
    },
    {
      name: "header",
      type: "object",
      label: "Header",
      description: "Table header that repeats on each page",
      defaultValue: null,
    },
    {
      name: "footer",
      type: "object",
      label: "Footer",
      description: "Table footer that appears at the end or on each page",
      defaultValue: null,
    },
  ],
  allowsChildren: true,
  isWrapper: false,
  priorityTier: 1,
  questPdfApi: "container.Table(table => ...)",
};

const layersMetadata: ComponentMetadata = {
  id: ComponentType.Layers,
  name: "Layers",
  category: "container",
  icon: "Layers",
  description:
    "Stacking planes for layered content (background, primary, foreground)",
  defaultProperties: {},
  propertySchema: [],
  allowsChildren: true,
  isWrapper: false,
  priorityTier: 2,
  questPdfApi: "container.Layers(layers => ...)",
};

const decorationMetadata: ComponentMetadata = {
  id: ComponentType.Decoration,
  name: "Decoration",
  category: "container",
  icon: "LayoutTemplate",
  description: "Repeating header/footer with main content area",
  defaultProperties: {},
  propertySchema: [
    {
      name: "before",
      type: "object",
      label: "Before (Header)",
      description: "Content that appears before the main content on each page",
      defaultValue: null,
    },
    {
      name: "after",
      type: "object",
      label: "After (Footer)",
      description: "Content that appears after the main content on each page",
      defaultValue: null,
    },
  ],
  allowsChildren: true,
  isWrapper: false,
  priorityTier: 2,
  questPdfApi: "container.Decoration(dec => ...)",
};

const inlinedMetadata: ComponentMetadata = {
  id: ComponentType.Inlined,
  name: "Inlined",
  category: "container",
  icon: "WrapText",
  description: "Inline flow layout for text-like wrapping",
  defaultProperties: {
    spacing: 0,
    verticalSpacing: 0,
    baselineAlignment: false,
  },
  propertySchema: [
    { ...spacingProperty, description: "Horizontal space between items" },
    {
      name: "verticalSpacing",
      type: "number",
      label: "Vertical Spacing",
      description: "Vertical space between wrapped lines",
      defaultValue: 0,
      min: 0,
      max: 1000,
      unit: "pt",
    },
    {
      name: "baselineAlignment",
      type: "boolean",
      label: "Baseline Alignment",
      description: "Align items to text baseline",
      defaultValue: false,
    },
  ],
  allowsChildren: true,
  isWrapper: false,
  priorityTier: 4,
  questPdfApi: "container.Inlined(inline => ...)",
};

const multiColumnMetadata: ComponentMetadata = {
  id: ComponentType.MultiColumn,
  name: "Multi Column",
  category: "container",
  icon: "LayoutColumns",
  description: "Newspaper-style multi-column layout",
  defaultProperties: {
    columnCount: 2,
    spacing: 10,
  },
  propertySchema: [
    {
      name: "columnCount",
      type: "number",
      label: "Column Count",
      description: "Number of columns",
      defaultValue: 2,
      min: 1,
      max: 10,
      required: true,
    },
    spacingProperty,
  ],
  allowsChildren: true,
  isWrapper: false,
  priorityTier: 4,
  questPdfApi: "Custom implementation using Column",
};

const listMetadata: ComponentMetadata = {
  id: ComponentType.List,
  name: "List",
  category: "content", // List = 205 in backend (Content category)
  icon: "List",
  description: "Ordered and unordered lists",
  defaultProperties: {
    listType: "unordered",
    spacing: 5,
    bulletCharacter: "•",
  },
  propertySchema: [
    {
      name: "listType",
      type: "enum",
      label: "List Type",
      description: "Ordered (numbered) or unordered (bulleted)",
      defaultValue: "unordered",
      options: [
        { label: "Unordered", value: "unordered" },
        { label: "Ordered", value: "ordered" },
      ],
    },
    spacingProperty,
    {
      name: "bulletCharacter",
      type: "string",
      label: "Bullet Character",
      description: "Character used for unordered list bullets",
      defaultValue: "•",
      supportsExpression: false,
    },
  ],
  allowsChildren: true,
  isWrapper: false,
  priorityTier: 3,
  questPdfApi: "Custom implementation",
};

// ============================================================================
// Content Components (8)
// ============================================================================

const textMetadata: ComponentMetadata = {
  id: ComponentType.Text,
  name: "Text",
  category: "content",
  icon: "Type",
  description: "Rich text with styling support",
  defaultProperties: {
    content: "Text content",
  },
  propertySchema: [
    {
      name: "content",
      type: "expression",
      label: "Content",
      description: "Text content (supports expressions like {{ data.field }})",
      defaultValue: "Text content",
      required: true,
      supportsExpression: true,
    },
    {
      name: "spans",
      type: "array",
      label: "Text Spans",
      description: "Rich text spans with different styles",
      defaultValue: [],
    },
  ],
  allowsChildren: false,
  priorityTier: 1,
  questPdfApi: 'container.Text("...")',
};

const imageMetadata: ComponentMetadata = {
  id: ComponentType.Image,
  name: "Image",
  category: "content",
  icon: "Image",
  description: "Raster and SVG images",
  defaultProperties: {
    source: "",
    fit: "contain",
  },
  propertySchema: [
    {
      name: "source",
      type: "image",
      label: "Source",
      description: "Image URL or base64 data",
      defaultValue: "",
      required: true,
      supportsExpression: true,
    },
    sizeProperty("width", "Width", "Image width in points"),
    sizeProperty("height", "Height", "Image height in points"),
    {
      name: "fit",
      type: "enum",
      label: "Fit Mode",
      description: "How the image should fit within its container",
      defaultValue: "contain",
      options: [
        { label: "Fill", value: "fill" },
        { label: "Contain", value: "contain" },
        { label: "Cover", value: "cover" },
        { label: "Width", value: "width" },
        { label: "Height", value: "height" },
        { label: "Area", value: "area" },
        { label: "Unproportional", value: "unproportional" },
      ],
    },
  ],
  allowsChildren: false,
  priorityTier: 1,
  questPdfApi: "container.Image(bytes/path)",
};

const lineMetadata: ComponentMetadata = {
  id: ComponentType.Line,
  name: "Line",
  category: "content",
  icon: "Minus",
  description: "Horizontal or vertical divider lines",
  defaultProperties: {
    orientation: "horizontal",
    thickness: 1,
    color: "#000000",
  },
  propertySchema: [
    {
      name: "orientation",
      type: "enum",
      label: "Orientation",
      description: "Line direction",
      defaultValue: "horizontal",
      options: [
        { label: "Horizontal", value: "horizontal" },
        { label: "Vertical", value: "vertical" },
      ],
    },
    {
      name: "thickness",
      type: "number",
      label: "Thickness",
      description: "Line thickness in points",
      defaultValue: 1,
      min: 0.1,
      max: 100,
      step: 0.5,
      unit: "pt",
    },
    colorProperty("color", "Color", "Line color"),
  ],
  allowsChildren: false,
  priorityTier: 2,
  questPdfApi: "container.LineHorizontal(1) / LineVertical(1)",
};

const placeholderMetadata: ComponentMetadata = {
  id: ComponentType.Placeholder,
  name: "Placeholder",
  category: "content",
  icon: "Square",
  description: "Gray placeholder box for prototyping",
  defaultProperties: {
    label: "Placeholder",
  },
  propertySchema: [
    {
      name: "label",
      type: "string",
      label: "Label",
      description: "Optional label text displayed on the placeholder",
      defaultValue: "Placeholder",
      supportsExpression: true,
    },
  ],
  allowsChildren: false,
  priorityTier: 2,
  questPdfApi: "container.Placeholder()",
};

const hyperlinkMetadata: ComponentMetadata = {
  id: ComponentType.Hyperlink,
  name: "Hyperlink",
  category: "content",
  icon: "Link",
  description: "Clickable hyperlink URLs",
  defaultProperties: {
    url: "https://example.com",
  },
  propertySchema: [
    {
      name: "url",
      type: "string",
      label: "URL",
      description: "Target URL for the hyperlink",
      defaultValue: "https://example.com",
      required: true,
      supportsExpression: true,
    },
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 2,
  questPdfApi: 'container.Hyperlink("url", c => ...)',
};

const canvasMetadata: ComponentMetadata = {
  id: ComponentType.Canvas,
  name: "Canvas",
  category: "content",
  icon: "PenTool",
  description: "Custom vector graphics using canvas",
  defaultProperties: {
    width: 100,
    height: 100,
    commands: [],
  },
  propertySchema: [
    sizeProperty("width", "Width", "Canvas width in points", 100),
    sizeProperty("height", "Height", "Canvas height in points", 100),
    {
      name: "commands",
      type: "array",
      label: "Drawing Commands",
      description: "Vector drawing commands",
      defaultValue: [],
    },
  ],
  allowsChildren: false,
  priorityTier: 4,
  questPdfApi: "container.Canvas(...)",
};

const barcodeMetadata: ComponentMetadata = {
  id: ComponentType.Barcode,
  name: "Barcode",
  category: "content",
  icon: "Barcode",
  description: "Barcode rendering (1D and 2D barcodes)",
  defaultProperties: {
    value: "1234567890",
    format: "code128",
  },
  propertySchema: [
    {
      name: "value",
      type: "string",
      label: "Value",
      description: "Data to encode in the barcode",
      defaultValue: "1234567890",
      required: true,
      supportsExpression: true,
    },
    {
      name: "format",
      type: "enum",
      label: "Format",
      description: "Barcode format type",
      defaultValue: "code128",
      required: true,
      options: [
        { label: "Code 128", value: "code128" },
        { label: "EAN-8", value: "ean8" },
        { label: "EAN-13", value: "ean13" },
        { label: "UPC-A", value: "upca" },
        { label: "Code 39", value: "code39" },
        { label: "Data Matrix", value: "dataMatrix" },
        { label: "PDF417", value: "pdf417" },
      ],
    },
  ],
  allowsChildren: false,
  priorityTier: 3,
  questPdfApi: "Integration with ZXing.Net",
};

const qrCodeMetadata: ComponentMetadata = {
  id: ComponentType.QRCode,
  name: "QR Code",
  category: "content",
  icon: "QrCode",
  description: "QR code rendering",
  defaultProperties: {
    value: "https://example.com",
    size: 100,
  },
  propertySchema: [
    {
      name: "value",
      type: "string",
      label: "Value",
      description: "Data to encode in the QR code",
      defaultValue: "https://example.com",
      required: true,
      supportsExpression: true,
    },
    {
      name: "size",
      type: "number",
      label: "Size",
      description: "QR code size in points",
      defaultValue: 100,
      min: 10,
      max: 1000,
      unit: "pt",
    },
  ],
  allowsChildren: false,
  priorityTier: 3,
  questPdfApi: "Integration with QRCoder",
};

// ============================================================================
// Styling Components (6)
// ============================================================================

const paddingMetadata: ComponentMetadata = {
  id: ComponentType.Padding,
  name: "Padding",
  category: "styling",
  icon: "BoxSelect",
  description: "Padding/spacing around content",
  defaultProperties: {
    all: 10,
  },
  propertySchema: [
    sizeProperty("all", "All Sides", "Padding on all sides", 10),
    sizeProperty("top", "Top", "Top padding"),
    sizeProperty("right", "Right", "Right padding"),
    sizeProperty("bottom", "Bottom", "Bottom padding"),
    sizeProperty("left", "Left", "Left padding"),
    sizeProperty("horizontal", "Horizontal", "Left and right padding"),
    sizeProperty("vertical", "Vertical", "Top and bottom padding"),
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 1,
  questPdfApi: "container.Padding(10)",
};

const borderMetadata: ComponentMetadata = {
  id: ComponentType.Border,
  name: "Border",
  category: "styling",
  icon: "Square",
  description: "Border with thickness and color",
  defaultProperties: {
    thickness: 1,
    color: "#000000",
  },
  propertySchema: [
    {
      name: "thickness",
      type: "number",
      label: "Thickness",
      description: "Border thickness in points",
      defaultValue: 1,
      min: 0,
      max: 100,
      step: 0.5,
      unit: "pt",
    },
    colorProperty("color", "Color", "Border color"),
    sizeProperty("top", "Top", "Top border thickness"),
    sizeProperty("right", "Right", "Right border thickness"),
    sizeProperty("bottom", "Bottom", "Bottom border thickness"),
    sizeProperty("left", "Left", "Left border thickness"),
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 1,
  questPdfApi: "container.Border(1)",
};

const backgroundMetadata: ComponentMetadata = {
  id: ComponentType.Background,
  name: "Background",
  category: "styling",
  icon: "PaintBucket",
  description: "Background color fill",
  defaultProperties: {
    color: "#f5f5f5",
  },
  propertySchema: [
    colorProperty("color", "Color", "Background color", "#f5f5f5"),
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 1,
  questPdfApi: "container.Background(color)",
};

const roundedCornersMetadata: ComponentMetadata = {
  id: ComponentType.RoundedCorners,
  name: "Rounded Corners",
  category: "styling",
  icon: "RectangleHorizontal",
  description: "Rounded corner borders",
  defaultProperties: {
    radius: 5,
  },
  propertySchema: [
    {
      name: "radius",
      type: "number",
      label: "Radius",
      description: "Corner radius in points",
      defaultValue: 5,
      min: 0,
      max: 500,
      unit: "pt",
    },
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 2,
  questPdfApi: "Custom implementation",
};

const shadowMetadata: ComponentMetadata = {
  id: ComponentType.Shadow,
  name: "Shadow",
  category: "styling",
  icon: "Layers2",
  description: "Drop shadow effect",
  defaultProperties: {
    color: "#00000033",
    blurRadius: 5,
    offsetX: 2,
    offsetY: 2,
  },
  propertySchema: [
    colorProperty("color", "Color", "Shadow color (with alpha)", "#00000033"),
    {
      name: "blurRadius",
      type: "number",
      label: "Blur Radius",
      description: "Shadow blur radius in points",
      defaultValue: 5,
      min: 0,
      max: 100,
      unit: "pt",
    },
    {
      name: "offsetX",
      type: "number",
      label: "Offset X",
      description: "Horizontal shadow offset",
      defaultValue: 2,
      min: -100,
      max: 100,
      unit: "pt",
    },
    {
      name: "offsetY",
      type: "number",
      label: "Offset Y",
      description: "Vertical shadow offset",
      defaultValue: 2,
      min: -100,
      max: 100,
      unit: "pt",
    },
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 3,
  questPdfApi: "Custom implementation",
};

const defaultTextStyleMetadata: ComponentMetadata = {
  id: ComponentType.DefaultTextStyle,
  name: "Default Text Style",
  category: "styling",
  icon: "TextCursor",
  description: "Text style inheritance for child elements",
  defaultProperties: {
    fontSize: 12,
    fontWeight: "normal",
    color: "#000000",
  },
  propertySchema: [
    {
      name: "fontFamily",
      type: "font",
      label: "Font Family",
      description: "Font family name",
      defaultValue: "default",
    },
    {
      name: "fontSize",
      type: "number",
      label: "Font Size",
      description: "Font size in points",
      defaultValue: 12,
      min: 1,
      max: 1000,
      unit: "pt",
    },
    {
      name: "fontWeight",
      type: "enum",
      label: "Font Weight",
      description: "Text weight/boldness",
      defaultValue: "normal",
      options: [
        { label: "Thin", value: "thin" },
        { label: "Extra Light", value: "extraLight" },
        { label: "Light", value: "light" },
        { label: "Normal", value: "normal" },
        { label: "Medium", value: "medium" },
        { label: "Semi Bold", value: "semiBold" },
        { label: "Bold", value: "bold" },
        { label: "Extra Bold", value: "extraBold" },
        { label: "Black", value: "black" },
      ],
    },
    {
      name: "fontStyle",
      type: "enum",
      label: "Font Style",
      description: "Text style (normal, italic, oblique)",
      defaultValue: "normal",
      options: [
        { label: "Normal", value: "normal" },
        { label: "Italic", value: "italic" },
        { label: "Oblique", value: "oblique" },
      ],
    },
    colorProperty("color", "Color", "Text color"),
    {
      name: "lineHeight",
      type: "number",
      label: "Line Height",
      description: "Line height multiplier",
      defaultValue: 1.2,
      min: 0.1,
      max: 10,
      step: 0.1,
    },
    {
      name: "letterSpacing",
      type: "number",
      label: "Letter Spacing",
      description: "Space between letters in points",
      defaultValue: 0,
      min: -100,
      max: 100,
      unit: "pt",
    },
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 2,
  questPdfApi: "container.DefaultTextStyle(x => ...)",
};

// ============================================================================
// Sizing Components (12)
// ============================================================================

const widthMetadata: ComponentMetadata = {
  id: ComponentType.Width,
  name: "Width",
  category: "sizing",
  icon: "MoveHorizontal",
  description: "Fixed or constrained width",
  defaultProperties: {
    value: 100,
    unit: "pt",
  },
  propertySchema: [
    {
      name: "value",
      type: "number",
      label: "Width",
      description: "Width value",
      defaultValue: 100,
      min: 0,
      max: 10000,
      required: true,
    },
    {
      name: "unit",
      type: "unit",
      label: "Unit",
      description: "Measurement unit",
      defaultValue: "pt",
      options: [
        { label: "Points", value: "pt" },
        { label: "Centimeters", value: "cm" },
        { label: "Inches", value: "inch" },
        { label: "Millimeters", value: "mm" },
        { label: "Percent", value: "%" },
      ],
    },
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 2,
  questPdfApi: "container.Width(100)",
};

const heightMetadata: ComponentMetadata = {
  id: ComponentType.Height,
  name: "Height",
  category: "sizing",
  icon: "MoveVertical",
  description: "Fixed or constrained height",
  defaultProperties: {
    value: 100,
    unit: "pt",
  },
  propertySchema: [
    {
      name: "value",
      type: "number",
      label: "Height",
      description: "Height value",
      defaultValue: 100,
      min: 0,
      max: 10000,
      required: true,
    },
    {
      name: "unit",
      type: "unit",
      label: "Unit",
      description: "Measurement unit",
      defaultValue: "pt",
      options: [
        { label: "Points", value: "pt" },
        { label: "Centimeters", value: "cm" },
        { label: "Inches", value: "inch" },
        { label: "Millimeters", value: "mm" },
        { label: "Percent", value: "%" },
      ],
    },
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 2,
  questPdfApi: "container.Height(50)",
};

const minWidthMetadata: ComponentMetadata = {
  id: ComponentType.MinWidth,
  name: "Min Width",
  category: "sizing",
  icon: "ArrowLeftFromLine",
  description: "Minimum width constraint",
  defaultProperties: {
    value: 50,
  },
  propertySchema: [
    sizeProperty("value", "Min Width", "Minimum width in points", 50),
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 2,
  questPdfApi: "container.MinWidth(100)",
};

const maxWidthMetadata: ComponentMetadata = {
  id: ComponentType.MaxWidth,
  name: "Max Width",
  category: "sizing",
  icon: "ArrowRightFromLine",
  description: "Maximum width constraint",
  defaultProperties: {
    value: 200,
  },
  propertySchema: [
    sizeProperty("value", "Max Width", "Maximum width in points", 200),
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 2,
  questPdfApi: "container.MaxWidth(200)",
};

const minHeightMetadata: ComponentMetadata = {
  id: ComponentType.MinHeight,
  name: "Min Height",
  category: "sizing",
  icon: "ArrowUpFromLine",
  description: "Minimum height constraint",
  defaultProperties: {
    value: 50,
  },
  propertySchema: [
    sizeProperty("value", "Min Height", "Minimum height in points", 50),
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 2,
  questPdfApi: "container.MinHeight(50)",
};

const maxHeightMetadata: ComponentMetadata = {
  id: ComponentType.MaxHeight,
  name: "Max Height",
  category: "sizing",
  icon: "ArrowDownFromLine",
  description: "Maximum height constraint",
  defaultProperties: {
    value: 200,
  },
  propertySchema: [
    sizeProperty("value", "Max Height", "Maximum height in points", 200),
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 2,
  questPdfApi: "container.MaxHeight(100)",
};

const alignmentMetadata: ComponentMetadata = {
  id: ComponentType.Alignment,
  name: "Alignment",
  category: "sizing",
  icon: "AlignCenter",
  description: "Horizontal and vertical alignment",
  defaultProperties: {
    horizontal: "center",
    vertical: "middle",
  },
  propertySchema: [
    {
      name: "horizontal",
      type: "enum",
      label: "Horizontal",
      description: "Horizontal alignment",
      defaultValue: "center",
      options: [
        { label: "Left", value: "left" },
        { label: "Center", value: "center" },
        { label: "Right", value: "right" },
        { label: "Start", value: "start" },
        { label: "End", value: "end" },
      ],
    },
    {
      name: "vertical",
      type: "enum",
      label: "Vertical",
      description: "Vertical alignment",
      defaultValue: "middle",
      options: [
        { label: "Top", value: "top" },
        { label: "Middle", value: "middle" },
        { label: "Bottom", value: "bottom" },
      ],
    },
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 2,
  questPdfApi: "container.AlignLeft() / AlignCenter() / AlignRight()",
};

const aspectRatioMetadata: ComponentMetadata = {
  id: ComponentType.AspectRatio,
  name: "Aspect Ratio",
  category: "sizing",
  icon: "Ratio",
  description: "Maintain aspect ratio of content",
  defaultProperties: {
    ratio: 1.777, // 16:9
  },
  propertySchema: [
    {
      name: "ratio",
      type: "number",
      label: "Ratio",
      description: "Aspect ratio (width/height, e.g., 1.777 for 16:9)",
      defaultValue: 1.777,
      min: 0.1,
      max: 10,
      step: 0.001,
      required: true,
    },
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 3,
  questPdfApi: "container.AspectRatio(16/9f)",
};

const extendMetadata: ComponentMetadata = {
  id: ComponentType.Extend,
  name: "Extend",
  category: "sizing",
  icon: "Expand",
  description: "Extend to fill available space",
  defaultProperties: {},
  propertySchema: [],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 3,
  questPdfApi: "container.Extend()",
};

const shrinkMetadata: ComponentMetadata = {
  id: ComponentType.Shrink,
  name: "Shrink",
  category: "sizing",
  icon: "Shrink",
  description: "Shrink to minimum required size",
  defaultProperties: {},
  propertySchema: [],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 3,
  questPdfApi: "container.Shrink()",
};

const unconstrainedMetadata: ComponentMetadata = {
  id: ComponentType.Unconstrained,
  name: "Unconstrained",
  category: "sizing",
  icon: "Maximize2",
  description: "Remove size constraints from parent",
  defaultProperties: {},
  propertySchema: [],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 4,
  questPdfApi: "container.Unconstrained()",
};

const constrainedMetadata: ComponentMetadata = {
  id: ComponentType.Constrained,
  name: "Constrained",
  category: "sizing",
  icon: "Minimize2",
  description: "Constrain content within min/max bounds",
  defaultProperties: {},
  propertySchema: [
    sizeProperty("minWidth", "Min Width", "Minimum width constraint"),
    sizeProperty("maxWidth", "Max Width", "Maximum width constraint"),
    sizeProperty("minHeight", "Min Height", "Minimum height constraint"),
    sizeProperty("maxHeight", "Max Height", "Maximum height constraint"),
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 4,
  questPdfApi: "container.Constrained()",
};

// ============================================================================
// Transformation Components (5)
// ============================================================================

const rotateMetadata: ComponentMetadata = {
  id: ComponentType.Rotate,
  name: "Rotate",
  category: "transformation",
  icon: "RotateCw",
  description: "Rotation transform",
  defaultProperties: {
    angle: 0,
  },
  propertySchema: [
    {
      name: "angle",
      type: "number",
      label: "Angle",
      description: "Rotation angle in degrees (-360 to 360)",
      defaultValue: 0,
      min: -360,
      max: 360,
      step: 1,
      unit: "°",
      required: true,
    },
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 3,
  questPdfApi: "container.Rotate(45)",
};

const scaleMetadata: ComponentMetadata = {
  id: ComponentType.Scale,
  name: "Scale",
  category: "transformation",
  icon: "ZoomIn",
  description: "Scale transform (uniform or non-uniform)",
  defaultProperties: {
    factor: 1,
  },
  propertySchema: [
    {
      name: "factor",
      type: "number",
      label: "Scale Factor",
      description: "Uniform scale factor",
      defaultValue: 1,
      min: 0.01,
      max: 10,
      step: 0.1,
    },
    {
      name: "factorX",
      type: "number",
      label: "Scale X",
      description: "Horizontal scale factor",
      defaultValue: undefined,
      min: 0.01,
      max: 10,
      step: 0.1,
    },
    {
      name: "factorY",
      type: "number",
      label: "Scale Y",
      description: "Vertical scale factor",
      defaultValue: undefined,
      min: 0.01,
      max: 10,
      step: 0.1,
    },
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 3,
  questPdfApi: "container.Scale(1.5f)",
};

const scaleToFitMetadata: ComponentMetadata = {
  id: ComponentType.ScaleToFit,
  name: "Scale To Fit",
  category: "transformation",
  icon: "Fullscreen",
  description: "Auto-scale content to fit available space",
  defaultProperties: {},
  propertySchema: [],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 4,
  questPdfApi: "container.ScaleToFit()",
};

const translateMetadata: ComponentMetadata = {
  id: ComponentType.Translate,
  name: "Translate",
  category: "transformation",
  icon: "Move",
  description: "Position offset/translation",
  defaultProperties: {
    x: 0,
    y: 0,
  },
  propertySchema: [
    {
      name: "x",
      type: "number",
      label: "X Offset",
      description: "Horizontal offset in points",
      defaultValue: 0,
      min: -10000,
      max: 10000,
      unit: "pt",
    },
    {
      name: "y",
      type: "number",
      label: "Y Offset",
      description: "Vertical offset in points",
      defaultValue: 0,
      min: -10000,
      max: 10000,
      unit: "pt",
    },
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 3,
  questPdfApi: "container.Translate(10, 20)",
};

const flipMetadata: ComponentMetadata = {
  id: ComponentType.Flip,
  name: "Flip",
  category: "transformation",
  icon: "FlipHorizontal",
  description: "Mirror/flip horizontally or vertically",
  defaultProperties: {
    horizontal: false,
    vertical: false,
  },
  propertySchema: [
    {
      name: "horizontal",
      type: "boolean",
      label: "Flip Horizontal",
      description: "Mirror horizontally",
      defaultValue: false,
    },
    {
      name: "vertical",
      type: "boolean",
      label: "Flip Vertical",
      description: "Mirror vertically",
      defaultValue: false,
    },
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 4,
  questPdfApi: "container.FlipHorizontal() / FlipVertical()",
};

// ============================================================================
// Flow Control Components (8)
// ============================================================================

const pageBreakMetadata: ComponentMetadata = {
  id: ComponentType.PageBreak,
  name: "Page Break",
  category: "flowControl",
  icon: "FileBreak",
  description: "Force a new page",
  defaultProperties: {},
  propertySchema: [],
  allowsChildren: false,
  priorityTier: 1,
  questPdfApi: "container.PageBreak()",
};

const ensureSpaceMetadata: ComponentMetadata = {
  id: ComponentType.EnsureSpace,
  name: "Ensure Space",
  category: "flowControl",
  icon: "RulerHorizontal",
  description: "Ensure minimum space or break to new page",
  defaultProperties: {
    minHeight: 100,
  },
  propertySchema: [
    {
      name: "minHeight",
      type: "number",
      label: "Min Height",
      description: "Minimum height required on page",
      defaultValue: 100,
      min: 1,
      max: 10000,
      unit: "pt",
      required: true,
    },
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 3,
  questPdfApi: "container.EnsureSpace(100)",
};

const showEntireMetadata: ComponentMetadata = {
  id: ComponentType.ShowEntire,
  name: "Show Entire",
  category: "flowControl",
  icon: "Ungroup",
  description: "Keep content together (prevent breaking)",
  defaultProperties: {},
  propertySchema: [],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 3,
  questPdfApi: "container.ShowEntire()",
};

const stopPagingMetadata: ComponentMetadata = {
  id: ComponentType.StopPaging,
  name: "Stop Paging",
  category: "flowControl",
  icon: "CircleStop",
  description: "Prevent content from paginating",
  defaultProperties: {},
  propertySchema: [],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 4,
  questPdfApi: "container.StopPaging()",
};

const sectionMetadata: ComponentMetadata = {
  id: ComponentType.Section,
  name: "Section",
  category: "flowControl",
  icon: "BookOpen",
  description: "Named section for table of contents",
  defaultProperties: {
    name: "Section",
  },
  propertySchema: [
    {
      name: "name",
      type: "string",
      label: "Section Name",
      description: "Name of the section (for TOC)",
      defaultValue: "Section",
      required: true,
      supportsExpression: true,
    },
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 3,
  questPdfApi: 'container.Section("name")',
};

const repeatMetadata: ComponentMetadata = {
  id: ComponentType.Repeat,
  name: "Repeat",
  category: "flowControl",
  icon: "Repeat",
  description: "Repeat content on every page",
  defaultProperties: {},
  propertySchema: [],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 4,
  questPdfApi: "Custom implementation",
};

const showOnceMetadata: ComponentMetadata = {
  id: ComponentType.ShowOnce,
  name: "Show Once",
  category: "flowControl",
  icon: "Eye",
  description: "Show content only on first page",
  defaultProperties: {},
  propertySchema: [],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 4,
  questPdfApi: "container.ShowOnce()",
};

const skipOnceMetadata: ComponentMetadata = {
  id: ComponentType.SkipOnce,
  name: "Skip Once",
  category: "flowControl",
  icon: "EyeOff",
  description: "Skip content on first page",
  defaultProperties: {},
  propertySchema: [],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 4,
  questPdfApi: "container.SkipOnce()",
};

// ============================================================================
// Special/Debug Components (4)
// ============================================================================

const contentDirectionMetadata: ComponentMetadata = {
  id: ComponentType.ContentDirection,
  name: "Content Direction",
  category: "special",
  icon: "ArrowRightLeft",
  description: "Set content direction (LTR/RTL)",
  defaultProperties: {
    direction: "ltr",
  },
  propertySchema: [
    {
      name: "direction",
      type: "enum",
      label: "Direction",
      description: "Text and content direction",
      defaultValue: "ltr",
      options: [
        { label: "Left to Right", value: "ltr" },
        { label: "Right to Left", value: "rtl" },
      ],
    },
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 4,
  questPdfApi: "container.ContentFromRightToLeft()",
};

const zIndexMetadata: ComponentMetadata = {
  id: ComponentType.ZIndex,
  name: "Z-Index",
  category: "special",
  icon: "Layers3",
  description: "Z-index layer stacking order",
  defaultProperties: {
    index: 0,
  },
  propertySchema: [
    {
      name: "index",
      type: "number",
      label: "Z-Index",
      description: "Layer stacking order (higher = on top)",
      defaultValue: 0,
      min: -1000,
      max: 1000,
      step: 1,
    },
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 4,
  questPdfApi: "Custom implementation",
};

const debugAreaMetadata: ComponentMetadata = {
  id: ComponentType.DebugArea,
  name: "Debug Area",
  category: "special",
  icon: "Bug",
  description: "Debug area with visual borders and label",
  defaultProperties: {
    label: "Debug",
    color: "#FF0000",
  },
  propertySchema: [
    {
      name: "label",
      type: "string",
      label: "Label",
      description: "Debug label text",
      defaultValue: "Debug",
    },
    colorProperty("color", "Color", "Debug border color", "#FF0000"),
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 4,
  questPdfApi: 'container.DebugArea("label")',
};

const debugPointerMetadata: ComponentMetadata = {
  id: ComponentType.DebugPointer,
  name: "Debug Pointer",
  category: "special",
  icon: "Crosshair",
  description: "Debug pointer for precise positioning",
  defaultProperties: {
    label: "Pointer",
    color: "#FF0000",
  },
  propertySchema: [
    {
      name: "label",
      type: "string",
      label: "Label",
      description: "Pointer label text",
      defaultValue: "Pointer",
    },
    colorProperty("color", "Color", "Pointer color", "#FF0000"),
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 4,
  questPdfApi: "container.DebugPointer()",
};

// ============================================================================
// Conditional Components (2)
// ============================================================================

const showIfMetadata: ComponentMetadata = {
  id: ComponentType.ShowIf,
  name: "Show If",
  category: "conditional",
  icon: "Filter",
  description: "Conditionally show content based on expression",
  defaultProperties: {
    condition: "{{ true }}",
  },
  propertySchema: [
    {
      name: "condition",
      type: "expression",
      label: "Condition",
      description: "Expression that evaluates to true/false",
      defaultValue: "{{ true }}",
      required: true,
      supportsExpression: true,
    },
  ],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 3,
  questPdfApi: "Custom implementation with ShowIf",
};

const preventPageBreakMetadata: ComponentMetadata = {
  id: ComponentType.PreventPageBreak,
  name: "Prevent Page Break",
  category: "conditional",
  icon: "Lock",
  description: "Prevent page break within content",
  defaultProperties: {},
  propertySchema: [],
  allowsChildren: true,
  isWrapper: true,
  priorityTier: 3,
  questPdfApi: "container.PreventPageBreak()",
};

// ============================================================================
// Component Registry
// ============================================================================

/**
 * Complete component registry with all 53 components
 * Aligned with backend PDFBuilder.Engine.Services.ComponentRegistry
 *
 * Backend enum numeric ranges:
 * - Container: 100-106
 * - Content: 200-208
 * - Styling: 300-305
 * - Sizing: 400-411
 * - Transformation: 500-504
 * - FlowControl: 600-607
 * - Special: 700-703
 * - Conditional: 800-801
 */
export const COMPONENT_REGISTRY: ComponentRegistry = {
  // Container Components (7) - Backend range: 100-106
  [ComponentType.Column]: columnMetadata,
  [ComponentType.Row]: rowMetadata,
  [ComponentType.Table]: tableMetadata,
  [ComponentType.Layers]: layersMetadata,
  [ComponentType.Decoration]: decorationMetadata,
  [ComponentType.Inlined]: inlinedMetadata,
  [ComponentType.MultiColumn]: multiColumnMetadata,

  // Content Components (9) - Backend range: 200-208
  // Note: List is in Content category (205) but allows children (IsContainer=true)
  [ComponentType.Text]: textMetadata,
  [ComponentType.Image]: imageMetadata,
  [ComponentType.Line]: lineMetadata,
  [ComponentType.Placeholder]: placeholderMetadata,
  [ComponentType.Hyperlink]: hyperlinkMetadata,
  [ComponentType.List]: listMetadata,
  [ComponentType.Canvas]: canvasMetadata,
  [ComponentType.Barcode]: barcodeMetadata,
  [ComponentType.QRCode]: qrCodeMetadata,

  // Styling Components (6)
  [ComponentType.Padding]: paddingMetadata,
  [ComponentType.Border]: borderMetadata,
  [ComponentType.Background]: backgroundMetadata,
  [ComponentType.RoundedCorners]: roundedCornersMetadata,
  [ComponentType.Shadow]: shadowMetadata,
  [ComponentType.DefaultTextStyle]: defaultTextStyleMetadata,

  // Sizing Components (12)
  [ComponentType.Width]: widthMetadata,
  [ComponentType.Height]: heightMetadata,
  [ComponentType.MinWidth]: minWidthMetadata,
  [ComponentType.MaxWidth]: maxWidthMetadata,
  [ComponentType.MinHeight]: minHeightMetadata,
  [ComponentType.MaxHeight]: maxHeightMetadata,
  [ComponentType.Alignment]: alignmentMetadata,
  [ComponentType.AspectRatio]: aspectRatioMetadata,
  [ComponentType.Extend]: extendMetadata,
  [ComponentType.Shrink]: shrinkMetadata,
  [ComponentType.Unconstrained]: unconstrainedMetadata,
  [ComponentType.Constrained]: constrainedMetadata,

  // Transformation Components (5)
  [ComponentType.Rotate]: rotateMetadata,
  [ComponentType.Scale]: scaleMetadata,
  [ComponentType.ScaleToFit]: scaleToFitMetadata,
  [ComponentType.Translate]: translateMetadata,
  [ComponentType.Flip]: flipMetadata,

  // Flow Control Components (8)
  [ComponentType.PageBreak]: pageBreakMetadata,
  [ComponentType.EnsureSpace]: ensureSpaceMetadata,
  [ComponentType.ShowEntire]: showEntireMetadata,
  [ComponentType.StopPaging]: stopPagingMetadata,
  [ComponentType.Section]: sectionMetadata,
  [ComponentType.Repeat]: repeatMetadata,
  [ComponentType.ShowOnce]: showOnceMetadata,
  [ComponentType.SkipOnce]: skipOnceMetadata,

  // Special Components (4)
  [ComponentType.ContentDirection]: contentDirectionMetadata,
  [ComponentType.ZIndex]: zIndexMetadata,
  [ComponentType.DebugArea]: debugAreaMetadata,
  [ComponentType.DebugPointer]: debugPointerMetadata,

  // Conditional Components (2)
  [ComponentType.ShowIf]: showIfMetadata,
  [ComponentType.PreventPageBreak]: preventPageBreakMetadata,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get component metadata by type
 */
export function getComponentMetadata(type: ComponentType): ComponentMetadata {
  return COMPONENT_REGISTRY[type];
}

/**
 * Get all components in a specific category
 */
export function getComponentsByCategory(
  category: ComponentCategory
): ComponentMetadata[] {
  return Object.values(COMPONENT_REGISTRY).filter(
    (component) => component.category === category
  );
}

/**
 * Get all components grouped by category
 */
export function getComponentsGroupedByCategory(): Record<
  ComponentCategory,
  ComponentMetadata[]
> {
  const categories: ComponentCategory[] = [
    "container",
    "content",
    "styling",
    "sizing",
    "transformation",
    "flowControl",
    "special",
    "conditional",
  ];

  return categories.reduce(
    (acc, category) => {
      acc[category] = getComponentsByCategory(category);
      return acc;
    },
    {} as Record<ComponentCategory, ComponentMetadata[]>
  );
}

/**
 * Get all components by priority tier
 */
export function getComponentsByTier(tier: 1 | 2 | 3 | 4): ComponentMetadata[] {
  return Object.values(COMPONENT_REGISTRY).filter(
    (component) => component.priorityTier === tier
  );
}

/**
 * Get default properties for a component type
 */
export function getDefaultProperties(
  type: ComponentType
): Record<string, unknown> {
  return { ...COMPONENT_REGISTRY[type].defaultProperties };
}

/**
 * Create a new layout node with default properties
 */
export function createLayoutNode(type: ComponentType, id: string): LayoutNode {
  const metadata = COMPONENT_REGISTRY[type];
  return {
    id,
    type,
    properties: getDefaultProperties(type),
    children: metadata.allowsChildren && !metadata.isWrapper ? [] : undefined,
    child: metadata.isWrapper ? undefined : undefined,
  };
}

/**
 * Category display names for UI
 */
export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  container: "Layout",
  content: "Content",
  styling: "Styling",
  sizing: "Sizing",
  transformation: "Transform",
  flowControl: "Flow Control",
  special: "Special",
  conditional: "Conditional",
};

/**
 * Category icons for UI
 */
export const CATEGORY_ICONS: Record<ComponentCategory, string> = {
  container: "LayoutGrid",
  content: "FileText",
  styling: "Palette",
  sizing: "Maximize",
  transformation: "RotateCcw",
  flowControl: "GitBranch",
  special: "Settings",
  conditional: "GitBranch",
};

/**
 * Total component count
 */
export const TOTAL_COMPONENT_COUNT = Object.keys(COMPONENT_REGISTRY).length;
