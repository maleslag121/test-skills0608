export default function ChannelDonut({ channels }) {
  const total = channels.reduce((sum, c) => sum + c.value, 0);
  let offset = 0;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  const segments = channels.map((ch) => {
    const pct = ch.value / total;
    const dash = pct * circumference;
    const segment = { ...ch, pct, dash, offset };
    offset += dash;
    return segment;
  });

  return (
    <section className="panel channel-donut">
      <header className="panel__header">
        <h2 className="panel__title">渠道占比</h2>
        <span className="panel__subtitle">销售来源</span>
      </header>
      <div className="channel-donut__body">
        <svg className="channel-donut__svg" viewBox="0 0 100 100" role="img" aria-label="渠道占比环形图">
          <circle cx="50" cy="50" r={radius} className="channel-donut__bg" fill="none" strokeWidth="12" />
          {segments.map((seg) => (
            <circle
              key={seg.name}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              strokeWidth="12"
              stroke={seg.color}
              strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
              strokeDashoffset={-seg.offset}
              className="channel-donut__segment"
              transform="rotate(-90 50 50)"
            />
          ))}
          <text x="50" y="47" className="channel-donut__center-num" textAnchor="middle">
            {total}%
          </text>
          <text x="50" y="58" className="channel-donut__center-label" textAnchor="middle">
            合计
          </text>
        </svg>
        <ul className="channel-donut__legend">
          {channels.map((ch) => (
            <li key={ch.name} className="channel-donut__legend-item">
              <span className="channel-donut__dot" style={{ background: ch.color }} />
              <span className="channel-donut__legend-name">{ch.name}</span>
              <span className="channel-donut__legend-value">{ch.value}%</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
