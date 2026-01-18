import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Lightbulb,
  Keyboard,
  MousePointer,
  Info,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

/**
 * A helpful hint to display in the empty state
 */
export interface EmptyStateHint {
  /** Icon to display (optional) */
  icon?: LucideIcon;
  /** Hint text */
  text: string;
  /** Optional keyboard shortcut to display */
  shortcut?: string;
}

/**
 * Visual variant for the empty state
 */
export type EmptyStateVariant = "default" | "subtle" | "dashed" | "card";

/**
 * Size variant for the empty state
 */
export type EmptyStateSize = "sm" | "md" | "lg";

interface EmptyStateProps {
  /** Icon to display at the top */
  icon?: ReactNode;
  /** Main title text */
  title: string;
  /** Description text below the title */
  description?: string;
  /** Action button or element */
  action?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Visual variant */
  variant?: EmptyStateVariant;
  /** Size variant */
  size?: EmptyStateSize;
  /** Array of helpful hints to display */
  hints?: EmptyStateHint[];
  /** Whether to show a quick tip section */
  showQuickTip?: boolean;
  /** Custom quick tip text (overrides default) */
  quickTip?: string;
  /** Secondary action */
  secondaryAction?: ReactNode;
}

// ============================================================================
// Helper Components
// ============================================================================

/**
 * Renders a single hint item
 */
function HintItem({ hint }: { hint: EmptyStateHint }) {
  const Icon = hint.icon || Lightbulb;

  return (
    <li className="flex items-start gap-2 text-left">
      <Icon className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
      <span className="text-muted-foreground text-sm">
        {hint.text}
        {hint.shortcut && (
          <kbd className="bg-muted text-muted-foreground ml-2 inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-xs">
            {hint.shortcut}
          </kbd>
        )}
      </span>
    </li>
  );
}

/**
 * Renders the hints section
 */
function HintsSection({ hints }: { hints: EmptyStateHint[] }) {
  if (!hints.length) return null;

  return (
    <div className="mt-4 w-full max-w-xs">
      <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
        <Sparkles className="h-3 w-3" />
        Quick Tips
      </div>
      <ul className="space-y-2">
        {hints.map((hint, index) => (
          <HintItem key={index} hint={hint} />
        ))}
      </ul>
    </div>
  );
}

/**
 * Renders a quick tip callout
 */
function QuickTipCallout({ tip }: { tip: string }) {
  return (
    <div className="bg-muted/50 mt-4 flex items-start gap-2 rounded-lg px-3 py-2">
      <Info className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
      <p className="text-muted-foreground text-xs">{tip}</p>
    </div>
  );
}

// ============================================================================
// Style Mappings
// ============================================================================

const variantStyles: Record<EmptyStateVariant, string> = {
  default: "rounded-lg border border-dashed bg-background",
  subtle: "rounded-lg bg-muted/30",
  dashed:
    "rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/10",
  card: "rounded-lg border bg-card shadow-sm",
};

const sizeStyles: Record<
  EmptyStateSize,
  { container: string; icon: string; title: string }
> = {
  sm: {
    container: "min-h-32 gap-2 p-4",
    icon: "[&>svg]:h-8 [&>svg]:w-8",
    title: "text-sm font-medium",
  },
  md: {
    container: "min-h-50 gap-4 p-6",
    icon: "[&>svg]:h-10 [&>svg]:w-10",
    title: "text-lg font-semibold",
  },
  lg: {
    container: "min-h-72 gap-6 p-8",
    icon: "[&>svg]:h-14 [&>svg]:w-14",
    title: "text-xl font-semibold",
  },
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * Empty state component for when there's no content to display
 *
 * @example Basic usage
 * ```tsx
 * <EmptyState
 *   icon={<FileText className="h-10 w-10" />}
 *   title="No documents"
 *   description="Create your first document to get started"
 *   action={<Button>Create Document</Button>}
 * />
 * ```
 *
 * @example With helpful hints
 * ```tsx
 * <EmptyState
 *   icon={<Layout className="h-10 w-10" />}
 *   title="Canvas is empty"
 *   description="Start building your PDF template"
 *   hints={[
 *     { icon: MousePointer, text: "Drag components from the palette" },
 *     { icon: Keyboard, text: "Quick add with", shortcut: "Ctrl+/" },
 *   ]}
 *   action={<Button>Add Component</Button>}
 * />
 * ```
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  variant = "default",
  size = "md",
  hints,
  showQuickTip,
  quickTip,
  secondaryAction,
}: EmptyStateProps) {
  const styles = sizeStyles[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        variantStyles[variant],
        styles.container,
        className
      )}
    >
      {icon && (
        <div className={cn("text-muted-foreground", styles.icon)}>{icon}</div>
      )}
      <div className="max-w-sm">
        <h3 className={styles.title}>{title}</h3>
        {description && (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        )}
      </div>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      )}

      {/* Helpful hints */}
      {hints && hints.length > 0 && <HintsSection hints={hints} />}

      {/* Quick tip callout */}
      {showQuickTip && quickTip && <QuickTipCallout tip={quickTip} />}
    </div>
  );
}

// ============================================================================
// Pre-built Empty State Variants
// ============================================================================

/**
 * Empty state for the canvas when no components exist
 */
export function CanvasEmptyState({
  onAddComponent,
  onOpenQuickAdd,
  className,
}: {
  onAddComponent?: () => void;
  onOpenQuickAdd?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-16 w-16"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="8"
            y="8"
            width="48"
            height="48"
            rx="4"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4 4"
            className="text-muted-foreground/40"
          />
          <rect
            x="16"
            y="16"
            width="32"
            height="8"
            rx="2"
            fill="currentColor"
            className="text-muted-foreground/20"
          />
          <rect
            x="16"
            y="28"
            width="20"
            height="6"
            rx="1"
            fill="currentColor"
            className="text-muted-foreground/15"
          />
          <rect
            x="16"
            y="38"
            width="32"
            height="6"
            rx="1"
            fill="currentColor"
            className="text-muted-foreground/15"
          />
          <circle
            cx="48"
            cy="48"
            r="12"
            fill="currentColor"
            className="text-primary/10"
          />
          <path
            d="M48 42V54M42 48H54"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-primary"
          />
        </svg>
      }
      title="Canvas is empty"
      description="Start building your PDF template by adding components from the palette"
      variant="subtle"
      size="lg"
      hints={[
        {
          icon: MousePointer,
          text: "Drag components from the left palette onto the canvas",
        },
        {
          icon: Keyboard,
          text: "Press to quickly add components",
          shortcut: "Ctrl+/",
        },
        {
          icon: Lightbulb,
          text: "Start with a Column or Row to create a layout structure",
        },
      ]}
      quickTip="Pro tip: Use Column for vertical layouts and Row for horizontal. Nest them to create complex structures!"
      showQuickTip
      className={className}
    />
  );
}

/**
 * Empty state for the component tree when no root exists
 */
export function ComponentTreeEmptyState({
  onAddRoot,
  className,
}: {
  onAddRoot?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-12 w-12"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M24 8v8M24 32v8M16 24H8M40 24h-8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-muted-foreground/40"
          />
          <circle
            cx="24"
            cy="24"
            r="6"
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted-foreground/60"
          />
          <circle
            cx="24"
            cy="8"
            r="3"
            fill="currentColor"
            className="text-muted-foreground/30"
          />
          <circle
            cx="24"
            cy="40"
            r="3"
            fill="currentColor"
            className="text-muted-foreground/30"
          />
          <circle
            cx="8"
            cy="24"
            r="3"
            fill="currentColor"
            className="text-muted-foreground/30"
          />
          <circle
            cx="40"
            cy="24"
            r="3"
            fill="currentColor"
            className="text-muted-foreground/30"
          />
        </svg>
      }
      title="No components"
      description="Add components to build your document structure"
      variant="subtle"
      size="sm"
      hints={[
        { icon: MousePointer, text: "Drag from palette to canvas" },
        { icon: Keyboard, text: "Quick add", shortcut: "Ctrl+/" },
      ]}
      className={className}
    />
  );
}

/**
 * Empty state for the preview panel when no preview exists
 */
export function PreviewEmptyState({
  onGenerate,
  isLoading,
  hasComponents,
  className,
}: {
  onGenerate?: () => void;
  isLoading?: boolean;
  hasComponents?: boolean;
  className?: string;
}) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-14 w-14"
          viewBox="0 0 56 56"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="8"
            y="4"
            width="40"
            height="48"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted-foreground/40"
          />
          <path
            d="M16 16h24M16 24h20M16 32h16M16 40h24"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-muted-foreground/20"
          />
          <circle
            cx="28"
            cy="28"
            r="10"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary/60"
          />
          <path
            d="M28 22v12M34 28H22"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-primary/60"
          />
        </svg>
      }
      title="No preview yet"
      description={
        hasComponents
          ? "Click 'Generate Preview' to see your PDF"
          : "Add components to the canvas first, then generate a preview"
      }
      variant="subtle"
      size="md"
      hints={
        hasComponents
          ? [
              { icon: Keyboard, text: "Generate preview", shortcut: "Ctrl+P" },
              {
                icon: Lightbulb,
                text: "Preview updates automatically when you make changes",
              },
            ]
          : [
              {
                icon: Lightbulb,
                text: "Start by adding a Column or Row component to the canvas",
              },
            ]
      }
      className={className}
    />
  );
}

/**
 * Empty state for templates list when no templates exist
 */
export function TemplatesEmptyState({
  onCreateTemplate,
  onImportTemplate,
  className,
}: {
  onCreateTemplate?: () => void;
  onImportTemplate?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-16 w-16"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="4"
            y="8"
            width="24"
            height="32"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted-foreground/40"
          />
          <rect
            x="36"
            y="8"
            width="24"
            height="32"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted-foreground/30"
          />
          <rect
            x="20"
            y="24"
            width="24"
            height="32"
            rx="2"
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted-foreground/20"
          />
          <path
            d="M10 16h12M10 22h8M10 28h10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-muted-foreground/30"
          />
          <circle
            cx="52"
            cy="52"
            r="10"
            fill="currentColor"
            className="text-primary/10"
          />
          <path
            d="M52 46v12M46 52h12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-primary"
          />
        </svg>
      }
      title="No templates yet"
      description="Create your first PDF template to get started with the visual builder"
      variant="dashed"
      size="lg"
      hints={[
        {
          icon: Lightbulb,
          text: "Templates can be reused with different data to generate PDFs",
        },
        {
          icon: MousePointer,
          text: "Or import an existing template from a JSON file",
        },
      ]}
      quickTip="Each template defines the layout structure. When generating a PDF, you provide the data (like names, dates, amounts) that fills in the template."
      showQuickTip
      className={className}
    />
  );
}

/**
 * Empty state for search results when no matches found
 */
export function SearchEmptyState({
  searchQuery,
  onClearSearch,
  className,
}: {
  searchQuery: string;
  onClearSearch?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-12 w-12"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="20"
            cy="20"
            r="12"
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted-foreground/40"
          />
          <path
            d="M30 30l10 10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-muted-foreground/40"
          />
          <path
            d="M14 20h12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-muted-foreground/60"
          />
        </svg>
      }
      title="No results found"
      description={`No matches for "${searchQuery}"`}
      variant="subtle"
      size="sm"
      hints={[
        { icon: Lightbulb, text: "Try using different keywords" },
        { icon: Lightbulb, text: "Check for typos in your search" },
      ]}
      className={className}
    />
  );
}

/**
 * Empty state for properties panel when nothing is selected
 */
export function PropertiesEmptyState({ className }: { className?: string }) {
  return (
    <EmptyState
      icon={
        <svg
          className="h-10 w-10"
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="4"
            y="4"
            width="32"
            height="32"
            rx="4"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="4 4"
            className="text-muted-foreground/30"
          />
          <circle
            cx="20"
            cy="20"
            r="6"
            stroke="currentColor"
            strokeWidth="2"
            className="text-muted-foreground/40"
          />
        </svg>
      }
      title="No component selected"
      description="Select a component on the canvas or in the tree to edit its properties"
      variant="subtle"
      size="sm"
      hints={[
        { icon: MousePointer, text: "Click a component to select it" },
        {
          icon: Keyboard,
          text: "Navigate with arrow keys in the tree",
        },
      ]}
      className={className}
    />
  );
}
