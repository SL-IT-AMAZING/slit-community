import { Skeleton } from "@/components/ui/skeleton";

export default function ContentLoading() {
  return (
    <div className="container py-8">
      {/* Header skeleton */}
      <div className="mb-8">
        <Skeleton className="mb-2 h-8 w-48" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Search skeleton */}
      <div className="mb-8">
        <Skeleton className="h-10 w-full md:w-96" />
      </div>

      {/* Content grid skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-lg border p-4">
            <div className="mb-2 flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
            <Skeleton className="mb-4 h-6 w-full" />
            <Skeleton className="mb-4 h-12 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
