import { useEffect, useRef, useState } from "react";
import api from "../api/client";
import { Globe, Play, Loader2, CheckCircle2, AlertCircle, Database, Sparkles } from "lucide-react";

export function SiteCrawler() {
  const [activeJobId, setActiveJobId] = useState(null);
  const [autoRun, setAutoRun] = useState(false);
  const [log, setLog] = useState([]);
  const [stats, setStats] = useState({ pages: 0, embedded: 0, faqs: 0 });
  const [recentJobs, setRecentJobs] = useState([]);
  const [job, setJob] = useState(null);
  const [isStarting, setIsStarting] = useState(false);
  const logRef = useRef(null);

  const pushLog = (s) => setLog(l => [...l.slice(-50), `${new Date().toLocaleTimeString()} · ${s}`]);
  const fetchStats = async () => { try { const r = await api.get('/crawl/stats'); setStats(r.data); } catch {} };
  const fetchJobs = async () => { try { const r = await api.get('/crawl/jobs'); setRecentJobs(r.data.jobs || []); } catch {} };
  const fetchJob = async (id) => { try { const r = await api.post('/crawl/job', { jobId: id }); setJob(r.data.job); return r.data.job; } catch { return null; } };

  useEffect(() => { fetchStats(); fetchJobs(); let id; if (autoRun) id = setInterval(() => { fetchStats(); fetchJobs(); }, 5000); return () => clearInterval(id); }, [autoRun]);

  const handleStart = async () => {
    setIsStarting(true);
    try {
      const res = await api.post('/crawl/start', { url: "https://www.paruluniversity.ac.in", limit: 100 });
      pushLog(`Crawl started · Firecrawl ID ${res.data.firecrawlId}`);
      setActiveJobId(res.data.jobId); setAutoRun(true); fetchJobs();
    } catch (e) { pushLog(`ERROR starting: ${e.response?.data?.error || e.message}`); }
    finally { setIsStarting(false); }
  };

  useEffect(() => {
    if (!autoRun || !activeJobId) return;
    let cancelled = false, busy = false;
    const tick = async () => {
      if (cancelled || busy) return; busy = true;
      try {
        const cj = await fetchJob(activeJobId); if (!cj) { busy = false; return; }
        if (cj.status === "crawling" || cj.status === "syncing") {
          const r = await api.post('/crawl/sync', { jobId: activeJobId });
          pushLog(`Synced · ${r.data.pagesScraped} pages · ${r.data.pagesEmbedded} embedded · ${r.data.status}`);
          fetchJob(activeJobId); fetchStats();
        } else if (cj.status === "completed" || cj.status === "generating_faqs") {
          const r = await api.post('/crawl/generate-faqs', { jobId: activeJobId, batchSize: 5 });
          pushLog(`FAQ batch · processed ${r.data.processed ?? 0} · added ${r.data.generated}`);
          fetchStats(); if (r.data.done) { pushLog("All done ✓"); setAutoRun(false); }
        } else if (cj.status === "failed") { pushLog(`Job failed: ${cj.error ?? "unknown"}`); setAutoRun(false); }
      } catch (e) { pushLog(`ERROR: ${e.response?.data?.error || e.message}`); }
      finally { busy = false; }
    };
    const id = setInterval(tick, 4000); tick();
    return () => { cancelled = true; clearInterval(id); };
  }, [autoRun, activeJobId]);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [log]);

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Globe size={18} style={{ color: 'var(--v2)' }} />
          <h2 style={{ fontSize: 18, fontWeight: 500, color: 'var(--text)' }}>Site Crawler & AI Training</h2>
        </div>
        <button onClick={handleStart} disabled={isStarting || autoRun} className="btn-glow" style={{ padding: '8px 16px', fontSize: 12 }}>
          {isStarting || autoRun ? <Loader2 size={14} style={{ animation: 'spin-slow 1s linear infinite' }} /> : <Play size={14} />}
          {autoRun ? "Running…" : "Crawl paruluniversity.ac.in"}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatBox icon={Database} label="Pages scraped" value={stats.pages} />
        <StatBox icon={Sparkles} label="Embedded for RAG" value={stats.embedded} />
        <StatBox icon={CheckCircle2} label="FAQs generated" value={stats.faqs} />
      </div>

      {/* Progress */}
      {job && (
        <div style={{ borderRadius: 'var(--r)', border: '0.5px solid var(--border)', background: 'var(--surface2)', padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
            <span style={{ fontWeight: 500, color: 'var(--text)' }}>Current job · {job.status}</span>
            <span style={{ color: 'var(--text3)', fontSize: 12 }}>{job.pages_scraped}/{job.pages_discovered || "?"} pages</span>
          </div>
          <div style={{ height: 4, background: 'var(--ink3)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--v), var(--teal))', transition: 'width 0.5s', width: `${job.pages_discovered ? Math.min(100, (job.pages_scraped / job.pages_discovered) * 100) : 5}%` }} />
          </div>
          {job.error && <p style={{ marginTop: 8, fontSize: 12, color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={12} /> {job.error}</p>}
        </div>
      )}

      {/* Logs + Jobs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div className="sec-label" style={{ marginBottom: 8, fontSize: 10 }}>Activity log</div>
          <div ref={logRef} style={{ height: 180, overflowY: 'auto', borderRadius: 'var(--r)', border: '0.5px solid var(--border)', background: 'var(--ink)', padding: 12, fontFamily: 'monospace', fontSize: 11, color: 'var(--text3)' }}>
            {log.length === 0 && <p>Click crawl to start.</p>}
            {log.map((l, i) => <div key={i} style={{ marginBottom: 4 }}>{l}</div>)}
          </div>
        </div>
        <div>
          <div className="sec-label" style={{ marginBottom: 8, fontSize: 10 }}>Recent crawls</div>
          <div style={{ height: 180, overflowY: 'auto', borderRadius: 'var(--r)', border: '0.5px solid var(--border)', background: 'var(--ink)' }}>
            {recentJobs.length === 0 && <p style={{ padding: 12, fontSize: 12, color: 'var(--text3)' }}>No crawls yet.</p>}
            {recentJobs.map(j => (
              <button key={j.id} onClick={() => { setActiveJobId(j.id); setAutoRun(j.status !== "completed" && j.status !== "failed"); }}
                style={{ width: '100%', textAlign: 'left', padding: 12, borderBottom: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, border: 'none', borderBottom: '0.5px solid var(--border)', transition: 'background 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontWeight: 500, color: 'var(--text2)' }}>{j.status}</span>
                  <span>{new Date(j.started_at).toLocaleString()}</span>
                </div>
                <span>{j.pages_scraped} pages · {j.pages_embedded} embedded · {j.faqs_generated} FAQs</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon: Icon, label, value }) {
  return (
    <div style={{ borderRadius: 'var(--r)', border: '0.5px solid var(--border)', background: 'var(--surface2)', padding: 16 }}>
      <Icon size={16} style={{ color: 'var(--v2)', marginBottom: 8 }} />
      <p style={{ fontSize: 22, fontWeight: 500, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value.toLocaleString()}</p>
      <p style={{ fontSize: 11, color: 'var(--text3)' }}>{label}</p>
    </div>
  );
}
