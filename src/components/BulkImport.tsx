import { useState } from "react";

interface Props { onClose: () => void; onDone: () => void; }

const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.55)", display: "flex", flexDirection: "column", justifyContent: "flex-end" };
const sheet: React.CSSProperties = { background: "white", borderRadius: "24px 24px 0 0", padding: "24px 20px", maxHeight: "90vh", overflowY: "auto" };
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 };
const input: React.CSSProperties = { width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "11px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" };
const btn: React.CSSProperties = { width: "100%", padding: 15, background: "linear-gradient(135deg, #1e3a8a, #2563eb)", color: "white", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 4 };

export default function BulkImport({ onClose, onDone }: Props) {
  const [text, setText] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [groupTag, setGroupTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);

  const lineCount = text.split("\n").filter(l => l.trim()).length;

  const handleImport = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/contacts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, referred_by: referredBy || undefined, group_tag: groupTag || undefined }),
      });
      if (res.ok) setResult(await res.json());
    } finally { setLoading(false); }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" }}>Bulk Import</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 26, color: "#9ca3af", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>

        {!result ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={label}>Paste names & numbers — one per line</label>
              <textarea
                value={text} onChange={e => setText(e.target.value)}
                placeholder={"Dr. Ramesh Nair, 9876543210\nDr. Priya Shetty, 9123456789\nDr. Kumar, 9988776655, Kamal"}
                rows={7} autoFocus
                style={{ ...input, resize: "none", fontFamily: "monospace", fontSize: 13 }}
              />
              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                Format: Name, Number &nbsp;·&nbsp; or &nbsp;·&nbsp; Name, Number, ReferredBy
                {lineCount > 0 && <span style={{ color: "#2563eb", fontWeight: 700, marginLeft: 8 }}>{lineCount} entries detected</span>}
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={label}>Referred By</label>
                <input style={input} type="text" value={referredBy} onChange={e => setReferredBy(e.target.value)} placeholder="e.g. Kamal" />
              </div>
              <div>
                <label style={label}>Group Tag</label>
                <input style={input} type="text" value={groupTag} onChange={e => setGroupTag(e.target.value)} placeholder="e.g. Karnataka" />
              </div>
            </div>
            <button onClick={handleImport} disabled={loading || !text.trim()} style={{ ...btn, opacity: loading || !text.trim() ? 0.5 : 1 }}>
              {loading ? "Importing…" : `Import ${lineCount > 0 ? lineCount + " " : ""}Contacts`}
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>✅</div>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: "0 0 6px" }}>{result.inserted} contacts imported</p>
            {result.skipped > 0 && <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>{result.skipped} lines skipped (invalid format)</p>}
            <button onClick={onDone} style={{ ...btn, marginTop: 24 }}>View Contacts</button>
          </div>
        )}
      </div>
    </div>
  );
}
