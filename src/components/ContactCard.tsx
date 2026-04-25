import { useState } from "react";
import type { Contact, ContactStatus } from "../lib/db/schema";

interface Props {
  contact: Contact;
  onStatusUpdate: (id: string, status: ContactStatus, notes?: string) => void;
  onToggle: (id: string, field: "wa_sent" | "email_sent", value: boolean) => void;
  onDelete: (id: string) => void;
}

const STATUS: Record<string, { label: string; dot: string; bg: string; border: string; badgeBg: string; badgeColor: string }> = {
  pending:     { label: "Pending",     dot: "#d1d5db", bg: "#ffffff",   border: "#e5e7eb", badgeBg: "#f3f4f6",  badgeColor: "#6b7280" },
  spoke:       { label: "Spoke",       dot: "#10b981", bg: "#f0fdf4",   border: "#bbf7d0", badgeBg: "#d1fae5",  badgeColor: "#065f46" },
  no_answer:   { label: "No Answer",   dot: "#ef4444", bg: "#fef2f2",   border: "#fecaca", badgeBg: "#fee2e2",  badgeColor: "#991b1b" },
  callback:    { label: "Callback",    dot: "#f59e0b", bg: "#fffbeb",   border: "#fde68a", badgeBg: "#fef3c7",  badgeColor: "#92400e" },
  followed_up: { label: "Followed Up", dot: "#3b82f6", bg: "#eff6ff",   border: "#bfdbfe", badgeBg: "#dbeafe",  badgeColor: "#1e40af" },
};

const OUTCOME_BTNS = [
  { s: "spoke" as ContactStatus,       label: "✓ Spoke",      bg: "#10b981" },
  { s: "no_answer" as ContactStatus,   label: "✗ No Answer",  bg: "#ef4444" },
  { s: "callback" as ContactStatus,    label: "↩ Callback",   bg: "#f59e0b" },
  { s: "followed_up" as ContactStatus, label: "✔ Followed Up",bg: "#3b82f6" },
  { s: "pending" as ContactStatus,     label: "↺ Reset",       bg: "#9ca3af" },
];

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" transform="translate(1,1)" />
    </svg>
  );
}

export default function ContactCard({ contact, onStatusUpdate, onToggle, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const [pendingStatus, setPendingStatus] = useState<ContactStatus | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  const status = (contact.status as ContactStatus) ?? "pending";
  const cfg = STATUS[status] ?? STATUS.pending;
  const hasPhone = !!(contact.phone && contact.phone.trim());

  const pick = (s: ContactStatus) => { setPendingStatus(s); setShowNote(true); };
  const save = () => {
    if (!pendingStatus) return;
    onStatusUpdate(contact.id, pendingStatus, note.trim() || undefined);
    setShowNote(false); setNote(""); setPendingStatus(null); setExpanded(false);
  };

  return (
    <div style={{ borderRadius: 16, border: `1.5px solid ${cfg.border}`, background: cfg.bg, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", cursor: "pointer" }} onClick={() => setExpanded(v => !v)}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{contact.name}</span>
            {status !== "pending" && (
              <span style={{ fontSize: 11, background: cfg.badgeBg, color: cfg.badgeColor, borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>{cfg.label}</span>
            )}
            {contact.referred_by && <span style={{ fontSize: 12, color: "#9ca3af" }}>via {contact.referred_by}</span>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 3, alignItems: "center", flexWrap: "wrap" as const }}>
            {hasPhone
              ? <span style={{ fontSize: 13, color: "#374151", fontWeight: 500, letterSpacing: "0.3px" }}>{contact.phone}</span>
              : <span style={{ fontSize: 12, color: "#d1d5db", fontStyle: "italic" }}>No number</span>
            }
            {contact.group_tag && (
              <span style={{ fontSize: 11, background: "#dbeafe", color: "#1d4ed8", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{contact.group_tag}</span>
            )}
            {contact.wa_sent ? <span style={{ fontSize: 11, background: "#d1fae5", color: "#065f46", borderRadius: 20, padding: "2px 8px" }}>WA ✓</span> : null}
            {contact.email_sent ? <span style={{ fontSize: 11, background: "#dbeafe", color: "#1e40af", borderRadius: 20, padding: "2px 8px" }}>Email ✓</span> : null}
          </div>
          {contact.notes && (
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{contact.notes}"</p>
          )}
        </div>

        {/* Call button */}
        {hasPhone ? (
          <a
            href={`tel:${contact.phone}`}
            onClick={e => e.stopPropagation()}
            style={{
              flexShrink: 0, width: 46, height: 46,
              background: "linear-gradient(145deg, #1d4ed8, #2563eb)",
              borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
              textDecoration: "none", boxShadow: "0 4px 12px rgba(37,99,235,0.4)",
              transition: "transform 0.1s",
            }}
            onMouseDown={e => (e.currentTarget.style.transform = "scale(0.93)")}
            onMouseUp={e => (e.currentTarget.style.transform = "scale(1)")}
          >
            <PhoneIcon />
          </a>
        ) : (
          <div style={{ flexShrink: 0, width: 46, height: 46, background: "#f3f4f6", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" transform="translate(1,1)" />
            </svg>
          </div>
        )}
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div style={{ borderTop: "1px solid #e5e7eb", padding: "14px", background: "white", display: "flex", flexDirection: "column", gap: 12 }}>
          {!showNote && (
            <div>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 8px", fontWeight: 600 }}>Mark call outcome:</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {OUTCOME_BTNS.map(({ s, label, bg }) => (
                  <button key={s} onClick={() => pick(s)}
                    style={{ background: bg, color: "white", border: "none", borderRadius: 10, padding: "10px 6px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showNote && (
            <div>
              <p style={{ fontSize: 13, color: "#374151", margin: "0 0 8px" }}>
                Marking as <strong style={{ color: STATUS[pendingStatus!]?.badgeColor }}>{STATUS[pendingStatus!]?.label}</strong> — add a note (optional):
              </p>
              <textarea
                value={note} onChange={e => setNote(e.target.value)}
                placeholder="e.g. Very supportive, will vote · Call back Thursday…"
                rows={2} autoFocus
                style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "10px 12px", fontSize: 14, resize: "none", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={save} style={{ flex: 1, background: "#1e3a8a", color: "white", border: "none", borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Save</button>
                <button onClick={() => { setShowNote(false); setPendingStatus(null); setNote(""); }}
                  style={{ flex: 1, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 10, padding: 12, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}

          {/* WA / Email toggles */}
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { field: "wa_sent" as const, on: !!contact.wa_sent, onLabel: "✓ WhatsApp Sent", offLabel: "Mark WA Sent", onBg: "#d1fae5", onColor: "#065f46", offColor: "#9ca3af" },
              { field: "email_sent" as const, on: !!contact.email_sent, onLabel: "✓ Email Sent", offLabel: "Mark Email Sent", onBg: "#dbeafe", onColor: "#1e40af", offColor: "#9ca3af" },
            ].map(({ field, on, onLabel, offLabel, onBg, onColor, offColor }) => (
              <button key={field} onClick={() => onToggle(contact.id, field, !on)}
                style={{ flex: 1, padding: "9px 6px", borderRadius: 10, border: `1.5px solid ${on ? "transparent" : "#e5e7eb"}`, background: on ? onBg : "#f9fafb", color: on ? onColor : offColor, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                {on ? onLabel : offLabel}
              </button>
            ))}
          </div>

          {(contact.shared_interests || contact.remarks) && (
            <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, background: "#f9fafb", borderRadius: 10, padding: "10px 12px" }}>
              {contact.shared_interests && <p style={{ margin: 0 }}><strong>Interests:</strong> {contact.shared_interests}</p>}
              {contact.remarks && <p style={{ margin: contact.shared_interests ? "4px 0 0" : 0 }}><strong>Notes:</strong> {contact.remarks}</p>}
            </div>
          )}

          {!confirmDel
            ? <button onClick={() => setConfirmDel(true)} style={{ background: "none", border: "none", color: "#fca5a5", fontSize: 12, textDecoration: "underline", cursor: "pointer", textAlign: "left", padding: 0 }}>Delete contact</button>
            : <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => onDelete(contact.id)} style={{ flex: 1, background: "#ef4444", color: "white", border: "none", borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Confirm Delete</button>
                <button onClick={() => setConfirmDel(false)} style={{ flex: 1, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 10, padding: "10px", fontSize: 13, cursor: "pointer" }}>Cancel</button>
              </div>
          }
        </div>
      )}
    </div>
  );
}
