/**
 * PropertiesPanel Component
 * Right sidebar for editing component properties
 *
 * Features:
 * - Dynamic property display based on selected component
 * - Collapsible property sections with smooth animations
 * - Show/hide sections based on component type
 * - Two-way binding with canvas store
 * - Real-time sync with resize handles
 * - Property validation
 * - Component type and name display
 */
"use client";

import { memo, useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useSelectionStore } from "@/store/selection-store";
import { useCanvasStore } from "@/store/canvas-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ContentProperties,
  LayoutProperties,
  SizingProperties,
  StylingProperties,
} from "./PropertyGroups";
import { PropertySection } from "./PropertySection";
import {
  getPropertySections,
  getPropertiesBySection,
  type PropertySectionId,
} from "./property-section-config";
import { getComponentMetadata, CATEGORY_LABELS } from "@/lib/constants";
import type { LayoutNode, ComponentType } from "@/types/component";
import {
  Settings2,
  Box,
  Type,
  ImageIcon,
  Columns,
  Rows,
  Table2,
  Layers,
  Link,
  SquareCode,
  FileText,
  Palette,
  Maximize2,
  RotateCcw,
  GitBranch,
  Settings,
  Copy,
  Hash,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for PropertiesPanel component
 */
export interface PropertiesPanelProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * Collapsed state for property sections
 */
type SectionCollapsedState = Record<PropertySectionId, boolean>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get display name for component type
 */
function getComponentDisplayName(type: ComponentType): string {
  // Convert PascalCase to space-separated words
  return type.replace(/([A-Z])/g, " $1").trim();
}

/**
 * Get category badge color
 */
function getCategoryColor(category: string): string {
  const colorMap: Record<string, string> = {
    container: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    content: "bg-green-500/10 text-green-600 dark:text-green-400",
    styling: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    sizing: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    transformation: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    flowControl: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
    special: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
    conditional: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  };
  return colorMap[category] || colorMap.special;
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <Settings2 className="text-muted-foreground/30 mb-4 h-12 w-12" />
      <h3 className="text-muted-foreground mb-2 text-sm font-medium">
        No Component Selected
      </h3>
      <p className="text-muted-foreground/70 text-xs">
        Select a component on the canvas to edit its properties.
      </p>
    </div>
  );
}

// ============================================================================
// Icon Component Maps
// ============================================================================

/**
 * Component type to icon mapping
 */
const COMPONENT_ICON_MAP: Record<string, typeof Box> = {
  Column: Columns,
  Row: Rows,
  Table: Table2,
  Layers: Layers,
  Text: Type,
  Image: ImageIcon,
  Hyperlink: Link,
  List: FileText,
  Padding: Box,
  Border: Box,
  Background: Palette,
  Width: Maximize2,
  Height: Maximize2,
  Rotate: RotateCcw,
  Scale: Maximize2,
  PageBreak: GitBranch,
  ContentDirection: Settings,
};

/**
 * Section ID to icon mapping
 */
const SECTION_ICON_MAP: Record<PropertySectionId, typeof Box> = {
  content: FileText,
  sizing: Maximize2,
  styling: Palette,
  layout: Columns,
  transform: RotateCcw,
  flow: GitBranch,
  advanced: Settings,
};

// ============================================================================
// Component Header
// ============================================================================

interface ComponentHeaderProps {
  component: LayoutNode;
}

function ComponentHeader({ component }: ComponentHeaderProps) {
  const displayName = getComponentDisplayName(component.type);
  // Get the icon from the pre-defined map, fallback to Box
  const IconComponent = COMPONENT_ICON_MAP[component.type] ?? Box;
  // Get component metadata for category
  const metadata = getComponentMetadata(component.type);
  const categoryLabel = CATEGORY_LABELS[metadata.category];
  const categoryColor = getCategoryColor(metadata.category);

  return (
    <div className="border-b p-4">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
          <IconComponent className="text-primary h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-sm font-semibold">{displayName}</h2>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium",
                categoryColor
              )}
            >
              {categoryLabel}
            </span>
            <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
              <Hash className="h-3 w-3" />
              {component.id.slice(0, 8)}
            </span>
          </div>
        </div>
      </div>
      {/* Component description */}
      {metadata.description && (
        <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
          {metadata.description}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Property Sections
// ============================================================================

interface PropertySectionsProps {
  component: LayoutNode;
}

function PropertySections({ component }: PropertySectionsProps) {
  // Track collapsed state for each section
  const [collapsedSections, setCollapsedSections] =
    useState<SectionCollapsedState>(() => {
      const sections = getPropertySections(component.type);
      const initialState: SectionCollapsedState = {} as SectionCollapsedState;
      sections.forEach((section) => {
        initialState[section.id] = section.defaultCollapsed;
      });
      return initialState;
    });

  // Handle section collapse toggle
  const handleSectionCollapse = useCallback(
    (sectionId: PropertySectionId, collapsed: boolean) => {
      setCollapsedSections((prev) => ({
        ...prev,
        [sectionId]: collapsed,
      }));
    },
    []
  );

  // Get visible sections for this component type
  const visibleSections = useMemo(
    () => getPropertySections(component.type),
    [component.type]
  );

  // Get properties grouped by section
  const propertiesBySection = useMemo(
    () => getPropertiesBySection(component.type),
    [component.type]
  );

  // Get component metadata
  const metadata = getComponentMetadata(component.type);

  // Render section content based on section ID
  const renderSectionContent = (sectionId: PropertySectionId) => {
    switch (sectionId) {
      case "sizing":
        return <SizingProperties useSelection={true} />;

      case "content":
        return <ContentProperties useSelection={true} />;

      case "layout":
        return <LayoutProperties useSelection={true} />;

      case "styling":
        return <StylingProperties useSelection={true} />;

      case "transform":
        return (
          <TransformSectionPlaceholder
            properties={propertiesBySection.transform}
            metadata={metadata}
          />
        );

      case "flow":
        return (
          <FlowSectionPlaceholder
            properties={propertiesBySection.flow}
            metadata={metadata}
          />
        );

      case "advanced":
        return (
          <AdvancedSectionContent
            component={component}
            properties={propertiesBySection.advanced}
            metadata={metadata}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-1 p-4">
      {visibleSections.map((section, index) => {
        const Icon = SECTION_ICON_MAP[section.id];
        const propertyCount = propertiesBySection[section.id]?.length || 0;

        return (
          <div key={section.id}>
            {index > 0 && <Separator className="my-3" />}
            <PropertySection
              title={section.label}
              icon={Icon}
              badge={propertyCount > 0 ? propertyCount : undefined}
              collapsed={collapsedSections[section.id]}
              onCollapsedChange={(collapsed) =>
                handleSectionCollapse(section.id, collapsed)
              }
            >
              {renderSectionContent(section.id)}
            </PropertySection>
          </div>
        );
      })}

      {/* Raw Properties Debug View - always at the bottom */}
      {process.env.NODE_ENV === "development" && (
        <>
          <Separator className="my-3" />
          <PropertySection
            title="Debug: Raw Properties"
            icon={SquareCode}
            defaultCollapsed={true}
          >
            <pre className="bg-muted max-h-48 overflow-auto rounded p-2 text-xs">
              {JSON.stringify(component.properties, null, 2)}
            </pre>
          </PropertySection>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Placeholder Section Components (to be replaced with real implementations)
// ============================================================================

interface SectionPlaceholderProps {
  properties: string[];
  metadata: ReturnType<typeof getComponentMetadata>;
}

function TransformSectionPlaceholder({
  properties,
  metadata,
}: SectionPlaceholderProps) {
  if (properties.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        No transform properties available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Transform properties (rotation, scale):
      </p>
      <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs">
        {properties.map((prop) => (
          <li key={prop}>{prop}</li>
        ))}
      </ul>
    </div>
  );
}

function FlowSectionPlaceholder({
  properties,
  metadata,
}: SectionPlaceholderProps) {
  if (properties.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        No flow control properties available.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        Flow control properties (page breaks, conditions):
      </p>
      <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs">
        {properties.map((prop) => (
          <li key={prop}>{prop}</li>
        ))}
      </ul>
    </div>
  );
}

interface AdvancedSectionProps extends SectionPlaceholderProps {
  component: LayoutNode;
}

function AdvancedSectionContent({
  component,
  properties,
  metadata,
}: AdvancedSectionProps) {
  return (
    <div className="space-y-3">
      {/* Quick Info */}
      <div className="bg-muted/50 space-y-2 rounded-md p-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Component ID:</span>
          <span className="font-mono">{component.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Type:</span>
          <span className="font-mono">{component.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Category:</span>
          <span>{CATEGORY_LABELS[metadata.category]}</span>
        </div>
        {metadata.allowsChildren && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Children:</span>
            <span>{component.children?.length || 0}</span>
          </div>
        )}
        {metadata.isWrapper && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Wrapper:</span>
            <span>{component.child ? "Has child" : "Empty"}</span>
          </div>
        )}
      </div>

      {/* Additional properties */}
      {properties.length > 0 && (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">Advanced properties:</p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-4 text-xs">
            {properties.map((prop) => (
              <li key={prop}>{prop}</li>
            ))}
          </ul>
        </div>
      )}

      {/* QuestPDF API Reference */}
      {metadata.questPdfApi && (
        <div className="space-y-1">
          <p className="text-muted-foreground text-xs">QuestPDF API:</p>
          <code className="bg-muted block rounded p-2 text-[10px]">
            {metadata.questPdfApi}
          </code>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * PropertiesPanel - Right sidebar for component properties
 */
function PropertiesPanelComponent({ className }: PropertiesPanelProps) {
  // Get selected component from stores
  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const primarySelectedId = selectedIds[0] ?? null;
  const getComponent = useCanvasStore((state) => state.getComponent);

  // Get the selected component
  const selectedComponent = useMemo(() => {
    if (!primarySelectedId) return null;
    return getComponent(primarySelectedId);
  }, [primarySelectedId, getComponent]);

  // Multiple selection info
  const hasMultipleSelection = selectedIds.length > 1;

  return (
    <aside
      className={cn("bg-background flex h-full flex-col border-l", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Properties</h2>
        {hasMultipleSelection && (
          <span className="text-muted-foreground text-xs">
            {selectedIds.length} selected
          </span>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        {!selectedComponent ? (
          <EmptyState />
        ) : hasMultipleSelection ? (
          <div className="p-4">
            <p className="text-muted-foreground text-center text-sm">
              Multiple components selected.
              <br />
              <span className="text-xs">
                Bulk editing will be available in a future update.
              </span>
            </p>
          </div>
        ) : (
          <>
            <ComponentHeader component={selectedComponent} />
            <PropertySections component={selectedComponent} />
          </>
        )}
      </ScrollArea>
    </aside>
  );
}

export const PropertiesPanel = memo(PropertiesPanelComponent);
PropertiesPanel.displayName = "PropertiesPanel";

export default PropertiesPanel;
