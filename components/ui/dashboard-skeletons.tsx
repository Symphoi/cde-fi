import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function DashboardHeaderSkeleton() {
  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-40" />
          <div className="flex space-x-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DashboardCardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-4 w-4" />
      </div>
    </Card>
  );
}

export function ChartSkeleton() {
  return (
    <Card className="h-[350px] p-4">
      <Skeleton className="h-full w-full" />
    </Card>
  );
}

export function TableSkeleton() {
  return (
    <Card>
      <div className="p-4 border-b">
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="p-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/100">
              {[...Array(6)].map((_, i) => (
                <th key={i} className="p-2 text-left">
                  <Skeleton className="h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, rowIdx) => (
              <tr key={rowIdx} className="border-b hover:bg-muted/60">
                {[...Array(6)].map((_, cellIdx) => (
                  <td key={cellIdx} className="p-2">
                    <Skeleton className="h-3 w-full max-w-[80px]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}