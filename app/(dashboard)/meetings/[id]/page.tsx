"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, FileText, Users, CheckCircle, X, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      email: string;
    };
  };
  attendance: Array<{
    id: string;
    status: "ATTENDED" | "NO_SHOW" | "CANCELLED" | "EXCUSED";
    checkedInAt: string | null;
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

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingAttendance, setUpdatingAttendance] = useState<string | null>(null);

  useEffect(() => {
    const fetchMeetingDetails = async () => {
      try {
        const response = await fetch(`/api/meetings/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setMeeting(data);
        } else {
          toast.error("Failed to load meeting details");
          router.push("/meetings");
          return;
        }
      } catch (error) {
        toast.error("An error occurred while loading meeting details");
        router.push("/meetings");
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchMeetingDetails();
    }
  }, [params.id, router]);

  const handleAttendanceUpdate = async (memberId: string, status: string) => {
    setUpdatingAttendance(memberId);

    try {
      const response = await fetch(`/api/meetings/${params.id}/attendance`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, status }),
      });

      if (response.ok) {
        // Update local state
        setMeeting((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            attendance: prev.attendance.map((att) =>
              att.member.id === memberId
                ? { ...att, status: status as any, checkedInAt: status === "ATTENDED" ? new Date().toISOString() : null }
                : att
            ),
          };
        });
        toast.success("Attendance updated");
      } else {
        toast.error("Failed to update attendance");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setUpdatingAttendance(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      ATTENDED: "bg-green-100 text-green-700 border-green-200",
      NO_SHOW: "bg-red-100 text-red-700 border-red-200",
      CANCELLED: "bg-gray-100 text-gray-700 border-gray-200",
      EXCUSED: "bg-blue-100 text-blue-700 border-blue-200",
    };
    return (
      <Badge className={`${variants[status as keyof typeof variants]} border text-xs`}>{status.replace("_", " ")}</Badge>
    );
  };

  const getAttendanceStats = () => {
    if (!meeting) return { attended: 0, noShow: 0, excused: 0, cancelled: 0, total: 0 };

    const attended = meeting.attendance.filter((a) => a.status === "ATTENDED").length;
    const noShow = meeting.attendance.filter((a) => a.status === "NO_SHOW").length;
    const excused = meeting.attendance.filter((a) => a.status === "EXCUSED").length;
    const cancelled = meeting.attendance.filter((a) => a.status === "CANCELLED").length;
    const total = meeting.attendance.length;

    return { attended, noShow, excused, cancelled, total };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
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

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-red-600"></div>
        </div>
      </div>
    );
  }

  if (!meeting) {
    return null;
  }

  const canEditMeeting = () => {
    // Super admins can edit anything, regular admins can only edit their own group's meetings
    return session?.user.role === "SUPER_ADMIN" || meeting.group.leader.id === session?.user.id;
  };

  const stats = getAttendanceStats();
  const past = isPast(meeting.date);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link href="/meetings">
          <Button variant="ghost" className="gap-2 mb-4 -ml-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Meetings
          </Button>
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{meeting.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {meeting.group.name} • Led by {meeting.group.leader.username}
            </p>
          </div>
          <div className="flex gap-2">
            {!canEditMeeting() && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                View Only
              </Badge>
            )}
            {past ? (
              <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
                Past Meeting
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Upcoming
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Meeting Information Card */}
        <Card className="md:col-span-2 border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Meeting Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Calendar className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Date & Time</p>
                  <p className="text-sm font-medium text-gray-900">{formatDate(meeting.date)}</p>
                  <p className="text-sm text-gray-600">{formatTime(meeting.date)}</p>
                </div>
              </div>

              {meeting.location && (
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <MapPin className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Location</p>
                    <p className="text-sm font-medium text-gray-900">{meeting.location}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Users className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Group</p>
                  <Link href={`/groups/${meeting.group.id}`} className="text-sm font-medium text-red-600 hover:text-red-700">
                    {meeting.group.name}
                  </Link>
                </div>
              </div>
            </div>

            {meeting.notes && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileText className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{meeting.notes}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Card */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">Attendance Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Attended</span>
                <span className="text-2xl font-semibold text-green-600">{stats.attended}</span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-600"
                  style={{ width: `${stats.total > 0 ? (stats.attended / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">No Show</span>
                <span className="text-2xl font-semibold text-red-600">{stats.noShow}</span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600"
                  style={{ width: `${stats.total > 0 ? (stats.noShow / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Excused</span>
                <span className="text-2xl font-semibold text-blue-600">{stats.excused}</span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${stats.total > 0 ? (stats.excused / stats.total) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Tracking */}
      <Card className="border-gray-200 mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Attendance Tracking</CardTitle>
          <CardDescription>Mark attendance for each member</CardDescription>
        </CardHeader>
        <CardContent>
          {meeting.attendance.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-3">
                <AlertCircle className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">No members registered for this meeting</p>
            </div>
          ) : (
            <div className="space-y-2">
              {meeting.attendance.map((attendanceRecord) => (
                <div
                  key={attendanceRecord.id}
                  className="p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Link
                            href={`/members/${attendanceRecord.member.id}`}
                            className="text-sm font-medium text-gray-900 hover:text-red-600"
                          >
                            {attendanceRecord.member.firstName} {attendanceRecord.member.lastName}
                          </Link>
                          {attendanceRecord.member.category && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                              {attendanceRecord.member.category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">{attendanceRecord.member.email}</p>
                        {attendanceRecord.member.company && (
                          <p className="text-xs text-gray-500">{attendanceRecord.member.company}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(attendanceRecord.status)}
                        {attendanceRecord.checkedInAt && (
                          <span className="text-xs text-gray-500">
                            <Clock className="h-3 w-3 inline mr-1" />
                            {new Date(attendanceRecord.checkedInAt).toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="w-40">
                      <Select
                        value={attendanceRecord.status}
                        onValueChange={(value) => handleAttendanceUpdate(attendanceRecord.member.id, value)}
                        disabled={!canEditMeeting() || updatingAttendance === attendanceRecord.member.id}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ATTENDED">
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              <span>Attended</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="NO_SHOW">
                            <div className="flex items-center gap-2">
                              <X className="h-3 w-3 text-red-600" />
                              <span>No Show</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="EXCUSED">
                            <div className="flex items-center gap-2">
                              <FileText className="h-3 w-3 text-blue-600" />
                              <span>Excused</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="CANCELLED">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-3 w-3 text-gray-600" />
                              <span>Cancelled</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
