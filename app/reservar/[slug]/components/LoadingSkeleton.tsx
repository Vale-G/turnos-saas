
// Componente genérico para esqueletos de carga
export const SkeletonLoader = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-gray-700 ${className}`} />
);

// Esqueleto específico para la carga inicial de la página de reserva
export const PageLoader = () => (
  <div className="space-y-6 p-4">
    <SkeletonLoader className="h-8 w-1/2" />
    <div className="space-y-4">
      <SkeletonLoader className="h-6 w-1/4" />
      <div className="flex space-x-4">
        <SkeletonLoader className="h-24 w-24 rounded-full" />
        <SkeletonLoader className="h-24 w-24 rounded-full" />
        <SkeletonLoader className="h-24 w-24 rounded-full" />
      </div>
    </div>
    <div className="space-y-4">
      <SkeletonLoader className="h-6 w-1/4" />
      <SkeletonLoader className="h-12 w-full" />
      <SkeletonLoader className="h-12 w-full" />
    </div>
  </div>
);
