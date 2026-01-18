/**
 * MonacoExpressionEditor Component
 * Monaco-based editor for expression syntax with {{ }} highlighting
 *
 * Features:
 * - Custom syntax highlighting for {{ expression }} syntax
 * - Hierarchical autocomplete for data fields
 * - Inline validation and error display with markers
 * - Single-line and multi-line modes
 * - Light and dark theme support
 * - Real-time two-way binding with debounce
 */
"use client";

import { useRef, useCallback, useEffect, useState, useMemo, memo } from "react";
import Editor, { type OnMount, type BeforeMount } from "@monaco-editor/react";
import type { editor, IDisposable } from "monaco-editor";
import { cn } from "@/lib/utils";
import { monacoConfig } from "@/config/monaco";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { validateExpressions } from "./ExpressionValidator";
import {
  registerExpressionAutocomplete,
  registerExpressionHoverProvider,
  extractDataFieldsFromSampleData,
} from "./ExpressionAutocomplete";
import type { EditingMode } from "@/types";

// ============================================================================
// Types
// ============================================================================

/**
 * Monaco editor instance type
 */
type MonacoEditor = editor.IStandaloneCodeEditor;

/**
 * Monaco module type - using Parameters utility to extract the type
 */
type Monaco = Parameters<BeforeMount>[0];

/**
 * Data field for autocomplete
 */
export interface DataField {
  /** Field path (e.g., "customer.name") */
  path: string;
  /** Display label */
  label: string;
  /** Field type for display */
  type: "string" | "number" | "boolean" | "array" | "object" | "date";
  /** Optional description */
  description?: string;
}

/**
 * Expression validation error
 */
export interface ExpressionError {
  /** Error message */
  message: string;
  /** Start position in the expression */
  startColumn: number;
  /** End position in the expression */
  endColumn: number;
  /** Line number (1-based) */
  lineNumber: number;
}

/**
 * Props for MonacoExpressionEditor component
 */
export interface MonacoExpressionEditorProps {
  /** Current value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Optional field label */
  label?: string;
  /** Placeholder text when empty */
  placeholder?: string;
  /** Whether the editor is disabled */
  disabled?: boolean;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Whether to use single-line mode (default: false) */
  singleLine?: boolean;
  /** Height of the editor in pixels (default: 100 for multi-line, 36 for single-line) */
  height?: number;
  /** Available data fields for autocomplete */
  dataFields?: DataField[];
  /** Sample data object to extract fields from (alternative to dataFields) */
  sampleData?: Record<string, unknown>;
  /**
   * Current editing mode - affects page variable autocomplete priority
   * Page variables like currentPage/totalPages are prioritized in header/footer mode
   */
  editingMode?: EditingMode;
  /** Whether to include page context variables in autocomplete (default: true) */
  includePageVariables?: boolean;
  /** Custom validation function */
  validate?: (value: string) => ExpressionError[];
  /** Whether to use built-in expression validation (default: true) */
  useBuiltinValidation?: boolean;
  /** External validation errors to display */
  errors?: ExpressionError[];
  /** Callback when validation state changes */
  onValidation?: (errors: ExpressionError[], warnings: string[]) => void;
  /** Whether to show inline error markers in the editor (default: true) */
  showInlineErrors?: boolean;
  /** Debounce delay in ms (default: 150) */
  debounceDelay?: number;
  /** Additional CSS classes for the container */
  className?: string;
  /** ID for accessibility */
  id?: string;
  /** Help text shown below the editor */
  helpText?: string;
  /** Theme override: 'light' | 'dark' | 'auto' */
  theme?: "light" | "dark" | "auto";
  /** Callback when editor is mounted */
  onMount?: (editor: MonacoEditor, monaco: Monaco) => void;
  /** Callback when editor is focused */
  onFocus?: () => void;
  /** Callback when editor is blurred */
  onBlur?: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const LANGUAGE_ID = "pdf-expression";
const DEFAULT_DEBOUNCE_DELAY = 150;
const SINGLE_LINE_HEIGHT = 36;
const MULTI_LINE_HEIGHT = 100;

/**
 * Token types for expression syntax highlighting
 */
const TOKEN_TYPES = {
  EXPRESSION_DELIMITER: "expression.delimiter",
  EXPRESSION_CONTENT: "expression.content",
  EXPRESSION_FIELD: "expression.field",
  EXPRESSION_OPERATOR: "expression.operator",
  EXPRESSION_STRING: "expression.string",
  EXPRESSION_NUMBER: "expression.number",
  TEXT: "text",
} as const;

// ============================================================================
// Language Registration
// ============================================================================

let languageRegistered = false;
const disposables: IDisposable[] = [];

/**
 * Register the custom expression language with Monaco
 */
function registerExpressionLanguage(monaco: Monaco): void {
  if (languageRegistered) return;

  // Register the language
  monaco.languages.register({ id: LANGUAGE_ID });

  // Define token provider for syntax highlighting
  const tokenProvider = monaco.languages.setMonarchTokensProvider(LANGUAGE_ID, {
    defaultToken: "text",

    // Expression delimiters
    brackets: [{ open: "{{", close: "}}", token: "expression.delimiter" }],

    // Token patterns
    tokenizer: {
      root: [
        // Match expression blocks {{ ... }}
        [
          /\{\{/,
          { token: TOKEN_TYPES.EXPRESSION_DELIMITER, next: "@expression" },
        ],
        // Everything else is plain text
        [/[^{]+/, TOKEN_TYPES.TEXT],
        [/\{(?!\{)/, TOKEN_TYPES.TEXT],
      ],

      expression: [
        // End of expression
        [/\}\}/, { token: TOKEN_TYPES.EXPRESSION_DELIMITER, next: "@root" }],
        // String literals in expressions
        [/"[^"]*"/, TOKEN_TYPES.EXPRESSION_STRING],
        [/'[^']*'/, TOKEN_TYPES.EXPRESSION_STRING],
        // Numbers
        [/\d+(\.\d+)?/, TOKEN_TYPES.EXPRESSION_NUMBER],
        // Operators
        [/[+\-*/%=<>!&|?:]+/, TOKEN_TYPES.EXPRESSION_OPERATOR],
        // Field paths (identifiers with dots)
        [
          /[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*/,
          TOKEN_TYPES.EXPRESSION_FIELD,
        ],
        // Parentheses and brackets
        [/[[\]()]/, TOKEN_TYPES.EXPRESSION_CONTENT],
        // Commas and other punctuation
        [/[,;]/, TOKEN_TYPES.EXPRESSION_CONTENT],
        // Whitespace
        [/\s+/, TOKEN_TYPES.EXPRESSION_CONTENT],
        // Catch-all for other characters in expression
        [/./, TOKEN_TYPES.EXPRESSION_CONTENT],
      ],
    },
  });

  disposables.push(tokenProvider);
  languageRegistered = true;
}

/**
 * Define custom theme rules for expression highlighting
 */
function defineExpressionThemes(monaco: Monaco): void {
  // Light theme
  monaco.editor.defineTheme("expression-light", {
    base: "vs",
    inherit: true,
    rules: [
      {
        token: TOKEN_TYPES.EXPRESSION_DELIMITER,
        foreground: "0969DA",
        fontStyle: "bold",
      },
      { token: TOKEN_TYPES.EXPRESSION_FIELD, foreground: "8250DF" },
      { token: TOKEN_TYPES.EXPRESSION_OPERATOR, foreground: "CF222E" },
      { token: TOKEN_TYPES.EXPRESSION_STRING, foreground: "0A3069" },
      { token: TOKEN_TYPES.EXPRESSION_NUMBER, foreground: "0550AE" },
      { token: TOKEN_TYPES.EXPRESSION_CONTENT, foreground: "24292F" },
      { token: TOKEN_TYPES.TEXT, foreground: "24292F" },
    ],
    colors: {
      "editor.background": "#FFFFFF",
      "editor.foreground": "#24292F",
      "editor.lineHighlightBackground": "#F6F8FA",
      "editorCursor.foreground": "#24292F",
      "editor.selectionBackground": "#0969DA33",
    },
  });

  // Dark theme
  monaco.editor.defineTheme("expression-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      {
        token: TOKEN_TYPES.EXPRESSION_DELIMITER,
        foreground: "79C0FF",
        fontStyle: "bold",
      },
      { token: TOKEN_TYPES.EXPRESSION_FIELD, foreground: "D2A8FF" },
      { token: TOKEN_TYPES.EXPRESSION_OPERATOR, foreground: "FF7B72" },
      { token: TOKEN_TYPES.EXPRESSION_STRING, foreground: "A5D6FF" },
      { token: TOKEN_TYPES.EXPRESSION_NUMBER, foreground: "79C0FF" },
      { token: TOKEN_TYPES.EXPRESSION_CONTENT, foreground: "C9D1D9" },
      { token: TOKEN_TYPES.TEXT, foreground: "C9D1D9" },
    ],
    colors: {
      "editor.background": "#0D1117",
      "editor.foreground": "#C9D1D9",
      "editor.lineHighlightBackground": "#161B22",
      "editorCursor.foreground": "#C9D1D9",
      "editor.selectionBackground": "#388BFD33",
    },
  });
}

// Note: Autocomplete is now handled by ExpressionAutocomplete module
// using registerExpressionAutocomplete and registerExpressionHoverProvider

// ============================================================================
// Component
// ============================================================================

/**
 * MonacoExpressionEditor - Monaco-based editor for expression syntax
 */
export const MonacoExpressionEditor = memo(function MonacoExpressionEditor({
  value,
  onChange,
  label,
  placeholder,
  disabled = false,
  readOnly = false,
  singleLine = false,
  height,
  dataFields = [],
  sampleData,
  editingMode = "content",
  includePageVariables = true,
  validate,
  useBuiltinValidation = true,
  errors: externalErrors = [],
  onValidation,
  showInlineErrors = true,
  debounceDelay = DEFAULT_DEBOUNCE_DELAY,
  className,
  id,
  helpText,
  theme = "auto",
  onMount,
  onFocus,
  onBlur,
}: MonacoExpressionEditorProps) {
  // Refs
  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completionProviderRef = useRef<IDisposable | null>(null);
  const hoverProviderRef = useRef<IDisposable | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const markersRef = useRef<string>("");

  // State
  const [isFocused, setIsFocused] = useState(false);
  const [internalErrors, setInternalErrors] = useState<ExpressionError[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Compute effective height
  const effectiveHeight =
    height ?? (singleLine ? SINGLE_LINE_HEIGHT : MULTI_LINE_HEIGHT);

  // Merge data fields from props and extract from sample data
  const effectiveDataFields = useMemo(() => {
    const fieldsFromSample = sampleData
      ? extractDataFieldsFromSampleData(sampleData)
      : [];
    // Merge, preferring explicit dataFields over extracted ones
    const fieldMap = new Map<string, DataField>();
    for (const field of fieldsFromSample) {
      fieldMap.set(field.path, field);
    }
    for (const field of dataFields) {
      fieldMap.set(field.path, field);
    }
    return Array.from(fieldMap.values());
  }, [dataFields, sampleData]);

  // Combine internal and external errors
  const allErrors = useMemo(
    () => [...internalErrors, ...externalErrors],
    [internalErrors, externalErrors]
  );

  // Detect system theme
  const resolvedTheme = useMemo(() => {
    if (theme !== "auto") return theme;
    // Default to light if we can't detect
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }, [theme]);

  // Monaco theme name
  const monacoTheme =
    resolvedTheme === "dark" ? "expression-dark" : "expression-light";

  // Editor options
  const editorOptions = useMemo(
    (): editor.IStandaloneEditorConstructionOptions => ({
      ...monacoConfig.defaultOptions,
      readOnly: disabled || readOnly,
      wordWrap: singleLine ? "off" : "on",
      lineNumbers: "off",
      scrollbar: {
        vertical: singleLine ? "hidden" : "auto",
        horizontal: "hidden",
        verticalScrollbarSize: 8,
      },
      minimap: { enabled: false },
      folding: false,
      glyphMargin: false,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 0,
      renderLineHighlight: "none",
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
      contextmenu: false,
      quickSuggestions: {
        other: true,
        strings: true,
        comments: false,
      },
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: singleLine ? "off" : "on",
      tabCompletion: "on",
      wordBasedSuggestions: "off",
      // Disable line breaks in single-line mode
      find: {
        addExtraSpaceOnTop: false,
        autoFindInSelection: "never",
        seedSearchStringFromSelection: "never",
      },
    }),
    [disabled, readOnly, singleLine]
  );

  // Generate unique ID
  const fieldId =
    id ??
    `monaco-expression-${label?.toLowerCase().replace(/\s+/g, "-") ?? "editor"}`;

  /**
   * Handle editor mount
   */
  const handleEditorDidMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Store model URI for markers
      const model = editor.getModel();
      if (model) {
        markersRef.current = model.uri.toString();
      }

      // Register enhanced autocomplete provider for data fields and page variables
      // Always register since page variables should be available even without data fields
      if (effectiveDataFields.length > 0 || includePageVariables) {
        completionProviderRef.current = registerExpressionAutocomplete(
          monaco,
          LANGUAGE_ID,
          {
            dataFields: effectiveDataFields,
            includeBuiltinFunctions: true,
            includePageVariables,
            editingMode,
            triggerCharacters: [".", "{"],
          }
        );

        // Register hover provider for field documentation
        hoverProviderRef.current = registerExpressionHoverProvider(
          monaco,
          LANGUAGE_ID,
          effectiveDataFields
        );
      }

      // Handle single-line mode: prevent Enter key from creating new lines
      if (singleLine) {
        editor.addAction({
          id: "prevent-newline",
          label: "Prevent Newline",
          keybindings: [monaco.KeyCode.Enter],
          run: () => {
            // Don't insert a newline, do nothing
          },
        });
      }

      // Focus and blur handlers
      editor.onDidFocusEditorWidget(() => {
        setIsFocused(true);
        onFocus?.();
      });

      editor.onDidBlurEditorWidget(() => {
        setIsFocused(false);
        onBlur?.();
      });

      // Call external onMount callback
      onMount?.(editor, monaco);
    },
    [
      effectiveDataFields,
      singleLine,
      includePageVariables,
      editingMode,
      onMount,
      onFocus,
      onBlur,
    ]
  );

  /**
   * Handle before mount - register language and themes
   */
  const handleBeforeMount: BeforeMount = useCallback((monaco) => {
    registerExpressionLanguage(monaco);
    defineExpressionThemes(monaco);
  }, []);

  /**
   * Handle value change with debounce
   */
  const handleChange = useCallback(
    (newValue: string | undefined) => {
      const valueToUse = newValue ?? "";

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        let validationErrors: ExpressionError[] = [];
        let validationWarnings: string[] = [];

        // Run built-in validation if enabled
        if (useBuiltinValidation) {
          const result = validateExpressions(valueToUse);
          validationErrors = result.errors;
          validationWarnings = result.warnings;
        }

        // Run custom validation if provided
        if (validate) {
          const customErrors = validate(valueToUse);
          validationErrors = [...validationErrors, ...customErrors];
        }

        setInternalErrors(validationErrors);
        setWarnings(validationWarnings);

        // Call validation callback if provided
        onValidation?.(validationErrors, validationWarnings);

        // Call onChange
        onChange(valueToUse);
      }, debounceDelay);
    },
    [onChange, debounceDelay, validate, useBuiltinValidation, onValidation]
  );

  /**
   * Update error decorations and markers in the editor
   */
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor.getModel();

    if (!model) return;

    // Only show inline errors if enabled
    if (!showInlineErrors) {
      // Clear any existing markers and decorations
      monaco.editor.setModelMarkers(model, "expression-validator", []);
      decorationsRef.current = editor.deltaDecorations(
        decorationsRef.current,
        []
      );
      return;
    }

    // Create Monaco markers for proper error display in editor
    const markers: editor.IMarkerData[] = allErrors.map((error) => ({
      severity: monaco.MarkerSeverity.Error,
      message: error.message,
      startLineNumber: error.lineNumber,
      startColumn: error.startColumn,
      endLineNumber: error.lineNumber,
      endColumn: error.endColumn,
      source: "Expression Validator",
    }));

    // Set markers on the model
    monaco.editor.setModelMarkers(model, "expression-validator", markers);

    // Create decorations for visual highlighting (underlines)
    const decorations: editor.IModelDeltaDecoration[] = allErrors.map(
      (error) => ({
        range: new monaco.Range(
          error.lineNumber,
          error.startColumn,
          error.lineNumber,
          error.endColumn
        ),
        options: {
          inlineClassName: "expression-error-underline",
          hoverMessage: { value: `**Error:** ${error.message}` },
          className: "expression-error-background",
        },
      })
    );

    // Apply decorations
    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      decorations
    );
  }, [allErrors, showInlineErrors]);

  /**
   * Update completion and hover providers when data fields change
   */
  useEffect(() => {
    if (!monacoRef.current || effectiveDataFields.length === 0) return;

    // Dispose previous providers
    completionProviderRef.current?.dispose();
    hoverProviderRef.current?.dispose();

    // Register new autocomplete provider
    completionProviderRef.current = registerExpressionAutocomplete(
      monacoRef.current,
      LANGUAGE_ID,
      {
        dataFields: effectiveDataFields,
        includeBuiltinFunctions: true,
        triggerCharacters: [".", "{"],
      }
    );

    // Register new hover provider
    hoverProviderRef.current = registerExpressionHoverProvider(
      monacoRef.current,
      LANGUAGE_ID,
      effectiveDataFields
    );

    return () => {
      completionProviderRef.current?.dispose();
      hoverProviderRef.current?.dispose();
    };
  }, [effectiveDataFields]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      completionProviderRef.current?.dispose();
      hoverProviderRef.current?.dispose();

      // Clear markers on unmount
      if (editorRef.current && monacoRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          monacoRef.current.editor.setModelMarkers(
            model,
            "expression-validator",
            []
          );
        }
      }
    };
  }, []);

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Label */}
      {label && (
        <Label htmlFor={fieldId} className="text-sm font-medium">
          {label}
        </Label>
      )}

      {/* Editor container */}
      <div
        className={cn(
          "relative rounded-md border transition-colors",
          isFocused ? "border-ring ring-ring ring-1" : "border-input",
          disabled && "cursor-not-allowed opacity-50",
          allErrors.length > 0 && "border-destructive"
        )}
      >
        {/* Placeholder */}
        {placeholder && value === "" && !isFocused && (
          <div
            className={cn(
              "text-muted-foreground pointer-events-none absolute inset-0 flex items-center px-3",
              singleLine ? "text-sm" : "items-start pt-2 text-sm"
            )}
          >
            {placeholder}
          </div>
        )}

        {/* Monaco Editor */}
        <Editor
          height={effectiveHeight}
          language={LANGUAGE_ID}
          value={value}
          onChange={handleChange}
          onMount={handleEditorDidMount}
          beforeMount={handleBeforeMount}
          theme={monacoTheme}
          options={editorOptions}
          loading={
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              Loading editor...
            </div>
          }
        />
      </div>

      {/* Error messages with icon */}
      {allErrors.length > 0 && (
        <div className="space-y-1" role="alert" aria-live="polite">
          {allErrors.slice(0, 5).map((error, index) => (
            <div
              key={`${error.lineNumber}-${error.startColumn}-${index}`}
              className="text-destructive flex items-start gap-1.5 text-xs"
            >
              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                {!singleLine && (
                  <span className="text-muted-foreground">
                    Line {error.lineNumber}, Col {error.startColumn}:{" "}
                  </span>
                )}
                {error.message}
              </span>
            </div>
          ))}
          {allErrors.length > 5 && (
            <p className="text-muted-foreground text-xs">
              ...and {allErrors.length - 5} more error
              {allErrors.length - 5 > 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && allErrors.length === 0 && (
        <div className="space-y-1">
          {warnings.slice(0, 3).map((warning, index) => (
            <p
              key={`warning-${index}`}
              className="text-xs text-yellow-600 dark:text-yellow-500"
            >
              ⚠️ {warning}
            </p>
          ))}
        </div>
      )}

      {/* Help text */}
      {helpText && allErrors.length === 0 && warnings.length === 0 && (
        <p className="text-muted-foreground text-xs">{helpText}</p>
      )}
    </div>
  );
});

// ============================================================================
// Exports
// ============================================================================

export default MonacoExpressionEditor;

// Re-export validation utilities for external use
export {
  createExpressionValidator,
  validateExpressions,
  validateSingleExpression,
} from "./ExpressionValidator";
export { extractDataFieldsFromSampleData } from "./ExpressionAutocomplete";
