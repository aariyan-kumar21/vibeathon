import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "urlshortener-links";

function generateCode() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function isValidUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function truncate(str, n = 45) {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

const BASE = "https://snip.ly/"; // Simulated base URL

export default function App() {
  const [links, setLinks] = useState([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [justCreated, setJustCreated] = useState(null);
  const [copied, setCopied] = useState(null);
  const [activeTab, setActiveTab] = useState("shorten"); // "shorten" | "dashboard"
  const [redirecting, setRedirecting] = useState(null);
  const [toast, setToast] = useState(null);
  const [loaded, setLoaded] = useState(false);

  // Load from storage
  useEffect(() => {
    async function load() {
      try {
        const result = await window.storage.get(STORAGE_KEY);
        if (result && result.value) {
          setLinks(JSON.parse(result.value));
        }
      } catch {
        // no data yet
      }
      setLoaded(true);
    }
    load();
  }, []);

  // Save to storage
  const save = useCallback(async (data) => {
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Storage error:", e);
    }
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const handleShorten = async () => {
    setError("");
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Please enter a URL.");
      return;
    }
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : "https://" + trimmed;
    if (!isValidUrl(withProtocol)) {
      setError("That doesn't look like a valid URL. Try including https://");
      return;
    }
    const code = generateCode();
    const newLink = {
      id: code,
      original: withProtocol,
      short: BASE + code,
      code,
      clicks: 0,
      createdAt: new Date().toISOString(),
    };
    const updated = [newLink, ...links];
    setLinks(updated);
    await save(updated);
    setJustCreated(newLink);
    setInput("");
    setActiveTab("shorten");
    showToast("Short link created!");
  };

  const handleClick = async (code) => {
    setRedirecting(code);
    const updated = links.map((l) =>
      l.code === code ? { ...l, clicks: l.clicks + 1 } : l
    );
    setLinks(updated);
    await save(updated);
    const link = updated.find((l) => l.code === code);
    setTimeout(() => {
      window.open(link.original, "_blank");
      setRedirecting(null);
    }, 600);
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
    showToast("Copied to clipboard!");
  };

  const handleDelete = async (code) => {
    const updated = links.filter((l) => l.code !== code);
    setLinks(updated);
    await save(updated);
    if (justCreated?.code === code) setJustCreated(null);
    showToast("Link deleted.", "info");
  };

  const totalClicks = links.reduce((s, l) => s + l.clicks, 0);

  return (
    <div style={styles.root}>
      {/* Animated background */}
      <div style={styles.bgGlow1} />
      <div style={styles.bgGlow2} />

      {/* Toast */}
      {toast && (
        <div style={{ ...styles.toast, background: toast.type === "info" ? "#334155" : "#10b981" }}>
          {toast.type === "success" ? "✓ " : "● "}{toast.msg}
        </div>
      )}

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoMark}>⚡</span>
          <span style={styles.logoText}>sniplink</span>
        </div>
        <div style={styles.statsBar}>
          <span style={styles.statPill}>{links.length} links</span>
          <span style={styles.statPill}>{totalClicks} clicks</span>
        </div>
      </header>

      {/* Main card */}
      <main style={styles.main}>
        {/* Tabs */}
        <div style={styles.tabs}>
          {["shorten", "dashboard"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                ...styles.tab,
                ...(activeTab === tab ? styles.tabActive : {}),
              }}
            >
              {tab === "shorten" ? "✂ Shorten" : `⊞ Dashboard${links.length ? ` (${links.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* Shorten tab */}
        {activeTab === "shorten" && (
          <div style={styles.panel}>
            <div style={styles.heroText}>
              <h1 style={styles.h1}>Paste. Shrink. Share.</h1>
              <p style={styles.sub}>Transform any long URL into a clean, trackable link in seconds.</p>
            </div>

            <div style={styles.inputRow}>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}>🔗</span>
                <input
                  style={styles.input}
                  placeholder="https://your-very-long-url.com/goes/here"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleShorten()}
                  autoFocus
                />
              </div>
              <button style={styles.btn} onClick={handleShorten}>
                Shorten →
              </button>
            </div>
            {error && <div style={styles.error}>{error}</div>}

            {/* Just created result */}
            {justCreated && (
              <div style={styles.result}>
                <div style={styles.resultLabel}>Your short link is ready 🎉</div>
                <div style={styles.resultRow}>
                  <span style={styles.resultUrl}>{justCreated.short}</span>
                  <div style={styles.resultActions}>
                    <button
                      style={styles.copyBtn}
                      onClick={() => handleCopy(justCreated.short, justCreated.id)}
                    >
                      {copied === justCreated.id ? "✓ Copied" : "Copy"}
                    </button>
                    <button
                      style={styles.visitBtn}
                      onClick={() => handleClick(justCreated.code)}
                    >
                      {redirecting === justCreated.code ? "Opening…" : "Visit →"}
                    </button>
                  </div>
                </div>
                <div style={styles.resultOrig}>
                  <span style={styles.origLabel}>Original:</span> {truncate(justCreated.original, 60)}
                </div>
              </div>
            )}

            {/* Recent links mini */}
            {links.length > 0 && (
              <div style={styles.recentWrap}>
                <div style={styles.recentHeader}>
                  Recent links
                  <button style={styles.seeAll} onClick={() => setActiveTab("dashboard")}>
                    See all →
                  </button>
                </div>
                {links.slice(0, 3).map((l) => (
                  <div key={l.id} style={styles.miniRow}>
                    <div style={styles.miniLeft}>
                      <span style={styles.miniCode}>{l.short}</span>
                      <span style={styles.miniOrig}>{truncate(l.original, 35)}</span>
                    </div>
                    <div style={styles.miniRight}>
                      <span style={styles.clickBadge}>{l.clicks} clicks</span>
                      <button style={styles.miniCopy} onClick={() => handleCopy(l.short, l.id)}>
                        {copied === l.id ? "✓" : "⎘"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Dashboard tab */}
        {activeTab === "dashboard" && (
          <div style={styles.panel}>
            <div style={styles.dashHeader}>
              <div>
                <h2 style={styles.dashTitle}>Your Links</h2>
                <p style={styles.dashSub}>
                  {links.length === 0
                    ? "No links yet — shorten your first URL!"
                    : `${links.length} link${links.length !== 1 ? "s" : ""} · ${totalClicks} total clicks`}
                </p>
              </div>
              {links.length > 0 && (
                <div style={styles.dashStats}>
                  <div style={styles.statCard}>
                    <div style={styles.statNum}>{links.length}</div>
                    <div style={styles.statLbl}>Links</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statNum}>{totalClicks}</div>
                    <div style={styles.statLbl}>Clicks</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statNum}>
                      {links.length ? Math.round(totalClicks / links.length) : 0}
                    </div>
                    <div style={styles.statLbl}>Avg/Link</div>
                  </div>
                </div>
              )}
            </div>

            {!loaded && (
              <div style={styles.loading}>Loading…</div>
            )}

            {loaded && links.length === 0 && (
              <div style={styles.empty}>
                <div style={styles.emptyIcon}>✂</div>
                <div style={styles.emptyText}>No links yet.</div>
                <button style={styles.btn} onClick={() => setActiveTab("shorten")}>
                  Create your first link →
                </button>
              </div>
            )}

            {links.map((l, i) => (
              <div key={l.id} style={{ ...styles.linkCard, animationDelay: `${i * 60}ms` }}>
                <div style={styles.linkTop}>
                  <div style={styles.linkShort}>
                    <span style={styles.linkShortText}>{l.short}</span>
                    <button style={styles.microBtn} onClick={() => handleCopy(l.short, l.id + "dash")}>
                      {copied === l.id + "dash" ? "✓" : "⎘"}
                    </button>
                  </div>
                  <div style={styles.linkRight}>
                    <div style={styles.clickCount}>
                      <span style={styles.clickNum}>{l.clicks}</span>
                      <span style={styles.clickWord}>clicks</span>
                    </div>
                    <button
                      style={styles.visitSmall}
                      onClick={() => handleClick(l.code)}
                    >
                      {redirecting === l.code ? "…" : "Visit"}
                    </button>
                    <button style={styles.deleteBtn} onClick={() => handleDelete(l.code)}>✕</button>
                  </div>
                </div>
                <div style={styles.linkOrig} title={l.original}>
                  {truncate(l.original, 70)}
                </div>
                <div style={styles.linkMeta}>
                  Created {new Date(l.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
                {/* Click bar */}
                {totalClicks > 0 && (
                  <div style={styles.barWrap}>
                    <div
                      style={{
                        ...styles.bar,
                        width: `${Math.round((l.clicks / Math.max(...links.map(x => x.clicks), 1)) * 100)}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        sniplink · Links & analytics stored locally · Built with ⚡
      </footer>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    background: "#0a0f1e",
    color: "#e2e8f0",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  bgGlow1: {
    position: "fixed",
    top: "-120px",
    left: "-120px",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  bgGlow2: {
    position: "fixed",
    bottom: "-100px",
    right: "-100px",
    width: "450px",
    height: "450px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(16,185,129,0.14) 0%, transparent 70%)",
    pointerEvents: "none",
    zIndex: 0,
  },
  toast: {
    position: "fixed",
    top: "20px",
    left: "50%",
    transform: "translateX(-50%)",
    padding: "10px 22px",
    borderRadius: "40px",
    fontSize: "14px",
    fontWeight: 600,
    color: "#fff",
    zIndex: 9999,
    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
    letterSpacing: "0.01em",
    animation: "fadeIn 0.2s ease",
  },
  header: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "22px 32px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    backdropFilter: "blur(12px)",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  logoMark: {
    fontSize: "24px",
  },
  logoText: {
    fontSize: "20px",
    fontWeight: 800,
    background: "linear-gradient(90deg, #818cf8, #34d399)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-0.5px",
  },
  statsBar: {
    display: "flex",
    gap: "10px",
  },
  statPill: {
    padding: "4px 14px",
    borderRadius: "20px",
    background: "rgba(255,255,255,0.07)",
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: 600,
    border: "1px solid rgba(255,255,255,0.08)",
  },
  main: {
    position: "relative",
    zIndex: 2,
    maxWidth: "720px",
    margin: "0 auto",
    padding: "40px 20px 60px",
  },
  tabs: {
    display: "flex",
    gap: "4px",
    marginBottom: "28px",
    background: "rgba(255,255,255,0.04)",
    padding: "4px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.07)",
    width: "fit-content",
  },
  tab: {
    padding: "9px 22px",
    borderRadius: "9px",
    border: "none",
    background: "transparent",
    color: "#64748b",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.18s",
    letterSpacing: "0.01em",
  },
  tabActive: {
    background: "linear-gradient(135deg, #6366f1, #10b981)",
    color: "#fff",
    boxShadow: "0 2px 12px rgba(99,102,241,0.3)",
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  heroText: {
    textAlign: "center",
    padding: "10px 0 4px",
  },
  h1: {
    fontSize: "clamp(28px, 5vw, 42px)",
    fontWeight: 900,
    margin: "0 0 10px",
    background: "linear-gradient(135deg, #e2e8f0 0%, #818cf8 50%, #34d399 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    letterSpacing: "-1px",
    lineHeight: 1.1,
  },
  sub: {
    color: "#64748b",
    fontSize: "15px",
    margin: 0,
  },
  inputRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  inputWrap: {
    flex: 1,
    minWidth: "240px",
    display: "flex",
    alignItems: "center",
    background: "rgba(255,255,255,0.05)",
    border: "1.5px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    padding: "0 16px",
    transition: "border-color 0.2s",
    "&:focus-within": {
      borderColor: "#6366f1",
    },
  },
  inputIcon: {
    fontSize: "16px",
    marginRight: "10px",
    opacity: 0.6,
  },
  input: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#e2e8f0",
    fontSize: "15px",
    padding: "15px 0",
    fontFamily: "inherit",
    "::placeholder": { color: "#475569" },
  },
  btn: {
    padding: "15px 28px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    border: "none",
    borderRadius: "12px",
    color: "#fff",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
    boxShadow: "0 4px 20px rgba(99,102,241,0.35)",
    transition: "transform 0.15s, box-shadow 0.15s",
    letterSpacing: "0.01em",
  },
  error: {
    color: "#f87171",
    fontSize: "13px",
    fontWeight: 500,
    paddingLeft: "4px",
    marginTop: "-8px",
  },
  result: {
    background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(99,102,241,0.1))",
    border: "1.5px solid rgba(16,185,129,0.3)",
    borderRadius: "14px",
    padding: "20px 22px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  resultLabel: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#34d399",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  resultRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "10px",
  },
  resultUrl: {
    fontSize: "20px",
    fontWeight: 800,
    color: "#a5f3fc",
    letterSpacing: "-0.3px",
  },
  resultActions: {
    display: "flex",
    gap: "8px",
  },
  copyBtn: {
    padding: "8px 18px",
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "8px",
    color: "#e2e8f0",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
  },
  visitBtn: {
    padding: "8px 18px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "13px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 2px 10px rgba(16,185,129,0.3)",
  },
  resultOrig: {
    fontSize: "13px",
    color: "#64748b",
    wordBreak: "break-all",
  },
  origLabel: {
    color: "#475569",
    fontWeight: 600,
  },
  recentWrap: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "14px",
    overflow: "hidden",
  },
  recentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "14px 18px",
    fontSize: "12px",
    fontWeight: 700,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
  },
  seeAll: {
    background: "none",
    border: "none",
    color: "#6366f1",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.03em",
  },
  miniRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 18px",
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    gap: "10px",
  },
  miniLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
  },
  miniCode: {
    fontSize: "14px",
    fontWeight: 700,
    color: "#a5b4fc",
  },
  miniOrig: {
    fontSize: "12px",
    color: "#475569",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  miniRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexShrink: 0,
  },
  clickBadge: {
    fontSize: "12px",
    fontWeight: 700,
    color: "#34d399",
    background: "rgba(16,185,129,0.1)",
    padding: "2px 10px",
    borderRadius: "20px",
  },
  miniCopy: {
    background: "none",
    border: "none",
    color: "#64748b",
    fontSize: "16px",
    cursor: "pointer",
    padding: "2px 6px",
  },
  // Dashboard
  dashHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "16px",
  },
  dashTitle: {
    margin: "0 0 4px",
    fontSize: "24px",
    fontWeight: 800,
    color: "#e2e8f0",
    letterSpacing: "-0.5px",
  },
  dashSub: {
    margin: 0,
    color: "#475569",
    fontSize: "14px",
  },
  dashStats: {
    display: "flex",
    gap: "10px",
  },
  statCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "12px 18px",
    textAlign: "center",
    minWidth: "64px",
  },
  statNum: {
    fontSize: "22px",
    fontWeight: 900,
    color: "#818cf8",
    lineHeight: 1,
    marginBottom: "2px",
  },
  statLbl: {
    fontSize: "11px",
    color: "#475569",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  loading: {
    textAlign: "center",
    color: "#475569",
    padding: "40px",
    fontSize: "15px",
  },
  empty: {
    textAlign: "center",
    padding: "60px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  },
  emptyIcon: {
    fontSize: "48px",
    opacity: 0.3,
  },
  emptyText: {
    color: "#475569",
    fontSize: "16px",
    fontWeight: 600,
  },
  linkCard: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "14px",
    padding: "18px 20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    transition: "border-color 0.2s, transform 0.2s",
    animation: "slideIn 0.3s ease both",
  },
  linkTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  linkShort: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  linkShortText: {
    fontSize: "16px",
    fontWeight: 800,
    color: "#a5b4fc",
    letterSpacing: "-0.2px",
  },
  microBtn: {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "6px",
    color: "#94a3b8",
    fontSize: "14px",
    cursor: "pointer",
    padding: "2px 8px",
    lineHeight: "18px",
  },
  linkRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  clickCount: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: "44px",
  },
  clickNum: {
    fontSize: "20px",
    fontWeight: 900,
    color: "#34d399",
    lineHeight: 1,
  },
  clickWord: {
    fontSize: "10px",
    color: "#475569",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  visitSmall: {
    padding: "7px 14px",
    background: "linear-gradient(135deg, #10b981, #059669)",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  deleteBtn: {
    background: "none",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: "7px",
    color: "#ef4444",
    fontSize: "13px",
    cursor: "pointer",
    padding: "5px 9px",
    opacity: 0.7,
    transition: "opacity 0.15s",
  },
  linkOrig: {
    fontSize: "13px",
    color: "#475569",
    wordBreak: "break-all",
  },
  linkMeta: {
    fontSize: "11px",
    color: "#334155",
    fontWeight: 500,
  },
  barWrap: {
    height: "3px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "4px",
    overflow: "hidden",
    marginTop: "4px",
  },
  bar: {
    height: "100%",
    background: "linear-gradient(90deg, #6366f1, #34d399)",
    borderRadius: "4px",
    transition: "width 0.5s ease",
    minWidth: "4px",
  },
  footer: {
    position: "relative",
    zIndex: 2,
    textAlign: "center",
    color: "#1e293b",
    fontSize: "12px",
    padding: "24px",
    fontWeight: 500,
  },
};
