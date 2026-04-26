import { useState, useEffect, useCallback, useRef, useId } from "react";
import type { Contact, ContactStatus } from "../lib/db/schema";
import StatsBar from "./StatsBar";
import ContactCard from "./ContactCard";
import BulkImport from "./BulkImport";
import AddContact from "./AddContact";
import MasterDatabase from "./MasterDatabase";

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
  { key: "priority",      label: "★ Priority" },
  { key: "pending",       label: "Pending" },
  { key: "pending_missed",label: "Pending+Missed" },
  { key: "followup_must", label: "🔴 Must Follow Up" },
  { key: "all",           label: "All" },
];

interface Props { memberName: string; role?: string; }

function MenuButton({ label, icon, danger, onClick }: { label: string; icon: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        gap: 10,
        padding: "14px 16px",
        background: "none",
        border: "none",
        fontSize: 14,
        fontWeight: 600,
        color: danger ? "#dc2626" : "#111827",
        cursor: "pointer",
        textAlign: "left",
        borderBottom: danger ? "none" : "1px solid #f1f5f9",
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

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
        <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 30, background: "white", borderRadius: 14, boxShadow: "0 8px 30px rgba(0,0,0,0.18)", border: "1px solid #e5e7eb", width: "min(260px, 90vw)", overflow: "hidden" }}>
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
  const [stats, setStats] = useState({ total: 0, spoke: 0, no_answer: 0, wrong_number: 0, callback: 0, followed_up: 0, pending: 0, called: 0, priority: 0, followup_must: 0 });
  const [activeTab, setActiveTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showBulk, setShowBulk] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [groups, setGroups] = useState<string[]>([]);
  const [activeGroup, setActiveGroup] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showMasterDb, setShowMasterDb] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

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
  useEffect(() => {
    const sync = () => setIsDesktop(window.innerWidth >= 1024);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  const refresh = useCallback(() => { fetchContacts(page); fetchStats(); }, [fetchContacts, page, fetchStats]);

  const handleStatusUpdate = useCallback(async (id: string, status: ContactStatus, notes?: string) => {
    await fetch("/api/calls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact_id: id, status, notes }) });
    refresh();
  }, [refresh]);

  const handleToggle = useCallback(async (id: string, field: "wa_sent" | "email_sent" | "priority", value: boolean) => {
    await fetch(`/api/contacts/${id}/toggles`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }) });
    refresh();
  }, [refresh]);

  const handleDelete = useCallback(async (id: string) => {
    await fetch(`/api/contacts/${id}`, { method: "DELETE" }); refresh();
  }, [refresh]);

  const handleExport = useCallback(() => {
    setMenuOpen(false);
    window.location.href = "/api/contacts/export.csv";
  }, []);

  const handleChangePin = useCallback(async () => {
    if (!currentPin || !newPin) {
      setPinError("Current PIN and new PIN are required.");
      return;
    }
    if (newPin.length < 4) {
      setPinError("New PIN must be at least 4 characters.");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("New PIN and confirm PIN must match.");
      return;
    }

    setPinLoading(true);
    setPinError("");
    try {
      const response = await fetch("/api/auth/change-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to change PIN" })) as { error?: string };
        setPinError(data.error || "Unable to change PIN");
        return;
      }

      setShowPinModal(false);
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } finally {
      setPinLoading(false);
    }
  }, [confirmPin, currentPin, newPin]);

  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); window.location.href = "/login"; };

  const tabCount = (key: string) => {
    if (key === "all") return stats.total;
    if (key === "pending") return stats.pending;
    if (key === "pending_missed") return stats.pending + stats.no_answer;
    if (key === "followup_must") return stats.followup_must;
    if (key === "priority") return stats.priority;
    return (stats as Record<string, number>)[key] ?? 0;
  };
  const canAccessMasterDb = isDesktop && (role === "admin" || role === "superadmin");

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
                  {canAccessMasterDb && <MenuButton label="Master Database" icon="🗂️" onClick={() => { setMenuOpen(false); setShowMasterDb(true); }} />}
                  <MenuButton label="Export Contacts CSV" icon="⬇️" onClick={handleExport} />
                  <MenuButton label="Change PIN" icon="🔐" onClick={() => { setMenuOpen(false); setPinError(""); setShowPinModal(true); }} />
                  <MenuButton label="Sign Out" icon="🚪" danger onClick={() => { setMenuOpen(false); logout(); }} />
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
            style={{ ...S.searchInput, paddingRight: search ? 36 : 14 }}
            type="search"
            placeholder="Search name or number…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button
              onClick={() => { setSearch(""); setPage(1); }}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "#e5e7eb", border: "none", borderRadius: "50%", width: 20, height: 20, cursor: "pointer", fontSize: 11, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1, padding: 0 }}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
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
      <MasterDatabase role={role as "superadmin" | "admin" | "member" | undefined} open={showMasterDb} onClose={() => setShowMasterDb(false)} />
      {showPinModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 80 }}>
          <div style={{ width: "100%", maxWidth: 420, background: "white", borderRadius: 16, boxShadow: "0 12px 32px rgba(0,0,0,0.22)", padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" }}>Change PIN</h2>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>Update your login PIN for this account.</p>
              </div>
              <button onClick={() => setShowPinModal(false)} style={{ background: "none", border: "none", fontSize: 22, lineHeight: 1, color: "#9ca3af", cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Current PIN", value: currentPin, setter: setCurrentPin },
                { label: "New PIN", value: newPin, setter: setNewPin },
                { label: "Confirm PIN", value: confirmPin, setter: setConfirmPin },
              ].map(({ label, value, setter }) => (
                <label key={label} style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: "#374151", fontWeight: 600 }}>
                  <span>{label}</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={value}
                    onChange={e => setter(e.target.value)}
                    style={{ border: "1.5px solid #e5e7eb", borderRadius: 10, padding: "10px 12px", fontSize: 14, outline: "none" }}
                  />
                </label>
              ))}
            </div>

            {pinError && <p style={{ margin: "12px 0 0", fontSize: 13, color: "#dc2626" }}>{pinError}</p>}

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={handleChangePin} disabled={pinLoading} style={{ flex: 1, background: "#1e3a8a", color: "white", border: "none", borderRadius: 10, padding: "11px 14px", fontSize: 14, fontWeight: 700, cursor: pinLoading ? "wait" : "pointer", opacity: pinLoading ? 0.75 : 1 }}>
                {pinLoading ? "Saving..." : "Update PIN"}
              </button>
              <button onClick={() => setShowPinModal(false)} style={{ flex: 1, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 10, padding: "11px 14px", fontSize: 14, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
