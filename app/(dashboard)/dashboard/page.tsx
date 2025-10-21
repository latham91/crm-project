import { auth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, UsersRound, Calendar, TrendingUp, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const stats = [
    { name: "Total Members", value: "0", icon: Users, color: "text-red-600", bgColor: "bg-red-50" },
    { name: "Active Groups", value: "0", icon: UsersRound, color: "text-orange-600", bgColor: "bg-orange-50" },
    { name: "Meetings", value: "0", icon: Calendar, color: "text-amber-600", bgColor: "bg-amber-50" },
    { name: "Attendance", value: "0%", icon: TrendingUp, color: "text-green-600", bgColor: "bg-green-50" },
  ];

  const quickActions = [
    { name: "Add Member", href: "/members", icon: Users, description: "Add a new member to your CRM" },
    { name: "Create Group", href: "/groups", icon: UsersRound, description: "Start a new networking group" },
    { name: "Schedule Meeting", href: "/meetings", icon: Calendar, description: "Plan your next meeting" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {session.user.username}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name} className="p-6 border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="p-6 border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.name} href={action.href}>
                  <Button
                    variant="outline"
                    className="w-full justify-between h-auto py-3 px-4 hover:bg-gray-50 hover:border-gray-300"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{action.name}</p>
                        <p className="text-xs text-gray-500">{action.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </Button>
                </Link>
              );
            })}
          </div>
        </Card>

        {/* Quick Stats */}
        <Card className="p-6 border-gray-200">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Stats</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">New members this week</span>
              <span className="text-sm font-medium text-gray-900">0</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Meetings scheduled</span>
              <span className="text-sm font-medium text-gray-900">0</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Average attendance</span>
              <span className="text-sm font-medium text-gray-900">0%</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Active group leaders</span>
              <span className="text-sm font-medium text-gray-900">0</span>
            </div>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6 border-gray-200 lg:col-span-2">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="text-center py-12">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-3">
              <Calendar className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No recent activity</p>
            <p className="text-xs text-gray-400 mt-1">Activity will appear here as you use the CRM</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
