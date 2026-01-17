/**
 * Site configuration
 * Contains metadata and general site settings
 */

export const siteConfig = {
  name: "PDF Builder",
  description:
    "Visual, no-code PDF template builder for creating insurance contracts and documents using a Figma-like interface.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ogImage: "/og-image.png",
  creator: "PDF Builder Team",
  keywords: [
    "PDF",
    "template",
    "builder",
    "no-code",
    "document",
    "insurance",
    "contract",
    "visual editor",
    "drag and drop",
    "QuestPDF",
  ],
  links: {
    github: "https://github.com/your-org/pdf-builder",
    docs: "/docs",
  },
} as const;

export type SiteConfig = typeof siteConfig;
