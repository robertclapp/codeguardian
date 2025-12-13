import { useState } from "react";
import { useSwipeable } from "react-swipeable";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { useIsMobile } from "@/hooks/useMobile";

interface SwipeableNotificationProps {
  children: React.ReactNode;
  onDismiss: () => void;
  className?: string;
}

/**
 * SwipeableNotification - Notification that can be dismissed by swiping
 * 
 * Usage:
 * <SwipeableNotification onDismiss={() => removeNotification(id)}>
 *   <div>Your notification content</div>
 * </SwipeableNotification>
 */
export function SwipeableNotification({
  children,
  onDismiss,
  className = "",
}: SwipeableNotificationProps) {
  const [offset, setOffset] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);
  const isMobile = useIsMobile();

  const handlers = useSwipeable({
    onSwiping: (eventData) => {
      if (!isMobile) return;
      // Only allow horizontal swipes
      if (Math.abs(eventData.deltaX) > Math.abs(eventData.deltaY)) {
        setOffset(eventData.deltaX);
      }
    },
    onSwiped: (eventData) => {
      if (!isMobile) return;
      // Dismiss if swiped more than 100px
      if (Math.abs(eventData.deltaX) > 100) {
        setIsDismissing(true);
        setTimeout(onDismiss, 300);
      } else {
        // Snap back
        setOffset(0);
      }
    },
    trackMouse: false,
    preventScrollOnSwipe: false,
    delta: 10,
  });

  return (
    <div
      {...handlers}
      className={`relative transition-all ${
        isDismissing ? "opacity-0 scale-95" : ""
      } ${className}`}
      style={{
        transform: isMobile ? `translateX(${offset}px)` : undefined,
        transition: offset === 0 ? "transform 0.3s ease-out" : "none",
      }}
    >
      {children}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={onDismiss}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Dismiss notification</span>
      </Button>
    </div>
  );
}
