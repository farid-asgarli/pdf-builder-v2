import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common";

export default function TemplatesPage() {
  // TODO: Fetch templates from API in Phase 6
  const templates: unknown[] = [];

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-muted-foreground">
            Manage your PDF templates
          </p>
        </div>
        <Button asChild>
          <Link href="/builder/new">
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Link>
        </Button>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No templates yet"
          description="Create your first PDF template to get started."
          action={
            <Button asChild>
              <Link href="/builder/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Template cards will be rendered here */}
        </div>
      )}
    </div>
  );
}
