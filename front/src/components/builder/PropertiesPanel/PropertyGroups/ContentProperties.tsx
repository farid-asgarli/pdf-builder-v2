/**
 * ContentProperties Component
 * Property group for content-related properties
 *
 * Features:
 * - Text content editing with expression support
 * - Image source input (URL, file upload, base64)
 * - Hyperlink URL configuration
 * - Barcode/QR code value and format settings
 * - List type and bullet configuration
 * - Line orientation and styling
 * - Placeholder label
 * - Real-time two-way binding with canvas store
 */
"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSelectionStore } from "@/store/selection-store";
import { useCanvasStore } from "@/store/canvas-store";
import {
  TextField,
  NumberField,
  ColorPicker,
  SelectField,
  ImageUploader,
  ListItemEditorModal,
} from "../fields";
import type { SelectOption } from "../fields/SelectField";
import type { ComponentType, LayoutNode } from "@/types/component";
import type { ListItemDto } from "@/types/properties";
import {
  Type,
  Image as ImageIcon,
  Link,
  QrCode,
  List,
  ListOrdered,
  Minus,
  Square,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for ContentProperties component
 */
export interface ContentPropertiesProps {
  /** Component ID to display properties for (overrides selection) */
  componentId?: string;
  /** Whether to use selection store for component ID */
  useSelection?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Barcode format options
 */
const BARCODE_FORMAT_OPTIONS: SelectOption[] = [
  { label: "Code 128", value: "code128" },
  { label: "EAN-8", value: "ean8" },
  { label: "EAN-13", value: "ean13" },
  { label: "UPC-A", value: "upca" },
  { label: "Code 39", value: "code39" },
  { label: "Data Matrix", value: "dataMatrix" },
  { label: "PDF417", value: "pdf417" },
];

/**
 * List type options
 */
const LIST_TYPE_OPTIONS: SelectOption[] = [
  { label: "Unordered (Bullets)", value: "unordered" },
  { label: "Ordered (Numbers)", value: "ordered" },
];

/**
 * Line orientation options
 */
const LINE_ORIENTATION_OPTIONS: SelectOption[] = [
  { label: "Horizontal", value: "horizontal" },
  { label: "Vertical", value: "vertical" },
];

/**
 * Image fit options
 */
const IMAGE_FIT_OPTIONS: SelectOption[] = [
  { label: "Fill", value: "fill", description: "Stretch to fill container" },
  {
    label: "Contain",
    value: "contain",
    description: "Fit within container, maintain ratio",
  },
  {
    label: "Cover",
    value: "cover",
    description: "Fill container, crop if needed",
  },
  { label: "Fit Width", value: "width", description: "Fit to width" },
  { label: "Fit Height", value: "height", description: "Fit to height" },
  { label: "Fit Area", value: "area", description: "Fit within area" },
  {
    label: "Unproportional",
    value: "unproportional",
    description: "Stretch without maintaining ratio",
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the content type section to show based on component type
 */
function getContentType(
  componentType: ComponentType | null
):
  | "text"
  | "image"
  | "hyperlink"
  | "barcode"
  | "qrcode"
  | "list"
  | "line"
  | "placeholder"
  | "canvas"
  | null {
  if (!componentType) return null;

  switch (componentType) {
    case "Text":
      return "text";
    case "Image":
      return "image";
    case "Hyperlink":
      return "hyperlink";
    case "Barcode":
      return "barcode";
    case "QRCode":
      return "qrcode";
    case "List":
      return "list";
    case "Line":
      return "line";
    case "Placeholder":
      return "placeholder";
    case "Canvas":
      return "canvas";
    default:
      return null;
  }
}

/**
 * Get properties from component
 */
function getProperties(component: LayoutNode | null): Record<string, unknown> {
  return component?.properties ?? {};
}

// ============================================================================
// Sub-Components for Different Content Types
// ============================================================================

interface ContentTypeProps {
  component: LayoutNode;
  onPropertyChange: (property: string, value: unknown) => void;
}

/**
 * Text content properties
 */
function TextContent({ component, onPropertyChange }: ContentTypeProps) {
  const properties = getProperties(component);
  const content = (properties.content as string) ?? "";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Type className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">Text Content</Label>
      </div>
      <TextField
        label="Content"
        value={content}
        onChange={(value) => onPropertyChange("content", value ?? "")}
        placeholder="Enter text or {{ expression }}"
        supportsExpression
        multiline
        rows={4}
        helpText="Use {{ data.field }} for dynamic content"
      />
    </div>
  );
}

/**
 * Image content properties
 */
function ImageContent({ component, onPropertyChange }: ContentTypeProps) {
  const properties = getProperties(component);
  const source = (properties.source as string) ?? "";
  const width = properties.width as number | undefined;
  const height = properties.height as number | undefined;
  const fit = (properties.fit as string) ?? "contain";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">Image Source</Label>
      </div>

      <ImageUploader
        label="Image"
        value={source}
        onChange={(value) => onPropertyChange("source", value ?? "")}
        supportsExpression
        showPreview
        helpText="URL, upload file, or {{ data.imageUrl }}"
      />

      <SelectField
        label="Fit Mode"
        value={fit}
        onChange={(value) => onPropertyChange("fit", value)}
        options={IMAGE_FIT_OPTIONS}
        helpText="How image fits within container"
      />

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Width"
          value={width}
          onChange={(value) => onPropertyChange("width", value)}
          unit="px"
          min={1}
          step={1}
          placeholder="Auto"
          allowEmpty
        />
        <NumberField
          label="Height"
          value={height}
          onChange={(value) => onPropertyChange("height", value)}
          unit="px"
          min={1}
          step={1}
          placeholder="Auto"
          allowEmpty
        />
      </div>
    </div>
  );
}

/**
 * Hyperlink content properties
 */
function HyperlinkContent({ component, onPropertyChange }: ContentTypeProps) {
  const properties = getProperties(component);
  const url = (properties.url as string) ?? "";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">Hyperlink</Label>
      </div>
      <TextField
        label="URL"
        value={url}
        onChange={(value) => onPropertyChange("url", value ?? "")}
        placeholder="https://example.com or {{ data.url }}"
        supportsExpression
        helpText="Target URL for the hyperlink"
      />
    </div>
  );
}

/**
 * Barcode content properties
 */
function BarcodeContent({ component, onPropertyChange }: ContentTypeProps) {
  const properties = getProperties(component);
  const value = (properties.value as string) ?? "";
  const format = (properties.format as string) ?? "code128";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Square className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">Barcode</Label>
      </div>

      <TextField
        label="Value"
        value={value}
        onChange={(v) => onPropertyChange("value", v ?? "")}
        placeholder="Enter barcode data or {{ expression }}"
        supportsExpression
        helpText="Data to encode in the barcode"
      />

      <SelectField
        label="Format"
        value={format}
        onChange={(v) => onPropertyChange("format", v)}
        options={BARCODE_FORMAT_OPTIONS}
        helpText="Barcode format type"
      />
    </div>
  );
}

/**
 * QR Code content properties
 */
function QRCodeContent({ component, onPropertyChange }: ContentTypeProps) {
  const properties = getProperties(component);
  const value = (properties.value as string) ?? "";
  const size = properties.size as number | undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <QrCode className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">QR Code</Label>
      </div>

      <TextField
        label="Value"
        value={value}
        onChange={(v) => onPropertyChange("value", v ?? "")}
        placeholder="Enter QR data or {{ expression }}"
        supportsExpression
        helpText="Data to encode in the QR code (URL, text, etc.)"
      />

      <NumberField
        label="Size"
        value={size}
        onChange={(v) => onPropertyChange("size", v)}
        unit="px"
        min={10}
        max={500}
        step={10}
        placeholder="Auto"
        allowEmpty
        helpText="QR code size in points"
      />
    </div>
  );
}

/**
 * List content properties
 */
function ListContent({ component, onPropertyChange }: ContentTypeProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const properties = getProperties(component);
  const listType =
    (properties.listType as "ordered" | "unordered" | "none") ?? "unordered";
  const spacing = properties.spacing as number | undefined;
  const bulletCharacter = (properties.bulletCharacter as string) ?? "•";
  const items = (properties.items as ListItemDto[]) ?? [];

  const handleSaveItems = useCallback(
    (newItems: ListItemDto[]) => {
      onPropertyChange("items", newItems);
    },
    [onPropertyChange]
  );

  // Count total items including nested
  const countItems = (itemList: ListItemDto[]): number => {
    return itemList.reduce((count, item) => {
      return count + 1 + (item.children ? countItems(item.children) : 0);
    }, 0);
  };

  const totalItems = countItems(items);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <List className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">List Settings</Label>
      </div>

      <SelectField
        label="List Type"
        value={listType}
        onChange={(v) => onPropertyChange("listType", v)}
        options={LIST_TYPE_OPTIONS}
      />

      {listType === "unordered" && (
        <TextField
          label="Bullet Character"
          value={bulletCharacter}
          onChange={(v) => onPropertyChange("bulletCharacter", v ?? "•")}
          placeholder="•"
          maxLength={3}
          helpText="Character used for bullets"
        />
      )}

      <NumberField
        label="Item Spacing"
        value={spacing}
        onChange={(v) => onPropertyChange("spacing", v)}
        unit="px"
        min={0}
        max={50}
        step={1}
        placeholder="0"
        allowEmpty
        helpText="Space between list items"
      />

      {/* List Items Editor Button */}
      <div className="space-y-2">
        <Label className="text-xs">List Items</Label>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => setIsEditorOpen(true)}
          >
            <ListOrdered className="mr-2 h-4 w-4" />
            Edit Items
            {totalItems > 0 && (
              <span className="bg-primary/10 ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium">
                {totalItems}
              </span>
            )}
          </Button>
        </div>
        {totalItems === 0 ? (
          <p className="text-muted-foreground text-[10px]">
            No items defined. Click to add list items.
          </p>
        ) : (
          <p className="text-muted-foreground text-[10px]">
            {totalItems} item{totalItems !== 1 ? "s" : ""} defined.
          </p>
        )}
      </div>

      {/* List Item Editor Modal */}
      <ListItemEditorModal
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        items={items}
        onSave={handleSaveItems}
        listType={listType}
      />
    </div>
  );
}

/**
 * Line content properties
 */
function LineContent({ component, onPropertyChange }: ContentTypeProps) {
  const properties = getProperties(component);
  const orientation = (properties.orientation as string) ?? "horizontal";
  const thickness = (properties.thickness as number) ?? 1;
  const color = (properties.color as string) ?? "#000000";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Minus className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">Line</Label>
      </div>

      <SelectField
        label="Orientation"
        value={orientation}
        onChange={(v) => onPropertyChange("orientation", v)}
        options={LINE_ORIENTATION_OPTIONS}
      />

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Thickness"
          value={thickness}
          onChange={(v) => onPropertyChange("thickness", v ?? 1)}
          unit="px"
          min={0.5}
          max={20}
          step={0.5}
        />
        <ColorPicker
          label="Color"
          value={color}
          onChange={(v) => onPropertyChange("color", v ?? "#000000")}
        />
      </div>
    </div>
  );
}

/**
 * Placeholder content properties
 */
function PlaceholderContent({ component, onPropertyChange }: ContentTypeProps) {
  const properties = getProperties(component);
  const label = (properties.label as string) ?? "";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Square className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">Placeholder</Label>
      </div>
      <TextField
        label="Label"
        value={label}
        onChange={(v) => onPropertyChange("label", v ?? "")}
        placeholder="Placeholder label"
        helpText="Optional label shown on the placeholder"
      />
    </div>
  );
}

/**
 * Canvas content properties
 */
function CanvasContent({ component, onPropertyChange }: ContentTypeProps) {
  const properties = getProperties(component);
  const width = (properties.width as number) ?? 100;
  const height = (properties.height as number) ?? 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Square className="text-muted-foreground h-4 w-4" />
        <Label className="text-xs font-medium">Canvas</Label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Width"
          value={width}
          onChange={(v) => onPropertyChange("width", v ?? 100)}
          unit="px"
          min={10}
          step={10}
        />
        <NumberField
          label="Height"
          value={height}
          onChange={(v) => onPropertyChange("height", v ?? 100)}
          unit="px"
          min={10}
          step={10}
        />
      </div>

      <p className="text-muted-foreground text-xs">
        Canvas drawing commands can be configured in the advanced settings.
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ContentProperties - Content-related property inputs
 */
function ContentPropertiesComponent({
  componentId,
  useSelection = true,
  className,
}: ContentPropertiesProps) {
  // Get selected component from stores
  const selectedId = useSelectionStore((state) => state.selectedIds[0] ?? null);
  const getComponent = useCanvasStore((state) => state.getComponent);
  const updateComponentProperty = useCanvasStore(
    (state) => state.updateComponentProperty
  );

  // Determine which component ID to use
  const targetId = componentId ?? (useSelection ? selectedId : null);

  // Get the component
  const component = useMemo(() => {
    if (!targetId) return null;
    return getComponent(targetId);
  }, [targetId, getComponent]);

  // Get content type for this component
  const contentType = useMemo(() => {
    return getContentType(component?.type ?? null);
  }, [component?.type]);

  // Handle property change
  const handlePropertyChange = useCallback(
    (property: string, value: unknown) => {
      if (!targetId) return;
      updateComponentProperty(targetId, property, value);
    },
    [targetId, updateComponentProperty]
  );

  // Don't render if no component or no content type
  if (!component || !contentType) {
    return null;
  }

  // Render appropriate content type section
  const renderContent = () => {
    switch (contentType) {
      case "text":
        return (
          <TextContent
            component={component}
            onPropertyChange={handlePropertyChange}
          />
        );
      case "image":
        return (
          <ImageContent
            component={component}
            onPropertyChange={handlePropertyChange}
          />
        );
      case "hyperlink":
        return (
          <HyperlinkContent
            component={component}
            onPropertyChange={handlePropertyChange}
          />
        );
      case "barcode":
        return (
          <BarcodeContent
            component={component}
            onPropertyChange={handlePropertyChange}
          />
        );
      case "qrcode":
        return (
          <QRCodeContent
            component={component}
            onPropertyChange={handlePropertyChange}
          />
        );
      case "list":
        return (
          <ListContent
            component={component}
            onPropertyChange={handlePropertyChange}
          />
        );
      case "line":
        return (
          <LineContent
            component={component}
            onPropertyChange={handlePropertyChange}
          />
        );
      case "placeholder":
        return (
          <PlaceholderContent
            component={component}
            onPropertyChange={handlePropertyChange}
          />
        );
      case "canvas":
        return (
          <CanvasContent
            component={component}
            onPropertyChange={handlePropertyChange}
          />
        );
      default:
        return null;
    }
  };

  return <div className={cn("space-y-4", className)}>{renderContent()}</div>;
}

export const ContentProperties = memo(ContentPropertiesComponent);
ContentProperties.displayName = "ContentProperties";

export default ContentProperties;
