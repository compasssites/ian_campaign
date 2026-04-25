import { useEffect, useMemo, useState } from "react";
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
  "name",
  "phone",
  "referred_by",
  "group_tag",
  "shared_interests",
  "remarks",
  "status",
  "notes",
];
const emptyNewRow = {
  name: "",
  phone: "",
  referred_by: "",
  group_tag: "",
  shared_interests: "",
  remarks: "",
  status: "pending" as ContactStatus,
  notes: "",
  wa_sent: 0,
  email_sent: 0,
};

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, "\"\"")}"` : text;
}

function formatTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

  const canAccess = role === "admin" || role === "superadmin";

  const fetchRows = async () => {
    if (!open || !canAccess) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/contacts/master");
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to load master database" })) as { error?: string };
        setError(data.error || "Unable to load master database");
        return;
      }
      const data = await response.json() as MasterContact[];
      setRows(data.map((row) => ({ ...row, name: formatTitleCase(row.name || "") })));
      setDrafts({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchRows();
  }, [open]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [
        row.name,
        row.phone,
        row.group_tag,
        row.referred_by,
        row.shared_interests,
        row.remarks,
        row.notes,
        row.status,
      ].some((value) => String(value ?? "").toLowerCase().includes(q))
    );
  }, [rows, search]);

  const getValue = (row: MasterContact, key: keyof MasterContact) => {
    const draft = drafts[row.id]?.[key];
    return draft !== undefined ? draft : row[key];
  };

  const updateDraft = (rowId: string, key: keyof MasterContact, value: string | number) => {
    setDrafts((current) => ({
      ...current,
      [rowId]: {
        ...current[rowId],
        [key]: value,
      },
    }));
  };

  const saveRow = async (row: MasterContact) => {
    const draft = drafts[row.id];
    if (!draft || !Object.keys(draft).length) return;

    setSavingId(row.id);
    setError("");
    try {
      const payload: Record<string, string | number> = {};
      for (const [key, value] of Object.entries(draft)) {
        if (value !== undefined) payload[key] = typeof value === "string" ? value.trim() : value;
      }

      const response = await fetch(`/api/contacts/${row.id}/master`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Unable to save row" })) as { error?: string };
        setError(data.error || "Unable to save row");
        return;
      }

      await fetchRows();
    } finally {
      setSavingId("");
    }
  };

  const exportVisibleCsv = () => {
    const headers = ["Name", "Phone", "Referred By", "Group", "Interests", "Remarks", "Status", "Notes", "WA Sent", "Email Sent", "Created", "Last Called", "Called By"];
    const lines = [
      headers.join(","),
      ...filteredRows.map((row) => [
        csvEscape(row.name),
        csvEscape(row.phone),
        csvEscape(row.referred_by),
        csvEscape(row.group_tag),
        csvEscape(row.shared_interests),
        csvEscape(row.remarks),
        csvEscape(row.status),
        csvEscape(row.notes),
        csvEscape(row.wa_sent ? "Yes" : "No"),
        csvEscape(row.email_sent ? "Yes" : "No"),
        csvEscape(row.created_at),
        csvEscape(row.called_at),
        csvEscape(row.called_by),
      ].join(",")),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "ian-master-database.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const printView = () => {
    const printable = window.open("", "_blank", "width=1400,height=900");
    if (!printable) return;

    const rowsHtml = filteredRows.map((row) => `
      <tr>
        <td>${row.name ?? ""}</td>
        <td>${row.phone ?? ""}</td>
        <td>${row.referred_by ?? ""}</td>
        <td>${row.group_tag ?? ""}</td>
        <td>${row.shared_interests ?? ""}</td>
        <td>${row.remarks ?? ""}</td>
        <td>${row.status ?? ""}</td>
        <td>${row.notes ?? ""}</td>
        <td>${row.wa_sent ? "Yes" : "No"}</td>
        <td>${row.email_sent ? "Yes" : "No"}</td>
      </tr>
    `).join("");

    printable.document.write(`
      <html>
        <head>
          <title>IAN Master Database</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
            th { background: #eff6ff; }
          </style>
        </head>
        <body>
          <h1>IAN Master Database</h1>
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Phone</th><th>Referred By</th><th>Group</th><th>Interests</th><th>Remarks</th><th>Status</th><th>Notes</th><th>WA</th><th>Email</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
        </body>
      </html>
    `);
    printable.document.close();
    printable.focus();
    printable.print();
  };

  const createRow = async () => {
    if (!newRow.name.trim() || !newRow.phone.trim()) {
      setError("Name and phone are required for a new row.");
      return;
    }

    setCreating(true);
    setError("");
    try {
      const createResponse = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRow.name.trim(),
          phone: newRow.phone.trim(),
          referred_by: newRow.referred_by.trim(),
          group_tag: newRow.group_tag.trim(),
          shared_interests: newRow.shared_interests.trim(),
          remarks: newRow.remarks.trim(),
        }),
      });

      if (!createResponse.ok) {
        const data = await createResponse.json().catch(() => ({ error: "Unable to add row" })) as { error?: string };
        setError(data.error || "Unable to add row");
        return;
      }

      const data = await createResponse.json() as { id: string };
      if (newRow.status !== "pending" || newRow.notes.trim() || newRow.wa_sent || newRow.email_sent) {
        await fetch(`/api/contacts/${data.id}/master`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: newRow.status,
            notes: newRow.notes.trim(),
            wa_sent: newRow.wa_sent,
            email_sent: newRow.email_sent,
          }),
        });
      }

      setNewRow(emptyNewRow);
      await fetchRows();
    } finally {
      setCreating(false);
    }
  };

  if (!open || !canAccess) return null;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(15,23,42,0.5)", padding: 18 }}>
      <div style={{ height: "100%", background: "#f8fafc", borderRadius: 18, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 16px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ padding: "16px 18px", background: "#0f172a", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Master Database</h2>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Desktop admin workspace for direct contact editing.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => window.location.href = "/api/contacts/export.csv"} style={{ background: "#16a34a", color: "white", border: "none", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Google CSV</button>
            <button onClick={exportVisibleCsv} style={{ background: "#2563eb", color: "white", border: "none", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Visible CSV</button>
            <button onClick={printView} style={{ background: "white", color: "#0f172a", border: "none", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Print / PDF</button>
            <button onClick={onClose} style={{ background: "transparent", color: "white", border: "1px solid rgba(255,255,255,0.22)", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Close</button>
          </div>
        </div>

        <div style={{ padding: 14, display: "flex", alignItems: "center", gap: 10, background: "white", borderBottom: "1px solid #e2e8f0" }}>
          <input
            type="search"
            placeholder="Search any contact field..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, border: "1.5px solid #dbe2ea", borderRadius: 10, padding: "10px 12px", fontSize: 14, outline: "none", minWidth: 240 }}
          />
          <button onClick={() => { setError(""); setNewRow(emptyNewRow); }} style={{ background: "#dcfce7", color: "#166534", border: "none", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Clear Add Row</button>
          <button onClick={fetchRows} style={{ background: "#e2e8f0", color: "#0f172a", border: "none", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Refresh</button>
          <div style={{ fontSize: 13, color: "#64748b" }}>{filteredRows.length} rows</div>
        </div>

        {error && <div style={{ padding: "10px 14px", background: "#fef2f2", color: "#b91c1c", fontSize: 13, borderBottom: "1px solid #fecaca" }}>{error}</div>}
        {loading && <div style={{ padding: 20, color: "#64748b" }}>Loading master database...</div>}

        {!loading && (
          <div style={{ flex: 1, overflow: "auto", background: "white" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1560 }}>
              <thead>
                <tr style={{ position: "sticky", top: 0, background: "#eff6ff", zIndex: 2 }}>
                  {["Name", "Phone", "Referred By", "Group", "Interests", "Remarks", "Status", "Notes", "WA", "Email", "Created", "Last Called", "Called By", "Action"].map((label) => (
                    <th key={label} style={{ borderBottom: "1px solid #cbd5e1", padding: "10px 8px", fontSize: 12, textAlign: "left", color: "#334155", whiteSpace: "nowrap" }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: "#f8fafc" }}>
                  {editableColumns.map((key) => (
                    <td key={key} style={{ borderBottom: "1px solid #dbe2ea", padding: 8, verticalAlign: "top" }}>
                      {key === "status" ? (
                        <select value={newRow.status} onChange={(e) => setNewRow((current) => ({ ...current, status: e.target.value as ContactStatus }))} style={{ width: "100%", border: "1px solid #86efac", borderRadius: 8, padding: "8px 9px", fontSize: 13, background: "white" }}>
                          {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                      ) : (
                        <input
                          value={String(newRow[key as keyof typeof newRow] ?? "")}
                          onChange={(e) => setNewRow((current) => ({ ...current, [key]: e.target.value }))}
                          placeholder={key === "name" ? "Add new contact..." : ""}
                          style={{ width: "100%", border: "1px solid #86efac", borderRadius: 8, padding: "8px 9px", fontSize: 13, background: "white" }}
                        />
                      )}
                    </td>
                  ))}
                  <td style={{ borderBottom: "1px solid #dbe2ea", padding: 8 }}>
                    <input type="checkbox" checked={Boolean(newRow.wa_sent)} onChange={(e) => setNewRow((current) => ({ ...current, wa_sent: e.target.checked ? 1 : 0 }))} />
                  </td>
                  <td style={{ borderBottom: "1px solid #dbe2ea", padding: 8 }}>
                    <input type="checkbox" checked={Boolean(newRow.email_sent)} onChange={(e) => setNewRow((current) => ({ ...current, email_sent: e.target.checked ? 1 : 0 }))} />
                  </td>
                  <td style={{ borderBottom: "1px solid #dbe2ea", padding: 8, fontSize: 12, color: "#94a3b8" }}>-</td>
                  <td style={{ borderBottom: "1px solid #dbe2ea", padding: 8, fontSize: 12, color: "#94a3b8" }}>-</td>
                  <td style={{ borderBottom: "1px solid #dbe2ea", padding: 8, fontSize: 12, color: "#94a3b8" }}>-</td>
                  <td style={{ borderBottom: "1px solid #dbe2ea", padding: 8 }}>
                    <button onClick={createRow} disabled={creating} style={{ background: "#2563eb", color: "white", border: "none", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: creating ? 0.7 : 1 }}>
                      {creating ? "Adding..." : "Add Row"}
                    </button>
                  </td>
                </tr>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    {editableColumns.map((key) => (
                      <td key={key} style={{ borderBottom: "1px solid #eef2f7", padding: 8, verticalAlign: "top" }}>
                        {key === "status" ? (
                          <select value={String(getValue(row, key) ?? "pending")} onChange={(e) => updateDraft(row.id, key, e.target.value)} style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 9px", fontSize: 13 }}>
                            {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                          </select>
                        ) : (
                          <input
                            value={String(getValue(row, key) ?? "")}
                            onChange={(e) => updateDraft(row.id, key, e.target.value)}
                            style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 8, padding: "8px 9px", fontSize: 13 }}
                          />
                        )}
                      </td>
                    ))}
                    <td style={{ borderBottom: "1px solid #eef2f7", padding: 8 }}>
                      <input type="checkbox" checked={Boolean(getValue(row, "wa_sent"))} onChange={(e) => updateDraft(row.id, "wa_sent", e.target.checked ? 1 : 0)} />
                    </td>
                    <td style={{ borderBottom: "1px solid #eef2f7", padding: 8 }}>
                      <input type="checkbox" checked={Boolean(getValue(row, "email_sent"))} onChange={(e) => updateDraft(row.id, "email_sent", e.target.checked ? 1 : 0)} />
                    </td>
                    <td style={{ borderBottom: "1px solid #eef2f7", padding: 8, fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>{formatDate(row.created_at)}</td>
                    <td style={{ borderBottom: "1px solid #eef2f7", padding: 8, fontSize: 12, color: "#475569", whiteSpace: "nowrap" }}>{formatDate(row.called_at)}</td>
                    <td style={{ borderBottom: "1px solid #eef2f7", padding: 8, fontSize: 12, color: "#475569" }}>{row.called_by || "-"}</td>
                    <td style={{ borderBottom: "1px solid #eef2f7", padding: 8 }}>
                      <button onClick={() => saveRow(row)} disabled={savingId === row.id} style={{ background: "#0f766e", color: "white", border: "none", borderRadius: 8, padding: "8px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", opacity: savingId === row.id ? 0.7 : 1 }}>
                        {savingId === row.id ? "Saving..." : "Save"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
