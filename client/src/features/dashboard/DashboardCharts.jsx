import { format, parseISO } from 'date-fns';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

// Two series on one axis. "Completed" is the story, so it carries the accent;
// "Created" is the baseline, drawn as a dashed neutral line (shape, not just colour, tells them apart).
const SERIES = {
  completed: { color: '#D4552F', label: 'Completed' },
  created: { color: '#78736A', label: 'Created' },
};
const AXIS = { fontSize: 10.5, fill: '#A09B8F', fontFamily: 'IBM Plex Mono, monospace' };

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md bg-paper-50 px-3 py-2 shadow-float">
      <p className="mb-1 font-mono text-[11px] text-ink-500">{format(parseISO(label), 'EEE, MMM d')}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center justify-between gap-6 text-[12.5px] text-ink-700">
          {SERIES[p.dataKey].label}
          <span className="font-mono font-medium text-ink-900">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Tasks created vs completed per day for the last 14 days. */
export function TrendChart({ data }) {
  const totals = data.reduce((acc, d) => ({ created: acc.created + d.created, completed: acc.completed + d.completed }), { created: 0, completed: 0 });
  return (
    <figure>
      <figcaption className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-ink-600">
        <span className="flex items-center gap-2">
          <span className="h-[2px] w-5 bg-brand-500" aria-hidden /> Completed <span className="font-mono text-ink-900">{totals.completed}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0 w-5 border-t-2 border-dashed border-ink-500" aria-hidden /> Created <span className="font-mono text-ink-900">{totals.created}</span>
        </span>
      </figcaption>
      <div className="h-[220px]" role="img" aria-label={`Over the last ${data.length} days, ${totals.created} tasks were created and ${totals.completed} completed`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 4, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="fill-completed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SERIES.completed.color} stopOpacity={0.12} />
                <stop offset="100%" stopColor={SERIES.completed.color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="#E3E0D8" />
            <XAxis dataKey="date" tickFormatter={(d) => format(parseISO(d), 'd MMM')} tick={AXIS} tickLine={false} axisLine={{ stroke: '#CFCBC0' }} minTickGap={28} />
            <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={40} />
            <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#A09B8F', strokeWidth: 1 }} />
            <Area type="monotone" dataKey="created" stroke={SERIES.created.color} strokeWidth={1.5} strokeDasharray="4 3" fill="none" activeDot={{ r: 3.5, strokeWidth: 2, stroke: '#FDFCF9' }} />
            <Area type="monotone" dataKey="completed" stroke={SERIES.completed.color} strokeWidth={2} fill="url(#fill-completed)" activeDot={{ r: 4, strokeWidth: 2, stroke: '#FDFCF9' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
