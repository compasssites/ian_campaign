import { useState, useEffect, useCallback, useRef, useId } from "react";
import type { Contact, ContactStatus } from "../lib/db/schema";
import StatsBar from "./StatsBar";
import ContactCard from "./ContactCard";
import BulkImport from "./BulkImport";
import AddContact from "./AddContact";

const S = {
  root: { minHeight: "100vh", background: "#f1f5f9", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" } as React.CSSProperties,
  header: { background: "linear-gradient(135deg, #0f2044 0%, #1e3a8a 100%)", color: "white", position: "sticky" as const, top: 0, zIndex: 20, boxShadow: "0 2px 16px rgba(0,0,0,0.3)" },
  headerTop: { padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  title: { fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: "-0.3px" },
  sub: { fontSize: 12, color: "rgba(255,255,255,0.5)", margin: 0 },
  btnRow: { display: "flex", gap: 6, alignItems: "center", flexShrink: 0 } as React.CSSProperties,
  btnBlue: { background: "#2563eb", color: "white", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" } as React.CSSProperties,
  btnWhite: { background: "white", color: "#1e3a8a", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" } as React.CSSProperties,
  btnGhost: { background: "transparent", color: "rgba(255,255,255,0.55)", border: "none", padding: "8px 8px", fontSize: 13, cursor: "pointer" } as React.CSSProperties,
  btnUsers: { background: "transparent", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "7px 12px", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" } as React.CSSProperties,
  tabs: { display: "flex", gap: 6, padding: "10px 16px 10px", overflowX: "auto" as const, background: "white", borderBottom: "1px solid #e5e7eb" },
  tab: (active: boolean): React.CSSProperties => ({
    flexShrink: 0, padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
    background: active ? "#1e3a8a" : "#f1f5f9", color: active ? "white" : "#6b7280",
  }),
  filterRow: { padding: "10px 16px", display: "flex", gap: 8, alignItems: "center", background: "white", borderBottom: "1px solid #f1f5f9" } as React.CSSProperties,
  searchInput: { flex: 1, padding: "10px 14px 10px 36px", borderRadius: 12, border: "1.5px solid #e5e7eb", fontSize: 15, background: "#f9fafb", outline: "none", boxSizing: "border-box" } as React.CSSProperties,
  groupBtn: (active: boolean): React.CSSProperties => ({
    flexShrink: 0, padding: "10px 14px", borderRadius: 12, border: "1.5px solid " + (active ? "#1e3a8a" : "#e5e7eb"),
    background: active ? "#eff6ff" : "white", color: active ? "#1e3a8a" : "#6b7280",
    fontSize: 13, fontWeight: active ? 700 : 400, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
  }),
  list: { padding: "12px 16px 80px", display: "flex", flexDirection: "column" as const, gap: 10 },
  empty: { textAlign: "center" as const, padding: "48px 16px", color: "#9ca3af" },
  pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: 12, paddingTop: 8 },
  pageBtn: { padding: "8px 18px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "white", fontSize: 14, cursor: "pointer" } as React.CSSProperties,
};

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "spoke", label: "Spoke" },
  { key: "no_answer", label: "Missed" },
  { key: "callback", label: "Callback" },
  { key: "followed_up", label: "Done" },
];

interface Props { memberName: string; role?: string; }

function GroupPicker({ groups, active, onChange }: { groups: string[]; active: string; onChange: (g: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = groups.filter(g => g.toLowerCase().includes(q.toLowerCase()));
  const label = active || "All Groups";

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button onClick={() => setOpen(v => !v)} style={S.groupBtn(!!active)}>
        <span>📍</span>
        <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 30, background: "white", borderRadius: 14, boxShadow: "0 8px 30px rgba(0,0,0,0.15)", border: "1px solid #e5e7eb", minWidth: 200, overflow: "hidden" }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid #f1f5f9" }}>
            <input
              autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search group…"
              style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none", boxSizing: "border-box" }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            <button onClick={() => { onChange(""); setOpen(false); setQ(""); }}
              style={{ width: "100%", padding: "10px 14px", border: "none", background: !active ? "#eff6ff" : "white", color: !active ? "#1e3a8a" : "#374151", fontSize: 13, textAlign: "left", cursor: "pointer", fontWeight: !active ? 700 : 400 }}>
              All Groups
            </button>
            {filtered.map(g => (
              <button key={g} onClick={() => { onChange(g); setOpen(false); setQ(""); }}
                style={{ width: "100%", padding: "10px 14px", border: "none", background: active === g ? "#eff6ff" : "white", color: active === g ? "#1e3a8a" : "#374151", fontSize: 13, textAlign: "left", cursor: "pointer", fontWeight: active === g ? 700 : 400 }}>
                {g}
              </button>
            ))}
            {filtered.length === 0 && <p style={{ padding: "10px 14px", fontSize: 13, color: "#9ca3af", margin: 0 }}>No groups found</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ memberName, role }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState({ total: 0, spoke: 0, no_answer: 0, callback: 0, followed_up: 0, pending: 0, called: 0 });
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showBulk, setShowBulk] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [groups, setGroups] = useState<string[]>([]);
  const [activeGroup, setActiveGroup] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchStats = useCallback(async () => {
    try { const r = await fetch("/api/stats"); if (r.ok) setStats(await r.json()); } catch {}
  }, []);

  const fetchGroups = useCallback(async () => {
    try { const r = await fetch("/api/contacts/groups"); if (r.ok) setGroups(await r.json()); } catch {}
  }, []);

  const fetchContacts = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (activeTab !== "all") params.set("status", activeTab);
      if (search) params.set("search", search);
      if (activeGroup) params.set("group", activeGroup);
      const r = await fetch(`/api/contacts?${params}`);
      if (r.ok) {
        const data = await r.json() as { contacts: Contact[]; total: number; pages: number };
        setContacts(data.contacts); setTotalPages(data.pages); setPage(p);
      }
    } finally { setLoading(false); }
  }, [activeTab, search, activeGroup]);

  useEffect(() => { fetchStats(); fetchGroups(); }, []);
  useEffect(() => { const t = setTimeout(() => fetchContacts(1), 200); return () => clearTimeout(t); }, [activeTab, search, activeGroup, fetchContacts]);

  const refresh = useCallback(() => { fetchContacts(page); fetchStats(); }, [fetchContacts, page, fetchStats]);

  const handleStatusUpdate = useCallback(async (id: string, status: ContactStatus, notes?: string) => {
    await fetch("/api/calls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact_id: id, status, notes }) });
    refresh();
  }, [refresh]);

  const handleToggle = useCallback(async (id: string, field: "wa_sent" | "email_sent", value: boolean) => {
    await fetch(`/api/contacts/${id}/toggles`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) });
    refresh();
  }, [refresh]);

  const handleDelete = useCallback(async (id: string) => {
    await fetch(`/api/contacts/${id}`, { method: "DELETE" }); refresh();
  }, [refresh]);

  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; };

  const tabCount = (key: string) => {
    if (key === "all") return stats.total;
    if (key === "pending") return stats.pending;
    return (stats as Record<string, number>)[key] ?? 0;
  };

  return (
    <div style={S.root}>
      <div style={S.header}>
        <div style={S.headerTop}>
          <div style={{ minWidth: 0 }}>
            <p style={S.title}>IAN Campaign</p>
            <p style={S.sub}>Hi, {memberName}</p>
          </div>
          <div style={S.btnRow}>
            <button style={S.btnBlue} onClick={() => setShowAdd(true)}>+ Add</button>
            <button style={S.btnWhite} onClick={() => setShowBulk(true)}>Import</button>
            {/* Hamburger menu */}
            <div style={{ position: "relative" }}>
              <button
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 10, padding: "8px 12px", cursor: "pointer", color: "white", fontSize: 18, lineHeight: 1 }}
                onClick={() => setMenuOpen(v => !v)}
              >
                ☰
              </button>
              {menuOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "white", borderRadius: 16, boxShadow: "0 8px 30px rgba(0,0,0,0.2)", minWidth: 180, overflow: "hidden", zIndex: 50 }}>
                  {role === "superadmin" && (
                    <a href="/users" style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", color: "#111827", textDecoration: "none", fontSize: 14, fontWeight: 600, borderBottom: "1px solid #f1f5f9" }}>
                      👥 Manage Users
                    </a>
                  )}
                  <button onClick={() => { setMenuOpen(false); window.location.href="/users"; }} style={{ display: role === "superadmin" ? "none" : "flex", width: "100%", alignItems: "center", gap: 10, padding: "14px 16px", background: "none", border: "none", fontSize: 14, fontWeight: 600, color: "#111827", cursor: "pointer", borderBottom: "1px solid #f1f5f9", textAlign: "left" }}>
                  </button>
                  <button onClick={() => { setMenuOpen(false); logout(); }} style={{ display: "flex", width: "100%", alignItems: "center", gap: 10, padding: "14px 16px", background: "none", border: "none", fontSize: 14, fontWeight: 600, color: "#dc2626", cursor: "pointer", textAlign: "left" }}>
                    🚪 Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <StatsBar stats={stats} />
      </div>

      {/* Filter tabs */}
      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t.key} style={S.tab(activeTab === t.key)} onClick={() => { setActiveTab(t.key); setPage(1); }}>
            {t.label} <span style={{ fontSize: 11, opacity: 0.7 }}>{tabCount(t.key)}</span>
          </button>
        ))}
      </div>

      {/* Search + group picker */}
      <div style={S.filterRow}>
        <div style={{ flex: 1, position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, pointerEvents: "none", color: "#9ca3af" }}>🔍</span>
          <input
            style={S.searchInput}
            type="search"
            placeholder="Search name or number…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <GroupPicker groups={groups} active={activeGroup} onChange={g => { setActiveGroup(g); setPage(1); }} />
      </div>

      {/* List */}
      <div style={S.list}>
        {loading && <div style={S.empty}>Loading…</div>}
        {!loading && contacts.length === 0 && (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
            <p style={{ margin: "0 0 8px" }}>No contacts found</p>
            <button style={{ color: "#2563eb", background: "none", border: "none", fontSize: 14, textDecoration: "underline", cursor: "pointer" }} onClick={() => setShowBulk(true)}>
              Import contacts
            </button>
          </div>
        )}
        {!loading && contacts.map(c => (
          <ContactCard key={c.id} contact={c} onStatusUpdate={handleStatusUpdate} onToggle={handleToggle} onDelete={handleDelete} onRefresh={refresh} />
        ))}
        {totalPages > 1 && (
          <div style={S.pagination}>
            <button style={{ ...S.pageBtn, opacity: page === 1 ? 0.4 : 1 }} disabled={page === 1} onClick={() => fetchContacts(page - 1)}>← Prev</button>
            <span style={{ fontSize: 13, color: "#6b7280" }}>{page} / {totalPages}</span>
            <button style={{ ...S.pageBtn, opacity: page === totalPages ? 0.4 : 1 }} disabled={page === totalPages} onClick={() => fetchContacts(page + 1)}>Next →</button>
          </div>
        )}
      </div>

      {showBulk && <BulkImport onClose={() => setShowBulk(false)} onDone={() => { setShowBulk(false); fetchGroups(); refresh(); }} />}
      {showAdd && <AddContact onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); refresh(); }} />}
    </div>
  );
}
