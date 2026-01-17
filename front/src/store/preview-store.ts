/**
 * Preview Store
 * Manages the PDF preview panel state
 */
import { create } from "zustand";

interface PreviewState {
  // Preview visibility
  isOpen: boolean;

  // Preview state
  isLoading: boolean;
  error: string | null;
  pdfUrl: string | null;

  // Page navigation
  currentPage: number;
  totalPages: number;

  // Zoom
  zoom: number;

  // Actions
  openPreview: () => void;
  closePreview: () => void;
  togglePreview: () => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPdfUrl: (url: string | null) => void;
  setPageInfo: (current: number, total: number) => void;

  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;

  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;

  reset: () => void;
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export const usePreviewStore = create<PreviewState>()((set, get) => ({
  isOpen: false,
  isLoading: false,
  error: null,
  pdfUrl: null,
  currentPage: 1,
  totalPages: 1,
  zoom: 1,

  openPreview: () => set({ isOpen: true }),
  closePreview: () => set({ isOpen: false }),
  togglePreview: () => set((state) => ({ isOpen: !state.isOpen })),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  setPdfUrl: (pdfUrl) => set({ pdfUrl, isLoading: false, error: null }),
  setPageInfo: (currentPage, totalPages) => set({ currentPage, totalPages }),

  nextPage: () => {
    const { currentPage, totalPages } = get();
    if (currentPage < totalPages) {
      set({ currentPage: currentPage + 1 });
    }
  },

  previousPage: () => {
    const { currentPage } = get();
    if (currentPage > 1) {
      set({ currentPage: currentPage - 1 });
    }
  },

  goToPage: (page) => {
    const { totalPages } = get();
    if (page >= 1 && page <= totalPages) {
      set({ currentPage: page });
    }
  },

  setZoom: (zoom) => set({ zoom }),

  zoomIn: () => {
    const { zoom } = get();
    const currentIndex = ZOOM_STEPS.findIndex((z) => z >= zoom);
    if (currentIndex < ZOOM_STEPS.length - 1) {
      set({ zoom: ZOOM_STEPS[currentIndex + 1] });
    }
  },

  zoomOut: () => {
    const { zoom } = get();
    const currentIndex = ZOOM_STEPS.findIndex((z) => z >= zoom);
    if (currentIndex > 0) {
      set({ zoom: ZOOM_STEPS[currentIndex - 1] });
    }
  },

  reset: () =>
    set({
      isOpen: false,
      isLoading: false,
      error: null,
      pdfUrl: null,
      currentPage: 1,
      totalPages: 1,
      zoom: 1,
    }),
}));
