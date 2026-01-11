import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="container py-8">
      {/* Hero skeleton */}
      <div className="mb-16 flex flex-col items-center text-center">
        <Skeleton className="mb-4 h-6 w-32" />
        <Skeleton className="mb-4 h-12 w-96" />
        <Skeleton className="mb-8 h-6 w-80" />
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Content grid skeleton */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-lg border p-4">
            <Skeleton className="mb-2 h-4 w-20" />
            <Skeleton className="mb-4 h-6 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
