import { useEffect, useState, useCallback, useRef } from "react";
import type { ContactStatus } from "../lib/db/schema";

type Role = "superadmin" | "admin" | "member";

interface MasterContact {
  id: string;
  name: string;
  phone: string;
  referred_by?: string;
  group_tag?: string;
  shared_interests?: string;
  remarks?: string;
  wa_sent: number;
  email_sent: number;
  priority: number;
  followup_type?: string | null;
  created_at: string;
  status?: ContactStatus;
  notes?: string;
  called_at?: string;
  called_by?: string;
}

interface PageResult {
  rows: MasterContact[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

interface Props { role?: Role; open: boolean; onClose: () => void; }

const STATUSES: ContactStatus[] = ["pending","spoke","no_answer","wrong_number","callback","followed_up"];

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  spoke:       { bg: "#dcfce7", color: "#166534" },
  no_answer:   { bg: "#fee2e2", color: "#991b1b" },
  wrong_number:{ bg: "#ede9fe", color: "#5b21b6" },
  callback:    { bg: "#fef3c7", color: "#92400e" },
  followed_up: { bg: "#dbeafe", color: "#1e40af" },
  pending:     { bg: "#f1f5f9", color: "#475569" },
};

function csvEscape(v: unknown) {
  if (v === null || v === undefined) return "";
  const t = String(v);
  return /[",\n]/.test(t) ? `"${t.replace(/"/g,'""')}"` : t;
}

function fmt(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  return isNaN(d.getTime()) ? v : d.toLocaleDateString("en-IN",{ day:"2-digit", month:"short" }) + " " + d.toLocaleTimeString("en-IN",{ hour:"2-digit", minute:"2-digit", hour12:true });
}

const th: React.CSSProperties = { padding:"10px 8px", fontSize:12, fontWeight:700, textAlign:"left", color:"#334155", whiteSpace:"nowrap", borderBottom:"2px solid #e2e8f0", position:"sticky" as const, top:0, background:"#f8fafc", zIndex:2 };
const td: React.CSSProperties = { padding:"7px 8px", fontSize:13, borderBottom:"1px solid #f1f5f9", verticalAlign:"middle" };
const inp: React.CSSProperties = { width:"100%", border:"1px solid #e2e8f0", borderRadius:7, padding:"6px 8px", fontSize:13, outline:"none", boxSizing:"border-box" as const, background:"white" };

export default function MasterDatabase({ role, open, onClose }: Props) {
  const [data, setData] = useState<PageResult>({ rows:[], total:0, page:1, pages:1, limit:100 });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");
  const [drafts, setDrafts] = useState<Record<string, Partial<MasterContact>>>({});
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canAccess = role === "admin" || role === "superadmin";

  const load = useCallback(async (p: number, q: string) => {
    if (!canAccess) return;
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(p), ...(q ? { search: q } : {}) });
      const res = await fetch(`/api/contacts/master?${params}`);
      if (!res.ok) { setError("Failed to load"); return; }
      const d = await res.json() as PageResult;
      setData(d); setSelected(new Set()); setDrafts({});
    } finally { setLoading(false); }
  }, [canAccess]);

  useEffect(() => { if (open) load(1, ""); }, [open, load]);

  // Debounced search
  const handleSearch = (q: string) => {
    setSearch(q); setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(1, q), 350);
  };

  const goPage = (p: number) => { setPage(p); load(p, search); };

  // ── Selection ────────────────────────────────────────────────────────
  const allSelected = data.rows.length > 0 && data.rows.every(r => selected.has(r.id));
  const toggleAll = () => {
    setSelected(s => {
      const n = new Set(s);
      allSelected ? data.rows.forEach(r => n.delete(r.id)) : data.rows.forEach(r => n.add(r.id));
      return n;
    });
  };
  const toggleOne = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── Bulk action (single API call) ────────────────────────────────────
  const applyBulk = async () => {
    if (!bulkAction || selected.size === 0) return;
    if (bulkAction === "delete" && !confirm(`Delete ${selected.size} contacts permanently?`)) return;
    setBulkLoading(true); setBulkMsg("");
    try {
      const res = await fetch("/api/contacts/bulk-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action: bulkAction }),
      });
      if (res.ok) {
        const d = await res.json() as { count: number };
        setBulkMsg(`Done — ${d.count} contacts updated`);
        setBulkAction("");
        setTimeout(() => setBulkMsg(""), 3000);
        load(page, search);
      } else {
        const d = await res.json() as { error: string };
        setError(d.error ?? "Bulk action failed");
      }
    } finally { setBulkLoading(false); }
  };

  // ── Single row save ──────────────────────────────────────────────────
  const saveRow = async (row: MasterContact) => {
    const draft = drafts[row.id];
    if (!draft || !Object.keys(draft).length) return;
    setSavingId(row.id); setError("");
    try {
      const res = await fetch(`/api/contacts/${row.id}/master`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!res.ok) { const d = await res.json() as { error: string }; setError(d.error ?? "Save failed"); return; }
      load(page, search);
    } finally { setSavingId(""); }
  };

  const updateDraft = (id: string, key: keyof MasterContact, val: string | number) =>
    setDrafts(c => ({ ...c, [id]: { ...c[id], [key]: val } }));

  const getValue = (row: MasterContact, key: keyof MasterContact) => {
    const d = drafts[row.id]?.[key];
    return d !== undefined ? d : row[key];
  };

  // ── Export ───────────────────────────────────────────────────────────
  const exportCsv = () => {
    const headers = ["Name","Phone","Group","Referred By","Status","Notes","Priority","Follow Up","WA","Created","Last Called","Called By"];
    const lines = [headers.join(","), ...data.rows.map(r => [
      csvEscape(r.name), csvEscape(r.phone), csvEscape(r.group_tag), csvEscape(r.referred_by),
      csvEscape(r.status), csvEscape(r.notes), csvEscape(r.priority?"Yes":"No"),
      csvEscape(r.followup_type||""), csvEscape(r.wa_sent?"Yes":"No"),
      csvEscape(r.created_at), csvEscape(r.called_at), csvEscape(r.called_by),
    ].join(","))];
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(lines.join("\n"));
    a.download = `ian-master-p${page}.csv`; a.click();
  };

  if (!open || !canAccess) return null;

  const someSelected = selected.size > 0;

  return (
    <div style={{ position:"fixed", inset:0, zIndex:90, background:"rgba(15,23,42,0.55)", padding:16 }}>
      <div style={{ height:"100%", background:"#f8fafc", borderRadius:16, display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>

        {/* Header */}
        <div style={{ padding:"14px 18px", background:"#0f172a", color:"white", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexShrink:0 }}>
          <div>
            <h2 style={{ margin:0, fontSize:20, fontWeight:800 }}>Master Database</h2>
            <p style={{ margin:"2px 0 0", fontSize:12, color:"rgba(255,255,255,0.5)" }}>{data.total.toLocaleString()} contacts · page {data.page}/{data.pages}</p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => window.location.href="/api/contacts/export.csv"} style={{ background:"#16a34a", color:"white", border:"none", borderRadius:9, padding:"8px 14px", fontSize:13, fontWeight:700, cursor:"pointer" }}>Google CSV</button>
            <button onClick={exportCsv} style={{ background:"#2563eb", color:"white", border:"none", borderRadius:9, padding:"8px 14px", fontSize:13, fontWeight:700, cursor:"pointer" }}>Export Page</button>
            <button onClick={onClose} style={{ background:"rgba(255,255,255,0.1)", color:"white", border:"1px solid rgba(255,255,255,0.2)", borderRadius:9, padding:"8px 14px", fontSize:13, fontWeight:700, cursor:"pointer" }}>✕ Close</button>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:10, background:"white", borderBottom:"1px solid #e2e8f0", flexShrink:0 }}>
          <input
            type="search" placeholder="🔍  Search name, phone, group…" value={search}
            onChange={e => handleSearch(e.target.value)}
            style={{ flex:1, border:"1.5px solid #e2e8f0", borderRadius:10, padding:"9px 14px", fontSize:14, outline:"none" }}
          />
          <button onClick={() => load(page, search)} style={{ background:"#f1f5f9", color:"#374151", border:"none", borderRadius:9, padding:"9px 14px", fontSize:13, fontWeight:600, cursor:"pointer" }}>↺</button>
          <span style={{ fontSize:13, color:"#94a3b8", whiteSpace:"nowrap" }}>{loading ? "Loading…" : `${data.rows.length} of ${data.total}`}</span>
        </div>

        {/* Bulk bar */}
        {someSelected && (
          <div style={{ padding:"10px 14px", background:"#1e3a8a", display:"flex", alignItems:"center", gap:10, flexShrink:0, flexWrap:"wrap" as const }}>
            <span style={{ color:"white", fontWeight:800, fontSize:14, whiteSpace:"nowrap" }}>{selected.size} selected</span>
            <select value={bulkAction} onChange={e => setBulkAction(e.target.value)}
              style={{ borderRadius:8, border:"none", padding:"9px 14px", fontSize:13, fontWeight:700, color:"#111827", cursor:"pointer", minWidth:220, background:"white" }}>
              <option value="">— Choose action —</option>
              <optgroup label="Call Status">
                <option value="spoke">✓ Mark Spoke</option>
                <option value="no_answer">✗ No Answer</option>
                <option value="callback">↩ Callback</option>
                <option value="followed_up">✔ Followed Up</option>
                <option value="pending">↺ Reset Pending</option>
              </optgroup>
              <optgroup label="Priority">
                <option value="priority_on">★ Set Priority</option>
                <option value="priority_off">☆ Remove Priority</option>
              </optgroup>
              <optgroup label="Follow Up">
                <option value="followup_must">🔴 Must Follow Up</option>
                <option value="followup_clear">Clear Follow Up</option>
              </optgroup>
              <optgroup label="Danger">
                <option value="delete">🗑 Delete</option>
              </optgroup>
            </select>
            <button onClick={applyBulk} disabled={!bulkAction || bulkLoading}
              style={{ background: bulkAction==="delete" ? "#dc2626" : "#10b981", color:"white", border:"none", borderRadius:8, padding:"9px 20px", fontSize:13, fontWeight:800, cursor:"pointer", opacity:(!bulkAction||bulkLoading)?0.5:1, whiteSpace:"nowrap" }}>
              {bulkLoading ? "Working…" : "Apply"}
            </button>
            <button onClick={() => setSelected(new Set())} style={{ background:"rgba(255,255,255,0.15)", color:"white", border:"none", borderRadius:8, padding:"9px 14px", fontSize:13, cursor:"pointer" }}>Deselect All</button>
            {bulkMsg && <span style={{ color:"#6ee7b7", fontSize:13, fontWeight:700 }}>✓ {bulkMsg}</span>}
          </div>
        )}

        {error && <div style={{ padding:"10px 14px", background:"#fef2f2", color:"#b91c1c", fontSize:13, flexShrink:0 }}>{error}</div>}

        {/* Table */}
        <div style={{ flex:1, overflow:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", minWidth:1100 }}>
            <thead>
              <tr>
                <th style={{ ...th, width:36, textAlign:"center" }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ width:15, height:15, cursor:"pointer" }} />
                </th>
                {["Name","Phone","Group","Referred By","Status","Notes","★","Follow Up","WA","Created","Last Called","Called By",""].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={14} style={{ ...td, textAlign:"center", padding:40, color:"#94a3b8", fontSize:15 }}>Loading…</td></tr>
              )}
              {!loading && data.rows.length === 0 && (
                <tr><td colSpan={14} style={{ ...td, textAlign:"center", padding:40, color:"#94a3b8" }}>No contacts found</td></tr>
              )}
              {!loading && data.rows.map(row => {
                const isSelected = selected.has(row.id);
                const hasDraft = !!drafts[row.id] && Object.keys(drafts[row.id]).length > 0;
                const statusVal = String(getValue(row,"status") ?? "pending");
                const sc = STATUS_COLOR[statusVal] ?? STATUS_COLOR.pending;
                return (
                  <tr key={row.id} style={{ background: isSelected ? "#eff6ff" : hasDraft ? "#fffbeb" : "white", transition:"background 0.1s" }}>
                    <td style={{ ...td, textAlign:"center", width:36 }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleOne(row.id)} style={{ width:15, height:15, cursor:"pointer" }} />
                    </td>
                    {/* Editable cells */}
                    {(["name","phone","group_tag","referred_by"] as (keyof MasterContact)[]).map(key => (
                      <td key={key} style={td}>
                        <input value={String(getValue(row,key)??"")} onChange={e => updateDraft(row.id, key, e.target.value)} style={inp} />
                      </td>
                    ))}
                    <td style={td}>
                      <select value={statusVal} onChange={e => updateDraft(row.id,"status",e.target.value)}
                        style={{ ...inp, background:sc.bg, color:sc.color, fontWeight:700, border:"none" }}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={td}>
                      <input value={String(getValue(row,"notes")??"")} onChange={e => updateDraft(row.id,"notes",e.target.value)} style={inp} />
                    </td>
                    <td style={{ ...td, textAlign:"center", fontSize:16 }}>
                      {row.priority ? <span style={{ color:"#f59e0b" }}>★</span> : <span style={{ color:"#e5e7eb" }}>☆</span>}
                    </td>
                    <td style={{ ...td, whiteSpace:"nowrap" }}>
                      {row.followup_type === "must"  && <span style={{ background:"#fee2e2", color:"#dc2626", borderRadius:6, padding:"2px 7px", fontWeight:700, fontSize:11 }}>🔴 Must</span>}
                      {row.followup_type === "maybe" && <span style={{ background:"#fef3c7", color:"#92400e", borderRadius:6, padding:"2px 7px", fontWeight:700, fontSize:11 }}>🟡 Maybe</span>}
                      {!row.followup_type && <span style={{ color:"#d1d5db", fontSize:12 }}>—</span>}
                    </td>
                    <td style={{ ...td, textAlign:"center" }}>
                      {row.wa_sent ? <span style={{ color:"#16a34a", fontWeight:700 }}>✓</span> : <span style={{ color:"#e5e7eb" }}>—</span>}
                    </td>
                    <td style={{ ...td, fontSize:11, color:"#64748b", whiteSpace:"nowrap" }}>{fmt(row.created_at)}</td>
                    <td style={{ ...td, fontSize:11, color:"#64748b", whiteSpace:"nowrap" }}>{fmt(row.called_at)}</td>
                    <td style={{ ...td, fontSize:11, color:"#64748b" }}>{row.called_by || "—"}</td>
                    <td style={td}>
                      {hasDraft && (
                        <button onClick={() => saveRow(row)} disabled={savingId===row.id}
                          style={{ background:"#0f766e", color:"white", border:"none", borderRadius:7, padding:"6px 12px", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", opacity:savingId===row.id?0.7:1 }}>
                          {savingId===row.id?"Saving…":"Save"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.pages > 1 && (
          <div style={{ padding:"12px 18px", background:"white", borderTop:"1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
            <span style={{ fontSize:13, color:"#64748b" }}>
              Page {data.page} of {data.pages} · {data.total.toLocaleString()} total contacts
            </span>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={() => goPage(1)} disabled={data.page===1} style={{ border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 12px", fontSize:13, cursor:"pointer", background:"white", opacity:data.page===1?0.4:1 }}>«</button>
              <button onClick={() => goPage(data.page-1)} disabled={data.page===1} style={{ border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 12px", fontSize:13, cursor:"pointer", background:"white", opacity:data.page===1?0.4:1 }}>‹ Prev</button>
              {/* Page number pills */}
              {Array.from({ length: Math.min(data.pages, 7) }, (_, i) => {
                let p = i + 1;
                if (data.pages > 7) {
                  const start = Math.max(1, data.page - 3);
                  p = start + i;
                  if (p > data.pages) return null;
                }
                return (
                  <button key={p} onClick={() => goPage(p)}
                    style={{ border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 12px", fontSize:13, cursor:"pointer", background:p===data.page?"#1e3a8a":"white", color:p===data.page?"white":"#374151", fontWeight:p===data.page?700:400 }}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => goPage(data.page+1)} disabled={data.page===data.pages} style={{ border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 12px", fontSize:13, cursor:"pointer", background:"white", opacity:data.page===data.pages?0.4:1 }}>Next ›</button>
              <button onClick={() => goPage(data.pages)} disabled={data.page===data.pages} style={{ border:"1px solid #e2e8f0", borderRadius:8, padding:"7px 12px", fontSize:13, cursor:"pointer", background:"white", opacity:data.page===data.pages?0.4:1 }}>»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
