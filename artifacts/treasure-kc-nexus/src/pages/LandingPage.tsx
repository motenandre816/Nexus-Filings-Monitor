import React from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ChevronRight, Database, Zap, ArrowRight, Activity, Globe, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      <header className="border-b border-white/5 sticky top-0 z-50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <span className="font-bold text-primary-foreground text-sm">TK</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Treasure</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/sign-up">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg shadow-primary/20">
                Get API Access
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative pt-32 pb-24 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>
          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                Kansas & Missouri SOS Data Live
              </div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
                Every New LLC Filed in KC. <span className="text-primary">Delivered Instantly.</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl">
                The definitive data pipeline for B2B sales, recruiters, and lead generation agencies. We scrape the Kansas and Missouri state registries daily and push the data directly to your webhook.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/sign-up">
                  <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20">
                    Start Your Free Trial <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-base border-white/10 hover:bg-white/5">
                  View API Docs
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Data Fields Section */}
        <section className="py-24 bg-card/30 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Precision Data Payload</h2>
              <p className="text-muted-foreground text-lg">Everything you need to qualify and contact new businesses.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: "Entity Details", desc: "Legal business name, filing status, state of registration, and unique filing ID.", icon: Database },
                { title: "Location Data", desc: "Registered city, state, and complete mailing addresses for localized targeting.", icon: Globe },
                { title: "Agent Information", desc: "Registered agent name and address to bypass gatekeepers and reach decision makers.", icon: Activity }
              ].map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.5 }}
                  className="bg-card border border-white/5 rounded-2xl p-8"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How it Works / JSON Snippet */}
        <section className="py-24">
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">Zero-Friction Integration</h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                Forget building brittle scrapers and solving captchas. Our infrastructure handles the daily extraction, normalization, and delivery. You just provide a webhook URL.
              </p>
              <ul className="space-y-6">
                {[
                  "Daily automated extraction from KS & MO registries",
                  "Data normalization and deduplication",
                  "Instant HTTP POST delivery to your endpoint",
                  "Built-in AI tools for outreach generation"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                    <span className="text-white/90 text-lg">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="rounded-2xl border border-white/10 bg-[#0d1117] p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50"></div>
              <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                <span className="ml-2 text-xs font-mono text-muted-foreground">webhook-payload.json</span>
              </div>
              <pre className="text-sm font-mono text-gray-300 overflow-x-auto">
{`{
  "event": "llc.created",
  "data": {
    "entityName": "APEX LOGISTICS LLC",
    "filingDate": "2023-10-24T00:00:00Z",
    "state": "MO",
    "city": "KANSAS CITY",
    "status": "Active",
    "agent": {
      "name": "JOHN DOE",
      "address": "123 MAIN ST, STE 400..."
    }
  }
}`}
              </pre>
            </motion.div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-24 bg-card/30 border-y border-white/5 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Transparent Pricing</h2>
              <p className="text-muted-foreground text-lg">Simple plans for unlimited access.</p>
            </div>
            
             <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
              {/* Starter Plan */}
               <div className="bg-card border border-primary/30 rounded-3xl p-8 relative flex flex-col shadow-xl">
                <div className="space-y-6 flex-1">
                   <div className="flex items-center justify-between gap-4">
                     <h3 className="text-2xl font-bold text-white">Free</h3>
                     <span className="text-xs font-semibold uppercase tracking-wider text-primary">No card required</span>
                   </div>
                  <div className="flex items-end gap-2">
                     <span className="text-5xl font-bold text-white">$0</span>
                     <span className="text-xl text-muted-foreground mb-1">forever</span>
                  </div>
                   <p className="text-muted-foreground">Explore the platform and test the API before you pay.</p>
                  
                  <div className="space-y-4 pt-4">
                    {[
                       "Preview KS + MO LLC filings",
                       "Up to 25 leads per request",
                       "JSON API: /api/fresh_llcs?state=KS",
                       "Dashboard access and manual refresh",
                       "No payment required"
                    ].map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-white/80">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-8 mt-auto">
                  <Link href="/sign-up" className="block w-full">
                    <Button size="lg" variant="outline" className="w-full h-14 text-base border-white/10 hover:bg-white/5">
                       Start Free
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Pro Plan */}
              <div className="bg-card border border-primary rounded-3xl p-8 relative flex flex-col shadow-2xl shadow-primary/20 scale-100 md:scale-105 z-10 overflow-hidden">
                <div className="absolute top-0 right-0 p-8">
                  <Zap className="w-12 h-12 text-primary opacity-20" />
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-b-lg uppercase tracking-wider">
                  Most Popular
                </div>
                
                <div className="space-y-6 flex-1 pt-4">
                  <h3 className="text-2xl font-bold text-white">Pro</h3>
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-bold text-white">$99</span>
                    <span className="text-xl text-muted-foreground mb-1">/ month</span>
                  </div>
                  <p className="text-muted-foreground">Everything you need to power your sales engine.</p>
                  
                  <div className="space-y-4 pt-4">
                    {[
                       "All states + full daily data",
                       "Higher API limits",
                       "JSON API + Grok AI outreach",
                      "Instant webhook to your app",
                      "Priority support",
                      "Custom outreach templates"
                    ].map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-white/90 font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-8 mt-auto">
                  <Link href="/sign-up" className="block w-full">
                    <Button size="lg" className="w-full h-14 text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-xl shadow-primary/20">
                       Contact Us
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

             <p className="text-center text-sm text-muted-foreground mb-24 max-w-xl mx-auto">
               Start free with no credit card. Paid plans can be activated later when billing is connected.
            </p>

            {/* API Sample */}
            <div className="max-w-4xl mx-auto text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-4">Developer Ready API</h2>
              <p className="text-muted-foreground text-lg mb-8">Direct JSON access to daily filings.</p>
              
              <div className="text-left rounded-2xl border border-white/10 bg-[#0d1117] p-6 shadow-2xl overflow-hidden">
                <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                  <span className="ml-2 text-xs font-mono text-muted-foreground">GET /api/fresh_llcs?state=KS</span>
                </div>
                <pre className="text-sm font-mono text-gray-300 overflow-x-auto">
{`{
  "date": "2025-04-05",
  "state": "KS",
  "total": 12,
  "llcs": [
    {
      "id": 1,
      "name": "Heartland Ventures LLC",
      "city": "Overland Park",
      "state": "KS",
      "address": "4821 Oak Ave, Overland Park, KS 66062",
      "filingDate": "2025-04-05",
      "filingId": "KS-2025-00841"
    }
  ]
}`}
                </pre>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-background py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="font-bold text-primary-foreground text-[10px]">TK</span>
            </div>
            <div>
              <span className="font-bold text-sm text-white">Treasure</span>
              <span className="text-xs text-muted-foreground ml-2">A Treasure Network Company</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Moten Global Solutions LLC. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
