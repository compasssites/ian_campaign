interface Props {
  stats: { total: number; spoke: number; no_answer: number; callback: number; followed_up: number; pending: number; called: number };
}

export default function StatsBar({ stats }: Props) {
  const pct = stats.total > 0 ? Math.round((stats.called / stats.total) * 100) : 0;

  return (
    <div className="px-4 pb-3">
      <div className="flex items-center justify-between text-xs text-blue-200 mb-1.5">
        <span>{stats.called} called of {stats.total} total</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-blue-900 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex gap-3 mt-2 text-xs">
        <span className="text-green-300">✓ {stats.spoke} spoke</span>
        <span className="text-red-300">✗ {stats.no_answer} missed</span>
        <span className="text-yellow-300">↩ {stats.callback} callback</span>
        <span className="text-blue-300">⏳ {stats.pending} pending</span>
      </div>
    </div>
  );
}
