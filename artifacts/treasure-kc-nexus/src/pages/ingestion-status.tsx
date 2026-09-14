import { useGetWorkerIngestionRuns } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "success") return "default";
  if (status === "partial_failure") return "secondary";
  return "outline";
}

export default function IngestionStatusPage() {
  const { data, isLoading } = useGetWorkerIngestionRuns();

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Ingestion Status</h2>
        <p className="text-muted-foreground">Monitor source ingestion runs and failures.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Last Run</CardTitle></CardHeader>
          <CardContent>
            {data?.lastRun ? format(new Date(data.lastRun.runAt), "PPP p") : "No runs yet"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Current Status</CardTitle></CardHeader>
          <CardContent>
            {data?.currentRun ? <Badge variant={statusVariant(data.currentRun.status)}>{data.currentRun.status}</Badge> : "Idle"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Recent Failures</CardTitle></CardHeader>
          <CardContent>
            {data?.recentRuns.filter((run) => run.failed > 0).length ?? 0}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Runs</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Run At</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Processed</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Failed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.recentRuns ?? []).map((run) => (
                <TableRow key={run.id}>
                  <TableCell>{format(new Date(run.runAt), "MMM d, yyyy p")}</TableCell>
                  <TableCell>{run.sourceId}</TableCell>
                  <TableCell><Badge variant={statusVariant(run.status)}>{run.status}</Badge></TableCell>
                  <TableCell>{run.recordsProcessed}</TableCell>
                  <TableCell>{run.added}</TableCell>
                  <TableCell>{run.updated}</TableCell>
                  <TableCell>{run.failed}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
