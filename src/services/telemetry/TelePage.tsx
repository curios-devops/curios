// /tele — internal telemetry on one sheet. Not linked anywhere and not indexed; the data comes
// from the `telemetry` edge function, which answers 404 unless the signed-in account is in
// TELE_ADMIN_EMAILS — so for anyone else this page is just "not found".
import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase.ts';
import { languages } from '../../types/language.ts';
import { assessMeter, providerLevel, type Level, type Meter, type Provider } from './assess.ts';

interface Stats {
  users: { total: number; new7: number; new30: number; active30: number; pro: number };
  visits: Record<'24h' | '7d' | '30d' | '90d' | '365d' | 'ytd' | 'range', { views: number; visitors: number }>;
  tracking_since: string | null;
  by_feature: Record<string, number>;
  by_lang: Record<string, number>;
  by_region: Record<string, number>;
  top_zones: { tz: string; n: number }[];
  daily: { day: string; n: number }[];
}
interface Telemetry { stats: Stats; providers: Provider[]; at: string }

const WINDOWS: [keyof Stats['visits'], string][] = [
  ['24h', 'Hoy (24 h)'], ['7d', 'Semana'], ['30d', 'Mes'], ['90d', '90 días'], ['365d', '1 año'], ['ytd', 'Este año'], ['range', 'Rango'],
];
const FEATURE_NAMES: Record<string, string> = {
  home: 'Inicio', search: 'Search', movies: 'Películas', music: 'Música', games: 'Juegos', 'made-with-ai': 'Made with AI',
  stories: 'Historias', character: 'Personajes', discover: 'Descubrir', library: 'Biblioteca', other: 'Otros',
};
const REGION_NAMES: Record<string, string> = {
  America: 'América', Europe: 'Europa', Asia: 'Asia', Africa: 'África', Australia: 'Oceanía', Pacific: 'Pacífico',
  Atlantic: 'Atlántico', Indian: 'Índico', Antarctica: 'Antártida', '?': 'Desconocida',
};
const LEVELS: Record<Level, { label: string; dot: string }> = {
  ok: { label: 'OK', dot: 'bg-green-500' },
  warn: { label: 'Atención', dot: 'bg-yellow-500' },
  critical: { label: 'Crítico', dot: 'bg-red-500' },
  down: { label: 'No disponible', dot: 'bg-red-500' },
  na: { label: 'N.A.', dot: 'bg-gray-400' },
};
const RANK: Record<Level, number> = { down: 0, critical: 1, warn: 2, na: 3, ok: 4 };

const num = (n: number) => n.toLocaleString('es');
const day = (d: Date) => d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function amount(v: number, unit: Meter['unit']) {
  if (unit === 'usd') return `${v < 0 ? '-' : ''}$${Math.abs(v).toFixed(2)}`;
  if (unit === 'bytes') return v >= 1024 ** 3 ? `${(v / 1024 ** 3).toFixed(2)} GB` : `${(v / 1024 ** 2).toFixed(1)} MB`;
  return num(Math.round(v * 100) / 100);
}
const pctText = (p: number | null) => (p === null ? 'N.A.' : `${Math.round(p * 100)}%`);

// Pie slices are shades of the accent (no new colors).
const SHADES = [100, 72, 52, 38, 26, 16];
function Pie({ title, data, names }: { title: string; data: Record<string, number>; names?: (k: string) => string }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const top = entries.slice(0, 5);
  const rest = entries.slice(5).reduce((n, [, v]) => n + v, 0);
  if (rest) top.push(['…', rest]);
  const total = top.reduce((n, [, v]) => n + v, 0);
  let at = 0;
  const stops = top.map(([, v], i) => {
    const from = at; at += (v / total) * 360;
    return `color-mix(in srgb, var(--accent-primary) ${SHADES[i]}%, transparent) ${from}deg ${at}deg`;
  });
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--ui-bg-elevated)', border: '1px solid var(--ui-border-default)' }}>
      <h3 className="text-sm font-medium mb-3">{title}</h3>
      {total === 0 ? <p className="text-sm" style={{ color: 'var(--ui-text-muted)' }}>N.A. · sin visitas en el rango</p> : (
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full shrink-0" style={{ background: `conic-gradient(${stops.join(',')})` }} />
          <ul className="text-xs space-y-1 min-w-0">
            {top.map(([k, v], i) => (
              <li key={k} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: `color-mix(in srgb, var(--accent-primary) ${SHADES[i]}%, transparent)` }} />
                <span className="truncate">{k === '…' ? 'Otros' : names ? names(k) : k}</span>
                <span style={{ color: 'var(--ui-text-muted)' }}>{Math.round((v / total) * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--ui-bg-elevated)', border: '1px solid var(--ui-border-default)' }}>
      <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--ui-text-secondary)' }}>{sub}</p>}
    </div>
  );
}

export default function TelePage() {
  const sheet = useRef<HTMLDivElement>(null);
  const [from, setFrom] = useState(() => isoDay(new Date(Date.now() - 29 * 864e5)));
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [data, setData] = useState<Telemetry | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'hidden' | 'error'>('loading');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = 'Curios · Telemetría';
    const robots = document.createElement('meta');
    robots.name = 'robots'; robots.content = 'noindex, nofollow';
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  const load = useCallback(async () => {
    setState((s) => (s === 'ready' ? s : 'loading'));
    const end = new Date(`${to}T00:00:00`); end.setDate(end.getDate() + 1);
    const { data: d, error } = await supabase.functions.invoke('telemetry', { body: { from: new Date(`${from}T00:00:00`).toISOString(), to: end.toISOString() } });
    if (error) {
      setState((error as { context?: Response }).context?.status === 404 ? 'hidden' : 'error');
      return;
    }
    setData(d as Telemetry);
    setState('ready');
  }, [from, to]);

  useEffect(() => { void load(); }, [load]);

  if (state === 'hidden' || state === 'error' || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm" style={{ background: 'var(--ui-bg-primary)', color: 'var(--ui-text-muted)' }}>
        {state === 'loading' ? '…' : state === 'error' ? 'Error al cargar la telemetría' : '404 · Página no encontrada'}
      </div>
    );
  }

  const { stats, providers } = data;
  const now = new Date(data.at);
  const sorted = [...providers].sort((a, b) => RANK[providerLevel(a, now)] - RANK[providerLevel(b, now)]);
  const counts = sorted.reduce<Record<Level, number>>((c, p) => ({ ...c, [providerLevel(p, now)]: c[providerLevel(p, now)] + 1 }), { ok: 0, warn: 0, critical: 0, down: 0, na: 0 });
  // Every day of the range, zeros included, so one busy day is one thin bar.
  const perDay = new Map(stats.daily.map((d) => [d.day, d.n]));
  const days: { day: string; n: number }[] = [];
  for (let d = new Date(`${from}T00:00:00`); isoDay(d) <= to; d.setDate(d.getDate() + 1)) days.push({ day: isoDay(d), n: perDay.get(isoDay(d)) ?? 0 });
  const maxDaily = Math.max(1, ...days.map((d) => d.n));
  const langName = (code: string) => languages.find((l) => l.code === code)?.name ?? code;

  // The whole sheet on ONE page sized to it (JPEG keeps it light), named by date.
  const savePdf = async () => {
    if (!sheet.current) return;
    setSaving(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const canvas = await html2canvas(sheet.current, { scale: 1.5, useCORS: true, logging: false });
      const w = canvas.width / 1.5, h = canvas.height / 1.5;
      const pdf = new jsPDF({ unit: 'px', format: [w, h], orientation: w > h ? 'landscape' : 'portrait', hotfixes: ['px_scaling'] });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, w, h);
      pdf.save(`curios-telemetria-${isoDay(now)}.pdf`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--ui-bg-primary)', color: 'var(--ui-text-primary)' }}>
      <div ref={sheet} className="max-w-6xl mx-auto px-4 py-6 space-y-5" style={{ background: 'var(--ui-bg-primary)' }}>
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold font-space-grotesk">Telemetría</h1>
            <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
              Curios · {now.toLocaleString('es')} · visitas desde {stats.tracking_since ? day(new Date(stats.tracking_since)) : 'hoy (recién activado)'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="flex items-center gap-1">Desde
              <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="rounded-lg px-2 py-1" style={{ background: 'var(--ui-bg-elevated)', border: '1px solid var(--ui-border-default)' }} />
            </label>
            <label className="flex items-center gap-1">Hasta
              <input type="date" value={to} min={from} max={isoDay(new Date())} onChange={(e) => setTo(e.target.value)} className="rounded-lg px-2 py-1" style={{ background: 'var(--ui-bg-elevated)', border: '1px solid var(--ui-border-default)' }} />
            </label>
            <div className="flex gap-2" data-html2canvas-ignore>
              <button onClick={() => void load()} className="flex items-center gap-1 px-3 py-1.5 rounded-full" style={{ background: 'var(--ui-bg-elevated)', border: '1px solid var(--ui-border-default)' }}>
                <RefreshCw size={14} /> Actualizar
              </button>
              <button onClick={() => void savePdf()} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 rounded-full font-medium hover:opacity-90 disabled:opacity-60" style={{ background: 'var(--accent-primary)', color: 'var(--ui-text-on-accent)' }}>
                <Download size={14} /> {saving ? 'Guardando…' : 'Guardar PDF'}
              </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card label="Usuarios registrados" value={num(stats.users.total)} sub={`+${num(stats.users.new7)} en 7 días · +${num(stats.users.new30)} en 30 días`} />
          <Card label="Activos (30 días)" value={num(stats.users.active30)} sub="con inicio de sesión" />
          <Card label="Suscriptores Pro" value={num(stats.users.pro)} />
          <Card label="Visitantes únicos (rango)" value={num(stats.visits.range.visitors)} sub={`${num(stats.visits.range.views)} visitas`} />
        </section>

        <section className="rounded-xl p-4" style={{ background: 'var(--ui-bg-elevated)', border: '1px solid var(--ui-border-default)' }}>
          <h2 className="text-sm font-medium mb-3">Visitas</h2>
          <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
            {WINDOWS.map(([k, label]) => (
              <div key={k}>
                <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>{label}</p>
                <p className="text-lg font-semibold">{num(stats.visits[k].views)}</p>
                <p className="text-xs" style={{ color: 'var(--ui-text-secondary)' }}>{num(stats.visits[k].visitors)} únicos</p>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-px h-16 mt-4">
            {days.map((d) => (
              <div key={d.day} className="flex-1 rounded-t" title={`${d.day}: ${d.n}`} style={{ height: `${(d.n / maxDaily) * 100}%`, minHeight: 2, background: d.n ? 'var(--accent-primary)' : 'var(--ui-border-default)' }} />
            ))}
          </div>
          <div className="flex justify-between text-[11px] mt-1" style={{ color: 'var(--ui-text-muted)' }}>
            <span>{day(new Date(`${from}T00:00:00`))}</span><span>{day(new Date(`${to}T00:00:00`))}</span>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Pie title="Visitas por función" data={stats.by_feature} names={(k) => FEATURE_NAMES[k] ?? k} />
          <Pie title="Idioma" data={stats.by_lang} names={langName} />
          <Pie title="Región" data={stats.by_region} names={(k) => REGION_NAMES[k] ?? k} />
        </section>
        {stats.top_zones.length > 0 && (
          <p className="text-xs" style={{ color: 'var(--ui-text-secondary)' }}>
            Zonas principales: {stats.top_zones.map((z) => `${z.tz.split('/').pop()?.replace(/_/g, ' ')} (${num(z.n)})`).join(' · ')}
          </p>
        )}

        <section className="rounded-xl p-4" style={{ background: 'var(--ui-bg-elevated)', border: '1px solid var(--ui-border-default)' }}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-medium">Consumo de APIs</h2>
            <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--ui-text-secondary)' }}>
              {(Object.keys(LEVELS) as Level[]).map((l) => (
                <span key={l} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${LEVELS[l].dot}`} />{LEVELS[l].label} {counts[l]}</span>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left" style={{ color: 'var(--ui-text-muted)' }}>
                  <th className="py-1.5 pr-3 font-medium">API</th>
                  <th className="py-1.5 pr-3 font-medium">Estado</th>
                  <th className="py-1.5 pr-3 font-medium">Consumo</th>
                  <th className="py-1.5 pr-3 font-medium w-32">%</th>
                  <th className="py-1.5 pr-3 font-medium">Proyección del mes</th>
                  <th className="py-1.5 pr-3 font-medium">Se agota</th>
                  <th className="py-1.5 font-medium">Nota</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((p) => {
                  const level = providerLevel(p, now);
                  const rows = p.meters.length ? p.meters : [null];
                  return rows.map((m, i) => {
                    const a = m ? assessMeter(m, now) : null;
                    const bar = a?.level === 'critical' ? 'bg-red-500' : a?.level === 'warn' ? 'bg-yellow-500' : 'bg-green-500';
                    return (
                      <tr key={`${p.id}-${i}`} style={{ borderTop: i === 0 ? '1px solid var(--ui-border-default)' : undefined }}>
                        <td className="py-1.5 pr-3 font-medium whitespace-nowrap">{i === 0 ? p.name : ''}</td>
                        <td className="py-1.5 pr-3 whitespace-nowrap">
                          {i === 0 && <span className={`flex items-center gap-1.5 ${level === 'down' ? 'text-red-500' : ''}`}><span className={`w-2 h-2 rounded-full ${LEVELS[level].dot}`} />{LEVELS[level].label}</span>}
                        </td>
                        <td className="py-1.5 pr-3 whitespace-nowrap">
                          {m ? <>{m.label}: <b>{amount(m.used, m.unit)}</b>{m.limit ? ` / ${amount(m.limit, m.unit)}` : ''}</> : 'N.A.'}
                        </td>
                        <td className="py-1.5 pr-3">
                          {a?.pct != null ? (
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-16 rounded-full overflow-hidden" style={{ background: 'var(--ui-bg-primary)' }}>
                                <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, a.pct * 100)}%` }} />
                              </div>
                              {pctText(a.pct)}
                            </div>
                          ) : m?.kind === 'balance' ? 'Prepago' : 'N.A.'}
                        </td>
                        <td className="py-1.5 pr-3 whitespace-nowrap">
                          {a?.projectedPct != null ? pctText(a.projectedPct) : a?.projectedUsed != null && m ? amount(a.projectedUsed, m.unit) : 'N.A.'}
                        </td>
                        <td className={`py-1.5 pr-3 whitespace-nowrap ${a?.exhaustAt ? 'text-red-500 font-medium' : ''}`}>
                          {a?.exhaustAt ? (a.exhaustAt <= now ? 'Agotada' : day(a.exhaustAt))
                            : a?.daysLeft != null ? `${Math.round(a.daysLeft)} días` : '—'}
                        </td>
                        <td className="py-1.5 min-w-[12rem] max-w-xs break-words" style={{ color: 'var(--ui-text-secondary)' }}>{i === 0 ? p.note ?? '' : ''}</td>
                      </tr>
                    );
                  });
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] mt-3" style={{ color: 'var(--ui-text-muted)' }}>
            Verde &lt; 70% usado y &lt; 80% proyectado · Amarillo hasta 90% / 100% · Rojo desde 90% usado, proyección sobre 100%, saldo agotado o API sin conexión · N.A.: sin clave o la API no expone consumo.
          </p>
        </section>
      </div>
    </div>
  );
}
