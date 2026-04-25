import { useState } from "react";
import type { Contact, ContactStatus } from "../lib/db/schema";

interface Props {
  contact: Contact;
  onStatusUpdate: (id: string, status: ContactStatus, notes?: string) => void;
  onToggle: (id: string, field: "wa_sent" | "email_sent", value: boolean) => void;
  onDelete: (id: string) => void;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  pending:     { label: "Pending",    color: "text-gray-500",  bg: "bg-gray-100" },
  spoke:       { label: "Spoke",      color: "text-green-700", bg: "bg-green-50" },
  no_answer:   { label: "No Answer",  color: "text-red-600",   bg: "bg-red-50" },
  callback:    { label: "Callback",   color: "text-amber-700", bg: "bg-amber-50" },
  followed_up: { label: "Followed Up",color: "text-blue-700",  bg: "bg-blue-50" },
};

export default function ContactCard({ contact, onStatusUpdate, onToggle, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [showNoteField, setShowNoteField] = useState(false);
  const [note, setNote] = useState("");
  const [pendingStatus, setPendingStatus] = useState<ContactStatus | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const status = (contact.status as ContactStatus) ?? "pending";
  const cfg = statusConfig[status] ?? statusConfig.pending;

  const handleStatusTap = (s: ContactStatus) => {
    setPendingStatus(s);
    setShowNoteField(true);
  };

  const saveStatus = () => {
    if (!pendingStatus) return;
    onStatusUpdate(contact.id, pendingStatus, note.trim() || undefined);
    setShowNoteField(false);
    setNote("");
    setPendingStatus(null);
    setExpanded(false);
  };

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${cfg.bg} border-gray-200`}>
      {/* Main row */}
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer active:opacity-80"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Status dot */}
        <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
          status === "spoke" ? "bg-green-500" :
          status === "no_answer" ? "bg-red-500" :
          status === "callback" ? "bg-amber-500" :
          status === "followed_up" ? "bg-blue-500" : "bg-gray-300"
        }`} />

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-gray-900 text-base truncate">{contact.name}</span>
            {contact.referred_by && (
              <span className="text-xs text-gray-400 shrink-0">via {contact.referred_by}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-gray-500 text-sm">{contact.phone}</span>
            {contact.group_tag && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">{contact.group_tag}</span>
            )}
          </div>
          {contact.notes && (
            <p className="text-xs text-gray-500 mt-0.5 truncate italic">"{contact.notes}"</p>
          )}
        </div>

        {/* Call button */}
        <a
          href={`tel:${contact.phone}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 w-10 h-10 bg-blue-900 rounded-full flex items-center justify-center shadow active:opacity-70"
        >
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </a>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="border-t border-gray-200 px-4 py-3 bg-white space-y-3">
          {/* Status buttons */}
          {!showNoteField && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Mark call outcome:</p>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { s: "spoke" as ContactStatus,       label: "Spoke",     cls: "bg-green-600" },
                  { s: "no_answer" as ContactStatus,   label: "No Answer", cls: "bg-red-500" },
                  { s: "callback" as ContactStatus,    label: "Callback",  cls: "bg-amber-500" },
                  { s: "followed_up" as ContactStatus, label: "Followed",  cls: "bg-blue-600" },
                  { s: "pending" as ContactStatus,     label: "Reset",     cls: "bg-gray-400" },
                ]).map(({ s, label, cls }) => (
                  <button
                    key={s}
                    onClick={() => handleStatusTap(s)}
                    className={`${cls} text-white py-2 rounded-xl text-sm font-medium active:opacity-70 ${s === "followed_up" || s === "pending" ? "col-span-1" : ""}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Note field */}
          {showNoteField && (
            <div>
              <p className="text-xs text-gray-500 mb-1">
                Marking as <strong>{statusConfig[pendingStatus!]?.label}</strong> — add a note (optional):
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Will support, call back Monday..."
                rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={saveStatus}
                  className="flex-1 bg-blue-900 text-white py-2 rounded-xl text-sm font-medium active:opacity-70"
                >
                  Save
                </button>
                <button
                  onClick={() => { setShowNoteField(false); setPendingStatus(null); setNote(""); }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-xl text-sm active:opacity-70"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Toggles */}
          <div className="flex gap-3">
            <button
              onClick={() => onToggle(contact.id, "wa_sent", !contact.wa_sent)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border ${contact.wa_sent ? "bg-green-100 text-green-800 border-green-300" : "bg-gray-50 text-gray-500 border-gray-200"}`}
            >
              {contact.wa_sent ? "✓ WA Sent" : "WA Send?"}
            </button>
            <button
              onClick={() => onToggle(contact.id, "email_sent", !contact.email_sent)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border ${contact.email_sent ? "bg-blue-100 text-blue-800 border-blue-300" : "bg-gray-50 text-gray-500 border-gray-200"}`}
            >
              {contact.email_sent ? "✓ Email Sent" : "Email Send?"}
            </button>
          </div>

          {/* Extra info */}
          {(contact.shared_interests || contact.remarks) && (
            <div className="text-xs text-gray-500 space-y-0.5">
              {contact.shared_interests && <p><span className="font-medium">Interests:</span> {contact.shared_interests}</p>}
              {contact.remarks && <p><span className="font-medium">Remarks:</span> {contact.remarks}</p>}
            </div>
          )}

          {/* Delete */}
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)} className="text-xs text-red-400 underline">
              Delete contact
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => onDelete(contact.id)} className="flex-1 bg-red-500 text-white py-1.5 rounded-lg text-sm active:opacity-70">
                Confirm Delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="flex-1 bg-gray-100 text-gray-700 py-1.5 rounded-lg text-sm active:opacity-70">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
