import { useGetDashboardStats, useGetRecentActivity, useGetLlcsByCity, useGetNewLlcs, useMarkLlcRecruited, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Building, MapPin, CheckCircle, Clock, FileText, Activity } from "lucide-react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity({ limit: 5 });
  const { data: cityCounts, isLoading: cityLoading } = useGetLlcsByCity();
  const { data: newLlcsResponse, isLoading: newLlcsLoading } = useGetNewLlcs({});
  const recruitMutation = useMarkLlcRecruited();

  const handleRecruit = (id: number) => {
    recruitMutation.mutate({
      id,
      data: {
        recruitedAt: new Date().toISOString(),
        notes: "Hey new spot, join Treasure KC — earn free TKC for check-ins, your customers save $99."
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/new_llcs"] });
      }
    });
  };

  const newLlcs = newLlcsResponse?.llcs || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Command Center</h2>
        <p className="text-muted-foreground">Overview of LLC filings and recruitment status.</p>
      </div>

      <Card className="bg-card border-primary/20 shadow-md">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-2">
            <CardTitle>New LLCs Today</CardTitle>
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
              {newLlcsLoading ? "..." : newLlcs.length} New
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
            {newLlcsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : newLlcs.length > 0 ? (
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                  <TableRow>
                    <TableHead>Business Name</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>Filed</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {newLlcs.map((llc) => (
                    <TableRow key={llc.id}>
                      <TableCell className="font-medium">
                        <Link href={`/llcs/${llc.id}`} className="hover:underline text-primary">
                          {llc.name}
                        </Link>
                      </TableCell>
                      <TableCell>{llc.city || 'Unknown'}</TableCell>
                      <TableCell>{llc.state}</TableCell>
                      <TableCell>{format(new Date(llc.filingDate), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        {llc.recruited ? (
                          <Badge variant="default" className="bg-green-500/10 text-green-500 hover:bg-green-500/20 border-green-500/20">Recruited</Badge>
                        ) : (
                          <Button 
                            size="sm" 
                            onClick={() => handleRecruit(llc.id)}
                            disabled={recruitMutation.isPending}
                          >
                            Recruit
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-3">
                <p>No new filings today yet — trigger a scrape to pull fresh data.</p>
                <Link href="/scrape">
                  <Button variant="outline" size="sm">Go to Scrape Portal</Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
