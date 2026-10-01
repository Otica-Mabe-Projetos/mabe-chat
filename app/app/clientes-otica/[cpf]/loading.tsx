// Ficha do cliente da ótica (personalização Ótica Mabe): esqueleto enquanto o ERP responde.
import { Skeleton } from "@/components/ui/skeleton";

export default function Carregando() {
  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden p-4 sm:p-6" aria-busy="true" aria-label="Carregando a ficha">
      <Skeleton className="h-4 w-32" />
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </div>
      <Skeleton className="h-6 w-28" />
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-6 w-44" />
      <Skeleton className="h-40 w-full rounded-lg" />
    </div>
  );
}
