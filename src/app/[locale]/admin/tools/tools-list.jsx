"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  FaPlus,
  FaMagnifyingGlass,
  FaPen,
  FaTrash,
  FaStar,
  FaCrown,
} from "react-icons/fa6";

import { createClient } from "@/lib/supabase/client";

function StarRating({ rating }) {
  const stars = [];
  const fullStars = Math.floor(rating || 0);
  const hasHalfStar = (rating || 0) % 1 !== 0;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <FaStar
          key={i}
          size={12}
          className="fill-yellow-400 text-yellow-400"
        />,
      );
    } else if (i === fullStars && hasHalfStar) {
      stars.push(
        <div key={i} className="relative w-3">
          <FaStar size={12} className="text-gray-300" />
          <div className="absolute left-0 top-0 w-1.5 overflow-hidden">
            <FaStar size={12} className="fill-yellow-400 text-yellow-400" />
          </div>
        </div>,
      );
    } else {
      stars.push(<FaStar key={i} size={12} className="text-gray-300" />);
    }
  }

  return (
    <div className="flex items-center gap-1">
      {stars}
      <span className="ml-1 text-xs text-muted-foreground">
        {(rating || 0).toFixed(1)}
      </span>
    </div>
  );
}

export default function ToolsList({ initialTools }) {
  const router = useRouter();
  const t = useTranslations("ratings");
  const [tools, setTools] = useState(initialTools);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toolToDelete, setToolToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredTools = tools.filter((item) => {
    const name = item.name || "";
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Toggle checkbox
  const toggleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all
  const selectAll = () => {
    if (selectedIds.size === filteredTools.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTools.map((item) => item.id)));
    }
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("tools")
        .delete()
        .in("id", Array.from(selectedIds));

      if (error) {
        console.error("Delete error:", error);
        alert("Failed to delete tools.");
        return;
      }

      setTools((prev) => prev.filter((item) => !selectedIds.has(item.id)));
      setSelectedIds(new Set());
      setDeleteDialogOpen(false);
      setToolToDelete(null);
      router.refresh();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete tools.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Single delete
  const handleDelete = async () => {
    if (!toolToDelete) return;

    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("tools")
        .delete()
        .eq("id", toolToDelete.id);

      if (error) {
        console.error("Delete error:", error);
        alert("Failed to delete tool.");
        return;
      }

      setTools((prev) => prev.filter((item) => item.id !== toolToDelete.id));
      setDeleteDialogOpen(false);
      setToolToDelete(null);
      router.refresh();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete tool.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Open bulk delete dialog
  const openBulkDeleteDialog = () => {
    setToolToDelete(null);
    setDeleteDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (item) => {
    setToolToDelete(item);
    setDeleteDialogOpen(true);
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-cera text-3xl font-bold">Tools Management</h1>
          <p className="text-muted-foreground">{tools.length} total tools</p>
        </div>
        <Link href="/admin/tools/new">
          <Button className="gap-2">
            <FaPlus size={12} />
            New Tool
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <FaMagnifyingGlass
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          size={14}
        />
        <Input
          type="text"
          placeholder="Search tools..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Select All Checkbox */}
      <div className="mb-4 flex items-center gap-2">
        <Checkbox
          checked={
            selectedIds.size === filteredTools.length &&
            filteredTools.length > 0
          }
          onCheckedChange={selectAll}
        />
        <span className="text-sm text-muted-foreground">Select All</span>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-muted p-3">
          <span className="text-sm text-muted-foreground">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={openBulkDeleteDialog}
            disabled={isDeleting}
            className="gap-2 text-destructive hover:bg-destructive/10"
          >
            <FaTrash size={12} />
            Delete Selected
          </Button>
        </div>
      )}

      {/* Tools List */}
      <div className="space-y-4">
        {filteredTools.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">No tools found.</p>
            </CardContent>
          </Card>
        ) : (
          filteredTools.map((item) => (
            <Card
              key={item.id}
              className={`transition-shadow hover:shadow-md ${
                selectedIds.has(item.id) ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedIds.has(item.id)}
                    onCheckedChange={() => toggleSelect(item.id)}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{item.name}</h3>
                      {item.is_featured && (
                        <Badge className="gap-1 bg-yellow-500/10 text-yellow-500">
                          <FaCrown size={8} />
                          Featured
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <StarRating rating={item.rating} />
                      <Badge variant="outline" className="text-xs">
                        {item.pricing || "Free"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/admin/tools/${item.id}`}>
                    <Button variant="ghost" size="icon">
                      <FaPen size={14} />
                    </Button>
                  </Link>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => openDeleteDialog(item)}
                  >
                    <FaTrash size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tool</DialogTitle>
            <DialogDescription>
              {toolToDelete
                ? `Are you sure you want to delete "${toolToDelete.name}"? This action cannot be undone.`
                : `Are you sure you want to delete ${selectedIds.size} items? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={toolToDelete ? handleDelete : handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
