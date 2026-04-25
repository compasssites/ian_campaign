interface Props {
  stats: { total: number; spoke: number; no_answer: number; wrong_number: number; callback: number; followed_up: number; pending: number; called: number };
}

export default function StatsBar({ stats }: Props) {
  const pct = stats.total > 0 ? Math.round((stats.called / stats.total) * 100) : 0;
  return (
    <div style={{ padding: "0 16px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "rgba(255,255,255,0.65)", marginBottom: 6 }}>
        <span>{stats.called} called of {stats.total} total</span>
        <span style={{ fontWeight: 700, color: "white" }}>{pct}%</span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.15)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #34d399, #10b981)", borderRadius: 99, transition: "width 0.5s" }} />
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 12 }}>
        <span style={{ color: "#6ee7b7" }}>✓ {stats.spoke} spoke</span>
        <span style={{ color: "#fca5a5" }}>✗ {stats.no_answer} missed</span>
        <span style={{ color: "#c4b5fd" }}>! {stats.wrong_number} wrong no.</span>
        <span style={{ color: "#fcd34d" }}>↩ {stats.callback} callback</span>
        <span style={{ color: "rgba(255,255,255,0.5)" }}>⏳ {stats.pending} pending</span>
      </div>
    </div>
  );
}
