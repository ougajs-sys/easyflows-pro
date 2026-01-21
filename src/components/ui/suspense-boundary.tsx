import React, { Suspense, ComponentType, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface SuspenseBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

/**
 * Suspense Boundary Component
 * Wraps components with React Suspense for lazy loading
 */
export function SuspenseBoundary({
  children,
  fallback,
  name = 'Component',
}: SuspenseBoundaryProps) {
  const defaultFallback = (
    <div className="flex items-center justify-center min-h-[200px] w-full">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Chargement de {name}...
        </p>
      </div>
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
}

/**
 * Higher-order component to wrap lazy-loaded components with Suspense
 */
export function withSuspense<P extends object>(
  Component: ComponentType<P>,
  options?: {
    fallback?: ReactNode;
    name?: string;
  }
): ComponentType<P> {
  return function SuspenseWrappedComponent(props: P) {
    return (
      <SuspenseBoundary fallback={options?.fallback} name={options?.name}>
        <Component {...props} />
      </SuspenseBoundary>
    );
  };
}

/**
 * Loading Skeleton Component
 * Provides a skeleton loader for better UX during lazy loading
 */
export function LoadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse space-y-4 ${className}`}>
      <div className="h-4 bg-muted rounded w-3/4"></div>
      <div className="h-4 bg-muted rounded w-1/2"></div>
      <div className="h-4 bg-muted rounded w-5/6"></div>
    </div>
  );
}

/**
 * Full Page Loading Component
 */
export function FullPageLoading({ message = 'Chargement...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen w-full">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
