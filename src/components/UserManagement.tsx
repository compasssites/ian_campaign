import { useState, useEffect } from "react";
import type { Role } from "../lib/auth/session";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  created_at: string;
}

const ROLE_LABELS: Record<Role, string> = {
  superadmin: "Super Admin",
  admin: "Admin (Boss)",
  member: "Team Member",
};

const ROLE_COLORS: Record<Role, string> = {
  superadmin: "bg-purple-100 text-purple-800",
  admin: "bg-blue-100 text-blue-800",
  member: "bg-gray-100 text-gray-700",
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", pin: "", role: "member" as Role });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const resetForm = () => {
    setForm({ name: "", email: "", pin: "", role: "member" });
    setError("");
  };

  const openAdd = () => { resetForm(); setEditUser(null); setShowAdd(true); };
  const openEdit = (u: User) => {
    setForm({ name: u.name, email: u.email, pin: "", role: u.role });
    setEditUser(u);
    setShowAdd(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email) { setError("Name and email are required"); return; }
    if (!editUser && !form.pin) { setError("PIN is required for new users"); return; }
    setSaving(true); setError("");

    try {
      let res: Response;
      if (editUser) {
        const body: Record<string, string> = { name: form.name, role: form.role };
        if (form.pin) body.pin = form.pin;
        res = await fetch(`/api/users/${editUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }

      if (res.ok) {
        setShowAdd(false);
        fetchUsers();
      } else {
        const d = await res.json() as { error: string };
        setError(d.error ?? "Failed");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    fetchUsers();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-blue-950 text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/dashboard" className="text-blue-300 text-sm">← Back</a>
          <div>
            <h1 className="font-bold text-lg">Team Members</h1>
            <p className="text-blue-300 text-xs">Manage access & roles</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium active:opacity-70"
        >
          + Add User
        </button>
      </div>

      {/* Role guide */}
      <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
        <div className="flex gap-4 text-xs text-blue-700">
          <span className="font-medium">Roles:</span>
          <span><span className="font-semibold">Super Admin</span> = You (full control)</span>
          <span><span className="font-semibold">Admin</span> = Boss (all features)</span>
          <span><span className="font-semibold">Member</span> = Calling team</span>
        </div>
      </div>

      {/* User list */}
      <div className="px-4 py-4 space-y-3">
        {loading && <div className="text-center py-10 text-gray-400">Loading...</div>}
        {!loading && users.map((u) => (
          <div key={u.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900">{u.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[u.role]}`}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{u.email}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(u)}
                  className="text-xs text-blue-600 border border-blue-200 px-2.5 py-1 rounded-lg active:opacity-70"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(u.id, u.name)}
                  className="text-xs text-red-500 border border-red-200 px-2.5 py-1 rounded-lg active:opacity-70"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/50" onClick={() => setShowAdd(false)}>
          <div className="mt-auto bg-white rounded-t-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg text-gray-900">{editUser ? "Edit User" : "Add User"}</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 text-2xl leading-none">&times;</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Dr. Ramesh Nair"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Email *</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="user@example.com"
                  disabled={!!editUser}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  {editUser ? "New PIN (leave blank to keep current)" : "PIN *"}
                </label>
                <input
                  type="password"
                  value={form.pin}
                  onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value }))}
                  placeholder="Min 4 characters"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="member">Team Member (calling team)</option>
                  <option value="admin">Admin — Boss (full access)</option>
                  <option value="superadmin">Super Admin (you)</option>
                </select>
              </div>

              {error && <p className="text-red-600 text-sm">{error}</p>}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-blue-900 text-white rounded-xl font-semibold text-base active:opacity-70 disabled:opacity-40"
              >
                {saving ? "Saving..." : editUser ? "Save Changes" : "Add User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
