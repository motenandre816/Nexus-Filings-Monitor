import { useState } from "react";
import { useParams } from "wouter";
import { useGetLlcById, useMarkLlcRecruited, useGenerateOutreach, getGetDashboardStatsQueryKey, getGetLlcsQueryKey, getGetRecentActivityQueryKey, getGetLlcsByCityQueryKey, getGetLlcByIdQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, MapPin, User, FileText, CheckCircle, Copy, Sparkles, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function LlcDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: llc, isLoading, error } = useGetLlcById(id);
  
  const markRecruited = useMarkLlcRecruited();
  const generateOutreach = useGenerateOutreach();

  const [tone, setTone] = useState("professional");
  const [note, setNote] = useState("");
  const [generatedMessage, setGeneratedMessage] = useState("");

  const handleMarkRecruited = () => {
    markRecruited.mutate({ id, data: { note: note || undefined } }, {
      onSuccess: () => {
        toast({
          title: "Success",
          description: "LLC marked as recruited.",
        });
        queryClient.invalidateQueries({ queryKey: getGetLlcByIdQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLlcsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
      },
      onError: (err) => {
        toast({
          title: "Error",
          description: "Failed to mark as recruited.",
          variant: "destructive",
        });
      }
    });
  };

  const handleGenerateOutreach = () => {
    generateOutreach.mutate({ id, data: { tone } }, {
      onSuccess: (data) => {
        setGeneratedMessage(data.message);
        toast({
          title: "Outreach Generated",
          description: "AI has crafted your message.",
        });
      },
      onError: () => {
        toast({
          title: "Error",
          description: "Failed to generate outreach.",
          variant: "destructive",
        });
      }
    });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedMessage);
    toast({
      title: "Copied",
      description: "Message copied to clipboard.",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-12 w-1/2" />
        <div className="grid md:grid-cols-2 gap-6">
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (error || !llc) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold">LLC Not Found</h2>
        <p className="text-muted-foreground mt-2">The LLC you're looking for doesn't exist or there was an error.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">{llc.name}</h2>
            {llc.recruited ? (
              <Badge className="bg-green-600">Recruited</Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-600">Pending</Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-muted-foreground text-sm">
            <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {llc.city || 'Unknown'}, {llc.state}</span>
            <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> ID: {llc.filingId || 'N/A'}</span>
          </div>
        </div>
        
        {!llc.recruited && (
          <div className="flex items-center gap-2">
            <Button 
              onClick={handleMarkRecruited} 
              disabled={markRecruited.isPending}
              data-testid="btn-mark-recruited"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {markRecruited.isPending ? "Updating..." : "Mark Recruited"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card shadow-sm border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Filing Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Filing Date</p>
                <p className="font-medium text-card-foreground">{format(new Date(llc.filingDate), "MMMM d, yyyy")}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <p className="font-medium text-card-foreground capitalize">{llc.status}</p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground">
                <User className="w-4 h-4 text-muted-foreground" /> Registered Agent
              </h4>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Name</p>
                  <p className="text-sm font-medium">{llc.agentName || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Address</p>
                  <p className="text-sm">{llc.agentAddress || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {llc.recruited && (
              <div className="border-t pt-4 bg-muted/30 p-4 rounded-md">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" /> Recruitment Info
                </h4>
                <p className="text-xs text-muted-foreground mb-1">
                  Recruited on {llc.recruitedAt ? format(new Date(llc.recruitedAt), "MMM d, yyyy") : 'Unknown'}
                </p>
                {llc.recruitNote && (
                  <p className="text-sm mt-2 italic border-l-2 border-green-500 pl-2">"{llc.recruitNote}"</p>
                )}
              </div>
            )}

            {!llc.recruited && (
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Recruitment Note (Optional)</label>
                <Textarea 
                  placeholder="Notes about recruitment conversation..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="resize-none"
                  data-testid="input-recruit-note"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm border-border flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              Grok AI Outreach
            </CardTitle>
            <CardDescription>Generate a tailored message for the Treasure rewards program.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger data-testid="select-tone" className="bg-background">
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleGenerateOutreach} 
                disabled={generateOutreach.isPending}
                data-testid="btn-generate-outreach"
              >
                {generateOutreach.isPending ? "Generating..." : "Generate"}
              </Button>
            </div>

            <div className="flex-1 border rounded-md p-4 bg-muted/20 relative min-h-[200px]">
              {generateOutreach.isPending ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-[90%]" />
                  <Skeleton className="h-4 w-[95%]" />
                  <Skeleton className="h-4 w-[80%]" />
                </div>
              ) : generatedMessage ? (
                <>
                  <div className="text-sm whitespace-pre-wrap text-card-foreground leading-relaxed pb-8" data-testid="text-generated-message">
                    {generatedMessage}
                  </div>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="absolute bottom-2 right-2"
                    onClick={copyToClipboard}
                    data-testid="btn-copy-message"
                  >
                    <Copy className="w-4 h-4 mr-2" /> Copy
                  </Button>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm text-center">
                  Select a tone and click generate to create an outreach message tailored for {llc.name}.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
