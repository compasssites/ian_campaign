import { useState, useEffect, useCallback } from "react";
import type { Contact, ContactStatus } from "../lib/db/schema";
import StatsBar from "./StatsBar";
import FilterTabs from "./FilterTabs";
import ContactCard from "./ContactCard";
import BulkImport from "./BulkImport";
import AddContact from "./AddContact";

interface Props {
  memberName: string;
  role?: string;
}

export default function Dashboard({ memberName, role }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState({ total: 0, spoke: 0, no_answer: 0, callback: 0, followed_up: 0, pending: 0, called: 0 });
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showBulk, setShowBulk] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [groups, setGroups] = useState<string[]>([]);
  const [activeGroup, setActiveGroup] = useState<string>("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) setStats(await res.json());
    } catch {}
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts/groups");
      if (res.ok) setGroups(await res.json());
    } catch {}
  }, []);

  const fetchContacts = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (activeTab !== "all") params.set("status", activeTab);
      if (search) params.set("search", search);
      if (activeGroup) params.set("group", activeGroup);
      const res = await fetch(`/api/contacts?${params}`);
      if (res.ok) {
        const data = await res.json() as { contacts: Contact[]; total: number; pages: number };
        setContacts(data.contacts);
        setTotalPages(data.pages);
        setPage(p);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, activeGroup]);

  useEffect(() => {
    fetchStats();
    fetchGroups();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchContacts(1), 200);
    return () => clearTimeout(t);
  }, [activeTab, search, activeGroup, fetchContacts]);

  const refresh = useCallback(() => {
    fetchContacts(page);
    fetchStats();
  }, [fetchContacts, page, fetchStats]);

  const handleStatusUpdate = useCallback(async (contactId: string, status: ContactStatus, notes?: string) => {
    await fetch("/api/calls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: contactId, status, notes }),
    });
    refresh();
  }, [refresh]);

  const handleToggle = useCallback(async (contactId: string, field: "wa_sent" | "email_sent", value: boolean) => {
    await fetch(`/api/contacts/${contactId}/toggles`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    refresh();
  }, [refresh]);

  const handleDelete = useCallback(async (contactId: string) => {
    await fetch(`/api/contacts/${contactId}`, { method: "DELETE" });
    refresh();
  }, [refresh]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-blue-950 text-white sticky top-0 z-20 shadow-lg">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg leading-tight">IAN Campaign</h1>
            <p className="text-blue-300 text-xs">Hi, {memberName}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAdd(true)}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium active:opacity-70"
            >
              + Add
            </button>
            <button
              onClick={() => setShowBulk(true)}
              className="bg-white text-blue-900 px-3 py-1.5 rounded-lg text-sm font-medium active:opacity-70"
            >
              Import
            </button>
            {role === "superadmin" && (
              <a href="/users" className="text-blue-300 px-2 py-1.5 text-sm active:opacity-70">
                Users
              </a>
            )}
            <button onClick={logout} className="text-blue-300 px-2 py-1.5 text-sm active:opacity-70">
              Exit
            </button>
          </div>
        </div>

        <StatsBar stats={stats} />

        {/* Group filter */}
        {groups.length > 0 && (
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveGroup("")}
              className={`shrink-0 text-xs px-3 py-1 rounded-full border ${activeGroup === "" ? "bg-white text-blue-900 border-white" : "border-blue-600 text-blue-200"}`}
            >
              All Groups
            </button>
            {groups.map((g) => (
              <button
                key={g}
                onClick={() => setActiveGroup(activeGroup === g ? "" : g)}
                className={`shrink-0 text-xs px-3 py-1 rounded-full border ${activeGroup === g ? "bg-white text-blue-900 border-white" : "border-blue-600 text-blue-200"}`}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <FilterTabs active={activeTab} onChange={(tab) => { setActiveTab(tab); setPage(1); }} stats={stats} />

      {/* Search */}
      <div className="px-4 py-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search name or number..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Contact List */}
      <div className="px-4 pb-6 space-y-2">
        {loading && (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        )}
        {!loading && contacts.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-400">No contacts found</p>
            <button onClick={() => setShowBulk(true)} className="mt-3 text-blue-600 text-sm underline">
              Import contacts
            </button>
          </div>
        )}
        {!loading && contacts.map((c) => (
          <ContactCard
            key={c.id}
            contact={c}
            onStatusUpdate={handleStatusUpdate}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        ))}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-3 pt-2">
            <button
              disabled={page === 1}
              onClick={() => fetchContacts(page - 1)}
              className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40"
            >
              Prev
            </button>
            <span className="py-2 text-sm text-gray-500">{page} / {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => fetchContacts(page + 1)}
              className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Bulk Import Modal */}
      {showBulk && (
        <BulkImport
          onClose={() => setShowBulk(false)}
          onDone={() => { setShowBulk(false); fetchGroups(); refresh(); }}
        />
      )}

      {/* Add Single Contact Modal */}
      {showAdd && (
        <AddContact
          onClose={() => setShowAdd(false)}
          onDone={() => { setShowAdd(false); refresh(); }}
        />
      )}
    </div>
  );
}
