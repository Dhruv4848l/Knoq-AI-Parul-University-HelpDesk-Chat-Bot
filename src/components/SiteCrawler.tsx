import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { startCrawl, syncCrawl, generateFaqsFromPages, getCrawlJob, listCrawlJobs, scrapedStats } from "@/lib/crawl.functions";
import { Globe, Play, Loader2, CheckCircle2, AlertCircle, Database, Sparkles } from "lucide-react";

type Job = {
  id: string;
  status: string;
  source_url: string;
  pages_discovered: number;
  pages_scraped: number;
  pages_embedded: number;
  faqs_generated: number;
  error: string | null;
  started_at: string;
};

export function SiteCrawler() {
  const qc = useQueryClient();
  const start = useServerFn(startCrawl);
  const sync = useServerFn(syncCrawl);
  const genFaqs = useServerFn(generateFaqsFromPages);
  const getJob = useServerFn(getCrawlJob);
  const listJobs = useServerFn(listCrawlJobs);
  const getStats = useServerFn(scrapedStats);

  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [autoRun, setAutoRun] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  const pushLog = (s: string) => setLog((l) => [...l.slice(-50), `${new Date().toLocaleTimeString()} · ${s}`]);

  const { data: stats } = useQuery({ queryKey: ["scraped-stats"], queryFn: () => getStats(), refetchInterval: autoRun ? 3000 : false });
  const { data: jobsData } = useQuery({ queryKey: ["crawl-jobs"], queryFn: () => listJobs(), refetchInterval: autoRun ? 5000 : 10000 });

  const { data: jobData } = useQuery({
    queryKey: ["crawl-job", activeJobId],
    queryFn: () => getJob({ data: { jobId: activeJobId! } }),
    enabled: !!activeJobId,
    refetchInterval: autoRun ? 3000 : false,
  });
  const job = jobData?.job as Job | undefined;

  const startMut = useMutation({
    mutationFn: () => start({ data: { url: "https://www.paruluniversity.ac.in", limit: 2000 } }),
    onSuccess: (r) => {
      pushLog(`Crawl started · Firecrawl ID ${r.firecrawlId}`);
      setActiveJobId(r.jobId);
      setAutoRun(true);
      qc.invalidateQueries({ queryKey: ["crawl-jobs"] });
    },
    onError: (e: Error) => pushLog(`ERROR starting: ${e.message}`),
  });

  // Auto sync loop
  useEffect(() => {
    if (!autoRun || !activeJobId) return;
    let cancelled = false;
    let busy = false;

    const tick = async () => {
      if (cancelled || busy) return;
      busy = true;
      try {
        const j = await getJob({ data: { jobId: activeJobId } });
        const status = j.job.status;

        if (status === "crawling" || status === "syncing") {
          const r = await sync({ data: { jobId: activeJobId } });
          pushLog(`Synced · ${r.pagesScraped} pages stored · ${r.pagesEmbedded} embedded · status ${r.status}`);
          qc.invalidateQueries({ queryKey: ["crawl-job", activeJobId] });
          qc.invalidateQueries({ queryKey: ["scraped-stats"] });
        } else if (status === "completed" || status === "generating_faqs") {
          // Move on to FAQ generation
          if (status === "completed" && (j.job.faqs_generated ?? 0) === 0) {
            // mark to start generating
            pushLog("Crawl done. Starting FAQ generation…");
          }
          const r = await genFaqs({ data: { jobId: activeJobId, batchSize: 5 } });
          pushLog(`FAQ batch · processed ${r.processed ?? 0} pages · added ${r.generated} FAQs`);
          qc.invalidateQueries({ queryKey: ["scraped-stats"] });
          if (r.done) {
            pushLog("All done ✓");
            setAutoRun(false);
          }
        } else if (status === "failed") {
          pushLog(`Job failed: ${j.job.error ?? "unknown"}`);
          setAutoRun(false);
        }
      } catch (e) {
        pushLog(`ERROR: ${(e as Error).message}`);
      } finally {
        busy = false;
      }
    };

    const id = setInterval(tick, 4000);
    tick();
    return () => { cancelled = true; clearInterval(id); };
  }, [autoRun, activeJobId, sync, genFaqs, getJob, qc]);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [log]);

  const recentJobs = (jobsData?.jobs ?? []) as Job[];

  return (
    <section className="rounded-2xl border bg-card p-6 lg:col-span-2">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Globe className="size-5 text-primary" />
          <h2 className="text-2xl">Site Crawler & AI Training</h2>
        </div>
        <button
          onClick={() => startMut.mutate()}
          disabled={startMut.isPending || autoRun}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50"
        >
          {startMut.isPending || autoRun ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          {autoRun ? "Running…" : "Crawl paruluniversity.ac.in"}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat icon={Database} label="Pages scraped" value={stats?.pages ?? 0} />
        <Stat icon={Sparkles} label="Embedded for RAG" value={stats?.embedded ?? 0} />
        <Stat icon={CheckCircle2} label="FAQs generated" value={stats?.faqs ?? 0} />
      </div>

      {job && (
        <div className="rounded-xl border bg-background p-4 mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="font-medium">Current job · {job.status}</span>
            <span className="text-muted-foreground text-xs">
              {job.pages_scraped}/{job.pages_discovered || "?"} pages
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${job.pages_discovered ? Math.min(100, (job.pages_scraped / job.pages_discovered) * 100) : 5}%` }}
            />
          </div>
          {job.error && (
            <p className="mt-2 text-xs text-destructive flex items-center gap-1">
              <AlertCircle className="size-3" /> {job.error}
            </p>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Activity log</p>
          <div ref={logRef} className="h-48 overflow-y-auto rounded-lg border bg-background p-3 font-mono text-[11px] space-y-1">
            {log.length === 0 && <p className="text-muted-foreground">Click the crawl button to start. Progress will appear here.</p>}
            {log.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Recent crawls</p>
          <div className="h-48 overflow-y-auto rounded-lg border bg-background divide-y">
            {recentJobs.length === 0 && <p className="p-3 text-xs text-muted-foreground">No crawls yet.</p>}
            {recentJobs.map((j) => (
              <button
                key={j.id}
                onClick={() => { setActiveJobId(j.id); setAutoRun(j.status !== "completed" && j.status !== "failed"); }}
                className="w-full text-left p-3 text-xs hover:bg-accent/40 transition"
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-medium">{j.status}</span>
                  <span className="text-muted-foreground">{new Date(j.started_at).toLocaleString()}</span>
                </div>
                <span className="text-muted-foreground">
                  {j.pages_scraped} pages · {j.pages_embedded} embedded · {j.faqs_generated} FAQs
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Globe; label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <Icon className="size-4 text-primary mb-2" />
      <p className="text-2xl font-medium tabular-nums">{value.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
