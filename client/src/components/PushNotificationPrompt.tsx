import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Bell, X } from "lucide-react";
import { useIsMobile } from "@/hooks/useMobile";
import { toast } from "sonner";

/**
 * PushNotificationPrompt - Requests permission for push notifications
 * Shows after user has been active for a while
 */
export function PushNotificationPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const isMobile = useIsMobile();

  useEffect(() => {
    // Check if notifications are supported
    if (!("Notification" in window)) {
      return;
    }

    // Check current permission
    setPermission(Notification.permission);

    // Don't show if already granted or denied
    if (Notification.permission !== "default") {
      return;
    }

    // Check if already dismissed
    const dismissed = localStorage.getItem("push-notification-dismissed");
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      const daysSinceDismissed = (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      
      // Show again after 7 days
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Show prompt after 30 seconds of activity
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 30000);

    return () => clearTimeout(timer);
  }, []);

  const requestPermission = async () => {
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === "granted") {
        toast.success("Notifications enabled! You'll receive updates about applications and interviews.");
        setShowPrompt(false);
        
        // Show a test notification
        new Notification("AI-Powered HR Platform", {
          body: "You'll now receive important updates!",
          icon: "/icon-192.png",
          badge: "/icon-192.png",
        });
      } else if (result === "denied") {
        toast.error("Notifications blocked. You can enable them in your browser settings.");
        setShowPrompt(false);
      }
    } catch (error) {
      console.error("[Push Notifications] Error requesting permission:", error);
      toast.error("Failed to enable notifications");
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("push-notification-dismissed", new Date().toISOString());
  };

  // Don't show if notifications not supported or permission already handled
  if (!("Notification" in window) || !showPrompt || permission !== "default") {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 md:left-auto md:right-4 md:w-96">
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Stay Updated</CardTitle>
                <CardDescription className="text-xs mt-1">
                  Get notified about new applications, interviews, and approvals
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mt-1 -mr-1"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Button
              onClick={requestPermission}
              className="flex-1"
              size="sm"
            >
              Enable Notifications
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
            >
              Not now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
