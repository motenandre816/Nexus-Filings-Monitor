import { useState } from "react";
import { useGetLlcs } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, Building, ChevronRight, FileText } from "lucide-react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";

export default function BrowseLlcs() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("ALL");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data, isLoading } = useGetLlcs({
    search: search || undefined,
    state: stateFilter === "ALL" ? undefined : stateFilter,
    limit,
    offset: page * limit,
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto flex flex-col h-full">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">LLC Database</h2>
          <p className="text-muted-foreground">Browse and search all stored LLC filings.</p>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by LLC name or city..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="pl-9 w-full bg-background"
            data-testid="input-search"
          />
        </div>
        <div className="w-[180px]">
          <Select
            value={stateFilter}
            onValueChange={(val) => {
              setStateFilter(val);
              setPage(0);
            }}
          >
            <SelectTrigger data-testid="select-state" className="bg-background">
              <SelectValue placeholder="All States" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All States</SelectItem>
              <SelectItem value="KS">Kansas (KS)</SelectItem>
              <SelectItem value="MO">Missouri (MO)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg bg-card shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
              <TableRow>
                <TableHead>LLC Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Filing Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))
              ) : data?.llcs && data.llcs.length > 0 ? (
                data.llcs.map((llc) => (
                  <TableRow 
                    key={llc.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setLocation(`/llcs/${llc.id}`)}
                    data-testid={`row-llc-${llc.id}`}
                  >
                    <TableCell className="font-medium text-card-foreground">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        {llc.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        {llc.city ? `${llc.city}, ${llc.state}` : llc.state}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <FileText className="w-3.5 h-3.5" />
                        {format(new Date(llc.filingDate), "MMM d, yyyy")}
                      </div>
                    </TableCell>
                    <TableCell>
                      {llc.recruited ? (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700">Recruited</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No LLCs found matching your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {data && (
          <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {page * limit + 1} to {Math.min((page + 1) * limit, data.total)} of {data.total} LLCs
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0 || isLoading}
                data-testid="btn-prev-page"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={!data || (page + 1) * limit >= data.total || isLoading}
                data-testid="btn-next-page"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
