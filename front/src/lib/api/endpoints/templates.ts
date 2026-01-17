/**
 * Template Management API Endpoints
 * Aligned with backend PDFBuilder.API.Controllers.TemplateController
 */

import { api } from "../client";
import type {
  TemplateDto,
  TemplateResponse,
  TemplateListResponse,
  DeleteTemplateResponse,
  SaveTemplateRequest,
  UpdateTemplateRequest,
  DuplicateTemplateRequest,
  PaginationParams,
} from "@/types/api";

/**
 * Template API base URL
 */
const TEMPLATE_BASE = "/api/template";

/**
 * Template filter parameters
 */
export interface TemplateFilterParams extends PaginationParams {
  /** Search term to filter by name or description */
  search?: string;
  /** Category to filter by */
  category?: string;
  /** Tags to filter by (comma-separated) */
  tags?: string;
  /** Filter by active status */
  isActive?: boolean;
  /** Sort in descending order */
  sortDescending?: boolean;
}

/**
 * Template API
 */
export const templateApi = {
  /**
   * Get a paginated list of all templates
   * GET /api/template
   *
   * @param params - Filter and pagination parameters
   * @returns Paginated list of template summaries
   */
  getAll: async (
    params?: TemplateFilterParams
  ): Promise<TemplateListResponse> => {
    const queryParams = new URLSearchParams();

    if (params?.search) queryParams.append("search", params.search);
    if (params?.category) queryParams.append("category", params.category);
    if (params?.tags) queryParams.append("tags", params.tags);
    if (params?.isActive !== undefined)
      queryParams.append("isActive", String(params.isActive));
    if (params?.page) queryParams.append("page", String(params.page));
    if (params?.pageSize)
      queryParams.append("pageSize", String(params.pageSize));
    if (params?.sortBy) queryParams.append("sortBy", params.sortBy);
    if (params?.sortDescending !== undefined)
      queryParams.append("sortDescending", String(params.sortDescending));

    const queryString = queryParams.toString();
    const url = queryString ? `${TEMPLATE_BASE}?${queryString}` : TEMPLATE_BASE;

    return api.get<TemplateListResponse>(url);
  },

  /**
   * Get a single template by ID with full layout
   * GET /api/template/{id}
   *
   * @param id - Template ID
   * @returns Full template data including layout
   */
  getById: async (id: string): Promise<TemplateResponse> => {
    return api.get<TemplateResponse>(`${TEMPLATE_BASE}/${id}`);
  },

  /**
   * Create a new template
   * POST /api/template
   *
   * @param request - Template creation request
   * @returns Created template data
   */
  create: async (request: SaveTemplateRequest): Promise<TemplateResponse> => {
    return api.post<TemplateResponse>(TEMPLATE_BASE, request);
  },

  /**
   * Update an existing template
   * PUT /api/template/{id}
   *
   * @param id - Template ID
   * @param request - Template update request
   * @returns Updated template data
   */
  update: async (
    id: string,
    request: UpdateTemplateRequest
  ): Promise<TemplateResponse> => {
    return api.put<TemplateResponse>(`${TEMPLATE_BASE}/${id}`, request);
  },

  /**
   * Partially update an existing template
   * PATCH /api/template/{id}
   *
   * @param id - Template ID
   * @param request - Partial template update request
   * @returns Updated template data
   */
  patch: async (
    id: string,
    request: Partial<UpdateTemplateRequest>
  ): Promise<TemplateResponse> => {
    return api.patch<TemplateResponse>(`${TEMPLATE_BASE}/${id}`, request);
  },

  /**
   * Delete a template
   * DELETE /api/template/{id}
   *
   * @param id - Template ID
   * @returns Deletion confirmation
   */
  delete: async (id: string): Promise<DeleteTemplateResponse> => {
    return api.delete<DeleteTemplateResponse>(`${TEMPLATE_BASE}/${id}`);
  },

  /**
   * Duplicate a template
   * POST /api/template/{id}/duplicate
   *
   * @param id - Template ID to duplicate
   * @param request - Duplication options
   * @returns New duplicated template
   */
  duplicate: async (
    id: string,
    request?: DuplicateTemplateRequest
  ): Promise<TemplateResponse> => {
    return api.post<TemplateResponse>(
      `${TEMPLATE_BASE}/${id}/duplicate`,
      request || {}
    );
  },

  /**
   * Export a template as JSON
   * GET /api/template/{id}/export
   *
   * @param id - Template ID
   * @returns Template data as downloadable JSON
   */
  export: async (id: string): Promise<TemplateDto> => {
    return api.get<TemplateDto>(`${TEMPLATE_BASE}/${id}/export`);
  },

  /**
   * Export and download template as JSON file
   * GET /api/template/{id}/export
   *
   * @param id - Template ID
   * @param filename - Optional filename
   */
  exportAndDownload: async (id: string, filename?: string): Promise<void> => {
    const template = await templateApi.export(id);
    const blob = new Blob([JSON.stringify(template, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || `${template.name || "template"}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Import a template from JSON
   * POST /api/template/import
   *
   * @param templateJson - Template JSON data
   * @returns Imported template
   */
  import: async (templateJson: TemplateDto): Promise<TemplateResponse> => {
    return api.post<TemplateResponse>(`${TEMPLATE_BASE}/import`, templateJson);
  },

  /**
   * Get all template categories
   * GET /api/template/categories
   *
   * @returns List of unique categories
   */
  getCategories: async (): Promise<string[]> => {
    return api.get<string[]>(`${TEMPLATE_BASE}/categories`);
  },

  /**
   * Get all template tags
   * GET /api/template/tags
   *
   * @returns List of unique tags
   */
  getTags: async (): Promise<string[]> => {
    return api.get<string[]>(`${TEMPLATE_BASE}/tags`);
  },
};

export default templateApi;
