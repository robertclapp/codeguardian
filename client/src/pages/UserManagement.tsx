import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, User, Search, Clock } from "lucide-react";
import { toast } from "sonner";

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState<"admin" | "user">("user");

  const { data: users, isLoading, refetch } = trpc.userManagement.getAllUsers.useQuery();
  const { data: activityLogs } = trpc.userManagement.getAllActivityLogs.useQuery({ limit: 100 });
  
  const updateRoleMutation = trpc.userManagement.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("User role updated successfully");
      setShowRoleDialog(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const filteredUsers = users?.filter(user =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRoleChange = (userId: number, currentRole: string) => {
    setSelectedUserId(userId);
    setNewRole(currentRole === "admin" ? "user" : "admin");
    setShowRoleDialog(true);
  };

  const confirmRoleChange = () => {
    if (selectedUserId) {
      updateRoleMutation.mutate({ userId: selectedUserId, role: newRole });
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage user roles and view activity logs</p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="activity">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>Manage user roles and permissions</CardDescription>
              <div className="flex items-center gap-2 pt-4">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Login Method</TableHead>
                    <TableHead>Last Signed In</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name || "—"}</TableCell>
                      <TableCell>{user.email || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                          {user.role === "admin" ? (
                            <><Shield className="h-3 w-3 mr-1" /> Admin</>
                          ) : (
                            <><User className="h-3 w-3 mr-1" /> User</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.loginMethod || "—"}</TableCell>
                      <TableCell>
                        {user.lastSignedIn
                          ? new Date(user.lastSignedIn).toLocaleString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRoleChange(user.id, user.role)}
                        >
                          {user.role === "admin" ? "Demote to User" : "Promote to Admin"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>View all user activity across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Resource ID</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityLogs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{log.userId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell>{log.resource || "—"}</TableCell>
                      <TableCell>{log.resourceId || "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{log.ipAddress || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Role Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to change this user's role to <strong>{newRole}</strong>?
              {newRole === "admin" && (
                <p className="mt-2 text-amber-600">
                  ⚠️ Admins have full access to all platform features including user management,
                  system settings, and sensitive data.
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmRoleChange} disabled={updateRoleMutation.isPending}>
              {updateRoleMutation.isPending ? "Updating..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
