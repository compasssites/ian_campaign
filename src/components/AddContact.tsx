import { useState } from "react";

interface Props {
  onClose: () => void;
  onDone: () => void;
}

export default function AddContact({ onClose, onDone }: Props) {
  const [form, setForm] = useState({ name: "", phone: "", referred_by: "", group_tag: "", shared_interests: "", remarks: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim()) { setError("Name and phone are required"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          referred_by: form.referred_by.trim() || undefined,
          group_tag: form.group_tag.trim() || undefined,
          shared_interests: form.shared_interests.trim() || undefined,
          remarks: form.remarks.trim() || undefined,
        }),
      });
      if (res.ok) { onDone(); }
      else { const d = await res.json() as { error: string }; setError(d.error ?? "Failed"); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50" onClick={onClose}>
      <div className="mt-auto bg-white rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-gray-900">Add Contact</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">&times;</button>
        </div>

        <div className="space-y-3">
          {[
            { key: "name", label: "Name *", placeholder: "Dr. Ramesh Nair", type: "text" },
            { key: "phone", label: "Phone *", placeholder: "9876543210", type: "tel" },
            { key: "referred_by", label: "Referred By", placeholder: "e.g. Kamal", type: "text" },
            { key: "group_tag", label: "Group / List", placeholder: "e.g. Karnataka", type: "text" },
            { key: "shared_interests", label: "Shared Interests", placeholder: "e.g. Paediatrics, IAN council", type: "text" },
            { key: "remarks", label: "Remarks", placeholder: "Any notes...", type: "text" },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          ))}

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-3 bg-blue-900 text-white rounded-xl font-semibold text-base active:opacity-70 disabled:opacity-40"
          >
            {loading ? "Saving..." : "Add Contact"}
          </button>
        </div>
      </div>
    </div>
  );
}
