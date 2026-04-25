import { useState } from "react";
import type { Contact } from "../lib/db/schema";

interface Props {
  contact: Contact;
  onClose: () => void;
  onDone: () => void;
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.6)", display: "flex", flexDirection: "column", justifyContent: "flex-end" };
const sheet: React.CSSProperties = { background: "white", borderRadius: "24px 24px 0 0", padding: "24px 20px", maxHeight: "92vh", overflowY: "auto" };
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 5 };
const inp: React.CSSProperties = { width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "11px 14px", fontSize: 15, outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit", background: "#f9fafb" };
const saveBtn: React.CSSProperties = { width: "100%", padding: 15, background: "linear-gradient(135deg, #1e3a8a, #2563eb)", color: "white", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 4 };

const FIELDS: { key: keyof Contact; label: string; placeholder: string; type: string }[] = [
  { key: "name",             label: "Name *",           placeholder: "Dr. Ramesh Nair",         type: "text" },
  { key: "phone",            label: "Phone",            placeholder: "9876543210",               type: "tel" },
  { key: "referred_by",      label: "Referred By",      placeholder: "e.g. Kamal",               type: "text" },
  { key: "group_tag",        label: "Group / City",     placeholder: "e.g. Bangalore",           type: "text" },
  { key: "shared_interests", label: "Shared Interests", placeholder: "e.g. Paediatrics, IAN council", type: "text" },
  { key: "remarks",          label: "Remarks / Notes",  placeholder: "Any extra notes…",         type: "text" },
];

export default function EditContact({ contact, onClose, onDone }: Props) {
  const [form, setForm] = useState<Record<string, string>>({
    name:             contact.name ?? "",
    phone:            contact.phone ?? "",
    referred_by:      contact.referred_by ?? "",
    group_tag:        contact.group_tag ?? "",
    shared_interests: contact.shared_interests ?? "",
    remarks:          contact.remarks ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!form.name?.trim()) { setError("Name is required"); return; }
    setLoading(true); setError("");
    try {
      const body: Record<string, string> = {};
      for (const [k, v] of Object.entries(form)) body[k] = v.trim();
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) onDone();
      else { const d = await res.json() as { error: string }; setError(d.error ?? "Failed"); }
    } finally { setLoading(false); }
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" }}>Edit Contact</h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "#9ca3af" }}>{contact.name}</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 28, color: "#9ca3af", cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {FIELDS.map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label style={lbl}>{label}</label>
              <input
                type={type}
                value={form[key as string] ?? ""}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                style={inp}
              />
            </div>
          ))}

          {error && <p style={{ color: "#dc2626", fontSize: 14, margin: 0 }}>{error}</p>}

          <button onClick={handleSave} disabled={loading} style={{ ...saveBtn, opacity: loading ? 0.6 : 1 }}>
            {loading ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
