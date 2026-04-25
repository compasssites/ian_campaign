interface Props {
  active: string;
  onChange: (tab: string) => void;
  stats: { total: number; spoke: number; no_answer: number; callback: number; followed_up: number; pending: number };
}

const tabs = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "spoke", label: "Spoke" },
  { key: "no_answer", label: "Missed" },
  { key: "callback", label: "Callback" },
  { key: "followed_up", label: "Done" },
];

export default function FilterTabs({ active, onChange, stats }: Props) {
  const count = (key: string) => {
    if (key === "all") return stats.total;
    if (key === "pending") return stats.pending;
    if (key === "spoke") return stats.spoke;
    if (key === "no_answer") return stats.no_answer;
    if (key === "callback") return stats.callback;
    if (key === "followed_up") return stats.followed_up;
    return 0;
  };

  return (
    <div className="flex gap-1.5 px-4 py-2 overflow-x-auto scrollbar-hide bg-white border-b border-gray-100 sticky top-[calc(var(--header-h,120px))] z-10">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
            active === tab.key
              ? "bg-blue-900 text-white"
              : "bg-gray-100 text-gray-600 active:bg-gray-200"
          }`}
        >
          {tab.label}
          <span className={`ml-1 text-xs ${active === tab.key ? "text-blue-200" : "text-gray-400"}`}>
            {count(tab.key)}
          </span>
        </button>
      ))}
    </div>
  );
}
