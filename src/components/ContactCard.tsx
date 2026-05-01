import { useState, useEffect } from "react";
import type { Contact, ContactStatus } from "../lib/db/schema";
import EditContact from "./EditContact";
import { getTemplates, DEFAULT_TEMPLATES, type WaTemplates } from "./WaTemplateEditor";

interface Props {
  contact: Contact;
  onStatusUpdate: (id: string, status: ContactStatus, notes?: string) => void;
  onToggle: (id: string, field: "wa_sent" | "email_sent" | "priority", value: boolean) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

const STATUS: Record<string, { label: string; dot: string; bg: string; border: string; badgeBg: string; badgeColor: string }> = {
  pending:     { label: "Pending",     dot: "#d1d5db", bg: "#ffffff", border: "#e5e7eb", badgeBg: "#f3f4f6", badgeColor: "#6b7280" },
  spoke:       { label: "Spoke",       dot: "#10b981", bg: "#f0fdf4", border: "#bbf7d0", badgeBg: "#d1fae5", badgeColor: "#065f46" },
  no_answer:   { label: "No Answer",   dot: "#ef4444", bg: "#fef2f2", border: "#fecaca", badgeBg: "#fee2e2", badgeColor: "#991b1b" },
  wrong_number:{ label: "Wrong Number",dot: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", badgeBg: "#ede9fe", badgeColor: "#5b21b6" },
  callback:    { label: "Callback",    dot: "#f59e0b", bg: "#fffbeb", border: "#fde68a", badgeBg: "#fef3c7", badgeColor: "#92400e" },
  followed_up: { label: "Followed Up", dot: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe", badgeBg: "#dbeafe", badgeColor: "#1e40af" },
};

const OUTCOME_BTNS = [
  { s: "spoke" as ContactStatus, label: "✓ Spoke", bg: "#10b981" },
  { s: "no_answer" as ContactStatus, label: "✗ No Answer", bg: "#ef4444" },
  { s: "wrong_number" as ContactStatus, label: "! Wrong No.", bg: "#7c3aed" },
  { s: "callback" as ContactStatus, label: "↩ Callback", bg: "#f59e0b" },
  { s: "followed_up" as ContactStatus, label: "✔ Followed Up", bg: "#3b82f6" },
  { s: "pending" as ContactStatus, label: "↺ Reset", bg: "#9ca3af" },
];

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#6b7280"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.18s ease" }}
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" transform="translate(1,1)" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path fill="#fff" d="M19.11 17.57c-.27-.14-1.61-.79-1.86-.88-.25-.09-.43-.14-.61.14-.18.27-.7.88-.86 1.06-.16.18-.32.2-.59.07-.27-.14-1.13-.42-2.15-1.34-.8-.71-1.34-1.59-1.5-1.86-.16-.27-.02-.42.12-.56.12-.12.27-.32.41-.48.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.48-.07-.14-.61-1.48-.84-2.02-.22-.52-.45-.45-.61-.46h-.52c-.18 0-.48.07-.73.34-.25.27-.95.93-.95 2.27s.97 2.63 1.11 2.82c.14.18 1.91 2.92 4.63 4.09.65.28 1.16.45 1.55.57.65.21 1.24.18 1.71.11.52-.08 1.61-.66 1.84-1.3.23-.64.23-1.18.16-1.29-.07-.11-.25-.18-.52-.32Z" />
      <path fill="#fff" fillRule="evenodd" d="M27.15 4.84A15.84 15.84 0 0 0 16 0C7.16 0 0 7.16 0 16c0 2.82.74 5.57 2.15 7.98L0 32l8.25-2.11A15.94 15.94 0 0 0 16 32c8.84 0 16-7.16 16-16 0-4.27-1.66-8.28-4.85-11.16ZM16 29.3c-2.4 0-4.76-.64-6.82-1.86l-.49-.29-4.9 1.25 1.31-4.78-.32-.49A13.24 13.24 0 0 1 2.7 16C2.7 8.67 8.67 2.7 16 2.7c3.54 0 6.86 1.38 9.36 3.88A13.16 13.16 0 0 1 29.3 16c0 7.33-5.97 13.3-13.3 13.3Z" clipRule="evenodd" />
    </svg>
  );
}

function isIndianNumber(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length === 10 && /^[6-9]/.test(d)) return true;
  if (d.length === 12 && d.startsWith("91") && /^[6-9]/.test(d.slice(2))) return true;
  if (d.length === 13 && d.startsWith("091")) return true;
  return false;
}

function normalizeWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  // International — use as-is, remove leading +
  return digits;
}

function getWhatsAppLink(phone: string, text: string) {
  const normalized = normalizeWhatsAppNumber(phone);
  return normalized ? `https://wa.me/${normalized}?text=${encodeURIComponent(text)}` : undefined;
}

function normalizeSmsNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return digits.startsWith("+") ? digits : `+${digits}`;
}

function getSmsLink(phone: string, text: string) {
  const normalized = normalizeSmsNumber(phone);
  return normalized ? `sms:${normalized}?body=${encodeURIComponent(text)}` : undefined;
}

function SmsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function getFirstName(name: string): string {
  // Strip Dr./Dr prefix, then take first word
  const stripped = name.replace(/^(dr\.?\s*|doctor\s*)/i, "").trim();
  return stripped.split(/\s+/)[0] || name;
}

function applyTemplate(template: string, name: string): string {
  const firstName = getFirstName(name);
  const drName = `Dr. ${firstName}`;
  return template
    .replace(/\{\{FIRSTNAME\}\}/g, firstName)
    .replace(/\{\{FULLNAME\}\}/g, name)
    .replace(/\{\{DRNAME\}\}/g, drName);
}

function formatTitleCase(name: string) {
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function ContactCard({ contact, onStatusUpdate, onToggle, onDelete, onRefresh }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");
  const [pendingStatus, setPendingStatus] = useState<ContactStatus | null>(null);
  const [postCallPriority, setPostCallPriority] = useState(!!contact.priority);
  const [postCallFollowup, setPostCallFollowup] = useState<string | null>(contact.followup_type ?? null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const status = (contact.status as ContactStatus) ?? "pending";
  const cfg = STATUS[status] ?? STATUS.pending;
  const hasPhone = !!(contact.phone && contact.phone.trim());
  const indian = hasPhone && isIndianNumber(contact.phone);
  const displayName = formatTitleCase(contact.name?.trim() || "Doctor");
  const [templates, setTemplates] = useState<WaTemplates>(DEFAULT_TEMPLATES);
  useEffect(() => { getTemplates().then(setTemplates); }, []);
  const waMessages = [
    {
      key: "wa-mark",
      label: contact.wa_sent ? "✓ WA Done" : "Mark WA Done",
      href: undefined,
      active: !!contact.wa_sent,
      onClick: () => onToggle(contact.id, "wa_sent", !contact.wa_sent),
    },
    {
      key: "wa-no-pickup",
      label: "No Pickup",
      href: hasPhone ? getWhatsAppLink(contact.phone, applyTemplate(templates.noPickup, displayName)) : undefined,
      active: false,
      onClick: undefined,
    },
    {
      key: "wa-picked-up",
      label: "Spoke",
      href: hasPhone ? getWhatsAppLink(contact.phone, applyTemplate(templates.spoke, displayName)) : undefined,
      active: false,
      onClick: undefined,
    },
  ];

  const smsMessages = [
    {
      key: "sms-no-pickup",
      label: "No Pickup",
      href: hasPhone ? getSmsLink(contact.phone, applyTemplate(templates.noPickup, displayName)) : undefined,
    },
    {
      key: "sms-spoke",
      label: "Spoke",
      href: hasPhone ? getSmsLink(contact.phone, applyTemplate(templates.spoke, displayName)) : undefined,
    },
  ];

  const pick = (s: ContactStatus) => {
    setPendingStatus(s);
    setPostCallPriority(!!contact.priority);
    setPostCallFollowup(contact.followup_type ?? null);
    setShowNote(true);
  };

  const save = async () => {
    if (!pendingStatus) return;
    onStatusUpdate(contact.id, pendingStatus, note.trim() || undefined);
    // Save priority + followup in parallel
    await fetch(`/api/contacts/${contact.id}/toggles`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority: postCallPriority, followup_type: postCallFollowup }),
    });
    setShowNote(false);
    setNote("");
    setPendingStatus(null);
    setExpanded(false);
  };

  return (
    <div style={{ borderRadius: 16, border: `1.5px solid ${cfg.border}`, background: cfg.bg, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", cursor: "pointer" }} onClick={() => setExpanded(v => !v)}>
        {/* Priority star — tap without expanding */}
        <button
          onClick={e => { e.stopPropagation(); onToggle(contact.id, "priority", !contact.priority); }}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, fontSize: 18, lineHeight: 1, color: contact.priority ? "#f59e0b" : "#e5e7eb" }}
          title={contact.priority ? "Remove priority" : "Mark as priority"}
        >
          ★
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" as const }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "#111827" }}>{displayName}</span>
            {contact.lm_number && (
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, letterSpacing: "0.2px" }}>{contact.lm_number}</span>
            )}
            {status !== "pending" && (
              <span style={{ fontSize: 11, background: cfg.badgeBg, color: cfg.badgeColor, borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>{cfg.label}</span>
            )}
            {contact.referred_by && <span style={{ fontSize: 12, color: "#9ca3af" }}>via {contact.referred_by}</span>}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 3, alignItems: "center", flexWrap: "wrap" as const }}>
            {hasPhone ? (
              <span style={{ fontSize: 13, color: "#374151", fontWeight: 500, letterSpacing: "0.3px" }}>{contact.phone}</span>
            ) : (
              <span style={{ fontSize: 12, color: "#d1d5db", fontStyle: "italic" }}>No number</span>
            )}
            {contact.group_tag && (
              <span style={{ fontSize: 11, background: "#dbeafe", color: "#1d4ed8", borderRadius: 20, padding: "2px 8px", fontWeight: 600 }}>{contact.group_tag}</span>
            )}
            {contact.wa_sent ? <span style={{ fontSize: 11, background: "#d1fae5", color: "#065f46", borderRadius: 20, padding: "2px 8px" }}>WA ✓</span> : null}
            {contact.followup_type === "must"  && <span style={{ fontSize: 11, background: "#fee2e2", color: "#dc2626", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>🔴 Must Follow Up</span>}
            {contact.followup_type === "maybe" && <span style={{ fontSize: 11, background: "#fef3c7", color: "#92400e", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>🟡 Maybe Follow Up</span>}
          </div>
          {contact.notes && (
            <p style={{ fontSize: 12, color: "#9ca3af", margin: "4px 0 0", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>"{contact.notes}"</p>
          )}
        </div>

        <div style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", width: 24 }}>
          <ChevronIcon expanded={expanded} />
        </div>

        {/* Call button: Indian = phone call, International = WA only, no number = grey */}
        {hasPhone && indian ? (
          <a href={`tel:${contact.phone}`} onClick={e => e.stopPropagation()}
            style={{ flexShrink: 0, width: 46, height: 46, background: "linear-gradient(145deg,#1d4ed8,#2563eb)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", boxShadow: "0 4px 12px rgba(37,99,235,0.4)" }}>
            <PhoneIcon />
          </a>
        ) : hasPhone && !indian ? (
          // International number — WhatsApp only
          <a href={getWhatsAppLink(contact.phone, applyTemplate(templates.noPickup, displayName)) ?? "#"}
            target="_blank" rel="noopener" onClick={e => e.stopPropagation()}
            title="International number — WhatsApp only"
            style={{ flexShrink: 0, width: 46, height: 46, background: "linear-gradient(145deg,#16a34a,#22c55e)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", boxShadow: "0 4px 12px rgba(22,163,74,0.4)" }}>
            <WhatsAppIcon />
          </a>
        ) : (
          <div style={{ flexShrink: 0, width: 46, height: 46, background: "#f3f4f6", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" transform="translate(1,1)" />
            </svg>
          </div>
        )}
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid #e5e7eb", padding: "14px", background: "white", display: "flex", flexDirection: "column", gap: 12 }}>
          {!showNote && (
            <div>
              <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 8px", fontWeight: 600 }}>Mark call outcome:</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                {OUTCOME_BTNS.map(({ s, label, bg }) => (
                  <button
                    key={s}
                    onClick={() => pick(s)}
                    style={{ background: bg, color: "white", border: "none", borderRadius: 10, padding: "10px 6px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showNote && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 13, color: "#374151", margin: 0 }}>
                Marking as <strong style={{ color: STATUS[pendingStatus!]?.badgeColor }}>{STATUS[pendingStatus!]?.label}</strong>
              </p>

              {/* Follow-up type — prominent 3 buttons */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>Follow-up needed?</p>
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { val: "must",  label: "🔴 Must Follow Up",  bg: postCallFollowup === "must"  ? "#dc2626" : "#f3f4f6", color: postCallFollowup === "must"  ? "white" : "#374151" },
                    { val: "maybe", label: "🟡 Maybe",           bg: postCallFollowup === "maybe" ? "#f59e0b" : "#f3f4f6", color: postCallFollowup === "maybe" ? "white" : "#374151" },
                    { val: null,    label: "No Follow-up",       bg: !postCallFollowup           ? "#e5e7eb" : "#f3f4f6", color: !postCallFollowup           ? "#374151" : "#9ca3af" },
                  ].map(({ val, label, bg, color }) => (
                    <button key={String(val)} onClick={() => setPostCallFollowup(val)}
                      style={{ flex: 1, background: bg, color, border: "none", borderRadius: 10, padding: "9px 4px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority toggle */}
              <button onClick={() => setPostCallPriority(v => !v)}
                style={{ display: "flex", alignItems: "center", gap: 8, background: postCallPriority ? "#fef3c7" : "#f9fafb", border: `1.5px solid ${postCallPriority ? "#f59e0b" : "#e5e7eb"}`, borderRadius: 10, padding: "9px 14px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: postCallPriority ? "#92400e" : "#6b7280" }}>
                <span style={{ fontSize: 18 }}>{postCallPriority ? "★" : "☆"}</span>
                {postCallPriority ? "Marked as Priority" : "Mark as Priority"}
              </button>

              {/* Note */}
              <textarea
                value={note} onChange={e => setNote(e.target.value)}
                placeholder="Any notes from the call… (optional)"
                rows={2} autoFocus
                style={{ width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "10px 12px", fontSize: 14, resize: "none", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
              />

              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={save} style={{ flex: 1, background: "#1e3a8a", color: "white", border: "none", borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Save</button>
                <button onClick={() => { setShowNote(false); setPendingStatus(null); setNote(""); }} style={{ flex: 1, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 10, padding: 12, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          )}

          <div>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 8px", fontWeight: 600 }}>WhatsApp actions:</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {waMessages.map(({ key, label, href, active, onClick }) => {
                const isMarkBtn = !href && !!onClick;
                const style: React.CSSProperties = {
                  minHeight: 42,
                  padding: "9px 8px",
                  borderRadius: 10,
                  border: active ? "1.5px solid transparent" : isMarkBtn ? "1.5px solid #0d9488" : "none",
                  background: active ? "#d1fae5" : href ? "#16a34a" : isMarkBtn ? "#f0fdfa" : "#f9fafb",
                  color: active ? "#065f46" : href ? "white" : isMarkBtn ? "#0d9488" : "#374151",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: href || onClick ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  textDecoration: "none",
                  boxSizing: "border-box",
                  opacity: href || onClick ? 1 : 0.55,
                };

                if (href) {
                  return (
                    <a key={key} href={href} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={style}>
                      <WhatsAppIcon />
                      <span>{label}</span>
                    </a>
                  );
                }

                return (
                  <button key={key} onClick={e => { e.stopPropagation(); onClick?.(); }} style={style}>
                    <WhatsAppIcon />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 8px", fontWeight: 600 }}>SMS actions:</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
              {smsMessages.map(({ key, label, href }) => (
                <a
                  key={key}
                  href={href ?? "#"}
                  onClick={e => { e.stopPropagation(); if (!href) e.preventDefault(); }}
                  style={{
                    minHeight: 42,
                    padding: "9px 8px",
                    borderRadius: 10,
                    border: "none",
                    background: href ? "#0ea5e9" : "#f3f4f6",
                    color: href ? "white" : "#9ca3af",
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: href ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    textDecoration: "none",
                    boxSizing: "border-box",
                    opacity: href ? 1 : 0.55,
                  }}
                >
                  <SmsIcon />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </div>

          {(contact.shared_interests || contact.remarks) && (
            <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6, background: "#f9fafb", borderRadius: 10, padding: "10px 12px" }}>
              {contact.shared_interests && <p style={{ margin: 0 }}><strong>Interests:</strong> {contact.shared_interests}</p>}
              {contact.remarks && <p style={{ margin: contact.shared_interests ? "4px 0 0" : 0 }}><strong>Notes:</strong> {contact.remarks}</p>}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <button
              onClick={() => setShowEdit(true)}
              style={{ background: "#eff6ff", color: "#1d4ed8", border: "none", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            >
              ✏️ Edit Details
            </button>
            {!confirmDel ? (
              <button onClick={() => setConfirmDel(true)} style={{ background: "none", border: "none", color: "#fca5a5", fontSize: 12, textDecoration: "underline", cursor: "pointer", padding: 0 }}>Delete</button>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => onDelete(contact.id)} style={{ background: "#ef4444", color: "white", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Confirm</button>
                <button onClick={() => setConfirmDel(false)} style={{ background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12, cursor: "pointer" }}>Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showEdit && (
        <EditContact
          contact={contact}
          onClose={() => setShowEdit(false)}
          onDone={() => {
            setShowEdit(false);
            setExpanded(false);
            onRefresh();
          }}
        />
      )}
    </div>
  );
}
