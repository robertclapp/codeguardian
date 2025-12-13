import { ReactNode } from "react";
import { useSwipeable } from "react-swipeable";
import { useIsMobile } from "@/hooks/useMobile";

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  className?: string;
  disabled?: boolean;
}

/**
 * SwipeableCard - Wrapper component that adds touch gesture support
 * 
 * Usage:
 * <SwipeableCard 
 *   onSwipeLeft={() => console.log('Swiped left')}
 *   onSwipeRight={() => console.log('Swiped right')}
 * >
 *   <YourContent />
 * </SwipeableCard>
 */
export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  className = "",
  disabled = false,
}: SwipeableCardProps) {
  const isMobile = useIsMobile();

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (!disabled && onSwipeLeft && isMobile) {
        onSwipeLeft();
      }
    },
    onSwipedRight: () => {
      if (!disabled && onSwipeRight && isMobile) {
        onSwipeRight();
      }
    },
    onSwipedUp: () => {
      if (!disabled && onSwipeUp && isMobile) {
        onSwipeUp();
      }
    },
    onSwipedDown: () => {
      if (!disabled && onSwipeDown && isMobile) {
        onSwipeDown();
      }
    },
    trackMouse: false, // Only track touch, not mouse
    preventScrollOnSwipe: false, // Allow scrolling
    delta: 50, // Minimum swipe distance
  });

  // Only apply swipe handlers on mobile
  if (!isMobile || disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div {...handlers} className={className}>
      {children}
    </div>
  );
}
