import { useState } from "react";

interface Props { onClose: () => void; onDone: () => void; }

const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", justifyContent: "flex-end" };
const sheet: React.CSSProperties = { background: "white", borderRadius: "24px 24px 0 0", padding: "24px 20px", maxHeight: "92vh", overflowY: "auto" };
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 };
const inp: React.CSSProperties = { width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "11px 14px", fontSize: 15, outline: "none", boxSizing: "border-box" as const, background: "#f9fafb" };
const primaryBtn: React.CSSProperties = { width: "100%", padding: 15, background: "linear-gradient(135deg,#1e3a8a,#2563eb)", color: "white", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer" };

// Row type for tabular entry
interface Row { name: string; phone: string; city: string; referredBy: string; }
const emptyRow = (): Row => ({ name: "", phone: "", city: "", referredBy: "" });

type Mode = "table" | "paste" | "csv";

export default function BulkImport({ onClose, onDone }: Props) {
  const [mode, setMode] = useState<Mode>("table");
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [pasteText, setPasteText] = useState("");
  const [groupTag, setGroupTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);

  const updateRow = (i: number, field: keyof Row, val: string) => {
    const next = [...rows];
    next[i] = { ...next[i], [field]: val };
    // Auto-add row when last row is touched
    if (i === rows.length - 1 && val) next.push(emptyRow());
    setRows(next);
  };

  const downloadSample = () => {
    const csv = "Name,Phone,City,Referred By\nDr. Ramesh Nair,9876543210,Bangalore,Kamal\nDr. Priya Shetty,9123456789,Delhi,\n";
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    a.download = "ian_campaign_import_template.csv";
    a.click();
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      const dataLines = lines.filter(l => !l.toLowerCase().startsWith("name,")); // skip header
      const newRows: Row[] = dataLines.map(line => {
        const parts = line.split(",").map(p => p.trim().replace(/^"|"$/g, ""));
        return { name: parts[0] ?? "", phone: parts[1] ?? "", city: parts[2] ?? "", referredBy: parts[3] ?? "" };
      }).filter(r => r.name || r.phone);
      setRows([...newRows, emptyRow()]);
      setMode("table");
    };
    reader.readAsText(file);
  };

  const buildBulkText = () => {
    if (mode === "paste") return pasteText;
    // Convert table rows to "Name, Phone, City, ReferredBy" lines
    return rows
      .filter(r => r.name.trim() || r.phone.trim())
      .map(r => [r.name, r.phone, r.city, r.referredBy].filter(Boolean).join(", "))
      .join("\n");
  };

  const handleImport = async () => {
    const text = buildBulkText();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/contacts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, group_tag: groupTag || undefined }),
      });
      if (res.ok) setResult(await res.json());
    } finally { setLoading(false); }
  };

  const entryCount = mode === "paste"
    ? pasteText.split("\n").filter(l => l.trim()).length
    : rows.filter(r => r.name.trim() || r.phone.trim()).length;

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: "9px", border: "none", cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 400,
    background: active ? "#1e3a8a" : "#f3f4f6", color: active ? "white" : "#6b7280",
    borderRadius: active ? 10 : 10,
  });

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" }}>Import Contacts</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 28, color: "#9ca3af", cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
        </div>

        {!result ? (
          <>
            {/* Mode tabs */}
            <div style={{ display: "flex", gap: 4, background: "#f3f4f6", borderRadius: 12, padding: 4, marginBottom: 16 }}>
              <button style={tabStyle(mode === "table")} onClick={() => setMode("table")}>📋 Table Entry</button>
              <button style={tabStyle(mode === "paste")} onClick={() => setMode("paste")}>📝 Paste Text</button>
              <button style={tabStyle(mode === "csv")} onClick={() => setMode("csv")}>📁 CSV File</button>
            </div>

            {/* Group tag (all modes) */}
            <div style={{ marginBottom: 14 }}>
              <label style={lbl}>Group / City Tag (applies to all)</label>
              <input style={inp} type="text" value={groupTag} onChange={e => setGroupTag(e.target.value)} placeholder="e.g. Karnataka, Delhi…" />
            </div>

            {/* TABLE MODE */}
            {mode === "table" && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f8fafc" }}>
                      {["Name *", "Phone", "City", "Referred By"].map(h => (
                        <th key={h} style={{ padding: "8px 6px", textAlign: "left", fontWeight: 700, color: "#374151", borderBottom: "1.5px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i}>
                        {(["name","phone","city","referredBy"] as (keyof Row)[]).map(field => (
                          <td key={field} style={{ padding: "4px 4px" }}>
                            <input
                              type={field === "phone" ? "tel" : "text"}
                              value={row[field]}
                              onChange={e => updateRow(i, field, e.target.value)}
                              placeholder={field === "name" ? "Dr. Ramesh" : field === "phone" ? "98765…" : field === "city" ? "City" : "Ref by"}
                              style={{ ...inp, padding: "9px 10px", fontSize: 13, background: "white" }}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
                  {entryCount} {entryCount === 1 ? "entry" : "entries"} — new row added automatically as you type
                </p>
              </div>
            )}

            {/* PASTE MODE */}
            {mode === "paste" && (
              <div>
                <label style={lbl}>Paste names & numbers — one per line</label>
                <textarea
                  value={pasteText} onChange={e => setPasteText(e.target.value)}
                  placeholder={"Dr. Ramesh Nair, 9876543210\nDr. Priya Shetty, 9123456789, Delhi, Kamal\n9988776655, Dr. Kumar"}
                  rows={8} autoFocus
                  style={{ ...inp, resize: "none", fontFamily: "monospace", fontSize: 13 }}
                />
                <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                  Format: Name, Phone &nbsp;·&nbsp; or &nbsp;·&nbsp; Name, Phone, City, ReferredBy
                  {entryCount > 0 && <strong style={{ color: "#2563eb", marginLeft: 8 }}>{entryCount} entries</strong>}
                </p>
              </div>
            )}

            {/* CSV MODE */}
            {mode === "csv" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ border: "2px dashed #e5e7eb", borderRadius: 16, padding: 24, textAlign: "center" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
                  <p style={{ margin: "0 0 12px", color: "#374151", fontWeight: 600 }}>Upload a CSV file</p>
                  <label style={{ ...primaryBtn, display: "inline-block", padding: "10px 24px", width: "auto", cursor: "pointer" }}>
                    Choose File
                    <input type="file" accept=".csv,.txt" onChange={handleCsvUpload} style={{ display: "none" }} />
                  </label>
                </div>
                <div style={{ background: "#f0f9ff", borderRadius: 12, padding: "12px 14px" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: "#1e40af" }}>Need a template?</p>
                  <p style={{ margin: "0 0 10px", fontSize: 12, color: "#374151" }}>
                    Download the sample CSV, fill it in Excel or Google Sheets, then upload it here.
                  </p>
                  <button onClick={downloadSample}
                    style={{ background: "white", color: "#1e40af", border: "1.5px solid #bfdbfe", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    ⬇ Download Sample CSV
                  </button>
                </div>
                <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>
                  Columns: <strong>Name, Phone, City, Referred By</strong> (header row optional)
                </p>
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={loading || entryCount === 0}
              style={{ ...primaryBtn, opacity: loading || entryCount === 0 ? 0.45 : 1, marginTop: 16 }}
            >
              {loading ? "Importing…" : `Import ${entryCount > 0 ? entryCount + " " : ""}Contacts`}
            </button>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 6px" }}>{result.inserted} contacts imported</p>
            {result.skipped > 0 && <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>{result.skipped} lines skipped</p>}
            <button onClick={onDone} style={{ ...primaryBtn, marginTop: 24 }}>View Contacts</button>
          </div>
        )}
      </div>
    </div>
  );
}
