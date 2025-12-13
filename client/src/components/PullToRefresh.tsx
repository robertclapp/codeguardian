import { ReactNode } from "react";
import PullToRefreshComponent from "react-simple-pull-to-refresh";
import { useIsMobile } from "@/hooks/useMobile";
import { RefreshCw } from "lucide-react";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

/**
 * PullToRefresh - Wrapper component that adds pull-to-refresh functionality
 * Only active on mobile devices
 * 
 * Usage:
 * <PullToRefresh onRefresh={async () => { await refetch(); }}>
 *   <YourListContent />
 * </PullToRefresh>
 */
export function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
}: PullToRefreshProps) {
  const isMobile = useIsMobile();

  // Only enable pull-to-refresh on mobile
  if (!isMobile || disabled) {
    return <>{children}</>;
  }

  return (
    <PullToRefreshComponent
      onRefresh={onRefresh}
      pullingContent={
        <div className="flex flex-col items-center justify-center py-4">
          <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" />
          <p className="text-sm text-muted-foreground mt-2">Pull to refresh</p>
        </div>
      }
      refreshingContent={
        <div className="flex flex-col items-center justify-center py-4">
          <RefreshCw className="h-6 w-6 text-primary animate-spin" />
          <p className="text-sm text-primary mt-2">Refreshing...</p>
        </div>
      }
      pullDownThreshold={80}
      maxPullDownDistance={120}
      resistance={2}
    >
      {children}
    </PullToRefreshComponent>
  );
}
