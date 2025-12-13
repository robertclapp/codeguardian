import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

/**
 * OfflineIndicator - Shows connection status banner
 * Appears when the user goes offline
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Show "Back online" message briefly
      setShowBanner(true);
      setTimeout(() => {
        setShowBanner(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Don't show if online and banner is hidden
  if (isOnline && !showBanner) {
    return null;
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
        showBanner ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div
        className={`py-2 px-4 text-center text-sm font-medium ${
          isOnline
            ? "bg-green-600 text-white"
            : "bg-yellow-600 text-white"
        }`}
      >
        <div className="flex items-center justify-center gap-2">
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4" />
              <span>Back online</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              <span>You're offline. Some features may be limited.</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
