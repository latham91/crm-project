"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Calendar,
  FileText,
  Users,
  MapPin,
  MessageSquarePlus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "next-auth/react";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  company: string | null;
  category: string | null;
  membershipType: "ACTIVE" | "INACTIVE" | "PENDING" | "EXPIRED";
  notes: string | null;
  createdAt: string;
}

interface AttendanceRecord {
  id: string;
  status: "ATTENDED" | "NO_SHOW" | "CANCELLED" | "EXCUSED";
  meeting: {
    id: string;
    title: string;
    date: string;
  };
}

interface GroupMembership {
  id: string;
  groupId: string;
  groupName: string;
  joinedAt: string;
}

interface MemberNote {
  id: string;
  note: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
}

export default function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [member, setMember] = useState<Member | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [groups, setGroups] = useState<GroupMembership[]>([]);
  const [notes, setNotes] = useState<MemberNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [isAddingNote, setIsAddingNote] = useState(false);

  useEffect(() => {
    const fetchMemberDetails = async () => {
      try {
        // Fetch member details
        const memberResponse = await fetch(`/api/members/${params.id}`);
        if (memberResponse.ok) {
          const memberData = await memberResponse.json();
          setMember(memberData);
        } else {
          toast.error("Failed to load member details");
          router.push("/members");
          return;
        }

        // Fetch member history (attendance and groups)
        const historyResponse = await fetch(`/api/members/${params.id}/history`);
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setAttendance(historyData.attendance || []);
          setGroups(historyData.groups || []);
        }

        // Fetch member notes
        const notesResponse = await fetch(`/api/members/${params.id}/notes`);
        if (notesResponse.ok) {
          const notesData = await notesResponse.json();
          setNotes(notesData);
        }
      } catch (error) {
        toast.error("An error occurred while loading member details");
        router.push("/members");
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchMemberDetails();
    }
  }, [params.id, router]);

  const getStatusBadge = (status: Member["membershipType"]) => {
    const variants = {
      ACTIVE: "bg-green-100 text-green-700 border-green-200",
      INACTIVE: "bg-gray-100 text-gray-700 border-gray-200",
      PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
      EXPIRED: "bg-red-100 text-red-700 border-red-200",
    };
    return <Badge className={`${variants[status]} border`}>{status}</Badge>;
  };

  const getAttendanceBadge = (status: AttendanceRecord["status"]) => {
    const variants = {
      ATTENDED: "bg-green-100 text-green-700 border-green-200",
      NO_SHOW: "bg-red-100 text-red-700 border-red-200",
      CANCELLED: "bg-gray-100 text-gray-700 border-gray-200",
      EXCUSED: "bg-blue-100 text-blue-700 border-blue-200",
    };
    return <Badge className={`${variants[status]} border text-xs`}>{status.replace("_", " ")}</Badge>;
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error("Please enter a note");
      return;
    }

    setIsAddingNote(true);
    try {
      const response = await fetch(`/api/members/${params.id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNote }),
      });

      if (response.ok) {
        const addedNote = await response.json();
        setNotes([addedNote, ...notes]);
        setNewNote("");
        toast.success("Note added successfully");
      } else {
        toast.error("Failed to add note");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const response = await fetch(`/api/members/${params.id}/notes/${noteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setNotes(notes.filter((note) => note.id !== noteId));
        toast.success("Note deleted successfully");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to delete note");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
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

  if (!member) {
    return null;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/members">
          <Button variant="ghost" className="gap-2 mb-4 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Members
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {member.firstName} {member.lastName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Member details and activity</p>
          </div>
          {getStatusBadge(member.membershipType)}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Member Information Card */}
        <Card className="md:col-span-2 border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Mail className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Email</p>
                  <p className="text-sm font-medium text-gray-900">{member.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Phone className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Phone</p>
                  <p className="text-sm font-medium text-gray-900">{member.phone || "Not provided"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Building className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Company</p>
                  <p className="text-sm font-medium text-gray-900">{member.company || "Not provided"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Users className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Business Category</p>
                  <p className="text-sm font-medium text-gray-900">{member.category || "Not specified"}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Member Since</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(member.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            </div>

            {member.notes && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileText className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{member.notes}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Card */}
        <div className="space-y-6">
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-500">Groups</span>
                  <span className="text-2xl font-semibold text-gray-900">{groups.length}</span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-600" style={{ width: `${Math.min(groups.length * 20, 100)}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-500">Meetings</span>
                  <span className="text-2xl font-semibold text-gray-900">{attendance.length}</span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-600" style={{ width: `${Math.min(attendance.length * 10, 100)}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-500">Attended</span>
                  <span className="text-2xl font-semibold text-gray-900">
                    {attendance.filter((a) => a.status === "ATTENDED").length}
                  </span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600"
                    style={{
                      width: `${
                        attendance.length > 0
                          ? (attendance.filter((a) => a.status === "ATTENDED").length / attendance.length) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Groups and Attendance */}
      <div className="grid gap-6 md:grid-cols-2 mt-6">
        {/* Groups Card */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Groups</CardTitle>
            <CardDescription>Networking groups this member belongs to</CardDescription>
          </CardHeader>
          <CardContent>
            {groups.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-3">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">Not a member of any groups yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((membership) => (
                  <Link
                    key={membership.id}
                    href={`/groups/${membership.groupId}`}
                    className="block p-3 rounded-lg border border-gray-200 hover:border-red-200 hover:bg-red-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded">
                        <Users className="h-4 w-4 text-gray-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{membership.groupName}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance History Card */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Attendance History</CardTitle>
            <CardDescription>Recent meeting attendance records</CardDescription>
          </CardHeader>
          <CardContent>
            {attendance.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-3">
                  <MapPin className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No attendance records yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {attendance.slice(0, 10).map((record) => (
                  <div key={record.id} className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{record.meeting.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(record.meeting.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      {getAttendanceBadge(record.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Notes */}
      <Card className="border-gray-200 mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Activity Notes</CardTitle>
          <CardDescription>Track interactions and important information about this member</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Note Form */}
          <div className="space-y-3">
            <Textarea
              placeholder="Add a note about this member..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[100px]"
            />
            <Button
              onClick={handleAddNote}
              disabled={isAddingNote || !newNote.trim()}
              className="gap-2 bg-red-600 hover:bg-red-700"
            >
              <MessageSquarePlus className="h-4 w-4" />
              {isAddingNote ? "Adding..." : "Add Note"}
            </Button>
          </div>

          {/* Notes List */}
          <div className="border-t border-gray-200 pt-4">
            {notes.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-3">
                  <FileText className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">No activity notes yet</p>
                <p className="text-xs text-gray-400 mt-1">Add your first note to start tracking interactions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="p-4 rounded-lg border border-gray-200 bg-gray-50/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.note}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="font-medium">{note.user.username}</span>
                          <span>•</span>
                          <span>
                            {new Date(note.createdAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                      {(session?.user.id === note.user.id || session?.user.role === "SUPER_ADMIN") && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
