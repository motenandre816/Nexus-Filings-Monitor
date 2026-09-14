import { useState } from "react";
import { useTriggerScrape, useTestWebhook, useGetWebhookConfig, getGetDashboardStatsQueryKey, getGetLlcsQueryKey, getGetRecentActivityQueryKey, getGetLlcsByCityQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileSearch, Activity, ServerCog, CheckCircle, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function ScrapeControl() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const triggerScrape = useTriggerScrape();
  const testWebhook = useTestWebhook();
  const { data: webhookConfig } = useGetWebhookConfig();

  const [state, setState] = useState("ALL");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [lastResult, setLastResult] = useState<{ found: number; stored: number; message: string } | null>(null);
  const [pingStatus, setPingStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleScrape = () => {
    triggerScrape.mutate({ data: { state, date } }, {
      onSuccess: (data) => {
        setLastResult(data);
        toast({
          title: "Scrape Complete",
          description: data.message,
        });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLlcsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetLlcsByCityQueryKey() });
      },
      onError: () => {
        toast({
          title: "Scrape Failed",
          description: "An error occurred during the scraping process.",
          variant: "destructive",
        });
      }
    });
  };

  const handleTestPing = () => {
    setPingStatus("loading");
    testWebhook.mutate(undefined, {
      onSuccess: (response) => {
        setPingStatus("success");
        toast({
          title: "Webhook Ping Successful",
          description: response.message,
        });
        setTimeout(() => setPingStatus("idle"), 3000);
      },
      onError: (error) => {
        setPingStatus("error");
        const errorData = (error as { data?: { message?: string; error?: string } } | null)?.data;
        const details = errorData?.error ?? errorData?.message ?? "Unable to reach the configured webhook endpoint.";
        toast({
          title: "Webhook Ping Failed",
          description: details,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Scraper Control</h2>
        <p className="text-muted-foreground">Manually trigger data collection and manage integrations.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card shadow-sm border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-primary" />
              Manual Execution
            </CardTitle>
            <CardDescription>Pull fresh LLC filings from state SOS databases.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Target State</Label>
              <RadioGroup value={state} onValueChange={setState} className="flex gap-4">
                <div className="flex items-center space-x-2 border p-3 rounded-md flex-1">
                  <RadioGroupItem value="ALL" id="all" data-testid="radio-state-all" />
                  <Label htmlFor="all" className="cursor-pointer">Both (KS & MO)</Label>
                </div>
                <div className="flex items-center space-x-2 border p-3 rounded-md flex-1">
                  <RadioGroupItem value="KS" id="ks" data-testid="radio-state-ks" />
                  <Label htmlFor="ks" className="cursor-pointer">Kansas</Label>
                </div>
                <div className="flex items-center space-x-2 border p-3 rounded-md flex-1">
                  <RadioGroupItem value="MO" id="mo" data-testid="radio-state-mo" />
                  <Label htmlFor="mo" className="cursor-pointer">Missouri</Label>
                </div>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label>Target Date</Label>
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                data-testid="input-scrape-date"
              />
              <p className="text-xs text-muted-foreground">State registries usually update records at midnight for the previous day.</p>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-4 pt-2">
            <Button 
              className="w-full" 
              onClick={handleScrape} 
              disabled={triggerScrape.isPending}
              data-testid="btn-trigger-scrape"
            >
              {triggerScrape.isPending ? "Scraping in progress..." : "Run Scraper Now"}
            </Button>

            {lastResult && (
              <div className="w-full bg-muted/50 border rounded-md p-4 text-sm mt-2">
                <div className="flex items-center gap-2 font-medium text-foreground mb-2">
                  <CheckCircle className="w-4 h-4 text-green-500" /> Execution Summary
                </div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs">Records Found</span>
                    <span className="font-semibold text-lg">{lastResult.found}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-muted-foreground text-xs">New Stored</span>
                    <span className="font-semibold text-lg text-primary">{lastResult.stored}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground border-t pt-2">{lastResult.message}</p>
              </div>
            )}
          </CardFooter>
        </Card>

        <div className="space-y-6">
          <Card className="bg-card shadow-sm border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ServerCog className="w-5 h-5 text-indigo-500" />
                Integration Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Treasure Portal</p>
                    <p className="text-xs text-muted-foreground font-mono">{webhookConfig?.webhookUrl ?? "loading..."}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Active
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                When an LLC is marked as recruited, their details are automatically pushed to the Treasure portal via webhook to initiate the onboarding process.
              </p>
              <Button 
                variant="outline" 
                onClick={handleTestPing}
                disabled={pingStatus === "loading" || testWebhook.isPending}
                className="w-full gap-2"
                data-testid="btn-test-ping"
              >
                <Activity className="w-4 h-4" />
                {pingStatus === "loading" ? "Pinging..." : pingStatus === "success" ? "Ping Successful!" : pingStatus === "error" ? "Ping Failed" : "Send Test Ping"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
