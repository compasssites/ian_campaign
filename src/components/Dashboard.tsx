import { useState, useEffect, useCallback } from "react";
import type { Contact, ContactStatus } from "../lib/db/schema";
import type { Role } from "../lib/auth/session";
import StatsBar from "./StatsBar";
import ContactCard from "./ContactCard";
import BulkImport from "./BulkImport";
import AddContact from "./AddContact";

const S = {
  root: { minHeight: "100vh", background: "#f1f5f9", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  header: { background: "linear-gradient(135deg, #0f2044, #1e3a8a)", color: "white", position: "sticky" as const, top: 0, zIndex: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.25)" },
  headerTop: { padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: "-0.3px" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.55)", margin: 0 },
  btnRow: { display: "flex", gap: 8, alignItems: "center" },
  btnPrimary: { background: "#2563eb", color: "white", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnWhite: { background: "white", color: "#1e3a8a", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnGhost: { background: "transparent", color: "rgba(255,255,255,0.6)", border: "none", padding: "8px 10px", fontSize: 13, cursor: "pointer" },
  btnLink: { background: "transparent", color: "rgba(255,255,255,0.7)", border: "none", padding: "8px 10px", fontSize: 13, cursor: "pointer", textDecoration: "underline" },
  groupBar: { padding: "0 16px 12px", display: "flex", gap: 8, overflowX: "auto" as const },
  groupChip: (active: boolean) => ({
    flexShrink: 0, fontSize: 12, padding: "5px 12px", borderRadius: 20,
    border: `1.5px solid ${active ? "white" : "rgba(255,255,255,0.35)"}`,
    background: active ? "white" : "transparent",
    color: active ? "#1e3a8a" : "rgba(255,255,255,0.8)",
    cursor: "pointer", fontWeight: active ? 700 : 400,
  }),
  tabs: { display: "flex", gap: 6, padding: "10px 16px", overflowX: "auto" as const, background: "white", borderBottom: "1px solid #e5e7eb", position: "sticky" as const, top: 0, zIndex: 10 },
  tab: (active: boolean) => ({
    flexShrink: 0, padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
    background: active ? "#1e3a8a" : "#f1f5f9",
    color: active ? "white" : "#6b7280",
  }),
  searchWrap: { padding: "10px 16px" },
  searchInput: { width: "100%", padding: "11px 16px", borderRadius: 14, border: "1.5px solid #e5e7eb", fontSize: 15, background: "#f9fafb", outline: "none", boxSizing: "border-box" as const },
  list: { padding: "0 16px 80px", display: "flex", flexDirection: "column" as const, gap: 10 },
  empty: { textAlign: "center" as const, padding: "48px 16px", color: "#9ca3af" },
  emptyLink: { color: "#2563eb", background: "none", border: "none", fontSize: 14, textDecoration: "underline", cursor: "pointer", marginTop: 8 },
  pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: 12, paddingTop: 8 },
  pageBtn: { padding: "8px 18px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "white", fontSize: 14, cursor: "pointer" },
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

export default function Dashboard({ memberName, role }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState({ total: 0, spoke: 0, no_answer: 0, callback: 0, followed_up: 0, pending: 0, called: 0 });
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showBulk, setShowBulk] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
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
          <div>
            <p style={S.headerTitle}>IAN Campaign</p>
            <p style={S.headerSub}>Hi, {memberName}</p>
          </div>
          <div style={S.btnRow}>
            <button style={S.btnPrimary} onClick={() => setShowAdd(true)}>+ Add</button>
            <button style={S.btnWhite} onClick={() => setShowBulk(true)}>Import</button>
            {role === "superadmin" && <a href="/users" style={S.btnLink}>Users</a>}
            <button style={S.btnGhost} onClick={logout}>Exit</button>
          </div>
        </div>

        <StatsBar stats={stats} />

        {groups.length > 0 && (
          <div style={S.groupBar}>
            <button style={S.groupChip(activeGroup === "")} onClick={() => setActiveGroup("")}>All Groups</button>
            {groups.map(g => (
              <button key={g} style={S.groupChip(activeGroup === g)} onClick={() => setActiveGroup(activeGroup === g ? "" : g)}>{g}</button>
            ))}
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div style={S.tabs}>
        {TABS.map(t => (
          <button key={t.key} style={S.tab(activeTab === t.key)} onClick={() => { setActiveTab(t.key); setPage(1); }}>
            {t.label} <span style={{ fontSize: 11, opacity: 0.7 }}>{tabCount(t.key)}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={S.searchWrap}>
        <input
          style={S.searchInput}
          type="search"
          placeholder="🔍  Search name or number…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      {/* List */}
      <div style={S.list}>
        {loading && <div style={S.empty}>Loading…</div>}
        {!loading && contacts.length === 0 && (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📋</div>
            <p>No contacts found</p>
            <button style={S.emptyLink} onClick={() => setShowBulk(true)}>Import contacts</button>
          </div>
        )}
        {!loading && contacts.map(c => (
          <ContactCard key={c.id} contact={c} onStatusUpdate={handleStatusUpdate} onToggle={handleToggle} onDelete={handleDelete} />
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
