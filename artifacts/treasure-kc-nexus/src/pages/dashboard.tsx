import { useGetDashboardStats, useGetRecentActivity, useGetLlcsByCity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, MapPin, CheckCircle, Clock, FileText, Activity } from "lucide-react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({ limit: 5 });
  const { data: cityCounts, isLoading: cityLoading } = useGetLlcsByCity();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Command Center</h2>
        <p className="text-muted-foreground">Overview of LLC filings and recruitment status.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total LLCs Found</CardTitle>
            <Building className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-7 w-20" /> : (
              <div className="text-2xl font-bold text-card-foreground" data-testid="stat-total">{stats?.totalLlcs.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Across KS & MO</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Filings</CardTitle>
            <Activity className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-7 w-20" /> : (
              <div className="text-2xl font-bold text-card-foreground" data-testid="stat-today">{stats?.todayLlcs.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">New opportunities</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recruited</CardTitle>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-7 w-20" /> : (
              <div className="text-2xl font-bold text-card-foreground" data-testid="stat-recruited">{stats?.recruitedCount.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">In Treasure</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Recruitment</CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {statsLoading ? <Skeleton className="h-7 w-20" /> : (
              <div className="text-2xl font-bold text-card-foreground" data-testid="stat-pending">{stats?.pendingRecruitment.toLocaleString()}</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">Needs outreach</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 bg-card">
          <CardHeader>
            <CardTitle>Filings by City</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {cityLoading ? (
              <div className="h-full flex items-center justify-center"><Skeleton className="h-full w-full" /></div>
            ) : cityCounts && cityCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cityCounts} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="city" type="category" axisLine={false} tickLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} width={100} />
                  <Tooltip 
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--popover-foreground))' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {cityCounts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
        
        <Card className="col-span-3 bg-card">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="space-y-4">
                {activity.map((llc) => (
                  <div key={llc.id} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="flex items-start gap-3 overflow-hidden">
                      <div className="mt-0.5">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <Link href={`/llcs/${llc.id}`} className="text-sm font-medium text-card-foreground hover:underline truncate block" data-testid={`activity-llc-${llc.id}`}>
                          {llc.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {llc.city || 'Unknown City'}, {llc.state}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-muted-foreground mb-1 whitespace-nowrap">
                        {format(new Date(llc.filingDate), "MMM d")}
                      </span>
                      {llc.recruited ? (
                        <Badge variant="default" className="text-[10px] px-1 py-0 h-4">Recruited</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">New</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No recent activity</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
