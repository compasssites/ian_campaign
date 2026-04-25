import { useState } from "react";

interface Props { onClose: () => void; onDone: () => void; }

const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,0,0,0.55)", display: "flex", flexDirection: "column", justifyContent: "flex-end" };
const sheet: React.CSSProperties = { background: "white", borderRadius: "24px 24px 0 0", padding: "24px 20px", maxHeight: "90vh", overflowY: "auto" };
const label: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 };
const input: React.CSSProperties = { width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "11px 14px", fontSize: 15, outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit", background: "#f9fafb" };
const btn: React.CSSProperties = { width: "100%", padding: 15, background: "linear-gradient(135deg, #1e3a8a, #2563eb)", color: "white", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer" };

const FIELDS = [
  { key: "name", label: "Name *", placeholder: "Dr. Ramesh Nair", type: "text" },
  { key: "phone", label: "Phone *", placeholder: "9876543210", type: "tel" },
  { key: "referred_by", label: "Referred By", placeholder: "e.g. Kamal", type: "text" },
  { key: "group_tag", label: "Group / List", placeholder: "e.g. Karnataka", type: "text" },
  { key: "shared_interests", label: "Shared Interests", placeholder: "e.g. Paediatrics, IAN council", type: "text" },
  { key: "remarks", label: "Remarks", placeholder: "Any notes…", type: "text" },
];

export default function AddContact({ onClose, onDone }: Props) {
  const [form, setForm] = useState<Record<string, string>>({ name: "", phone: "", referred_by: "", group_tag: "", shared_interests: "", remarks: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!form.name?.trim() || !form.phone?.trim()) { setError("Name and phone are required"); return; }
    setLoading(true); setError("");
    try {
      const body: Record<string, string> = {};
      for (const [k, v] of Object.entries(form)) if (v.trim()) body[k] = v.trim();
      const res = await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) onDone();
      else { const d = await res.json() as { error: string }; setError(d.error ?? "Failed"); }
    } finally { setLoading(false); }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" }}>Add Contact</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 26, color: "#9ca3af", cursor: "pointer", lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {FIELDS.map(({ key, label: lbl, placeholder, type }) => (
            <div key={key}>
              <label style={label}>{lbl}</label>
              <input type={type} value={form[key] ?? ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} style={input} />
            </div>
          ))}
          {error && <p style={{ color: "#dc2626", fontSize: 14, margin: 0 }}>{error}</p>}
          <button onClick={handleSave} disabled={loading} style={{ ...btn, opacity: loading ? 0.6 : 1, marginTop: 4 }}>
            {loading ? "Saving…" : "Add Contact"}
          </button>
        </div>
      </div>
    </div>
  );
}
