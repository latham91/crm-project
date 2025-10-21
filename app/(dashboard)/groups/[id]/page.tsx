"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, MapPin, Clock, FileText, UserPlus, Trash2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
    id: string;
    joinedAt: string;
    member: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      company: string | null;
      category: string | null;
    };
  }>;
}

interface AvailableMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  category: string | null;
}

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [group, setGroup] = useState<Group | null>(null);
  const [availableMembers, setAvailableMembers] = useState<AvailableMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isRemoveMemberDialogOpen, setIsRemoveMemberDialogOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [memberToRemove, setMemberToRemove] = useState<Group["groupMembers"][0] | null>(null);
  const [categoryConflict, setCategoryConflict] = useState<{
    member: string;
    category: string;
  } | null>(null);

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        // Fetch group details
        const groupResponse = await fetch(`/api/groups/${params.id}`);
        if (groupResponse.ok) {
          const groupData = await groupResponse.json();
          setGroup(groupData);
        } else {
          toast.error("Failed to load group details");
          router.push("/groups");
          return;
        }

        // Fetch all members to show available ones
        const membersResponse = await fetch("/api/members");
        if (membersResponse.ok) {
          const membersData = await membersResponse.json();
          setAvailableMembers(membersData);
        }
      } catch (error) {
        toast.error("An error occurred while loading group details");
        router.push("/groups");
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchGroupDetails();
    }
  }, [params.id, router]);

  const handleAddMember = async () => {
    if (!selectedMemberId) {
      toast.error("Please select a member");
      return;
    }

    setCategoryConflict(null);

    try {
      const response = await fetch(`/api/groups/${params.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selectedMemberId }),
      });

      if (response.ok) {
        toast.success("Member added successfully");
        setIsAddMemberDialogOpen(false);
        setSelectedMemberId("");
        // Refresh group details
        const groupResponse = await fetch(`/api/groups/${params.id}`);
        if (groupResponse.ok) {
          const groupData = await groupResponse.json();
          setGroup(groupData);
        }
      } else {
        const errorData = await response.json();
        if (response.status === 409) {
          // Category conflict
          setCategoryConflict({
            member: errorData.conflictingMember?.name || "Another member",
            category: errorData.conflictingMember?.category || "this category",
          });
          toast.error(errorData.message || "Category conflict");
        } else {
          toast.error(errorData.error || "Failed to add member");
        }
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      const response = await fetch(`/api/groups/${params.id}/members/${memberToRemove.member.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Member removed successfully");
        setIsRemoveMemberDialogOpen(false);
        setMemberToRemove(null);
        // Refresh group details
        const groupResponse = await fetch(`/api/groups/${params.id}`);
        if (groupResponse.ok) {
          const groupData = await groupResponse.json();
          setGroup(groupData);
        }
      } else {
        toast.error("Failed to remove member");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const openRemoveDialog = (membership: Group["groupMembers"][0]) => {
    setMemberToRemove(membership);
    setIsRemoveMemberDialogOpen(true);
  };

  const getUsedCategories = () => {
    if (!group) return [];
    return group.groupMembers.map((gm) => gm.member.category?.toLowerCase()).filter((cat): cat is string => !!cat);
  };

  const getAvailableMembersFiltered = () => {
    if (!group) return availableMembers;

    const currentMemberIds = group.groupMembers.map((gm) => gm.member.id);
    const usedCategories = getUsedCategories();

    return availableMembers
      .filter((member) => !currentMemberIds.includes(member.id))
      .map((member) => ({
        ...member,
        hasConflict: member.category && usedCategories.includes(member.category.toLowerCase()),
      }));
  };

  const getCategoryBadgeClass = (category: string | null) => {
    if (!category) return "bg-gray-100 text-gray-700 border-gray-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-red-600"></div>
        </div>
      </div>
    );
  }

  if (!group) {
    return null;
  }

  const canEditGroup = () => {
    // Super admins can edit anything, regular admins can only edit their own groups
    return session?.user.role === "SUPER_ADMIN" || group.leader.id === session?.user.id;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/groups">
          <Button variant="ghost" className="gap-2 mb-4 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Groups
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{group.name}</h1>
            <p className="text-sm text-gray-500 mt-1">Led by {group.leader.username}</p>
          </div>
          <Button
            onClick={() => setIsAddMemberDialogOpen(true)}
            className="gap-2 bg-red-600 hover:bg-red-700"
            disabled={!canEditGroup()}
          >
            <UserPlus className="h-4 w-4" />
            {canEditGroup() ? "Add Member" : "View Only"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Group Information Card */}
        <Card className="md:col-span-2 border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Group Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {group.description && (
              <div>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileText className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Description</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{group.description}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {group.meetingFrequency && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Clock className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Meeting Frequency</p>
                    <p className="text-sm font-medium text-gray-900">{group.meetingFrequency}</p>
                  </div>
                </div>
              )}

              {group.location && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <MapPin className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Location</p>
                    <p className="text-sm font-medium text-gray-900">{group.location}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Members</span>
                <span className="text-2xl font-semibold text-gray-900">{group.groupMembers.length}</span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600"
                  style={{ width: `${Math.min(group.groupMembers.length * 10, 100)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Categories</span>
                <span className="text-2xl font-semibold text-gray-900">{getUsedCategories().length}</span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${Math.min(getUsedCategories().length * 10, 100)}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Members List */}
      <Card className="border-gray-200 mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Members</CardTitle>
          <CardDescription>Manage group members and their categories</CardDescription>
        </CardHeader>
        <CardContent>
          {group.groupMembers.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-3">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 mb-4">No members in this group yet</p>
              <Button onClick={() => setIsAddMemberDialogOpen(true)} className="gap-2 bg-red-600 hover:bg-red-700">
                <UserPlus className="h-4 w-4" />
                Add First Member
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {group.groupMembers.map((membership) => (
                <div
                  key={membership.id}
                  className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium text-gray-900">
                            {membership.member.firstName} {membership.member.lastName}
                          </p>
                          {membership.member.category && (
                            <Badge variant="outline" className={getCategoryBadgeClass(membership.member.category)}>
                              {membership.member.category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{membership.member.email}</p>
                        {membership.member.company && <p className="text-xs text-gray-500">{membership.member.company}</p>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openRemoveDialog(membership)}
                      className="text-gray-400 hover:text-red-600"
                      disabled={!canEditGroup()}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Member Dialog */}
      <Dialog
        open={isAddMemberDialogOpen}
        onOpenChange={(open) => {
          setIsAddMemberDialogOpen(open);
          if (!open) {
            setCategoryConflict(null);
            setSelectedMemberId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Member to Group</DialogTitle>
            <DialogDescription>Select a member to add. Only one member per business category is allowed.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {categoryConflict && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>{categoryConflict.member}</strong> is already in this group with the category{" "}
                  <strong>"{categoryConflict.category}"</strong>. Only one member per category is allowed.
                </AlertDescription>
              </Alert>
            )}

            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableMembersFiltered().map((member: any) => (
                  <SelectItem key={member.id} value={member.id} disabled={member.hasConflict}>
                    <div className="flex items-center gap-2">
                      <span>
                        {member.firstName} {member.lastName}
                      </span>
                      {member.category && (
                        <Badge
                          variant="outline"
                          className={
                            member.hasConflict
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }
                        >
                          {member.category}
                        </Badge>
                      )}
                      {member.hasConflict && <span className="text-xs text-red-600">(Already taken)</span>}
                    </div>
                  </SelectItem>
                ))}
                {getAvailableMembersFiltered().length === 0 && (
                  <SelectItem value="none" disabled>
                    No available members
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddMemberDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} className="bg-red-600 hover:bg-red-700" disabled={!selectedMemberId}>
              Add Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={isRemoveMemberDialogOpen} onOpenChange={setIsRemoveMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <span className="font-semibold">
                {memberToRemove?.member.firstName} {memberToRemove?.member.lastName}
              </span>{" "}
              from this group?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRemoveMemberDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRemoveMember} variant="destructive">
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
