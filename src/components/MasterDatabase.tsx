import { useEffect, useMemo, useState, useCallback } from "react";
import type { ContactStatus } from "../lib/db/schema";

type Role = "superadmin" | "admin" | "member";

interface MasterContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
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

interface Props {
  role?: Role;
  open: boolean;
  onClose: () => void;
}

const STATUSES: ContactStatus[] = ["pending", "spoke", "no_answer", "wrong_number", "callback", "followed_up"];

const editableColumns: Array<keyof MasterContact> = [
  "name", "phone", "referred_by", "group_tag", "shared_interests", "remarks", "status", "notes",
];

const emptyNewRow = {
  name: "", phone: "", referred_by: "", group_tag: "",
  shared_interests: "", remarks: "", status: "pending" as ContactStatus,
  notes: "", wa_sent: 0, email_sent: 0,
};

const STATUS_COLORS: Record<string, string> = {
  spoke: "#16a34a", no_answer: "#dc2626", wrong_number: "#7c3aed",
  callback: "#d97706", followed_up: "#2563eb", pending: "#6b7280",
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" });
}

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function formatTitleCase(value: string) {
  return value.toLowerCase().split(/\s+/).filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

export default function MasterDatabase({ role, open, onClose }: Props) {
  const [rows, setRows] = useState<MasterContact[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Partial<MasterContact>>>({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [newRow, setNewRow] = useState(emptyNewRow);
  const [creating, setCreating] = useState(false);

  // Bulk select state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState("");

  const canAccess = role === "admin" || role === "superadmin";

  const fetchRows = useCallback(async () => {
    if (!open || !canAccess) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/contacts/master");
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: "Unable to load" })) as { error?: string };
        setError(d.error || "Unable to load"); return;
      }
      const data = await res.json() as MasterContact[];
      setRows(data.map((r) => ({ ...r, name: formatTitleCase(r.name || "") })));
      setDrafts({}); setSelected(new Set());
    } finally { setLoading(false); }
  }, [open, canAccess]);

  useEffect(() => { if (open) fetchRows(); }, [open, fetchRows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.name, r.phone, r.group_tag, r.referred_by, r.shared_interests, r.remarks, r.notes, r.status]
        .some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [rows, search]);

  // ── Bulk select helpers ──────────────────────────────────────────────
  const allVisibleIds = filteredRows.map((r) => r.id);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelected((s) => { const n = new Set(s); allVisibleIds.forEach((id) => n.delete(id)); return n; });
    } else {
      setSelected((s) => { const n = new Set(s); allVisibleIds.forEach((id) => n.add(id)); return n; });
    }
  };

  const toggleOne = (id: string) => {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const applyBulkAction = async () => {
    if (!bulkAction || selected.size === 0) return;
    setBulkLoading(true); setBulkResult("");

    const ids = Array.from(selected);

    if (bulkAction === "delete") {
      if (!confirm(`Delete ${ids.length} contacts? This cannot be undone.`)) { setBulkLoading(false); return; }
      let done = 0;
      for (const id of ids) {
        await fetch(`/api/contacts/${id}`, { method: "DELETE" });
        done++;
      }
      setBulkResult(`Deleted ${done} contacts.`);
      setSelected(new Set());
      await fetchRows();
    } else if (bulkAction === "priority_on") {
      for (const id of ids) {
        await fetch(`/api/contacts/${id}/toggles`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priority: true }) });
      }
      setBulkResult(`Marked ${ids.length} as Priority.`);
      await fetchRows();
    } else if (bulkAction === "priority_off") {
      for (const id of ids) {
        await fetch(`/api/contacts/${id}/toggles`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priority: false }) });
      }
      setBulkResult(`Removed priority from ${ids.length} contacts.`);
      await fetchRows();
    } else if (bulkAction === "followup_must") {
      for (const id of ids) {
        await fetch(`/api/contacts/${id}/toggles`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ followup_type: "must" }) });
      }
      setBulkResult(`Set Must Follow Up on ${ids.length} contacts.`);
      await fetchRows();
    } else if (bulkAction === "followup_clear") {
      for (const id of ids) {
        await fetch(`/api/contacts/${id}/toggles`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ followup_type: null }) });
      }
      setBulkResult(`Cleared follow-up on ${ids.length} contacts.`);
      await fetchRows();
    } else {
      // It's a status
      for (const id of ids) {
        await fetch("/api/calls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contact_id: id, status: bulkAction }) });
      }
      setBulkResult(`Marked ${ids.length} contacts as ${bulkAction}.`);
      await fetchRows();
    }

    setBulkLoading(false);
    setBulkAction("");
    setTimeout(() => setBulkResult(""), 3000);
  };

  // ── Single row edit ──────────────────────────────────────────────────
  const getValue = (row: MasterContact, key: keyof MasterContact) => {
    const d = drafts[row.id]?.[key];
    return d !== undefined ? d : row[key];
  };

  const updateDraft = (rowId: string, key: keyof MasterContact, value: string | number) => {
    setDrafts((c) => ({ ...c, [rowId]: { ...c[rowId], [key]: value } }));
  };

  const saveRow = async (row: MasterContact) => {
    const draft = drafts[row.id];
    if (!draft || !Object.keys(draft).length) return;
    setSavingId(row.id); setError("");
    try {
      const payload: Record<string, string | number> = {};
      for (const [k, v] of Object.entries(draft)) {
        if (v !== undefined) payload[k] = typeof v === "string" ? v.trim() : v;
      }
      const res = await fetch(`/api/contacts/${row.id}/master`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({ error: "Unable to save" })) as { error?: string }; setError(d.error || "Unable to save"); return; }
      await fetchRows();
    } finally { setSavingId(""); }
  };

  const exportVisibleCsv = () => {
    const headers = ["Name","Phone","Referred By","Group","Status","Notes","Priority","Follow Up","WA","Created","Last Called","Called By"];
    const lines = [headers.join(","), ...filteredRows.map((r) => [
      csvEscape(r.name), csvEscape(r.phone), csvEscape(r.referred_by), csvEscape(r.group_tag),
      csvEscape(r.status), csvEscape(r.notes), csvEscape(r.priority ? "Yes" : "No"),
      csvEscape(r.followup_type || ""), csvEscape(r.wa_sent ? "Yes" : "No"),
      csvEscape(r.created_at), csvEscape(r.called_at), csvEscape(r.called_by),
    ].join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "ian-master-database.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const createRow = async () => {
    if (!newRow.name.trim() || !newRow.phone.trim()) { setError("Name and phone are required."); return; }
    setCreating(true); setError("");
    try {
      const res = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newRow.name.trim(), phone: newRow.phone.trim(), referred_by: newRow.referred_by.trim(), group_tag: newRow.group_tag.trim(), shared_interests: newRow.shared_interests.trim(), remarks: newRow.remarks.trim() }) });
      if (!res.ok) { const d = await res.json().catch(() => ({ error: "Unable to add" })) as { error?: string }; setError(d.error || "Unable to add"); return; }
      const data = await res.json() as { id: string };
      if (newRow.status !== "pending" || newRow.notes.trim()) {
        await fetch(`/api/contacts/${data.id}/master`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newRow.status, notes: newRow.notes.trim() }) });
      }
      setNewRow(emptyNewRow); await fetchRows();
    } finally { setCreating(false); }
  };

  if (!open || !canAccess) return null;

  const thStyle: React.CSSProperties = { borderBottom: "1px solid #cbd5e1", padding: "10px 8px", fontSize: 12, textAlign: "left", color: "#334155", whiteSpace: "nowrap", fontWeight: 700 };
  const tdStyle: React.CSSProperties = { borderBottom: "1px solid #eef2f7", padding: 8, verticalAlign: "top" };
  const inputStyle: React.CSSProperties = { width: "100%", border: "1px solid #cbd5e1", borderRadius: 8, padding: "7px 9px", fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(15,23,42,0.5)", padding: 18 }}>
      <div style={{ height: "100%", background: "#f8fafc", borderRadius: 18, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 16px 40px rgba(0,0,0,0.25)" }}>

        {/* Header */}
        <div style={{ padding: "14px 18px", background: "#0f172a", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Master Database</h2>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255,255,255,0.55)" }}>{rows.length} contacts · desktop admin view</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => window.location.href = "/api/contacts/export.csv"} style={{ background: "#16a34a", color: "white", border: "none", borderRadius: 9, padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Google CSV</button>
            <button onClick={exportVisibleCsv} style={{ background: "#2563eb", color: "white", border: "none", borderRadius: 9, padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Export CSV</button>
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.12)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 9, padding: "8px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>✕ Close</button>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, background: "white", borderBottom: "1px solid #e2e8f0", flexShrink: 0, flexWrap: "wrap" as const }}>
          <input type="search" placeholder="🔍 Search any field…" value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 200, border: "1.5px solid #dbe2ea", borderRadius: 10, padding: "9px 12px", fontSize: 14, outline: "none" }} />
          <button onClick={fetchRows} style={{ background: "#f1f5f9", color: "#0f172a", border: "none", borderRadius: 9, padding: "9px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>↺ Refresh</button>
          <span style={{ fontSize: 13, color: "#64748b" }}>{filteredRows.length} shown</span>
        </div>

        {/* Bulk action bar — appears when rows are selected */}
        {someSelected && (
          <div style={{ padding: "10px 14px", background: "#1e3a8a", display: "flex", alignItems: "center", gap: 10, flexShrink: 0, flexWrap: "wrap" as const }}>
            <span style={{ color: "white", fontWeight: 700, fontSize: 14 }}>{selected.size} selected</span>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              style={{ borderRadius: 8, border: "none", padding: "8px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", minWidth: 200 }}
            >
              <option value="">— Choose action —</option>
              <optgroup label="Mark Call Status">
                <option value="spoke">✓ Mark as Spoke</option>
                <option value="no_answer">✗ Mark as No Answer</option>
                <option value="callback">↩ Mark as Callback</option>
                <option value="followed_up">✔ Mark as Followed Up</option>
                <option value="pending">↺ Reset to Pending</option>
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
                <option value="delete">🗑 Delete Selected</option>
              </optgroup>
            </select>
            <button
              onClick={applyBulkAction}
              disabled={!bulkAction || bulkLoading}
              style={{ background: bulkAction === "delete" ? "#dc2626" : "#10b981", color: "white", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", opacity: (!bulkAction || bulkLoading) ? 0.5 : 1 }}
            >
              {bulkLoading ? "Working…" : "Apply"}
            </button>
            <button onClick={() => setSelected(new Set())} style={{ background: "rgba(255,255,255,0.15)", color: "white", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13, cursor: "pointer" }}>
              Deselect All
            </button>
            {bulkResult && <span style={{ color: "#6ee7b7", fontSize: 13, fontWeight: 600 }}>✓ {bulkResult}</span>}
          </div>
        )}

        {error && <div style={{ padding: "10px 14px", background: "#fef2f2", color: "#b91c1c", fontSize: 13, borderBottom: "1px solid #fecaca", flexShrink: 0 }}>{error}</div>}
        {loading && <div style={{ padding: 20, color: "#64748b" }}>Loading…</div>}

        {!loading && (
          <div style={{ flex: 1, overflow: "auto", background: "white" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1400 }}>
              <thead>
                <tr style={{ position: "sticky", top: 0, background: "#eff6ff", zIndex: 2 }}>
                  {/* Select all checkbox */}
                  <th style={{ ...thStyle, width: 36, textAlign: "center" }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll}
                      title={allSelected ? "Deselect all" : "Select all visible"}
                      style={{ width: 16, height: 16, cursor: "pointer" }} />
                  </th>
                  {["Name","Phone","Referred By","Group","Interests","Remarks","Status","Notes","WA","★","Follow Up","Created","Last Called","Called By","Save"].map((h) => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* New row */}
                <tr style={{ background: "#f0fdf4" }}>
                  <td style={tdStyle} />
                  {editableColumns.map((key) => (
                    <td key={key} style={tdStyle}>
                      {key === "status" ? (
                        <select value={newRow.status} onChange={(e) => setNewRow((c) => ({ ...c, status: e.target.value as ContactStatus }))}
                          style={{ ...inputStyle, border: "1px solid #86efac" }}>
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <input value={String(newRow[key as keyof typeof newRow] ?? "")}
                          onChange={(e) => setNewRow((c) => ({ ...c, [key]: e.target.value }))}
                          placeholder={key === "name" ? "New contact…" : ""}
                          style={{ ...inputStyle, border: "1px solid #86efac" }} />
                      )}
                    </td>
                  ))}
                  <td style={tdStyle}><input type="checkbox" checked={Boolean(newRow.wa_sent)} onChange={(e) => setNewRow((c) => ({ ...c, wa_sent: e.target.checked ? 1 : 0 }))} /></td>
                  <td style={{ ...tdStyle, color: "#94a3b8", fontSize: 12 }}>-</td>
                  <td style={{ ...tdStyle, color: "#94a3b8", fontSize: 12 }}>-</td>
                  <td style={{ ...tdStyle, color: "#94a3b8", fontSize: 12 }}>-</td>
                  <td style={{ ...tdStyle, color: "#94a3b8", fontSize: 12 }}>-</td>
                  <td style={{ ...tdStyle, color: "#94a3b8", fontSize: 12 }}>-</td>
                  <td style={tdStyle}>
                    <button onClick={createRow} disabled={creating}
                      style={{ background: "#2563eb", color: "white", border: "none", borderRadius: 8, padding: "7px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: creating ? 0.7 : 1 }}>
                      {creating ? "Adding…" : "Add"}
                    </button>
                  </td>
                </tr>

                {/* Data rows */}
                {filteredRows.map((row) => {
                  const isSelected = selected.has(row.id);
                  const hasDraft = drafts[row.id] && Object.keys(drafts[row.id]).length > 0;
                  return (
                    <tr key={row.id} style={{ background: isSelected ? "#eff6ff" : hasDraft ? "#fffbeb" : "white" }}>
                      {/* Row checkbox */}
                      <td style={{ ...tdStyle, textAlign: "center", width: 36 }}>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleOne(row.id)}
                          style={{ width: 16, height: 16, cursor: "pointer" }} />
                      </td>

                      {editableColumns.map((key) => (
                        <td key={key} style={tdStyle}>
                          {key === "status" ? (
                            <select value={String(getValue(row, key) ?? "pending")} onChange={(e) => updateDraft(row.id, key, e.target.value)}
                              style={{ ...inputStyle, color: STATUS_COLORS[String(getValue(row, key))] ?? "#374151", fontWeight: 600 }}>
                              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          ) : (
                            <input value={String(getValue(row, key) ?? "")} onChange={(e) => updateDraft(row.id, key, e.target.value)}
                              style={inputStyle} />
                          )}
                        </td>
                      ))}

                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <input type="checkbox" checked={Boolean(getValue(row, "wa_sent"))} onChange={(e) => updateDraft(row.id, "wa_sent", e.target.checked ? 1 : 0)} />
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center", fontSize: 18 }}>
                        {row.priority ? "★" : <span style={{ color: "#e5e7eb" }}>☆</span>}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12 }}>
                        {row.followup_type === "must" && <span style={{ background: "#fee2e2", color: "#dc2626", borderRadius: 6, padding: "2px 6px", fontWeight: 700 }}>🔴 Must</span>}
                        {row.followup_type === "maybe" && <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 6, padding: "2px 6px", fontWeight: 700 }}>🟡 Maybe</span>}
                        {!row.followup_type && <span style={{ color: "#d1d5db" }}>—</span>}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>{formatDate(row.created_at)}</td>
                      <td style={{ ...tdStyle, fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>{formatDate(row.called_at)}</td>
                      <td style={{ ...tdStyle, fontSize: 12, color: "#475569" }}>{row.called_by || "—"}</td>
                      <td style={tdStyle}>
                        {hasDraft && (
                          <button onClick={() => saveRow(row)} disabled={savingId === row.id}
                            style={{ background: "#0f766e", color: "white", border: "none", borderRadius: 8, padding: "7px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: savingId === row.id ? 0.7 : 1 }}>
                            {savingId === row.id ? "Saving…" : "Save"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
