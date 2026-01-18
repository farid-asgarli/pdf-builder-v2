import type { ReactNode } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky top-0 z-50 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <FileText className="text-primary h-5 w-5" />
            <span className="text-lg font-semibold">PDF Builder</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/templates"
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            >
              Templates
            </Link>
            <Button size="sm" asChild>
              <Link href="/builder/new">New Template</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
