/**
 * PageVariables
 * Panel component displaying all available page context variables
 *
 * Features:
 * - Grouped display of page variables
 * - Copy-to-clipboard for quick insertion
 * - Documentation for each variable
 * - Visual indicators for header/footer recommended variables
 */
"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  BookOpen,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PAGE_VARIABLES, type PageVariable } from "@/components/monaco";
import type { EditingMode } from "@/types";

// ============================================================================
// Types
// ============================================================================

export interface PageVariablesProps {
  /** Current editing mode affects which variables are highlighted */
  editingMode?: EditingMode;
  /** Callback when a variable expression is copied */
  onCopy?: (expression: string) => void;
  /** Whether the panel is expanded by default */
  defaultExpanded?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface VariableGroup {
  name: string;
  description: string;
  variables: PageVariable[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Group variables by their namespace prefix
 */
function groupVariables(variables: PageVariable[]): VariableGroup[] {
  const groups: Map<string, PageVariable[]> = new Map();
  const standalone: PageVariable[] = [];

  for (const variable of variables) {
    const dotIndex = variable.name.indexOf(".");
    if (dotIndex > 0) {
      const prefix = variable.name.substring(0, dotIndex);
      const existing = groups.get(prefix) || [];
      existing.push(variable);
      groups.set(prefix, existing);
    } else {
      standalone.push(variable);
    }
  }

  const result: VariableGroup[] = [];

  // Add standalone page variables first
  if (standalone.length > 0) {
    result.push({
      name: "Page Numbers",
      description:
        "Variables for page numbering (best used in headers/footers)",
      variables: standalone,
    });
  }

  // Add grouped variables
  for (const [prefix, vars] of groups) {
    result.push({
      name: prefix.charAt(0).toUpperCase() + prefix.slice(1),
      description: `${prefix.charAt(0).toUpperCase() + prefix.slice(1)}-related variables`,
      variables: vars,
    });
  }

  return result;
}

/**
 * Wrap variable name in expression syntax
 */
function toExpression(name: string): string {
  return `{{ ${name} }}`;
}

// ============================================================================
// Variable Row Component
// ============================================================================

interface VariableRowProps {
  variable: PageVariable;
  isHighlighted: boolean;
  onCopy: (expression: string) => void;
}

/**
 * Get usage example for a variable
 */
function getVariableUsageExample(variableName: string): string {
  switch (variableName) {
    case "currentPage":
      return "Page {{ currentPage }} of {{ totalPages }}";
    case "totalPages":
      return "Total: {{ totalPages }} pages";
    case "section.name":
      return "Section: {{ section.name }}";
    case "template.title":
      return "Document: {{ template.title }}";
    case "template.createdDate":
      return 'Created: {{ template.createdDate.ToString("yyyy-MM-dd") }}';
    case "template.updatedDate":
      return 'Updated: {{ template.updatedDate.ToString("yyyy-MM-dd") }}';
    default:
      return `{{ ${variableName} }}`;
  }
}

/**
 * Variable documentation tooltip content
 */
interface VariableDocTooltipProps {
  variable: PageVariable;
}

function VariableDocTooltip({ variable }: VariableDocTooltipProps) {
  const expression = toExpression(variable.name);
  const usageExample = getVariableUsageExample(variable.name);

  return (
    <div className="max-w-xs space-y-2 p-1">
      <div>
        <div className="text-foreground text-xs font-semibold">
          {variable.description}
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-muted-foreground text-xs">Syntax:</div>
        <code className="bg-muted block rounded px-2 py-1 font-mono text-xs">
          {expression}
        </code>
      </div>

      <div className="space-y-1">
        <div className="text-muted-foreground text-xs">Returns:</div>
        <span className="inline-block rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
          {variable.returnType}
        </span>
      </div>

      <div className="space-y-1">
        <div className="text-muted-foreground text-xs">Example:</div>
        <code className="bg-muted block rounded px-2 py-1 font-mono text-xs italic">
          {usageExample}
        </code>
      </div>

      {variable.headerFooterOnly && (
        <div className="flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
          <span>📄</span>
          <span>Best used in headers/footers</span>
        </div>
      )}
    </div>
  );
}

function VariableRow({ variable, isHighlighted, onCopy }: VariableRowProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const expression = toExpression(variable.name);
    try {
      await navigator.clipboard.writeText(expression);
      setCopied(true);
      onCopy(expression);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [variable.name, onCopy]);

  return (
    <div
      className={cn(
        "group flex items-center justify-between rounded-md px-2 py-1.5 transition-colors",
        isHighlighted
          ? "bg-primary/10 hover:bg-primary/15"
          : "hover:bg-muted/50"
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {/* Variable name with documentation tooltip */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <code className="bg-muted hover:bg-muted/80 shrink-0 cursor-help rounded px-1.5 py-0.5 font-mono text-xs">
                {variable.name}
              </code>
            </TooltipTrigger>
            <TooltipContent side="right" align="start" className="p-2">
              <VariableDocTooltip variable={variable} />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <span className="text-muted-foreground truncate text-xs">
          {variable.description}
        </span>
        {variable.headerFooterOnly && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="shrink-0 cursor-help text-xs">📄</span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Best used in headers/footers</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="ml-2 flex shrink-0 items-center gap-1">
        <span className="text-muted-foreground text-xs opacity-0 transition-opacity group-hover:opacity-100">
          {variable.returnType}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={handleCopy}
                aria-label={`Copy ${toExpression(variable.name)} to clipboard`}
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {copied ? "Copied!" : `Copy ${toExpression(variable.name)}`}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

// ============================================================================
// Variable Group Component
// ============================================================================

interface VariableGroupSectionProps {
  group: VariableGroup;
  editingMode: EditingMode;
  onCopy: (expression: string) => void;
  defaultExpanded?: boolean;
}

function VariableGroupSection({
  group,
  editingMode,
  onCopy,
  defaultExpanded = true,
}: VariableGroupSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultExpanded);
  const isHeaderFooterMode =
    editingMode === "header" || editingMode === "footer";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-full justify-start px-2 font-medium"
        >
          {isOpen ? (
            <ChevronDown className="mr-1 h-4 w-4" />
          ) : (
            <ChevronRight className="mr-1 h-4 w-4" />
          )}
          {group.name}
          <span className="text-muted-foreground ml-2 text-xs">
            ({group.variables.length})
          </span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0.5 pl-2">
        {group.variables.map((variable) => (
          <VariableRow
            key={variable.name}
            variable={variable}
            isHighlighted={
              isHeaderFooterMode
                ? !!variable.headerFooterOnly
                : !variable.headerFooterOnly
            }
            onCopy={onCopy}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * PageVariables - Complete panel for page context variables
 */
export function PageVariables({
  editingMode = "content",
  onCopy,
  defaultExpanded = true,
  className,
}: PageVariablesProps) {
  const groups = useMemo(() => groupVariables(PAGE_VARIABLES), []);
  const isHeaderFooterMode =
    editingMode === "header" || editingMode === "footer";

  const handleCopy = useCallback(
    (expression: string) => {
      onCopy?.(expression);
    },
    [onCopy]
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="text-muted-foreground h-4 w-4" />
          <h3 className="text-sm font-semibold">Page Variables</h3>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  aria-label="Page variables documentation"
                >
                  <Info className="text-muted-foreground h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-sm p-3">
                <div className="space-y-2">
                  <p className="text-foreground font-semibold">
                    About Page Variables
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Page variables are special placeholders that get replaced
                    with actual values when the PDF is generated. They&apos;re
                    especially useful in headers and footers for displaying page
                    numbers and document information.
                  </p>
                  <div className="bg-muted rounded p-2">
                    <p className="text-xs font-medium">Usage:</p>
                    <code className="text-xs">
                      Page {"{{ currentPage }}"} of {"{{ totalPages }}"}
                    </code>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    📄 Variables marked with this icon work best in
                    headers/footers as they&apos;re evaluated per-page.
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {isHeaderFooterMode && (
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs">
            Editing {editingMode}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-muted-foreground text-xs">
        Insert these variables in your text content using expression syntax.
        Click to copy.
      </p>

      {/* Variable Groups */}
      <div className="space-y-1">
        {groups.map((group) => (
          <VariableGroupSection
            key={group.name}
            group={group}
            editingMode={editingMode}
            onCopy={handleCopy}
            defaultExpanded={defaultExpanded}
          />
        ))}
      </div>

      {/* Hint */}
      <div className="text-muted-foreground bg-muted/50 rounded-md p-2 text-xs">
        <strong>Tip:</strong> Use{" "}
        <code className="bg-muted rounded px-1">{"{{ currentPage }}"}</code> and{" "}
        <code className="bg-muted rounded px-1">{"{{ totalPages }}"}</code> in
        headers/footers for page numbering like &ldquo;Page 1 of 10&rdquo;.
      </div>
    </div>
  );
}

export default PageVariables;
