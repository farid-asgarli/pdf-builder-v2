/**
 * PageExpressionHelper
 * UI component showing available page context variables with copy-to-clipboard
 *
 * Features:
 * - List of available page variables (currentPage, totalPages, etc.)
 * - Copy-to-clipboard functionality
 * - Context-aware suggestions based on editing mode (filters in header/footer)
 * - Documentation tooltips
 * - Smart autocomplete registration for Monaco editor
 * - Real-time preview of evaluated expressions
 */
"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Copy,
  Check,
  FileText,
  Hash,
  Calendar,
  Info,
  Eye,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PAGE_VARIABLES, type PageVariable } from "@/components/monaco";
import type { EditingMode } from "@/types";

// ============================================================================
// Types
// ============================================================================

export interface PageExpressionHelperProps {
  /** Current editing mode */
  editingMode?: EditingMode;
  /** Callback when a variable is selected/copied */
  onVariableSelect?: (expression: string) => void;
  /** Whether to show the component in compact mode */
  compact?: boolean;
  /** Whether to filter variables based on editing mode (true = only show relevant) */
  filterByMode?: boolean;
  /** Whether to show the expression preview panel */
  showPreview?: boolean;
  /** Sample data for expression preview */
  samplePreviewData?: ExpressionPreviewData;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Sample data used for previewing page expressions
 */
export interface ExpressionPreviewData {
  currentPage?: number;
  totalPages?: number;
  sectionName?: string;
  templateTitle?: string;
  createdDate?: string;
  updatedDate?: string;
}

/**
 * Default preview data for expression testing
 */
const DEFAULT_PREVIEW_DATA: ExpressionPreviewData = {
  currentPage: 1,
  totalPages: 5,
  sectionName: "Introduction",
  templateTitle: "Insurance Contract",
  createdDate: new Date().toISOString().split("T")[0],
  updatedDate: new Date().toISOString().split("T")[0],
};

// ============================================================================
// Expression Preview Evaluation
// ============================================================================

/**
 * Evaluates a page expression with sample data for preview
 * Safely parses {{ variable }} syntax and replaces with preview values
 */
export function evaluatePageExpression(
  expression: string,
  previewData: ExpressionPreviewData = DEFAULT_PREVIEW_DATA
): { result: string; isValid: boolean; error?: string } {
  if (!expression) {
    return { result: "", isValid: true };
  }

  try {
    // Extract all {{ ... }} expressions
    const expressionPattern = /\{\{\s*([^}]+?)\s*\}\}/g;
    let result = expression;
    let match: RegExpExecArray | null;
    let hasError = false;
    let errorMsg: string | undefined;

    // Create a map of variable names to their preview values
    const variableMap: Record<string, string | number> = {
      currentPage: previewData.currentPage ?? 1,
      totalPages: previewData.totalPages ?? 5,
      "section.name": previewData.sectionName ?? "Section",
      "template.title": previewData.templateTitle ?? "Document",
      "template.createdDate":
        previewData.createdDate ?? new Date().toISOString().split("T")[0],
      "template.updatedDate":
        previewData.updatedDate ?? new Date().toISOString().split("T")[0],
    };

    // Replace each expression with its preview value
    while ((match = expressionPattern.exec(expression)) !== null) {
      const fullMatch = match[0];
      const variableName = match[1].trim();

      // Check if variable exists in our map
      if (variableName in variableMap) {
        result = result.replace(fullMatch, String(variableMap[variableName]));
      } else {
        // Check if it's a method call like .ToString("format")
        const baseVarMatch = variableName.match(/^([a-zA-Z_.]+)/);
        if (baseVarMatch && baseVarMatch[1] in variableMap) {
          // For method calls, just use the base value
          result = result.replace(
            fullMatch,
            String(variableMap[baseVarMatch[1]])
          );
        } else {
          // Unknown variable - mark as error
          hasError = true;
          errorMsg = `Unknown variable: ${variableName}`;
          result = result.replace(fullMatch, `[?${variableName}?]`);
        }
      }
    }

    return {
      result,
      isValid: !hasError,
      error: errorMsg,
    };
  } catch (error) {
    return {
      result: expression,
      isValid: false,
      error: error instanceof Error ? error.message : "Invalid expression",
    };
  }
}

/**
 * Get filtered variables based on editing mode
 * In header/footer mode: Show all variables, but prioritize page-related ones
 * In content mode: Show non-page variables, filter out header/footer-only ones
 */
export function getContextAwareVariables(
  editingMode: "content" | "header" | "footer",
  filterByMode: boolean = false
): PageVariable[] {
  const isHeaderFooterMode =
    editingMode === "header" || editingMode === "footer";

  if (filterByMode) {
    // Strict filtering: only show relevant variables
    if (isHeaderFooterMode) {
      // In header/footer, show all (including page numbers)
      return PAGE_VARIABLES;
    } else {
      // In content mode, filter out header/footer-only variables
      return PAGE_VARIABLES.filter((v) => !v.headerFooterOnly);
    }
  }

  // No filtering, just sort by relevance
  return [...PAGE_VARIABLES].sort((a, b) => {
    const aRecommended = isHeaderFooterMode
      ? a.headerFooterOnly
      : !a.headerFooterOnly;
    const bRecommended = isHeaderFooterMode
      ? b.headerFooterOnly
      : !b.headerFooterOnly;

    if (aRecommended && !bRecommended) return -1;
    if (!aRecommended && bRecommended) return 1;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get Monaco autocomplete suggestions for page variables
 * This is the core function for smart autocomplete integration
 */
export function getPageVariableSuggestions(
  editingMode: "content" | "header" | "footer",
  prefix: string = ""
): Array<{
  label: string;
  insertText: string;
  detail: string;
  documentation: string;
  sortPriority: number;
}> {
  const isHeaderFooterMode =
    editingMode === "header" || editingMode === "footer";
  const suggestions: Array<{
    label: string;
    insertText: string;
    detail: string;
    documentation: string;
    sortPriority: number;
  }> = [];

  for (const variable of PAGE_VARIABLES) {
    // Check if variable name matches prefix
    if (
      prefix &&
      !variable.name.toLowerCase().startsWith(prefix.toLowerCase())
    ) {
      continue;
    }

    // Calculate sort priority (lower = higher priority)
    let sortPriority = 50;
    if (isHeaderFooterMode && variable.headerFooterOnly) {
      // High priority for page vars in header/footer
      sortPriority = 10;
    } else if (!isHeaderFooterMode && !variable.headerFooterOnly) {
      // High priority for non-page vars in content
      sortPriority = 10;
    } else if (isHeaderFooterMode) {
      // Medium priority for other vars in header/footer
      sortPriority = 30;
    } else {
      // Low priority for page vars in content mode
      sortPriority = 70;
    }

    suggestions.push({
      label: variable.name,
      insertText: variable.name,
      detail: `(${variable.returnType}) ${variable.headerFooterOnly ? "📄 Header/Footer" : ""}`,
      documentation: variable.description,
      sortPriority,
    });
  }

  return suggestions.sort((a, b) => a.sortPriority - b.sortPriority);
}

// ============================================================================
// Expression Preview Component
// ============================================================================

interface ExpressionPreviewProps {
  /** The expression to preview */
  expression: string;
  /** Preview data for evaluation */
  previewData?: ExpressionPreviewData;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ExpressionPreview - Shows real-time preview of evaluated expressions
 */
function ExpressionPreview({
  expression,
  previewData = DEFAULT_PREVIEW_DATA,
  className,
}: ExpressionPreviewProps) {
  const { result, isValid, error } = useMemo(
    () => evaluatePageExpression(expression, previewData),
    [expression, previewData]
  );

  if (!expression) {
    return (
      <div className={cn("text-muted-foreground text-sm italic", className)}>
        Enter an expression to see preview
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Eye className="text-muted-foreground h-4 w-4" />
        <span className="text-sm font-medium">Preview</span>
        {!isValid && (
          <Badge variant="destructive" className="text-xs">
            Error
          </Badge>
        )}
      </div>
      <div
        className={cn(
          "rounded-md border p-3 font-mono text-sm",
          isValid
            ? "bg-muted/50 border-border"
            : "bg-destructive/10 border-destructive/30"
        )}
      >
        {result || (
          <span className="text-muted-foreground italic">Empty result</span>
        )}
      </div>
      {error && (
        <div className="text-destructive flex items-center gap-1.5 text-xs">
          <AlertCircle className="h-3 w-3" />
          {error}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Expression Tester Component
// ============================================================================

interface ExpressionTesterProps {
  /** Current editing mode */
  editingMode: EditingMode;
  /** Preview data */
  previewData?: ExpressionPreviewData;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ExpressionTester - Interactive panel to test page expressions
 */
function ExpressionTester({
  editingMode,
  previewData = DEFAULT_PREVIEW_DATA,
  className,
}: ExpressionTesterProps) {
  const [testExpression, setTestExpression] = useState("");
  const [customPreviewData, setCustomPreviewData] =
    useState<ExpressionPreviewData>(previewData);

  // Quick expression templates
  const quickExpressions = useMemo(() => {
    const base = [
      {
        label: "Page X of Y",
        expression: "Page {{ currentPage }} of {{ totalPages }}",
      },
      { label: "Page Number", expression: "{{ currentPage }}" },
    ];

    if (editingMode === "header" || editingMode === "footer") {
      return [
        ...base,
        { label: "Document Title", expression: "{{ template.title }}" },
        { label: "Section Name", expression: "{{ section.name }}" },
      ];
    }

    return [
      { label: "Document Title", expression: "{{ template.title }}" },
      { label: "Section Name", expression: "{{ section.name }}" },
    ];
  }, [editingMode]);

  return (
    <div className={cn("bg-card space-y-4 rounded-lg border p-4", className)}>
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary h-4 w-4" />
        <h4 className="font-medium">Expression Tester</h4>
      </div>

      {/* Quick Expression Buttons */}
      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs">Quick Insert</Label>
        <div className="flex flex-wrap gap-1.5">
          {quickExpressions.map((item) => (
            <Button
              key={item.expression}
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setTestExpression(item.expression)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Expression Input */}
      <div className="space-y-2">
        <Label
          htmlFor="test-expression"
          className="text-muted-foreground text-xs"
        >
          Test Expression
        </Label>
        <Input
          id="test-expression"
          value={testExpression}
          onChange={(e) => setTestExpression(e.target.value)}
          placeholder="Enter expression like: Page {{ currentPage }} of {{ totalPages }}"
          className="font-mono text-sm"
        />
      </div>

      {/* Preview Output */}
      <ExpressionPreview
        expression={testExpression}
        previewData={customPreviewData}
      />

      {/* Preview Data Controls */}
      <div className="space-y-2">
        <Label className="text-muted-foreground text-xs">Preview Values</Label>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="preview-page" className="text-xs">
              Current Page
            </Label>
            <Input
              id="preview-page"
              type="number"
              min={1}
              value={customPreviewData.currentPage}
              onChange={(e) =>
                setCustomPreviewData({
                  ...customPreviewData,
                  currentPage: parseInt(e.target.value) || 1,
                })
              }
              className="h-8"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="preview-total" className="text-xs">
              Total Pages
            </Label>
            <Input
              id="preview-total"
              type="number"
              min={1}
              value={customPreviewData.totalPages}
              onChange={(e) =>
                setCustomPreviewData({
                  ...customPreviewData,
                  totalPages: parseInt(e.target.value) || 1,
                })
              }
              className="h-8"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Wrap a variable name in expression syntax
 */
function toExpression(variableName: string): string {
  return `{{ ${variableName} }}`;
}

// ============================================================================
// Variable Icon Component
// ============================================================================

interface VariableIconProps {
  returnType: string;
  className?: string;
}

/**
 * Icon component for variable types - declared outside render to comply with React rules
 */
function VariableIcon({ returnType, className }: VariableIconProps) {
  switch (returnType.toLowerCase()) {
    case "number":
      return <Hash className={className} />;
    case "string":
      return <FileText className={className} />;
    case "datetime":
      return <Calendar className={className} />;
    default:
      return <Info className={className} />;
  }
}

// ============================================================================
// Variable Item Component
// ============================================================================

interface VariableItemProps {
  variable: PageVariable;
  isRecommended: boolean;
  compact?: boolean;
  onCopy: (expression: string) => void;
}

function VariableItem({
  variable,
  isRecommended,
  compact,
  onCopy,
}: VariableItemProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const expression = toExpression(variable.name);
    try {
      await navigator.clipboard.writeText(expression);
      setCopied(true);
      onCopy(expression);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  }, [variable.name, onCopy]);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-2 font-mono text-xs",
                isRecommended && "bg-primary/10 border-primary/20 border"
              )}
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="mr-1 h-3 w-3 text-green-500" />
              ) : (
                <VariableIcon
                  returnType={variable.returnType}
                  className="mr-1 h-3 w-3 opacity-60"
                />
              )}
              {variable.name}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="font-medium">{variable.description}</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Returns: {variable.returnType}
            </p>
            {variable.headerFooterOnly && (
              <p className="text-primary mt-1 text-xs">
                📄 Best used in headers/footers
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={cn(
        "hover:bg-muted/50 group flex items-center justify-between rounded-md p-2 transition-colors",
        isRecommended && "bg-primary/5 border-primary/10 border"
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <VariableIcon
          returnType={variable.returnType}
          className="h-4 w-4 shrink-0 opacity-60"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <code className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm">
              {toExpression(variable.name)}
            </code>
            {variable.headerFooterOnly && (
              <span className="text-primary text-xs">📄</span>
            )}
          </div>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {variable.description}
          </p>
        </div>
      </div>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span className="sr-only">Copy expression</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{copied ? "Copied!" : "Copy to clipboard"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * PageExpressionHelper - Shows available page context variables with smart autocomplete
 *
 * Features:
 * - Context-aware suggestions (filters/prioritizes based on editing mode)
 * - Copy-to-clipboard for quick insertion
 * - Real-time expression preview with sample data
 * - Interactive expression tester
 */
export function PageExpressionHelper({
  editingMode = "content",
  onVariableSelect,
  compact = false,
  filterByMode = false,
  showPreview = false,
  samplePreviewData,
  className,
}: PageExpressionHelperProps) {
  const isHeaderFooterMode =
    editingMode === "header" || editingMode === "footer";

  const handleCopy = useCallback(
    (expression: string) => {
      onVariableSelect?.(expression);
    },
    [onVariableSelect]
  );

  // Get context-aware variables (filtered or sorted based on editing mode)
  const displayVariables = useMemo(
    () => getContextAwareVariables(editingMode, filterByMode),
    [editingMode, filterByMode]
  );

  // Determine which variables are recommended in current mode
  const isVariableRecommended = useCallback(
    (variable: PageVariable): boolean => {
      return isHeaderFooterMode
        ? !!variable.headerFooterOnly
        : !variable.headerFooterOnly;
    },
    [isHeaderFooterMode]
  );

  if (compact) {
    return (
      <div className={cn("flex flex-wrap gap-1.5", className)}>
        {displayVariables.map((variable) => (
          <VariableItem
            key={variable.name}
            variable={variable}
            isRecommended={isVariableRecommended(variable)}
            compact
            onCopy={handleCopy}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Page Variables</h4>
          {isHeaderFooterMode && (
            <Badge variant="secondary" className="text-xs">
              <FileText className="mr-1 h-3 w-3" />
              Header/Footer Mode
            </Badge>
          )}
        </div>

        <p className="text-muted-foreground text-xs">
          {isHeaderFooterMode
            ? "Page numbering variables are highlighted and prioritized. Click to copy."
            : filterByMode
              ? "Showing variables recommended for main content."
              : "Page numbering variables work best in headers/footers."}
        </p>
      </div>

      {/* Context-aware Mode Indicator */}
      {isHeaderFooterMode && (
        <div className="bg-primary/5 border-primary/20 flex items-center gap-2 rounded-md border p-2">
          <Sparkles className="text-primary h-4 w-4" />
          <span className="text-primary text-xs">
            Smart suggestions enabled: Page variables are prioritized for{" "}
            {editingMode === "header" ? "header" : "footer"} editing
          </span>
        </div>
      )}

      {/* Variable List */}
      <div className="space-y-1">
        {displayVariables.length > 0 ? (
          displayVariables.map((variable) => (
            <VariableItem
              key={variable.name}
              variable={variable}
              isRecommended={isVariableRecommended(variable)}
              onCopy={handleCopy}
            />
          ))
        ) : (
          <div className="text-muted-foreground py-4 text-center text-sm">
            No variables available for this context
          </div>
        )}
      </div>

      {/* Expression Preview/Tester Panel */}
      {showPreview && (
        <>
          <Separator />
          <ExpressionTester
            editingMode={editingMode}
            previewData={samplePreviewData}
          />
        </>
      )}
    </div>
  );
}

// ============================================================================
// Additional Exports for Monaco Integration
// ============================================================================

/**
 * Hook for registering page variable autocomplete with Monaco editor
 * Call this in your Monaco editor setup to enable smart page variable suggestions
 */
export function usePageVariableAutocomplete(
  editingMode: "content" | "header" | "footer"
) {
  const suggestionsRef = useRef<ReturnType<typeof getPageVariableSuggestions>>(
    []
  );

  useEffect(() => {
    suggestionsRef.current = getPageVariableSuggestions(editingMode);
  }, [editingMode]);

  return {
    /**
     * Get current autocomplete suggestions for page variables
     */
    getSuggestions: useCallback(
      (prefix?: string) => getPageVariableSuggestions(editingMode, prefix),
      [editingMode]
    ),
    /**
     * Check if a variable name is a valid page variable
     */
    isPageVariable: useCallback((name: string) => {
      return PAGE_VARIABLES.some((v) => v.name === name);
    }, []),
    /**
     * Get page variable metadata by name
     */
    getVariable: useCallback((name: string) => {
      return PAGE_VARIABLES.find((v) => v.name === name);
    }, []),
  };
}

export { ExpressionPreview, ExpressionTester };
export default PageExpressionHelper;
