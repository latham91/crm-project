"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Plus, Search, MapPin, Users, Eye, Pencil, Trash2, Clock, List, CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Meeting {
  id: string;
  title: string;
  date: string;
  location: string | null;
  notes: string | null;
  group: {
    id: string;
    name: string;
    leader: {
      id: string;
      username: string;
    };
  };
  attendance: Array<{
    id: string;
    status: string;
    member: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

interface Group {
  id: string;
  name: string;
}

export default function MeetingsPage() {
  const { data: session } = useSession();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUpcoming, setFilterUpcoming] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [formData, setFormData] = useState({
    groupId: "",
    title: "",
    date: "",
    time: "",
    location: "",
    notes: "",
  });

  const fetchMeetings = async () => {
    try {
      const params = new URLSearchParams();
      if (filterUpcoming) params.append("upcoming", "true");

      const response = await fetch(`/api/meetings?${params}`);
      if (response.ok) {
        const data = await response.json();
        setMeetings(data);
      }
    } catch (error) {
      toast.error("Failed to fetch meetings");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await fetch("/api/groups");
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (error) {
      console.error("Failed to fetch groups");
    }
  };

  useEffect(() => {
    fetchMeetings();
    fetchGroups();
  }, [filterUpcoming]);

  const handleAdd = async () => {
    if (!formData.groupId || !formData.title || !formData.date || !formData.time) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      // Combine date and time
      const dateTime = new Date(`${formData.date}T${formData.time}`);

      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: formData.groupId,
          title: formData.title,
          date: dateTime.toISOString(),
          location: formData.location,
          notes: formData.notes,
        }),
      });

      if (response.ok) {
        toast.success("Meeting created successfully");
        setIsAddDialogOpen(false);
        resetForm();
        fetchMeetings();
      } else {
        toast.error("Failed to create meeting");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleEdit = async () => {
    if (!selectedMeeting) return;

    try {
      const dateTime = new Date(`${formData.date}T${formData.time}`);

      const response = await fetch(`/api/meetings/${selectedMeeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          date: dateTime.toISOString(),
          location: formData.location,
          notes: formData.notes,
        }),
      });

      if (response.ok) {
        toast.success("Meeting updated successfully");
        setIsEditDialogOpen(false);
        resetForm();
        fetchMeetings();
      } else {
        toast.error("Failed to update meeting");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleDelete = async () => {
    if (!selectedMeeting) return;

    try {
      const response = await fetch(`/api/meetings/${selectedMeeting.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Meeting deleted successfully");
        setIsDeleteDialogOpen(false);
        setSelectedMeeting(null);
        fetchMeetings();
      } else {
        toast.error("Failed to delete meeting");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const resetForm = () => {
    setFormData({
      groupId: "",
      title: "",
      date: "",
      time: "",
      location: "",
      notes: "",
    });
    setSelectedMeeting(null);
  };

  const openEditDialog = (meeting: Meeting) => {
    const meetingDate = new Date(meeting.date);
    setSelectedMeeting(meeting);
    setFormData({
      groupId: meeting.group.id,
      title: meeting.title,
      date: meetingDate.toISOString().split("T")[0],
      time: meetingDate.toTimeString().slice(0, 5),
      location: meeting.location || "",
      notes: meeting.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setIsDeleteDialogOpen(true);
  };

  const filteredMeetings = meetings.filter(
    (meeting) =>
      meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAttendanceStats = (meeting: Meeting) => {
    const attended = meeting.attendance.filter((a) => a.status === "ATTENDED").length;
    const total = meeting.attendance.length;
    return { attended, total };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isPast = (dateString: string) => {
    return new Date(dateString) < new Date();
  };

  // Calendar view helpers
  const groupMeetingsByDate = () => {
    const grouped: { [key: string]: Meeting[] } = {};
    filteredMeetings.forEach((meeting) => {
      const dateKey = new Date(meeting.date).toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(meeting);
    });
    return grouped;
  };

  const getCalendarDates = () => {
    const dates: Date[] = [];
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth() + 2, 0); // Next 2 months

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    return dates;
  };

  const getMeetingsForDate = (date: Date) => {
    const grouped = groupMeetingsByDate();
    return grouped[date.toDateString()] || [];
  };

  const formatCalendarDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const canEditMeeting = (meeting: Meeting) => {
    // Super admins can edit anything, regular admins can only edit their own group's meetings
    return session?.user.role === "SUPER_ADMIN" || meeting.group.leader.id === session?.user.id;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Meetings</h1>
          <p className="text-sm text-gray-500 mt-1">Schedule and manage meetings</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 bg-red-600 hover:bg-red-700">
          <Plus className="h-4 w-4" />
          Schedule Meeting
        </Button>
      </div>

      {/* Search, Filter, and View Toggle */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search meetings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={filterUpcoming ? "default" : "outline"}
          onClick={() => setFilterUpcoming(!filterUpcoming)}
          className={filterUpcoming ? "bg-red-600 hover:bg-red-700" : ""}
        >
          <Clock className="h-4 w-4 mr-2" />
          Upcoming Only
        </Button>
        <div className="flex border border-gray-200 rounded-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("list")}
            className={`rounded-r-none ${viewMode === "list" ? "bg-gray-100" : ""}`}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("calendar")}
            className={`rounded-l-none border-l ${viewMode === "calendar" ? "bg-gray-100" : ""}`}
          >
            <CalendarDays className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Meetings Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-red-600"></div>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <Card className="p-12 border-gray-200">
          <div className="text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
              <Calendar className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              {searchTerm || filterUpcoming ? "No meetings found" : "No meetings scheduled"}
            </h3>
            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
              {searchTerm || filterUpcoming
                ? "Try adjusting your search or filters"
                : "Schedule your first meeting to start tracking attendance"}
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2 bg-red-600 hover:bg-red-700">
              <Plus className="h-4 w-4" />
              Schedule Meeting
            </Button>
          </div>
        </Card>
      ) : viewMode === "list" ? (
        <div className="grid gap-4">
          {filteredMeetings.map((meeting) => {
            const stats = getAttendanceStats(meeting);
            const past = isPast(meeting.date);

            return (
              <Card key={meeting.id} className={`border-gray-200 ${past ? "opacity-75" : ""}`}>
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{meeting.title}</h3>
                        {past ? (
                          <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
                            Past
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Upcoming
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Users className="h-4 w-4" />
                          <span>{meeting.group.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span>
                            {formatDate(meeting.date)} at {formatTime(meeting.date)}
                          </span>
                        </div>
                        {meeting.location && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4" />
                            <span>{meeting.location}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {stats.attended}/{stats.total} attended
                        </Badge>
                      </div>
                    </div>

                    <TooltipProvider>
                      <div className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Link href={`/meetings/${meeting.id}`}>
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
                              onClick={() => openEditDialog(meeting)}
                              disabled={!canEditMeeting(meeting)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {canEditMeeting(meeting) ? "Edit Meeting" : "You can only edit your own group's meetings"}
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(meeting)}
                              disabled={!canEditMeeting(meeting)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {canEditMeeting(meeting) ? "Delete Meeting" : "You can only delete your own group's meetings"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TooltipProvider>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Calendar View */
        <div className="grid gap-4">
          {getCalendarDates().map((date) => {
            const dayMeetings = getMeetingsForDate(date);
            const today = isToday(date);
            const hasMeetings = dayMeetings.length > 0;

            if (!hasMeetings && !today) {
              // Only show dates with meetings or today's date
              return null;
            }

            return (
              <Card key={date.toISOString()} className={`border-gray-200 ${today ? "border-red-200 bg-red-50/30" : ""}`}>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`text-center min-w-[60px] ${today ? "text-red-600" : "text-gray-900"}`}>
                      <div className="text-xs font-medium uppercase">
                        {date.toLocaleDateString("en-US", { weekday: "short" })}
                      </div>
                      <div className="text-2xl font-semibold">{date.getDate()}</div>
                      <div className="text-xs text-gray-500">{date.toLocaleDateString("en-US", { month: "short" })}</div>
                    </div>
                    <div className="flex-1">
                      {hasMeetings ? (
                        <div className="space-y-2">
                          {dayMeetings.map((meeting) => {
                            const stats = getAttendanceStats(meeting);
                            const past = isPast(meeting.date);

                            return (
                              <div
                                key={meeting.id}
                                className={`p-3 rounded-lg border border-gray-200 bg-white hover:border-red-200 hover:bg-red-50/50 transition-colors ${
                                  past ? "opacity-75" : ""
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="text-sm font-semibold text-gray-900">{meeting.title}</h4>
                                      {past ? (
                                        <Badge
                                          variant="outline"
                                          className="bg-gray-100 text-gray-700 border-gray-200 text-xs"
                                        >
                                          Past
                                        </Badge>
                                      ) : (
                                        <Badge
                                          variant="outline"
                                          className="bg-green-50 text-green-700 border-green-200 text-xs"
                                        >
                                          Upcoming
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatTime(meeting.date)}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        {meeting.group.name}
                                      </span>
                                      {meeting.location && (
                                        <span className="flex items-center gap-1">
                                          <MapPin className="h-3 w-3" />
                                          {meeting.location}
                                        </span>
                                      )}
                                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                        {stats.attended}/{stats.total} attended
                                      </Badge>
                                    </div>
                                  </div>
                                  <TooltipProvider>
                                    <div className="flex items-center gap-1">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Link href={`/meetings/${meeting.id}`}>
                                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                              <Eye className="h-3 w-3" />
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
                                            className="h-7 w-7 p-0"
                                            onClick={() => openEditDialog(meeting)}
                                            disabled={!canEditMeeting(meeting)}
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {canEditMeeting(meeting) ? "Edit" : "You can only edit your own group's meetings"}
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0"
                                            onClick={() => openDeleteDialog(meeting)}
                                            disabled={!canEditMeeting(meeting)}
                                          >
                                            <Trash2 className="h-3 w-3 text-red-600" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          {canEditMeeting(meeting)
                                            ? "Delete"
                                            : "You can only delete your own group's meetings"}
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </TooltipProvider>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 italic">No meetings scheduled</div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Meeting Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule New Meeting</DialogTitle>
            <DialogDescription>Create a new meeting for a group</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="group">Group *</Label>
              <Select value={formData.groupId} onValueChange={(value) => setFormData({ ...formData, groupId: value })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="title">Meeting Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1.5"
                placeholder="e.g., Weekly Networking Meeting"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="time">Time *</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="mt-1.5"
                />
              </div>
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
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1.5"
                placeholder="Any additional information..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdd} className="bg-red-600 hover:bg-red-700">
              Schedule Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Meeting Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Meeting</DialogTitle>
            <DialogDescription>Update meeting information</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Group</Label>
              <Input value={selectedMeeting?.group.name} disabled className="mt-1.5 bg-gray-50" />
            </div>
            <div>
              <Label htmlFor="edit-title">Meeting Title *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-date">Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="edit-time">Time *</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="mt-1.5"
                />
              </div>
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
            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} className="bg-red-600 hover:bg-red-700">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Meeting</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-semibold">{selectedMeeting?.title}</span>? This will also
              delete all attendance records. This action cannot be undone.
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
