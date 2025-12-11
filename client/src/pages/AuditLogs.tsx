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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Eye, Download } from "lucide-react";
import { toast } from "sonner";

export default function AuditLogs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [showSnapshotDialog, setShowSnapshotDialog] = useState(false);

  const { data: auditLogs, isLoading } = trpc.audit.getAuditLogs.useQuery({
    limit: 500,
  });

  const filteredLogs = auditLogs?.filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.tableName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesTable = tableFilter === "all" || log.tableName === tableFilter;
    
    return matchesSearch && matchesAction && matchesTable;
  });

  const uniqueTables = Array.from(new Set(auditLogs?.map(log => log.tableName) || []));

  const handleViewSnapshot = (log: any) => {
    setSelectedLog(log);
    setShowSnapshotDialog(true);
  };

  const handleExportCSV = () => {
    if (!filteredLogs) return;

    const headers = ["ID", "User", "Action", "Table", "Record ID", "Timestamp", "IP Address"];
    const rows = filteredLogs.map(log => [
      log.id,
      log.userName,
      log.action,
      log.tableName,
      log.recordId,
      new Date(log.createdAt).toISOString(),
      log.ipAddress || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Audit logs exported successfully");
  };

  const renderSnapshot = (snapshot: string | null) => {
    if (!snapshot) return <p className="text-muted-foreground">No data</p>;
    
    try {
      const data = JSON.parse(snapshot);
      return (
        <pre className="bg-muted p-4 rounded-lg overflow-auto max-h-96 text-sm">
          {JSON.stringify(data, null, 2)}
        </pre>
      );
    } catch {
      return <p className="text-destructive">Invalid JSON</p>;
    }
  };

  const renderChanges = (changes: string | null) => {
    if (!changes) return <p className="text-muted-foreground">No changes recorded</p>;
    
    try {
      const data = JSON.parse(changes);
      return (
        <div className="space-y-2">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex items-start gap-2">
              <Badge variant="outline">{key}</Badge>
              <span className="text-sm">{JSON.stringify(value)}</span>
            </div>
          ))}
        </div>
      );
    } catch {
      return <p className="text-destructive">Invalid JSON</p>;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">Complete audit trail of all system operations</p>
        </div>
        <Button onClick={handleExportCSV} disabled={!filteredLogs?.length}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter audit logs by action, table, or search query</CardDescription>
          <div className="flex flex-wrap gap-4 pt-4">
            <Input
              placeholder="Search by user or table..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="update">Update</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tableFilter} onValueChange={setTableFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Tables" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tables</SelectItem>
                {uniqueTables.map(table => (
                  <SelectItem key={table} value={table}>{table}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground mb-4">
            Showing {filteredLogs?.length || 0} of {auditLogs?.length || 0} logs
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Record ID</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-sm">{log.id}</TableCell>
                  <TableCell>{log.userName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        log.action === "create"
                          ? "default"
                          : log.action === "update"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      {log.tableName}
                    </div>
                  </TableCell>
                  <TableCell>{log.recordId}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewSnapshot(log)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showSnapshotDialog} onOpenChange={setShowSnapshotDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              {selectedLog?.action} operation on {selectedLog?.tableName} (ID: {selectedLog?.recordId})
              by {selectedLog?.userName} at {selectedLog && new Date(selectedLog.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {selectedLog?.changes && (
              <div>
                <h3 className="font-semibold mb-2">Changes</h3>
                {renderChanges(selectedLog.changes)}
              </div>
            )}
            {selectedLog?.beforeSnapshot && (
              <div>
                <h3 className="font-semibold mb-2">Before</h3>
                {renderSnapshot(selectedLog.beforeSnapshot)}
              </div>
            )}
            {selectedLog?.afterSnapshot && (
              <div>
                <h3 className="font-semibold mb-2">After</h3>
                {renderSnapshot(selectedLog.afterSnapshot)}
              </div>
            )}
            {selectedLog?.ipAddress && (
              <div>
                <h3 className="font-semibold mb-2">IP Address</h3>
                <p className="font-mono text-sm">{selectedLog.ipAddress}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
