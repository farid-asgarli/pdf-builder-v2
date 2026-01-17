import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";

interface TemplateCardSkeletonProps {
  className?: string;
}

/**
 * Skeleton loader for template card
 */
export function TemplateCardSkeleton({ className }: TemplateCardSkeletonProps) {
  return (
    <Card className={cn("flex flex-col", className)}>
      {/* Preview thumbnail skeleton */}
      <div className="bg-muted aspect-4/3 animate-pulse rounded-t-lg" />

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            {/* Title skeleton */}
            <div className="bg-muted h-5 w-3/4 animate-pulse rounded" />
            {/* Category skeleton */}
            <div className="bg-muted h-3 w-1/2 animate-pulse rounded" />
          </div>
          {/* Actions button skeleton */}
          <div className="bg-muted h-8 w-8 animate-pulse rounded" />
        </div>
      </CardHeader>

      <CardContent className="flex-1 pb-2">
        {/* Description skeleton */}
        <div className="space-y-2">
          <div className="bg-muted h-4 w-full animate-pulse rounded" />
          <div className="bg-muted h-4 w-2/3 animate-pulse rounded" />
        </div>
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-2 pt-0">
        {/* Tags skeleton */}
        <div className="flex gap-1">
          <div className="bg-muted h-5 w-16 animate-pulse rounded-full" />
          <div className="bg-muted h-5 w-12 animate-pulse rounded-full" />
        </div>
        {/* Metadata skeleton */}
        <div className="flex w-full items-center justify-between">
          <div className="bg-muted h-3 w-8 animate-pulse rounded" />
          <div className="bg-muted h-3 w-24 animate-pulse rounded" />
        </div>
      </CardFooter>
    </Card>
  );
}
