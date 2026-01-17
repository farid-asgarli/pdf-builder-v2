/**
 * PropertySection Component
 * Collapsible property group section for the properties panel
 *
 * Features:
 * - Collapsible sections with smooth animation
 * - Icon support for visual categorization
 * - Badge support for additional info (e.g., count)
 * - Accessibility support with proper ARIA attributes
 * - Keyboard navigation
 */
"use client";

import { memo, useState, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, type LucideIcon } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * Props for PropertySection component
 */
export interface PropertySectionProps {
  /** Section title */
  title: string;
  /** Optional description shown in collapsed state */
  description?: string;
  /** Lucide icon component for the section */
  icon?: LucideIcon;
  /** Whether the section is initially collapsed */
  defaultCollapsed?: boolean;
  /** Controlled collapsed state */
  collapsed?: boolean;
  /** Callback when collapsed state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Optional badge content (e.g., property count) */
  badge?: string | number;
  /** Whether the section is disabled */
  disabled?: boolean;
  /** Section content */
  children: ReactNode;
  /** Additional CSS classes for the container */
  className?: string;
  /** Additional CSS classes for the content */
  contentClassName?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * PropertySection - Collapsible property group
 */
function PropertySectionComponent({
  title,
  description,
  icon: Icon,
  defaultCollapsed = false,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  badge,
  disabled = false,
  children,
  className,
  contentClassName,
}: PropertySectionProps) {
  // Internal state for uncontrolled mode
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed);

  // Determine if we're in controlled or uncontrolled mode
  const isControlled = controlledCollapsed !== undefined;
  const isCollapsed = isControlled ? controlledCollapsed : internalCollapsed;

  // Handle collapse toggle
  const handleToggle = useCallback(
    (open: boolean) => {
      const newCollapsed = !open;
      if (!isControlled) {
        setInternalCollapsed(newCollapsed);
      }
      onCollapsedChange?.(newCollapsed);
    },
    [isControlled, onCollapsedChange]
  );

  return (
    <Collapsible
      open={!isCollapsed}
      onOpenChange={handleToggle}
      disabled={disabled}
      className={cn("group", className)}
    >
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between py-2 text-left transition-colors",
          "hover:bg-muted/50 -mx-2 rounded-md px-2",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
          disabled && "cursor-not-allowed opacity-50"
        )}
        aria-expanded={!isCollapsed}
        aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${title} section`}
      >
        <div className="flex items-center gap-2">
          {Icon && (
            <Icon
              className={cn(
                "text-muted-foreground h-4 w-4 transition-colors",
                !isCollapsed && "text-foreground"
              )}
            />
          )}
          <div className="min-w-0">
            <span
              className={cn(
                "text-sm font-medium",
                isCollapsed ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {title}
            </span>
            {description && isCollapsed && (
              <span className="text-muted-foreground ml-2 text-xs">
                — {description}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {badge !== undefined && (
            <span
              className={cn(
                "text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                "tabular-nums"
              )}
            >
              {badge}
            </span>
          )}
          <ChevronDown
            className={cn(
              "text-muted-foreground h-4 w-4 shrink-0 transition-transform duration-200",
              !isCollapsed && "rotate-180"
            )}
          />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent
        className={cn(
          "overflow-hidden transition-all",
          "data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
        )}
      >
        <div className={cn("pt-3 pb-1", contentClassName)}>{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export const PropertySection = memo(PropertySectionComponent);
PropertySection.displayName = "PropertySection";

export default PropertySection;
