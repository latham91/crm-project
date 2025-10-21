"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UsersRound, Plus, Search, Users, MapPin, Clock, Eye, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Group {
  id: string;
  name: string;
  description: string | null;
  meetingFrequency: string | null;
  location: string | null;
  createdAt: string;
  leader: {
    id: string;
    username: string;
    email: string;
  };
  groupMembers: Array<{
    member: {
      id: string;
      firstName: string;
      lastName: string;
      category: string | null;
    };
  }>;
}

export default function GroupsPage() {
  const { data: session } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    meetingFrequency: "",
    location: "",
  });

  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/groups");
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      toast.error("Failed to fetch groups");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleAdd = async () => {
    try {
      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Group created successfully");
        setIsAddDialogOpen(false);
        resetForm();
        fetchGroups();
      } else {
        toast.error("Failed to create group");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleEdit = async () => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Group updated successfully");
        setIsEditDialogOpen(false);
        resetForm();
        fetchGroups();
      } else {
        toast.error("Failed to update group");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleDelete = async () => {
    if (!selectedGroup) return;

    try {
      const response = await fetch(`/api/groups/${selectedGroup.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Group deleted successfully");
        setIsDeleteDialogOpen(false);
        setSelectedGroup(null);
        fetchGroups();
      } else {
        toast.error("Failed to delete group");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      meetingFrequency: "",
      location: "",
    });
    setSelectedGroup(null);
  };

  const openEditDialog = (group: Group) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || "",
      meetingFrequency: group.meetingFrequency || "",
      location: group.location || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (group: Group) => {
    setSelectedGroup(group);
    setIsDeleteDialogOpen(true);
  };

  const filteredGroups = groups.filter((group) => group.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const getUsedCategories = (group: Group) => {
    const categories = group.groupMembers.map((gm) => gm.member.category).filter((cat): cat is string => !!cat);
    return [...new Set(categories)];
  };

  const canEditGroup = (group: Group) => {
    // Super admins can edit anything, regular admins can only edit their own groups
    return session?.user.role === "SUPER_ADMIN" || group.leader.id === session?.user.id;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Groups</h1>
          <p className="text-sm text-gray-500 mt-1">Organize your networking groups</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4" />
          Create Group
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Groups Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-red-600"></div>
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card className="p-12 border-gray-200">
          <div className="text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
              <UsersRound className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              {searchTerm ? "No groups found" : "No groups yet"}
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              {searchTerm ? "Try adjusting your search" : "Create your first networking group to start organizing meetings"}
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4" />
              Create Group
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredGroups.map((group) => (
            <Card key={group.id} className="border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{group.name}</h3>
                    <p className="text-sm text-gray-500">Led by {group.leader.username}</p>
                  </div>
                  <TooltipProvider>
                    <div className="flex items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link href={`/groups/${group.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent>View Details</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(group)}
                            disabled={!canEditGroup(group)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {canEditGroup(group) ? "Edit Group" : "You can only edit your own groups"}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(group)}
                            disabled={!canEditGroup(group)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {canEditGroup(group) ? "Delete Group" : "You can only delete your own groups"}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </div>

                {group.description && <p className="text-sm text-gray-600 mb-4 line-clamp-2">{group.description}</p>}

                <div className="space-y-2 mb-4">
                  {group.meetingFrequency && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      {group.meetingFrequency}
                    </div>
                  )}
                  {group.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {group.location}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-4 w-4" />
                    <span>{group.groupMembers.length} members</span>
                  </div>
                  {getUsedCategories(group).length > 0 && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {getUsedCategories(group).length} categories
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Group Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>Create a new networking group</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1.5"
                placeholder="e.g., Downtown Business Network"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1.5"
                placeholder="Brief description of the group..."
              />
            </div>
            <div>
              <Label htmlFor="meetingFrequency">Meeting Frequency</Label>
              <Input
                id="meetingFrequency"
                value={formData.meetingFrequency}
                onChange={(e) => setFormData({ ...formData, meetingFrequency: e.target.value })}
                className="mt-1.5"
                placeholder="e.g., Weekly on Wednesdays"
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="mt-1.5"
                placeholder="e.g., Downtown Conference Center"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} className="bg-red-600 hover:bg-red-700" disabled={!formData.name}>
              Create Group
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>Update group information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit-name">Group Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-meetingFrequency">Meeting Frequency</Label>
              <Input
                id="edit-meetingFrequency"
                value={formData.meetingFrequency}
                onChange={(e) => setFormData({ ...formData, meetingFrequency: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} className="bg-red-600 hover:bg-red-700" disabled={!formData.name}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{selectedGroup?.name}</span>? This will also
              remove all members from the group. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
