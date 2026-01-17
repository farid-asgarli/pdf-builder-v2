/**
 * Monaco Editor Configuration
 * Settings for the expression editor component
 */

export const monacoConfig = {
  /** Custom language ID for expression syntax */
  languageId: "pdf-expression",

  /** Default editor options */
  defaultOptions: {
    minimap: { enabled: false },
    lineNumbers: "off" as const,
    scrollBeyondLastLine: false,
    wordWrap: "on" as const,
    wrappingIndent: "indent" as const,
    folding: false,
    glyphMargin: false,
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 0,
    renderLineHighlight: "none" as const,
    scrollbar: {
      vertical: "auto" as const,
      horizontal: "hidden" as const,
      verticalScrollbarSize: 8,
    },
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    overviewRulerBorder: false,
    contextmenu: false,
    fontSize: 14,
    fontFamily: "var(--font-geist-mono), monospace",
    padding: { top: 8, bottom: 8 },
    automaticLayout: true,
  },

  /** Expression syntax pattern */
  expressionPattern: /\{\{([^}]+)\}\}/g,

  /** Default language for expressions */
  language: "javascript",

  /** Theme options */
  themes: {
    light: "expression-light",
    dark: "expression-dark",
  },

  /** Token types for syntax highlighting */
  tokenTypes: {
    expressionDelimiter: "expression.delimiter",
    expressionContent: "expression.content",
    expressionField: "expression.field",
    expressionOperator: "expression.operator",
    expressionString: "expression.string",
    expressionNumber: "expression.number",
    text: "text",
  },
} as const;

/**
 * Expression syntax helpers
 */
export const expressionHelpers = {
  /** Wrap a field path in expression syntax */
  wrap: (fieldPath: string): string => `{{ ${fieldPath} }}`,

  /** Extract field path from expression */
  unwrap: (expression: string): string | null => {
    const match = expression.match(/\{\{\s*([^}]+?)\s*\}\}/);
    return match ? match[1].trim() : null;
  },

  /** Check if a string contains expressions */
  hasExpressions: (text: string): boolean => {
    return monacoConfig.expressionPattern.test(text);
  },

  /** Extract all expressions from a string */
  extractAll: (text: string): string[] => {
    const matches = text.matchAll(monacoConfig.expressionPattern);
    return Array.from(matches, (m) => m[1].trim());
  },
};

export type MonacoConfig = typeof monacoConfig;
