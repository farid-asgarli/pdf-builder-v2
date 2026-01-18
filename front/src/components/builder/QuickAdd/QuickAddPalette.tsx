/**
 * QuickAddPalette
 * A command palette for quickly adding components to the canvas
 *
 * Features:
 * - Opens with Ctrl+/ keyboard shortcut
 * - Fuzzy search across all components
 * - Keyboard navigation (arrows, enter, escape)
 * - Shows component category and description
 * - Recently used components
 * - Quick shortcuts for common components
 */
"use client";

import { useState, useCallback, useMemo, useEffect, useRef, memo } from "react";
import { createPortal } from "react-dom";
import { Search, Clock, Command, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ComponentType,
  type ComponentMetadata,
  type ComponentCategory as CategoryType,
} from "@/types/component";
import { COMPONENT_REGISTRY } from "@/lib/constants/components";
import { getCategoryMetadata } from "@/lib/constants/categories";
import { COMPONENT_ICONS } from "@/lib/constants/icons";
import { useCanvasStore } from "@/store/canvas-store";
import { useSelectionStore } from "@/store/selection-store";
import { useHistoryStore } from "@/store/history-store";

// ============================================================================
// Types
// ============================================================================

export interface QuickAddPaletteProps {
  /** Whether the palette is open */
  isOpen: boolean;
  /** Callback when the palette should close */
  onClose: () => void;
  /** Callback when a component is added */
  onComponentAdded?: (componentType: ComponentType) => void;
  /** Target container ID to add components to (defaults to selected or root) */
  targetContainerId?: string;
  /** Additional CSS classes */
  className?: string;
}

interface QuickAddItem {
  type: ComponentType;
  metadata: ComponentMetadata;
  category: CategoryType;
  score: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Local storage key for recently used components */
const RECENT_COMPONENTS_KEY = "pdf-builder:recent-components";
const MAX_RECENT_COMPONENTS = 5;

/** Quick shortcuts for common components (shown at top) */
const QUICK_SHORTCUTS: { type: ComponentType; shortcut: string }[] = [
  { type: ComponentType.Column, shortcut: "c" },
  { type: ComponentType.Row, shortcut: "r" },
  { type: ComponentType.Text, shortcut: "t" },
  { type: ComponentType.Image, shortcut: "i" },
  { type: ComponentType.Table, shortcut: "b" },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Simple fuzzy match scoring
 */
function fuzzyMatch(query: string, text: string): number {
  const normalizedQuery = query.toLowerCase().trim();
  const normalizedText = text.toLowerCase();

  if (!normalizedQuery) return 1;
  if (normalizedText === normalizedQuery) return 100;
  if (normalizedText.startsWith(normalizedQuery)) return 80;
  if (normalizedText.includes(normalizedQuery)) return 60;

  // Character-by-character fuzzy match
  let queryIndex = 0;
  let score = 0;
  let consecutiveMatches = 0;

  for (
    let i = 0;
    i < normalizedText.length && queryIndex < normalizedQuery.length;
    i++
  ) {
    if (normalizedText[i] === normalizedQuery[queryIndex]) {
      score += 10 + consecutiveMatches * 5;
      consecutiveMatches++;
      queryIndex++;
    } else {
      consecutiveMatches = 0;
    }
  }

  return queryIndex === normalizedQuery.length ? score : 0;
}

/**
 * Load recently used components from localStorage
 */
function loadRecentComponents(): ComponentType[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_COMPONENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save recently used component to localStorage
 */
function saveRecentComponent(type: ComponentType): void {
  if (typeof window === "undefined") return;
  try {
    const recent = loadRecentComponents().filter((t) => t !== type);
    recent.unshift(type);
    localStorage.setItem(
      RECENT_COMPONENTS_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT_COMPONENTS))
    );
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Generate a unique node ID
 */
function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get color for category
 */
function getCategoryColor(category: CategoryType): string {
  const categoryMeta = getCategoryMetadata(category);
  return categoryMeta.color || "#64748b";
}

// ============================================================================
// Sub-Components
// ============================================================================

interface QuickAddItemRowProps {
  item: QuickAddItem;
  isSelected: boolean;
  shortcut?: string;
  onSelect: () => void;
  onHover: () => void;
}

/**
 * Renders icon for a component type
 * Extracted as a separate component to satisfy React Compiler requirements
 */
function ComponentIcon({
  type,
  color,
}: {
  type: ComponentType;
  color: string;
}) {
  const Icon = COMPONENT_ICONS[type];
  if (!Icon) return null;
  return <Icon className="h-4 w-4" style={{ color }} />;
}

const QuickAddItemRow = memo(function QuickAddItemRow({
  item,
  isSelected,
  shortcut,
  onSelect,
  onHover,
}: QuickAddItemRowProps) {
  const categoryMeta = getCategoryMetadata(item.category);
  const categoryColor = getCategoryColor(item.category);

  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
        isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
      )}
      onClick={onSelect}
      onMouseEnter={onHover}
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded"
        style={{
          backgroundColor: `color-mix(in srgb, ${categoryColor} 15%, transparent)`,
        }}
      >
        <ComponentIcon type={item.type} color={categoryColor} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{item.metadata.name}</span>
          <Badge variant="outline" className="px-1 py-0 text-[10px]">
            {categoryMeta.label}
          </Badge>
        </div>
        <p className="text-muted-foreground truncate text-xs">
          {item.metadata.description}
        </p>
      </div>
      {shortcut && (
        <kbd className="bg-muted text-muted-foreground shrink-0 rounded border px-1.5 py-0.5 font-mono text-xs">
          {shortcut}
        </kbd>
      )}
      {isSelected && (
        <CornerDownLeft className="text-muted-foreground h-4 w-4 shrink-0" />
      )}
    </button>
  );
});

// ============================================================================
// Main Component
// ============================================================================

/**
 * QuickAddPalette - Command palette for quickly adding components
 *
 * @example
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 *
 * // Open with Ctrl+/
 * useEffect(() => {
 *   const handler = (e: KeyboardEvent) => {
 *     if ((e.ctrlKey || e.metaKey) && e.key === '/') {
 *       e.preventDefault();
 *       setIsOpen(true);
 *     }
 *   };
 *   window.addEventListener('keydown', handler);
 *   return () => window.removeEventListener('keydown', handler);
 * }, []);
 *
 * return (
 *   <QuickAddPalette
 *     isOpen={isOpen}
 *     onClose={() => setIsOpen(false)}
 *   />
 * );
 * ```
 */
export function QuickAddPalette({
  isOpen,
  onClose,
  onComponentAdded,
  targetContainerId,
  className,
}: QuickAddPaletteProps) {
  // Refs
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Initialize state with function to avoid re-running loadRecentComponents
  const [recentComponents, setRecentComponents] = useState<ComponentType[]>(
    () => loadRecentComponents()
  );
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Store hooks
  const root = useCanvasStore((state) => state.root);
  const addComponent = useCanvasStore((state) => state.addComponent);
  const getComponent = useCanvasStore((state) => state.getComponent);
  const selectedIds = useSelectionStore((state) => state.selectedIds);
  const select = useSelectionStore((state) => state.select);
  const pushState = useHistoryStore((state) => state.pushState);

  // Focus input when opened and reset state
  useEffect(() => {
    if (isOpen) {
      // Use timeout to ensure DOM is ready
      const timer = setTimeout(() => {
        setQuery("");
        setSelectedIndex(0);
        inputRef.current?.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Get all components with search scoring
  const allItems = useMemo<QuickAddItem[]>(() => {
    const items: QuickAddItem[] = [];

    for (const [typeKey, metadata] of Object.entries(COMPONENT_REGISTRY)) {
      const type = typeKey as ComponentType;
      const category = metadata.category;

      // Calculate search score
      const nameScore = fuzzyMatch(query, metadata.name);
      const descScore = fuzzyMatch(query, metadata.description) * 0.5;
      const typeScore = fuzzyMatch(query, type) * 0.3;
      const score = Math.max(nameScore, descScore, typeScore);

      if (!query || score > 0) {
        items.push({
          type,
          metadata,
          category,
          score,
        });
      }
    }

    return items;
  }, [query]);

  // Sort items: recent first, then by score, then alphabetically
  const sortedItems = useMemo(() => {
    const recentSet = new Set(recentComponents);

    return [...allItems].sort((a, b) => {
      // Recent items first (only when no query)
      if (!query) {
        const aRecent = recentSet.has(a.type);
        const bRecent = recentSet.has(b.type);
        if (aRecent && !bRecent) return -1;
        if (!aRecent && bRecent) return 1;
        if (aRecent && bRecent) {
          return (
            recentComponents.indexOf(a.type) - recentComponents.indexOf(b.type)
          );
        }
      }

      // Then by score
      if (b.score !== a.score) return b.score - a.score;

      // Then alphabetically
      return a.metadata.name.localeCompare(b.metadata.name);
    });
  }, [allItems, query, recentComponents]);

  // Group items for display
  const groupedItems = useMemo(() => {
    if (query) {
      // When searching, show flat list
      return { results: sortedItems.slice(0, 20) };
    }

    // When not searching, group by category with recent at top
    const recent = sortedItems.filter((item) =>
      recentComponents.includes(item.type)
    );
    const byCategory: Record<string, QuickAddItem[]> = {};

    for (const item of sortedItems) {
      if (!recentComponents.includes(item.type)) {
        const category = item.category;
        if (!byCategory[category]) {
          byCategory[category] = [];
        }
        byCategory[category].push(item);
      }
    }

    return { recent, byCategory };
  }, [sortedItems, query, recentComponents]);

  // Flat list for keyboard navigation
  const flatItems = useMemo((): QuickAddItem[] => {
    if ("results" in groupedItems && groupedItems.results) {
      return groupedItems.results;
    }

    const items: QuickAddItem[] = [];
    if (groupedItems.recent) {
      items.push(...groupedItems.recent);
    }
    for (const category of Object.values(groupedItems.byCategory || {})) {
      items.push(...category);
    }
    return items;
  }, [groupedItems]);

  // Find shortcut for item
  const getShortcut = useCallback(
    (type: ComponentType): string | undefined => {
      if (query) return undefined;
      const shortcut = QUICK_SHORTCUTS.find((s) => s.type === type);
      return shortcut?.shortcut;
    },
    [query]
  );

  // Handle component selection
  const handleSelectComponent = useCallback(
    (type: ComponentType) => {
      const metadata = COMPONENT_REGISTRY[type];
      if (!metadata) return;

      // Determine target container
      let targetId = targetContainerId;
      if (!targetId && selectedIds.length > 0) {
        const selectedNode = getComponent(selectedIds[0]);
        if (selectedNode) {
          // If selected node is a container, add to it; otherwise add to its parent
          const isContainer = metadata.allowsChildren;
          if (isContainer) {
            targetId = selectedIds[0];
          } else {
            // Find parent - for now, use root
            targetId = root?.id;
          }
        }
      }
      if (!targetId) {
        targetId = root?.id;
      }

      if (!targetId) {
        // No target - can't add component
        onClose();
        return;
      }

      // Push state for undo
      if (root) {
        pushState(root, { action: `Add ${metadata.name}` });
      }

      // Create the new component node
      const newNode = {
        id: generateNodeId(),
        type,
        properties: { ...metadata.defaultProperties },
        children: metadata.allowsChildren ? [] : undefined,
      };

      // Add the component
      const result = addComponent(targetId, newNode);

      if (result.success && result.nodeId) {
        // Select the new component
        select(result.nodeId);

        // Update recent components
        saveRecentComponent(type);
        setRecentComponents((prev) => {
          const updated = [type, ...prev.filter((t) => t !== type)];
          return updated.slice(0, MAX_RECENT_COMPONENTS);
        });

        // Notify parent
        onComponentAdded?.(type);
      }

      onClose();
    },
    [
      targetContainerId,
      selectedIds,
      getComponent,
      root,
      pushState,
      addComponent,
      select,
      onComponentAdded,
      onClose,
    ]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, (flatItems.length || 1) - 1)
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (flatItems[selectedIndex]) {
            handleSelectComponent(flatItems[selectedIndex].type);
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        default:
          // Check for quick shortcuts (single letter when no query)
          if (
            !query &&
            e.key.length === 1 &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.altKey
          ) {
            const shortcut = QUICK_SHORTCUTS.find(
              (s) => s.shortcut.toLowerCase() === e.key.toLowerCase()
            );
            if (shortcut) {
              e.preventDefault();
              handleSelectComponent(shortcut.type);
            }
          }
      }
    },
    [flatItems, selectedIndex, handleSelectComponent, onClose, query]
  );

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      selectedEl?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Handle query change - also reset selection
  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      setSelectedIndex(0);
    },
    []
  );

  // Don't render if not open
  if (!isOpen) return null;

  // Render portal
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette */}
      <div
        className={cn(
          "bg-popover text-popover-foreground relative w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl",
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Quick add component"
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="text-muted-foreground h-5 w-5 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search components... (or press a shortcut key)"
            className="placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
          />
          {!query && (
            <div className="text-muted-foreground flex items-center gap-1 text-xs">
              <kbd className="bg-muted rounded border px-1.5 py-0.5 font-mono text-[10px]">
                esc
              </kbd>
              <span>to close</span>
            </div>
          )}
        </div>

        {/* Quick shortcuts hint */}
        {!query && (
          <div className="border-b px-4 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs">Quick add:</span>
              {QUICK_SHORTCUTS.map(({ type, shortcut }) => {
                const meta = COMPONENT_REGISTRY[type];
                return (
                  <button
                    key={type}
                    type="button"
                    className="bg-muted hover:bg-accent flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors"
                    onClick={() => handleSelectComponent(type)}
                  >
                    <kbd className="font-mono font-medium">{shortcut}</kbd>
                    <span>{meta.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Results */}
        <ScrollArea className="max-h-80">
          <div ref={listRef} className="p-2">
            {"results" in groupedItems && groupedItems.results ? (
              // Search results
              groupedItems.results.length > 0 ? (
                groupedItems.results.map((item, index) => (
                  <div key={item.type} data-index={index}>
                    <QuickAddItemRow
                      item={item}
                      isSelected={selectedIndex === index}
                      shortcut={getShortcut(item.type)}
                      onSelect={() => handleSelectComponent(item.type)}
                      onHover={() => setSelectedIndex(index)}
                    />
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground py-8 text-center text-sm">
                  No components found for &quot;{query}&quot;
                </div>
              )
            ) : (
              // Grouped view
              <>
                {/* Recent */}
                {groupedItems.recent && groupedItems.recent.length > 0 && (
                  <div className="mb-2">
                    <div className="text-muted-foreground mb-1 flex items-center gap-1.5 px-3 text-xs font-medium tracking-wide uppercase">
                      <Clock className="h-3 w-3" />
                      Recent
                    </div>
                    {groupedItems.recent.map((item) => {
                      const index = flatItems.indexOf(item);
                      return (
                        <div key={item.type} data-index={index}>
                          <QuickAddItemRow
                            item={item}
                            isSelected={selectedIndex === index}
                            shortcut={getShortcut(item.type)}
                            onSelect={() => handleSelectComponent(item.type)}
                            onHover={() => setSelectedIndex(index)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Categories */}
                {Object.entries(groupedItems.byCategory || {}).map(
                  ([category, items]) => {
                    const categoryMeta = getCategoryMetadata(
                      category as CategoryType
                    );
                    return (
                      <div key={category} className="mb-2">
                        <div className="text-muted-foreground mb-1 px-3 text-xs font-medium tracking-wide uppercase">
                          {categoryMeta.label}
                        </div>
                        {items.slice(0, 5).map((item) => {
                          const index = flatItems.indexOf(item);
                          return (
                            <div key={item.type} data-index={index}>
                              <QuickAddItemRow
                                item={item}
                                isSelected={selectedIndex === index}
                                shortcut={getShortcut(item.type)}
                                onSelect={() =>
                                  handleSelectComponent(item.type)
                                }
                                onHover={() => setSelectedIndex(index)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                )}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="text-muted-foreground flex items-center justify-between border-t px-4 py-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-muted rounded border px-1 py-0.5 font-mono text-[10px]">
                ↑↓
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-muted rounded border px-1 py-0.5 font-mono text-[10px]">
                ↵
              </kbd>
              select
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Command className="h-3 w-3" />
            <span>+</span>
            <kbd className="bg-muted rounded border px-1 py-0.5 font-mono text-[10px]">
              /
            </kbd>
            <span>to open</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default QuickAddPalette;
