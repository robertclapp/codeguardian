import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SwipeableCard } from "@/components/SwipeableCard";
import { SwipeableNotification } from "@/components/SwipeableNotification";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Bell, CheckCircle, Info } from "lucide-react";
import { toast } from "sonner";

/**
 * SwipeDemo - Demonstration page for touch gesture functionality
 * Shows how to use SwipeableCard and SwipeableNotification components
 */
export default function SwipeDemo() {
  const [currentCard, setCurrentCard] = useState(0);
  const [notifications, setNotifications] = useState([
    { id: 1, title: "New Application", message: "John Doe applied for Software Engineer", type: "info" },
    { id: 2, title: "Document Approved", message: "Resume approved for Jane Smith", type: "success" },
    { id: 3, title: "Interview Scheduled", message: "Interview with Mike Johnson at 2 PM", type: "info" },
  ]);

  const cards = [
    {
      title: "Candidate 1: John Doe",
      description: "Software Engineer",
      skills: ["React", "TypeScript", "Node.js"],
      experience: "5 years",
    },
    {
      title: "Candidate 2: Jane Smith",
      description: "Product Manager",
      skills: ["Agile", "Product Strategy", "UX Design"],
      experience: "7 years",
    },
    {
      title: "Candidate 3: Mike Johnson",
      description: "Data Scientist",
      skills: ["Python", "Machine Learning", "SQL"],
      experience: "3 years",
    },
  ];

  const handleSwipeLeft = () => {
    toast.error("Rejected candidate");
    if (currentCard < cards.length - 1) {
      setCurrentCard(currentCard + 1);
    }
  };

  const handleSwipeRight = () => {
    toast.success("Approved candidate");
    if (currentCard < cards.length - 1) {
      setCurrentCard(currentCard + 1);
    }
  };

  const dismissNotification = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
    toast.info("Notification dismissed");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Touch Gesture Demo</h1>
          <p className="text-muted-foreground mt-1">
            Try swiping on mobile devices to interact with cards and notifications
          </p>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How to Use</CardTitle>
            <CardDescription>
              This page demonstrates touch gesture functionality available throughout the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <ArrowLeft className="h-5 w-5 text-destructive" />
              <span className="text-sm">Swipe left to reject/dismiss</span>
            </div>
            <div className="flex items-center gap-3">
              <ArrowRight className="h-5 w-5 text-green-600" />
              <span className="text-sm">Swipe right to approve/accept</span>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Note: Gestures only work on touch devices (mobile/tablet). Desktop users can use buttons.
            </p>
          </CardContent>
        </Card>

        {/* Swipeable Candidate Cards */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Candidate Review</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Swipe left to reject, swipe right to approve
          </p>
          
          {currentCard < cards.length ? (
            <SwipeableCard
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              className="max-w-md mx-auto"
            >
              <Card className="border-2">
                <CardHeader>
                  <CardTitle>{cards[currentCard].title}</CardTitle>
                  <CardDescription>{cards[currentCard].description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {cards[currentCard].skills.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Experience</p>
                    <p className="text-sm text-muted-foreground">{cards[currentCard].experience}</p>
                  </div>
                  <div className="text-center text-xs text-muted-foreground pt-4">
                    Card {currentCard + 1} of {cards.length}
                  </div>
                </CardContent>
              </Card>
            </SwipeableCard>
          ) : (
            <Card className="max-w-md mx-auto">
              <CardContent className="py-12 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <p className="text-lg font-medium">All candidates reviewed!</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Refresh the page to try again
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Swipeable Notifications */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Notifications</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Swipe horizontally to dismiss notifications
          </p>
          
          <div className="space-y-3 max-w-md mx-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <SwipeableNotification
                  key={notification.id}
                  onDismiss={() => dismissNotification(notification.id)}
                >
                  <Card>
                    <CardContent className="py-4 pr-10">
                      <div className="flex items-start gap-3">
                        {notification.type === "success" ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        ) : (
                          <Bell className="h-5 w-5 text-blue-600 mt-0.5" />
                        )}
                        <div>
                          <p className="font-medium text-sm">{notification.title}</p>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </SwipeableNotification>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Info className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No notifications</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
