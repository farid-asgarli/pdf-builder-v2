/**
 * PDF Generation API Endpoints
 * Aligned with backend PDFBuilder.API.Controllers.PdfController
 */

import { api } from "../client";
import type {
  GeneratePdfRequest,
  GenerateFromTemplateRequest,
  PdfGenerationResponse,
} from "@/types/api";

/**
 * PDF API base URL
 */
const PDF_BASE = "/api/pdf";

/**
 * PDF Generation API
 */
export const pdfApi = {
  /**
   * Generate PDF from JSON layout
   * POST /api/pdf/generate
   *
   * @param request - PDF generation request containing layout and data
   * @returns PDF generation response with PDF bytes or download URL
   */
  generate: async (
    request: GeneratePdfRequest
  ): Promise<PdfGenerationResponse> => {
    return api.post<PdfGenerationResponse>(`${PDF_BASE}/generate`, request);
  },

  /**
   * Generate PDF from JSON layout and download directly
   * POST /api/pdf/generate
   *
   * @param request - PDF generation request
   * @param filename - Filename for the downloaded PDF
   */
  generateAndDownload: async (
    request: GeneratePdfRequest,
    filename?: string
  ): Promise<void> => {
    const response = await api.post<PdfGenerationResponse>(
      `${PDF_BASE}/generate`,
      request
    );

    if (response.success && response.pdfBytes) {
      // Convert base64 to blob and download
      const byteCharacters = atob(response.pdfBytes);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename || response.filename || "document.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } else {
      throw new Error(response.errorMessage || "PDF generation failed");
    }
  },

  /**
   * Generate PDF from an existing template
   * POST /api/pdf/generate-from-template/{templateId}
   *
   * @param templateId - ID of the template to use
   * @param request - Generation request with data and overrides
   * @returns PDF generation response
   */
  generateFromTemplate: async (
    templateId: string,
    request: GenerateFromTemplateRequest
  ): Promise<PdfGenerationResponse> => {
    return api.post<PdfGenerationResponse>(
      `${PDF_BASE}/generate-from-template/${templateId}`,
      request
    );
  },

  /**
   * Generate PDF from template and download directly
   * POST /api/pdf/generate-from-template/{templateId}
   *
   * @param templateId - ID of the template to use
   * @param request - Generation request with data
   * @param filename - Filename for the downloaded PDF
   */
  generateFromTemplateAndDownload: async (
    templateId: string,
    request: GenerateFromTemplateRequest,
    filename?: string
  ): Promise<void> => {
    const response = await pdfApi.generateFromTemplate(templateId, request);

    if (response.success && response.pdfBytes) {
      // Convert base64 to blob and download
      const byteCharacters = atob(response.pdfBytes);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename || response.filename || "document.pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } else {
      throw new Error(response.errorMessage || "PDF generation failed");
    }
  },

  /**
   * Preview PDF as blob URL (for iframe display)
   * POST /api/pdf/generate
   *
   * @param request - PDF generation request
   * @returns Blob URL that can be used in an iframe src
   */
  generatePreview: async (request: GeneratePdfRequest): Promise<string> => {
    const response = await api.post<PdfGenerationResponse>(
      `${PDF_BASE}/generate`,
      request
    );

    if (response.success && response.pdfBytes) {
      const byteCharacters = atob(response.pdfBytes);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      return window.URL.createObjectURL(blob);
    }

    throw new Error(response.errorMessage || "PDF generation failed");
  },
};

export default pdfApi;
