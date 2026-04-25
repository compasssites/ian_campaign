import { useState } from "react";
import type { Contact, ContactStatus } from "../lib/db/schema";

interface Props {
  contact: Contact;
  onStatusUpdate: (id: string, status: ContactStatus, notes?: string) => void;
  onToggle: (id: string, field: "wa_sent" | "email_sent", value: boolean) => void;
  onDelete: (id: string) => void;
}

const STATUS_CFG: Record<string, { label: string; dot: string; bg: string; border: string }> = {
  pending:     { label: "Pending",     dot: "#d1d5db", bg: "#ffffff",   border: "#e5e7eb" },
  spoke:       { label: "Spoke",       dot: "#10b981", bg: "#f0fdf4",   border: "#bbf7d0" },
  no_answer:   { label: "No Answer",   dot: "#ef4444", bg: "#fef2f2",   border: "#fecaca" },
  callback:    { label: "Callback",    dot: "#f59e0b", bg: "#fffbeb",   border: "#fde68a" },
  followed_up: { label: "Followed Up", dot: "#3b82f6", bg: "#eff6ff",   border: "#bfdbfe" },
};

export default function ContactCard({ contact, onStatusUpdate, onToggle, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<ContactStatus | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  const status = (contact.status as ContactStatus) ?? "pending";
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending;

  const pick = (s: ContactStatus) => { setPending(s); setShowNote(true); };
  const save = () => {
    if (!pending) return;
    onStatusUpdate(contact.id, pending, note.trim() || undefined);
    setShowNote(false); setNote(""); setPending(null); setExpanded(false);
  };

  const card: React.CSSProperties = {
    borderRadius: 16, border: `1.5px solid ${cfg.border}`,
    background: cfg.bg, overflow: "hidden",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  };

  return (
    <div style={card}>
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", cursor: "pointer" }} onClick={() => setExpanded(v => !v)}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: cfg.dot, marginTop: 5, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" as const }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{contact.name}</span>
            {contact.referred_by && <span style={{ fontSize: 12, color: "#9ca3af" }}>via {contact.referred_by}</span>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 2, flexWrap: "wrap" as const }}>
            <span style={{ fontSize: 13, color: "#6b7280" }}>{contact.phone || "No number"}</span>
            {contact.group_tag && (
              <span style={{ fontSize: 11, background: "#dbeafe", color: "#1d4ed8", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{contact.group_tag}</span>
            )}
          </div>
          {contact.notes && <p style={{ fontSize: 12, color: "#9ca3af", margin: "3px 0 0", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>"{contact.notes}"</p>}
        </div>
        <a
          href={`tel:${contact.phone}`}
          onClick={e => e.stopPropagation()}
          style={{ flexShrink: 0, width: 44, height: 44, background: "linear-gradient(135deg, #1e3a8a, #2563eb)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", boxShadow: "0 3px 8px rgba(37,99,235,0.35)" }}
        >
          <span style={{ fontSize: 20 }}>📞</span>
        </a>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: "1px solid #e5e7eb", padding: "12px 14px", background: "white", display: "flex", flexDirection: "column", gap: 10 }}>
          {!showNote && (
            <div>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 8px" }}>Mark outcome:</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {([
                  { s: "spoke" as ContactStatus, label: "Spoke", bg: "#10b981" },
                  { s: "no_answer" as ContactStatus, label: "No Answer", bg: "#ef4444" },
                  { s: "callback" as ContactStatus, label: "Callback", bg: "#f59e0b" },
                  { s: "followed_up" as ContactStatus, label: "Followed Up", bg: "#3b82f6" },
                  { s: "pending" as ContactStatus, label: "Reset", bg: "#9ca3af" },
                ]).map(({ s, label, bg }) => (
                  <button key={s} onClick={() => pick(s)} style={{ background: bg, color: "white", border: "none", borderRadius: 10, padding: "10px 6px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showNote && (
            <div>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 6px" }}>
                Marking as <strong>{STATUS_CFG[pending!]?.label}</strong> — add a note (optional):
              </p>
              <textarea
                value={note} onChange={e => setNote(e.target.value)}
                placeholder="e.g. Very supportive, call back Thursday…"
                rows={2}
                autoFocus
                style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "10px 12px", fontSize: 14, resize: "none", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={save} style={{ flex: 1, background: "#1e3a8a", color: "white", border: "none", borderRadius: 10, padding: "11px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Save</button>
                <button onClick={() => { setShowNote(false); setPending(null); setNote(""); }} style={{ flex: 1, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 10, padding: "11px", fontSize: 14, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Toggles */}
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { field: "wa_sent" as const, on: !!contact.wa_sent, onLabel: "✓ WA Sent", offLabel: "WA Send?", onBg: "#d1fae5", onColor: "#065f46" },
              { field: "email_sent" as const, on: !!contact.email_sent, onLabel: "✓ Email Sent", offLabel: "Email Send?", onBg: "#dbeafe", onColor: "#1e40af" },
            ].map(({ field, on, onLabel, offLabel, onBg, onColor }) => (
              <button key={field} onClick={() => onToggle(contact.id, field, !on)}
                style={{ flex: 1, padding: "9px", borderRadius: 10, border: `1.5px solid ${on ? "transparent" : "#e5e7eb"}`, background: on ? onBg : "#f9fafb", color: on ? onColor : "#9ca3af", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {on ? onLabel : offLabel}
              </button>
            ))}
          </div>

          {(contact.shared_interests || contact.remarks) && (
            <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
              {contact.shared_interests && <p style={{ margin: 0 }}><strong>Interests:</strong> {contact.shared_interests}</p>}
              {contact.remarks && <p style={{ margin: "2px 0 0" }}><strong>Notes:</strong> {contact.remarks}</p>}
            </div>
          )}

          {!confirmDel
            ? <button onClick={() => setConfirmDel(true)} style={{ background: "none", border: "none", color: "#fca5a5", fontSize: 12, textDecoration: "underline", cursor: "pointer", textAlign: "left" }}>Delete contact</button>
            : <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => onDelete(contact.id)} style={{ flex: 1, background: "#ef4444", color: "white", border: "none", borderRadius: 10, padding: "9px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Confirm Delete</button>
                <button onClick={() => setConfirmDel(false)} style={{ flex: 1, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 10, padding: "9px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
          }
        </div>
      )}
    </div>
  );
}
