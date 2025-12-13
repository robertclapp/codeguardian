import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Eye, Wifi, WifiOff } from "lucide-react";

interface UserPresence {
  userId: string;
  userName: string;
  resourceType: "candidate" | "job" | "document";
  resourceId: string;
  timestamp: number;
}

interface PresenceIndicatorProps {
  presentUsers: UserPresence[];
  isConnected: boolean;
}

export function PresenceIndicator({
  presentUsers,
  isConnected,
}: PresenceIndicatorProps) {
  if (presentUsers.length === 0 && isConnected) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getColorForUser = (userId: string) => {
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-orange-500",
      "bg-teal-500",
    ];
    const index = parseInt(userId) % colors.length;
    return colors[index];
  };

  return (
    <div className="flex items-center gap-2">
      {/* Connection Status */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center">
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isConnected ? "Connected" : "Disconnected"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Present Users */}
      {presentUsers.length > 0 && (
        <>
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {presentUsers.length}
            </span>
          </div>

          <div className="flex -space-x-2">
            {presentUsers.slice(0, 3).map((user) => (
              <TooltipProvider key={user.userId}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-8 w-8 border-2 border-background">
                      <AvatarFallback
                        className={`text-xs ${getColorForUser(user.userId)} text-white`}
                      >
                        {getInitials(user.userName)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{user.userName} is viewing this</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}

            {presentUsers.length > 3 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-8 w-8 border-2 border-background">
                      <AvatarFallback className="bg-gray-500 text-white text-xs">
                        +{presentUsers.length - 3}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      {presentUsers.slice(3).map((user) => (
                        <p key={user.userId}>{user.userName}</p>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </>
      )}
    </div>
  );
}
