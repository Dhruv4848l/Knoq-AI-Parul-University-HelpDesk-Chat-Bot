import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import gsap from "gsap";
import {
  MessageSquare,
  Database,
  Users,
  ShieldCheck,
  LogIn,
  Sparkles,
  Zap,
  Check,
  ArrowRight,
  Cpu,
  Globe,
} from "lucide-react";

import { Nav } from "../components/Nav";
import { ChatPanel } from "../components/ChatPanel";
import { Interactive3D } from "../components/Interactive3D";
import { MacbookScroll } from "../components/ui/macbook-scroll";
import { CardSpotlight } from "../components/ui/card-spotlight";

/* ─── Shared Layout Constants ─── */
const SECTION = {
  maxWidth: 1260,
  margin: "0 auto",
  padding: "5rem 2rem",
  position: "relative",
  zIndex: 2,
};

const BG = "#030303";
const CARD_BG = "#0a0a0a";

/* ─── Tiny helper ─── */
function StepItem({ title }) {
  return (
    <li style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: "4px",
          background: "rgba(255,255,255,0.06)",
          border: "0.5px solid rgba(255,255,255,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          marginTop: 2,
        }}
      >
        <Check size={10} strokeWidth={3} color="#ffffff" />
      </span>
      <span style={{ color: "#c8c7c2", fontSize: 14 }}>{title}</span>
    </li>
  );
}

/* ═══════════════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════════════ */
function Home() {
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const ctasRef = useRef(null);

  /* ── GSAP entrance ── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (titleRef.current) {
        const words = titleRef.current.querySelectorAll(".hero-word");
        gsap.fromTo(
          words,
          { y: 70, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.12, duration: 0.9, ease: "power4.out" }
        );
      }
      if (descRef.current) {
        gsap.fromTo(descRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, delay: 0.4, ease: "power3.out" });
      }
      if (ctasRef.current) {
        gsap.fromTo(ctasRef.current, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, delay: 0.65, ease: "power3.out" });
      }
    });
    return () => ctx.revert();
  }, []);

  return (
    <div style={{ background: BG, color: "#f2f1ec", minHeight: "100vh", overflowX: "clip" }}>
      <Nav />

      {/* ═══════════════════════════════════════
          HERO
         ═══════════════════════════════════════ */}
      <section
        id="hero"
        style={{
          position: "relative",
          minHeight: "calc(100vh - 66px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "3rem 2rem",
          overflow: "hidden",
        }}
      >
        {/* Spotlight + Grid */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {/* Subtle light leak (spotlight) stretching vertically */}
          <div style={{
            position: "absolute",
            top: 0,
            right: "12%",
            width: "30%",
            height: "100%",
            background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.025) 50%, transparent)",
            transform: "skewX(-12deg)",
            filter: "blur(50px)",
            pointerEvents: "none",
          }} />
          <div style={{
            position: "absolute",
            top: "-20%",
            left: "15%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.015)",
            filter: "blur(100px)",
            pointerEvents: "none",
          }} />
          <div className="grid-lines" style={{ opacity: 0.12 }} />
        </div>

        {/* Content wrapper */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: "4.5rem",
            maxWidth: 1260,
            width: "100%",
            flexWrap: "wrap",
            justifyContent: "space-between",
          }}
        >
          {/* ── Left: Text ── */}
          <div style={{ flex: "1.2 1 440px", minWidth: 300 }}>
            <div 
              style={{ 
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255, 255, 255, 0.04)",
                border: "0.5px solid rgba(255, 255, 255, 0.1)",
                padding: "6px 14px",
                borderRadius: "4px",
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#c8c7c2",
                marginBottom: 28,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffffff", animation: "blink-dot 2s infinite" }} />
              Parul University AI Agent
            </div>

            <h1
              ref={titleRef}
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(2.5rem, 5vw, 4.2rem)",
                fontWeight: 500,
                lineHeight: 1.1,
                marginBottom: 24,
                letterSpacing: "-0.02em",
                overflow: "hidden",
                color: "#f2f1ec",
              }}
            >
              <span className="hero-word" style={{ display: "inline-block", marginRight: 12 }}>
                Your
              </span>
              <span className="hero-word" style={{ display: "inline-block", marginRight: 12 }}>
                campus,
              </span>
              <br />
              <span
                className="hero-word"
                style={{
                  display: "inline-block",
                  background: "linear-gradient(135deg, #ffffff 0%, #d8d7d2 50%, #908f8a 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  fontStyle: "italic",
                  fontWeight: 600,
                }}
              >
                always answering.
              </span>
            </h1>

            <p
              ref={descRef}
              style={{ fontSize: 16, color: "#a09f9a", maxWidth: 520, marginBottom: 36, lineHeight: 1.75, opacity: 0 }}
            >
              An AI helpdesk that handles the thousand questions students ask the admin office every week — instantly, 24/7, and in plain English.
            </p>

            <div ref={ctasRef} style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 18, opacity: 0 }}>
              <Link
                to="/login"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#ffffff",
                  color: "#030303",
                  padding: "12px 22px",
                  borderRadius: 6,
                  fontSize: 13.5,
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(255,255,255,0.05)",
                  transition: "all 0.3s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.background = "#e6e5e0";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.background = "#ffffff";
                }}
              >
                <LogIn size={15} /> Sign in for full access <ArrowRight size={13} />
              </Link>
              <a
                href="#platform-scroll"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: "transparent",
                  color: "#f2f1ec",
                  border: "0.5px solid rgba(255,255,255,0.18)",
                  padding: "12px 22px",
                  borderRadius: 6,
                  fontSize: 13.5,
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "all 0.3s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
                }}
              >
                <MessageSquare size={15} /> Try free chat
              </a>
            </div>

            <p style={{ fontSize: 12, color: "var(--text3)" }}>
              Sign-in restricted to <strong style={{ color: "#ffffff" }}>@paruluniversity.ac.in</strong> · Free mode
              open to everyone
            </p>
          </div>

          {/* ── Right: 3D Torus Knot ── */}
          <div style={{ flex: "1 1 380px", minWidth: 300, maxWidth: 480, height: 440 }}>
            <div
              style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "visible",
              }}
            >
              <Interactive3D />
            </div>
          </div>
        </div>
      </section>

      <div className="sep" />

      {/* ═══════════════════════════════════════
          MACBOOK SCROLL — Platform Demo
         ═══════════════════════════════════════ */}
      <section id="platform-scroll" style={{ background: BG, position: "relative" }}>
        {/* Ambient glow */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.015)",
            filter: "blur(100px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ ...SECTION, paddingTop: "2rem", paddingBottom: 0 }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <h2
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: "clamp(1.8rem, 4vw, 3rem)",
                fontWeight: 500,
                color: "#fff",
                letterSpacing: "-0.02em",
                marginBottom: 12,
              }}
            >
              Real-time Campus Assistant
            </h2>
            <p style={{ color: "#a09f9a", maxWidth: 530, margin: "0 auto", fontSize: 15, lineHeight: 1.7 }}>
              Scroll to reveal the workspace and start chatting with our AI-powered assistant directly on-page.
            </p>
            <p style={{ fontSize: 18, fontWeight: 600, color: "rgba(255,255,255,0.85)", marginTop: 32 }}>
              Knoq-AI Chat Terminal
            </p>
          </div>
        </div>

        <MacbookScroll
          title={null}
          badge={
            <div
              style={{
                background: "#ffffff",
                color: "#030303",
                fontWeight: 700,
                fontSize: 9,
                borderRadius: 4,
                padding: "4px 10px",
                transform: "rotate(-8deg)",
                border: "1px solid rgba(255,255,255,0.8)",
                boxShadow: "0 4px 15px rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                gap: 5,
                animation: "float 3.5s ease-in-out infinite",
                letterSpacing: "0.05em",
              }}
            >
              <Sparkles size={11} /> FREE MODE
            </div>
          }
          showGradient={false}
        >
          <ChatPanel mode="free" height="100%" />
        </MacbookScroll>
      </section>

      <div className="sep" />

      {/* ═══════════════════════════════════════
          STATS — Page-fold cards
         ═══════════════════════════════════════ */}
      <section id="stats" style={{ background: BG, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div className="grid-lines" style={{ opacity: 0.1 }} />
        </div>
        <div style={SECTION}>
          <div className="sec-label">Performance &amp; Architecture</div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
              marginTop: 32,
            }}
          >
            {/* Card 1 */}
            <div className="page-fold-card" style={{ padding: 32, minHeight: 280 }}>
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.04)",
                    border: "0.5px solid rgba(255,255,255,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    marginBottom: 20,
                  }}
                >
                  <Zap size={22} />
                </div>
                <div 
                  style={{ 
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: 38, 
                    fontWeight: 500, 
                    color: "#fff", 
                    letterSpacing: "-0.02em", 
                    lineHeight: 1 
                  }}
                >
                  &lt; 50ms
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#a09f9a", marginTop: 8 }}>
                  Cached Response Latency
                </div>
              </div>
              <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7 }}>
                Smart FAQ caching stores resolved questions locally, dropping lookup latencies to near-zero.
              </p>
              <div className="page-fold-corner" />
            </div>

            {/* Card 2 */}
            <div className="page-fold-card" style={{ padding: 32, minHeight: 280 }}>
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.04)",
                    border: "0.5px solid rgba(255,255,255,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    marginBottom: 20,
                  }}
                >
                  <Database size={22} />
                </div>
                <div 
                  style={{ 
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: 38, 
                    fontWeight: 500, 
                    color: "#fff", 
                    letterSpacing: "-0.02em", 
                    lineHeight: 1 
                  }}
                >
                  10,000+
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#a09f9a", marginTop: 8 }}>
                  Questions Answered
                </div>
              </div>
              <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7 }}>
                A massive structured dataset covering exams, fees, campus routes, library policies, and procedures.
              </p>
              <div className="page-fold-corner" />
            </div>

            {/* Card 3 */}
            <div className="page-fold-card" style={{ padding: 32, minHeight: 280 }}>
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.04)",
                    border: "0.5px solid rgba(255,255,255,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ffffff",
                    marginBottom: 20,
                  }}
                >
                  <Cpu size={22} />
                </div>
                <div 
                  style={{ 
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: 36, 
                    fontWeight: 500, 
                    color: "#fff", 
                    letterSpacing: "-0.02em", 
                    lineHeight: 1 
                  }}
                >
                  Gemini RAG
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "#a09f9a", marginTop: 8 }}>
                  Retrieval-Augmented AI
                </div>
              </div>
              <p style={{ fontSize: 13, color: "var(--text3)", lineHeight: 1.7 }}>
                Google Gemini combined with vector embeddings to answer complex, unlisted campus questions reliably.
              </p>
              <div className="page-fold-corner" />
            </div>
          </div>
        </div>
      </section>

      <div className="sep" />

      {/* ═══════════════════════════════════════
          ACCESS MODES
         ═══════════════════════════════════════ */}
      <section id="tiers" style={{ background: BG, position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            bottom: "-10%",
            left: "10%",
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.01)",
            filter: "blur(80px)",
            pointerEvents: "none",
          }}
        />
        <div style={SECTION}>
          <div className="sec-label">Authorization Tiers</div>
          <h2
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(1.8rem, 4vw, 3rem)",
              fontWeight: 500,
              color: "#fff",
              letterSpacing: "-0.02em",
              marginBottom: 40,
            }}
          >
            Tailored Access Control
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 24,
            }}
          >
            {/* ── Guest ── */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{
                borderRadius: 16,
                border: "0.5px solid rgba(255,255,255,0.08)",
                background: CARD_BG,
                padding: 32,
                position: "relative",
                overflow: "hidden",
                cursor: "default",
              }}
            >
              {/* Corner glow */}
              <div
                style={{
                  position: "absolute",
                  top: -60,
                  right: -60,
                  width: 140,
                  height: 140,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.015)",
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "0.5px solid rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  marginBottom: 24,
                }}
              >
                <Users size={22} />
              </div>

              <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 500, color: "#fff", marginBottom: 8 }}>Free Mode · Guest</h3>
              <p style={{ fontSize: 14, color: "#a09f9a", marginBottom: 28, lineHeight: 1.7 }}>
                No university account needed. Open to parents, prospective students, and visitors.
              </p>

              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12, borderTop: "0.5px solid var(--border)", paddingTop: 24 }}>
                {[
                  { text: "Exams, hostel, and general guidelines", on: true },
                  { text: "No login or authentication required", on: true },
                  { text: "Does not save personal chat logs", on: false },
                  { text: "No generative AI fallback for custom queries", on: false },
                ].map((item) => (
                  <li
                     key={item.text}
                     style={{ fontSize: 14, color: item.on ? "#c8c7c2" : "var(--text3)", display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ color: item.on ? "#ffffff" : "var(--text3)", fontWeight: 700, fontSize: 13 }}>
                      {item.on ? "✓" : "—"}
                    </span>
                    {item.text}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* ── Student ── */}
            <motion.div
              whileHover={{ y: -6 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{
                borderRadius: 16,
                border: "0.5px solid rgba(255,255,255,0.18)",
                background: `linear-gradient(135deg, ${CARD_BG} 0%, rgba(255,255,255,0.02) 100%)`,
                padding: 32,
                position: "relative",
                overflow: "hidden",
                cursor: "default",
              }}
            >
              {/* University tag */}
              <div
                style={{
                  position: "absolute",
                  top: 20,
                  right: 20,
                  background: "rgba(255,255,255,0.06)",
                  color: "#ffffff",
                  border: "0.5px solid rgba(255,255,255,0.15)",
                  borderRadius: 4,
                  padding: "4px 12px",
                  fontSize: 10,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  letterSpacing: "0.03em",
                }}
              >
                <ShieldCheck size={12} />
                @paruluniversity.ac.in
              </div>

              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.04)",
                  border: "0.5px solid rgba(255,255,255,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  marginBottom: 24,
                }}
              >
                <ShieldCheck size={22} />
              </div>

              <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, fontWeight: 500, color: "#fff", marginBottom: 8 }}>Full Mode · Verified</h3>
              <p style={{ fontSize: 14, color: "#a09f9a", marginBottom: 28, lineHeight: 1.7 }}>
                Sign in using your university G-Suite credentials to unlock the full experience.
              </p>

              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 12, borderTop: "0.5px solid var(--border)", paddingTop: 24 }}>
                {[
                  "Comprehensive, specific knowledge bases",
                  "Generative Gemini AI for complex questions",
                  "Persistent chat history & search settings",
                  "Admin dashboard controls (role-restricted)",
                ].map((text) => (
                  <li
                    key={text}
                    style={{ fontSize: 14, color: "#c8c7c2", display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <span style={{ color: "#ffffff", fontWeight: 700, fontSize: 13 }}>✓</span>
                    {text}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      <div className="sep" />

      {/* ═══════════════════════════════════════
          HOW IT WORKS — CardSpotlight
         ═══════════════════════════════════════ */}
      <section id="roadmap" style={{ background: BG, position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            top: "-10%",
            right: "-5%",
            width: 350,
            height: 350,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.01)",
            filter: "blur(100px)",
            pointerEvents: "none",
          }}
        />
        <div style={SECTION}>
          <div className="sec-label">Interactive Roadmap</div>
          <h2
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(1.8rem, 4vw, 3rem)",
              fontWeight: 500,
              color: "#fff",
              letterSpacing: "-0.02em",
              marginBottom: 40,
            }}
          >
            How It Works
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            {/* Step 1 */}
            <CardSpotlight
              color="rgba(255, 255, 255, 0.07)"
              style={{ minHeight: 360, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
            >
              <div>
                <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, fontWeight: 500, color: "rgba(255,255,255,0.15)", lineHeight: 1 }}>01</p>
                <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 500, color: "#fff", marginTop: 8, marginBottom: 20 }}>
                  Student Verification
                </h3>
                <p style={{ fontSize: 13, color: "#a09f9a", marginBottom: 16 }}>
                  Follow these steps to authorize your account securely:
                </p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
                  <StepItem title="Enter your @paruluniversity.ac.in email" />
                  <StepItem title="Receive dynamic OTP confirmation" />
                  <StepItem title="Establish personal avatar & logs" />
                </ul>
              </div>
              <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 24, lineHeight: 1.6 }}>
                Direct verification keeps queries scoped to authorized students.
              </p>
            </CardSpotlight>

            {/* Step 2 */}
            <CardSpotlight
              color="rgba(255, 255, 255, 0.07)"
              style={{ minHeight: 360, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
            >
              <div>
                <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, fontWeight: 500, color: "rgba(255,255,255,0.15)", lineHeight: 1 }}>02</p>
                <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 500, color: "#fff", marginTop: 8, marginBottom: 20 }}>
                  AI-Powered RAG Search
                </h3>
                <p style={{ fontSize: 13, color: "#a09f9a", marginBottom: 16 }}>
                  Query anything about campus procedures:
                </p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
                  <StepItem title="Type natural campus queries" />
                  <StepItem title="Direct vector indexing lookup" />
                  <StepItem title="Generative fallback using Gemini" />
                </ul>
              </div>
              <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 24, lineHeight: 1.6 }}>
                Instant verification matching with academic datasets.
              </p>
            </CardSpotlight>

            {/* Step 3 */}
            <CardSpotlight
              color="rgba(255, 255, 255, 0.07)"
              style={{ minHeight: 360, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
            >
              <div>
                <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 32, fontWeight: 500, color: "rgba(255,255,255,0.15)", lineHeight: 1 }}>03</p>
                <h3 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 20, fontWeight: 500, color: "#fff", marginTop: 8, marginBottom: 20 }}>
                  Admin Curation
                </h3>
                <p style={{ fontSize: 13, color: "#a09f9a", marginBottom: 16 }}>
                  Continuous updates without coding:
                </p>
                <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 14 }}>
                  <StepItem title="View query logs & cache hit rate" />
                  <StepItem title="Scrape subdomains with Firecrawl" />
                  <StepItem title="Add custom rules and FAQ pairs" />
                </ul>
              </div>
              <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 24, lineHeight: 1.6 }}>
                Keep answers updated directly from the control panel.
              </p>
            </CardSpotlight>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FOOTER
         ═══════════════════════════════════════ */}
      <footer
        style={{
          position: "relative",
          background: BG,
          borderTop: "0.5px solid var(--border)",
          paddingTop: "6rem",
          paddingBottom: "2rem",
          overflow: "hidden",
        }}
      >
        {/* Giant background text */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            pointerEvents: "none",
            userSelect: "none",
            overflow: "hidden",
          }}
        >
          <span
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: "clamp(10rem, 24vw, 25rem)",
              fontWeight: 900,
              letterSpacing: "0.04em",
              lineHeight: 0.85,
              background: "linear-gradient(90deg, #030303, #121215, #1f1f23, #121215, #030303)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              whiteSpace: "nowrap",
              transform: "translateY(18%)",
              animation: "shimmer 10s linear infinite",
              filter: "none",
            }}
          >
            KNOQ AI
          </span>
        </div>

        {/* Footer content */}
        <div style={{ ...SECTION, padding: "0 2rem", position: "relative", zIndex: 10 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 40,
              marginBottom: 60,
            }}
          >
            {/* Brand */}
            <div style={{ gridColumn: "span 2" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "4px",
                    background: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    color: "#030303",
                    fontSize: 14,
                  }}
                >
                  K
                </div>
                <span style={{ fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: "0.02em" }}>KNOQ-AI</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text3)", maxWidth: 340, lineHeight: 1.7 }}>
                The smart AI Helpdesk for Parul University. Supporting students, staff, and visitors with instant
                structured responses.
              </p>
            </div>

            {/* Links 1 */}
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 16 }}>Tiers</h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                <li>
                  <Link to="/login" style={{ fontSize: 13, color: "var(--text3)", textDecoration: "none" }}>
                    Student Log-In
                  </Link>
                </li>
                <li>
                  <a href="#platform-scroll" style={{ fontSize: 13, color: "var(--text3)", textDecoration: "none" }}>
                    Free Guest Mode
                  </a>
                </li>
                <li>
                  <Link to="/signup" style={{ fontSize: 13, color: "var(--text3)", textDecoration: "none" }}>
                    Create Account
                  </Link>
                </li>
              </ul>
            </div>

            {/* Links 2 */}
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: "#fff", marginBottom: 16 }}>Resources</h4>
              <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                <li>
                  <a
                    href="https://paruluniversity.ac.in"
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 13, color: "var(--text3)", textDecoration: "none" }}
                  >
                    Parul University
                  </a>
                </li>
                <li>
                  <Link to="/docs" style={{ fontSize: 13, color: "var(--text3)", textDecoration: "none" }}>
                    RAG Pipeline Docs
                  </Link>
                </li>
                <li>
                  <Link to="/cache" style={{ fontSize: 13, color: "var(--text3)", textDecoration: "none" }}>
                    Performance Cache
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div
            style={{
              borderTop: "0.5px solid var(--border)",
              paddingTop: 24,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 12, color: "var(--text3)" }}>
              © {new Date().getFullYear()} Knoq-AI · Parul University Helpdesk
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span className="ver-tag">v1.0 (MERN)</span>
              <span style={{ fontSize: 11, color: "var(--text3)", display: "flex", alignItems: "center", gap: 4 }}>
                <Globe size={11} /> UTF-8
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;
