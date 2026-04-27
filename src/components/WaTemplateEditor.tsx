import { useState, useEffect } from "react";

export interface WaTemplates {
  noPickup: string;
  spoke: string;
}

export const DEFAULT_TEMPLATES: WaTemplates = {
  noPickup: `Dear Dr. {{FIRSTNAME}},\n\nThis is Dr. Sudhir Kothari from Poona. I tried calling you but couldn't get through. This is regarding the upcoming IAN election. Please let me know when I can call, or give me a call when you are free.`,
  spoke: `Dear Dr. {{FIRSTNAME}},\n\nIt was a pleasure speaking with you. Voting starts on 6 May and ends on 10 May. Thank you for your support.`,
};

const STORAGE_KEY = "ian_wa_templates";

export function loadTemplates(): WaTemplates {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_TEMPLATES, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_TEMPLATES;
}

export function saveTemplates(t: WaTemplates) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

interface Props {
  onClose: () => void;
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 60, background: "rgba(0,0,0,0.55)", display: "flex", flexDirection: "column", justifyContent: "flex-end" };
const sheet: React.CSSProperties = { background: "white", borderRadius: "24px 24px 0 0", padding: "24px 20px", maxHeight: "92vh", overflowY: "auto" };
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 };
const ta: React.CSSProperties = { width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "12px 14px", fontSize: 14, resize: "vertical" as const, outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit", lineHeight: 1.6, minHeight: 100 };
const saveBtn: React.CSSProperties = { width: "100%", padding: 14, background: "linear-gradient(135deg,#1e3a8a,#2563eb)", color: "white", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 4 };

export default function WaTemplateEditor({ onClose }: Props) {
  const [templates, setTemplates] = useState<WaTemplates>(DEFAULT_TEMPLATES);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setTemplates(loadTemplates()); }, []);

  const handleSave = () => {
    saveTemplates(templates);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  const reset = () => setTemplates(DEFAULT_TEMPLATES);

  const hint = (
    <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#0369a1", marginBottom: 14 }}>
      <strong>Placeholders you can use:</strong>
      <ul style={{ margin: "6px 0 0", paddingLeft: 18, lineHeight: 1.8 }}>
        <li><code>{"{{FIRSTNAME}}"}</code> — first name only (e.g. Ramesh)</li>
        <li><code>{"{{FULLNAME}}"}</code> — full name (e.g. Ramesh Nair)</li>
        <li><code>{"{{DRNAME}}"}</code> — Dr. Firstname (e.g. Dr. Ramesh)</li>
      </ul>
      <p style={{ margin: "6px 0 0" }}>These are replaced automatically when the message is sent.</p>
    </div>
  );

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" }}>WhatsApp Templates</h2>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "#9ca3af" }}>Edit the messages sent via WA buttons</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 28, color: "#9ca3af", cursor: "pointer", lineHeight: 1, padding: 0 }}>×</button>
        </div>

        {hint}

        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>📵 No Pickup message</label>
          <textarea
            value={templates.noPickup}
            onChange={e => setTemplates(t => ({ ...t, noPickup: e.target.value }))}
            style={ta}
            rows={5}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={lbl}>✅ Spoke / Thank You message</label>
          <textarea
            value={templates.spoke}
            onChange={e => setTemplates(t => ({ ...t, spoke: e.target.value }))}
            style={ta}
            rows={5}
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSave} style={{ ...saveBtn, flex: 3 }}>
            {saved ? "✓ Saved!" : "Save Templates"}
          </button>
          <button onClick={reset} style={{ flex: 1, padding: 14, background: "#f3f4f6", color: "#6b7280", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
