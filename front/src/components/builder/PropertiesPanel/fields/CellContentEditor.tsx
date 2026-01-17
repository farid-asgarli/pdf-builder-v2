/**
 * CellContentEditor Component
 * Editor for table cell content with component type selection and preview
 *
 * Features:
 * - Component type selector (Text, Image, Column, Row, etc.)
 * - Inline preview of content
 * - Quick edit fields based on content type
 * - Integration with PropertiesPanel for detailed editing
 */
"use client";

import { useCallback, useMemo, memo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { LayoutNode } from "@/types/component";
import { ComponentType } from "@/types/component";
import {
  Type,
  Image as ImageIcon,
  Columns,
  Rows,
  LayoutGrid,
  Box,
  Trash2,
  ExternalLink,
  Info,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Supported content types for quick creation
 */
export type QuickContentType =
  | "text"
  | "image"
  | "column"
  | "row"
  | "padding"
  | "empty";

/**
 * Props for CellContentEditor
 */
export interface CellContentEditorProps {
  /** Current content (LayoutNode or undefined) */
  content: LayoutNode | undefined;
  /** Callback when content changes */
  onChange: (content: LayoutNode | undefined) => void;
  /** Callback to open full component editor */
  onOpenFullEditor?: (componentId: string) => void;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show compact mode */
  compact?: boolean;
}

/**
 * Content type configuration
 */
interface ContentTypeConfig {
  type: QuickContentType;
  label: string;
  icon: React.ReactNode;
  description: string;
  componentType?: ComponentType;
}

// ============================================================================
// Constants
// ============================================================================

/** Generate a unique ID for new nodes */
const generateId = () =>
  `cell-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Content type configurations */
const CONTENT_TYPES: ContentTypeConfig[] = [
  {
    type: "text",
    label: "Text",
    icon: <Type className="h-4 w-4" />,
    description: "Text content with expression support",
    componentType: ComponentType.Text,
  },
  {
    type: "image",
    label: "Image",
    icon: <ImageIcon className="h-4 w-4" aria-hidden="true" />,
    description: "Image from URL or upload",
    componentType: ComponentType.Image,
  },
  {
    type: "column",
    label: "Column",
    icon: <Columns className="h-4 w-4" />,
    description: "Vertical layout for multiple items",
    componentType: ComponentType.Column,
  },
  {
    type: "row",
    label: "Row",
    icon: <Rows className="h-4 w-4" />,
    description: "Horizontal layout for multiple items",
    componentType: ComponentType.Row,
  },
  {
    type: "padding",
    label: "Padded",
    icon: <Box className="h-4 w-4" />,
    description: "Content with padding wrapper",
    componentType: ComponentType.Padding,
  },
  {
    type: "empty",
    label: "Empty",
    icon: <LayoutGrid className="h-4 w-4" />,
    description: "No content (empty cell)",
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create default content for a given type
 */
function createDefaultContent(type: QuickContentType): LayoutNode | undefined {
  const id = generateId();

  switch (type) {
    case "text":
      return {
        id,
        type: ComponentType.Text,
        properties: { content: "" },
      };
    case "image":
      return {
        id,
        type: ComponentType.Image,
        properties: { source: "" },
      };
    case "column":
      return {
        id,
        type: ComponentType.Column,
        properties: { spacing: 4 },
        children: [],
      };
    case "row":
      return {
        id,
        type: ComponentType.Row,
        properties: { spacing: 4 },
        children: [],
      };
    case "padding":
      return {
        id,
        type: ComponentType.Padding,
        properties: { all: 8 },
      };
    case "empty":
    default:
      return undefined;
  }
}

/**
 * Detect the quick content type from a LayoutNode
 */
function detectContentType(content: LayoutNode | undefined): QuickContentType {
  if (!content) return "empty";

  switch (content.type) {
    case ComponentType.Text:
      return "text";
    case ComponentType.Image:
      return "image";
    case ComponentType.Column:
      return "column";
    case ComponentType.Row:
      return "row";
    case ComponentType.Padding:
      return "padding";
    default:
      return "empty"; // Custom/unknown types default to empty
  }
}

/**
 * Get icon for a component type
 */
function getComponentIcon(type: ComponentType): React.ReactNode {
  switch (type) {
    case ComponentType.Text:
      return <Type className="h-3.5 w-3.5" />;
    case ComponentType.Image:
      return <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />;
    case ComponentType.Column:
      return <Columns className="h-3.5 w-3.5" />;
    case ComponentType.Row:
      return <Rows className="h-3.5 w-3.5" />;
    case ComponentType.Padding:
      return <Box className="h-3.5 w-3.5" />;
    default:
      return <LayoutGrid className="h-3.5 w-3.5" />;
  }
}

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Quick editor for Text content
 */
const TextContentEditor = memo(function TextContentEditor({
  content,
  onChange,
  disabled,
}: {
  content: LayoutNode;
  onChange: (content: LayoutNode) => void;
  disabled?: boolean;
}) {
  const textValue = (content.properties?.content as string) || "";

  const handleChange = useCallback(
    (value: string) => {
      onChange({
        ...content,
        properties: {
          ...content.properties,
          content: value,
        },
      });
    },
    [content, onChange]
  );

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-xs">Text Content</Label>
      <Textarea
        value={textValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Enter text or {{ expression }}"
        disabled={disabled}
        className="min-h-15 resize-none text-sm"
        rows={2}
      />
      <p className="text-muted-foreground text-xs">
        Supports expressions: {"{{ data.fieldName }}"}
      </p>
    </div>
  );
});

/**
 * Quick editor for Image content
 */
const ImageContentEditor = memo(function ImageContentEditor({
  content,
  onChange,
  disabled,
}: {
  content: LayoutNode;
  onChange: (content: LayoutNode) => void;
  disabled?: boolean;
}) {
  const sourceValue = (content.properties?.source as string) || "";

  const handleChange = useCallback(
    (value: string) => {
      onChange({
        ...content,
        properties: {
          ...content.properties,
          source: value,
        },
      });
    },
    [content, onChange]
  );

  return (
    <div className="space-y-2">
      <Label className="text-muted-foreground text-xs">Image Source</Label>
      <Input
        value={sourceValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="https://example.com/image.png or {{ data.imageUrl }}"
        disabled={disabled}
        className="text-sm"
      />
      <p className="text-muted-foreground text-xs">
        URL, base64, or expression
      </p>
    </div>
  );
});

/**
 * Info display for container content (Column/Row)
 */
const ContainerContentInfo = memo(function ContainerContentInfo({
  content,
  onOpenFullEditor,
}: {
  content: LayoutNode;
  onOpenFullEditor?: (componentId: string) => void;
}) {
  const childCount = content.children?.length || 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getComponentIcon(content.type)}
          <span className="text-sm font-medium">{content.type}</span>
        </div>
        <span className="text-muted-foreground text-xs">
          {childCount} item{childCount !== 1 ? "s" : ""}
        </span>
      </div>
      {onOpenFullEditor && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenFullEditor(content.id)}
          className="w-full text-xs"
        >
          <ExternalLink className="mr-1 h-3 w-3" />
          Edit in Canvas
        </Button>
      )}
    </div>
  );
});

// ============================================================================
// Main Component
// ============================================================================

/**
 * CellContentEditor - Edit table cell content with type selection
 */
export function CellContentEditor({
  content,
  onChange,
  onOpenFullEditor,
  disabled,
  className,
  compact,
}: CellContentEditorProps) {
  // Detect current content type
  const currentType = useMemo(() => detectContentType(content), [content]);

  // Handle type change
  const handleTypeChange = useCallback(
    (type: QuickContentType) => {
      const newContent = createDefaultContent(type);
      onChange(newContent);
    },
    [onChange]
  );

  // Handle content update (for existing content)
  const handleContentUpdate = useCallback(
    (updatedContent: LayoutNode) => {
      onChange(updatedContent);
    },
    [onChange]
  );

  // Handle clear content
  const handleClear = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Content Type Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Content Type</Label>
          {content && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  disabled={disabled}
                  className="text-muted-foreground h-6 w-6 p-0 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear content</TooltipContent>
            </Tooltip>
          )}
        </div>

        <Select
          value={currentType}
          onValueChange={(v) => handleTypeChange(v as QuickContentType)}
          disabled={disabled}
        >
          <SelectTrigger className={cn("h-9", compact && "h-8 text-xs")}>
            <SelectValue placeholder="Select content type" />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_TYPES.map((config) => (
              <SelectItem key={config.type} value={config.type}>
                <div className="flex items-center gap-2">
                  {config.icon}
                  <span>{config.label}</span>
                  {!compact && (
                    <span className="text-muted-foreground ml-1 text-xs">
                      — {config.description}
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Content Editor based on type */}
      {content && currentType !== "empty" && (
        <div className="border-muted ml-1 border-l-2 pl-3">
          {currentType === "text" && (
            <TextContentEditor
              content={content}
              onChange={handleContentUpdate}
              disabled={disabled}
            />
          )}

          {currentType === "image" && (
            <ImageContentEditor
              content={content}
              onChange={handleContentUpdate}
              disabled={disabled}
            />
          )}

          {(currentType === "column" || currentType === "row") && (
            <ContainerContentInfo
              content={content}
              onOpenFullEditor={onOpenFullEditor}
            />
          )}

          {currentType === "padding" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Box className="text-muted-foreground h-3.5 w-3.5" />
                <span className="text-sm">Padding wrapper</span>
              </div>
              <p className="text-muted-foreground text-xs">
                Configure padding values in the Properties Panel
              </p>
              {onOpenFullEditor && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenFullEditor(content.id)}
                  className="w-full text-xs"
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Edit Properties
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!content && currentType === "empty" && (
        <div className="bg-muted/30 border-muted-foreground/30 flex flex-col items-center justify-center rounded-md border border-dashed px-3 py-4">
          <LayoutGrid className="text-muted-foreground/50 mb-2 h-8 w-8" />
          <p className="text-muted-foreground text-center text-xs">
            Empty cell — select a content type above
          </p>
        </div>
      )}

      {/* Hint for advanced editing */}
      {content && !compact && (
        <div className="text-muted-foreground bg-muted/30 flex items-start gap-1.5 rounded p-2 text-xs">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            For advanced content configuration, use the Properties Panel or
            Canvas editor.
          </span>
        </div>
      )}
    </div>
  );
}

export default memo(CellContentEditor);
