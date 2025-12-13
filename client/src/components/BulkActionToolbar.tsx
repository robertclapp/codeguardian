import { Button } from "./ui/button";
import { Trash2, Archive, Download, Edit } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface BulkActionToolbarProps {
  selectedCount: number;
  onDelete?: () => void;
  onArchive?: () => void;
  onExport?: () => void;
  onStatusChange?: () => void;
  onClearSelection: () => void;
  showArchive?: boolean;
  showStatusChange?: boolean;
}

/**
 * BulkActionToolbar - Shows actions when items are selected
 * Appears as a sticky toolbar at the top of lists
 */
export function BulkActionToolbar({
  selectedCount,
  onDelete,
  onArchive,
  onExport,
  onStatusChange,
  onClearSelection,
  showArchive = true,
  showStatusChange = false,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="sticky top-0 z-10 bg-primary/10 border-b border-primary/20 px-4 py-3 flex items-center justify-between animate-in slide-in-from-top-2">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          {selectedCount} {selectedCount === 1 ? "item" : "items"} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="h-8"
        >
          Clear selection
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {onExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="h-8"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}

        {showArchive && onArchive && (
          <Button
            variant="outline"
            size="sm"
            onClick={onArchive}
            className="h-8"
          >
            <Archive className="h-4 w-4 mr-2" />
            Archive
          </Button>
        )}

        {showStatusChange && onStatusChange && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                <Edit className="h-4 w-4 mr-2" />
                Change Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onStatusChange?.()}>
                Mark as Active
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange?.()}>
                Mark as Closed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onStatusChange?.()}>
                Mark as Draft
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {onDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="h-8"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
