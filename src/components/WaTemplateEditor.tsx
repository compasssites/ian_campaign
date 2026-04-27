import { useState, useEffect } from "react";

export interface WaTemplates {
  noPickup: string;
  spoke: string;
}

export const DEFAULT_TEMPLATES: WaTemplates = {
  noPickup: `Dear Dr. {{FIRSTNAME}},\n\nThis is Dr. Sudhir Kothari from Poona. I tried calling you but couldn't get through. This is regarding the upcoming IAN election. Please let me know when I can call, or give me a call when you are free.`,
  spoke: `Dear Dr. {{FIRSTNAME}},\n\nIt was a pleasure speaking with you. Voting starts on 6 May and ends on 10 May. Thank you for your support.`,
};

// In-memory cache so ContactCard doesn't fetch on every render
let _cache: WaTemplates | null = null;
let _fetching: Promise<WaTemplates> | null = null;

export async function getTemplates(): Promise<WaTemplates> {
  if (_cache) return _cache;
  if (_fetching) return _fetching;
  _fetching = fetch("/api/settings/wa-templates")
    .then(r => r.ok ? r.json() as Promise<WaTemplates> : DEFAULT_TEMPLATES)
    .catch(() => DEFAULT_TEMPLATES)
    .then(t => { _cache = t; _fetching = null; return t; });
  return _fetching;
}

export function invalidateCache() { _cache = null; }

interface Props { onClose: () => void; }

const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.55)", display: "flex", flexDirection: "column", justifyContent: "flex-end" };
const sheet: React.CSSProperties = { background: "white", borderRadius: "24px 24px 0 0", padding: "24px 20px", maxHeight: "92vh", overflowY: "auto" };
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 };
const ta: React.CSSProperties = { width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "12px 14px", fontSize: 14, resize: "vertical" as const, outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit", lineHeight: 1.6, minHeight: 100 };
const primaryBtn: React.CSSProperties = { padding: 14, background: "linear-gradient(135deg,#1e3a8a,#2563eb)", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer" };

export default function WaTemplateEditor({ onClose }: Props) {
  const [templates, setTemplates] = useState<WaTemplates>(DEFAULT_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/settings/wa-templates")
      .then(r => r.ok ? r.json() as Promise<WaTemplates> : DEFAULT_TEMPLATES)
      .catch(() => DEFAULT_TEMPLATES)
      .then(t => { setTemplates(t); setLoading(false); });
  }, []);

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/settings/wa-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(templates),
      });
      if (res.ok) {
        invalidateCache();
        setSaved(true);
        setTimeout(() => { setSaved(false); onClose(); }, 800);
      } else {
        const d = await res.json() as { error: string };
        setError(d.error ?? "Failed to save");
      }
    } finally { setSaving(false); }
  };

  const reset = () => setTemplates(DEFAULT_TEMPLATES);

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" }}>WhatsApp Templates</h2>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "#9ca3af" }}>Saved centrally — all team members see the same messages</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 28, color: "#9ca3af", cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
        </div>

        {/* Placeholder hint */}
        <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#0369a1", marginBottom: 16 }}>
          <strong>Placeholders — replaced automatically per contact:</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 2 }}>
            <li><code style={{ background: "#e0f2fe", padding: "1px 5px", borderRadius: 4 }}>{"{{FIRSTNAME}}"}</code> — first name only &nbsp;<em style={{ color:"#64748b" }}>(e.g. Ramesh)</em></li>
            <li><code style={{ background: "#e0f2fe", padding: "1px 5px", borderRadius: 4 }}>{"{{FULLNAME}}"}</code> — full name &nbsp;<em style={{ color:"#64748b" }}>(e.g. Ramesh Nair)</em></li>
            <li><code style={{ background: "#e0f2fe", padding: "1px 5px", borderRadius: 4 }}>{"{{DRNAME}}"}</code> — Dr. Firstname &nbsp;<em style={{ color:"#64748b" }}>(e.g. Dr. Ramesh)</em></li>
          </ul>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "24px 0", color: "#9ca3af" }}>Loading…</div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>📵 No Pickup / Missed Call message</label>
              <textarea value={templates.noPickup} rows={5}
                onChange={e => setTemplates(t => ({ ...t, noPickup: e.target.value }))} style={ta} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>✅ Spoke / Thank You message</label>
              <textarea value={templates.spoke} rows={5}
                onChange={e => setTemplates(t => ({ ...t, spoke: e.target.value }))} style={ta} />
            </div>
          </>
        )}

        {error && <p style={{ color: "#dc2626", fontSize: 13, margin: "0 0 10px" }}>{error}</p>}

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSave} disabled={saving || loading}
            style={{ ...primaryBtn, flex: 3, opacity: saving || loading ? 0.6 : 1 }}>
            {saved ? "✓ Saved!" : saving ? "Saving…" : "Save for Everyone"}
          </button>
          <button onClick={reset}
            style={{ flex: 1, padding: 14, background: "#f3f4f6", color: "#6b7280", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
