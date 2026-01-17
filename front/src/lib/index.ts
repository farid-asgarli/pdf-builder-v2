/**
 * Library exports
 */
export { cn } from "./utils";
export { api, apiClient, ApiError } from "./api";
export * from "./constants";
export * from "./schema";

// Canvas utilities - explicitly export to avoid conflicts with schema
export {
  traverseTree,
  flattenTree,
  findNodeById,
  findNodeByPath,
  findParentNode,
  getAncestorIds,
  getDescendantIds,
  countTreeNodes,
  getTreeMaxDepth,
  cloneNode,
  cloneNodeWithNewIds,
  updateNode,
  updateNodeProperties,
  deleteNode,
  addChildNode,
  setWrapperChild,
  moveNode,
  canAcceptChildren,
  wouldCreateCycle,
  generateNodeId,
} from "./canvas";

// DnD utilities
export {
  getDropZonePosition,
  calculateInsertionPosition,
  validateDrop,
  isValidDropPosition,
  getDropValidationMessage,
  createDropZoneInfo,
  acceptsMultipleChildren,
  acceptsChildren,
  getDropIndicatorStyle,
  createPaletteDragData,
  createTreeDragData,
  extractDragItem,
  type DropZonePosition,
  type DragItem,
  type InsertionInfo,
} from "./canvas";
