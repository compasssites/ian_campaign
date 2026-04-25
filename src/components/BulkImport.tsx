import { useState } from "react";

interface Props {
  onClose: () => void;
  onDone: () => void;
}

export default function BulkImport({ onClose, onDone }: Props) {
  const [text, setText] = useState("");
  const [referredBy, setReferredBy] = useState("");
  const [groupTag, setGroupTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);

  const lineCount = text.split("\n").filter((l) => l.trim()).length;

  const handleImport = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/contacts/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, referred_by: referredBy || undefined, group_tag: groupTag || undefined }),
      });
      if (res.ok) {
        setResult(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/50" onClick={onClose}>
      <div className="mt-auto bg-white rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-gray-900">Bulk Import</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">&times;</button>
        </div>

        {!result ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Paste names & numbers (one per line)
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Dr. Ramesh Nair, 9876543210\nDr. Priya Shetty, 9123456789\nDr. Kumar, 9988776655, Referred by Kamal`}
                rows={7}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none font-mono"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-1">
                Format: Name, Number &nbsp;|&nbsp; Name, Number, ReferredBy
                {lineCount > 0 && <span className="ml-2 text-blue-600 font-medium">{lineCount} entries detected</span>}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Referred By</label>
                <input
                  type="text"
                  value={referredBy}
                  onChange={(e) => setReferredBy(e.target.value)}
                  placeholder="e.g. Kamal"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Group Tag</label>
                <input
                  type="text"
                  value={groupTag}
                  onChange={(e) => setGroupTag(e.target.value)}
                  placeholder="e.g. Karnataka"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            <button
              onClick={handleImport}
              disabled={loading || !text.trim()}
              className="w-full py-3 bg-blue-900 text-white rounded-xl font-semibold text-base active:opacity-70 disabled:opacity-40"
            >
              {loading ? "Importing..." : `Import ${lineCount > 0 ? lineCount : ""} Contacts`}
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-xl font-bold text-gray-900">{result.inserted} contacts imported</p>
            {result.skipped > 0 && (
              <p className="text-sm text-gray-400 mt-1">{result.skipped} lines skipped (invalid format)</p>
            )}
            <button
              onClick={onDone}
              className="mt-5 w-full py-3 bg-blue-900 text-white rounded-xl font-semibold text-base"
            >
              View Contacts
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
