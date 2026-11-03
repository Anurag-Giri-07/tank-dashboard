import { readings } from './data'
import { getTankStats } from './tankStats'

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(
    new Date(timestamp),
  )
}

// manages color of the bar according to the tank level
function levelColour(level: number) {
  if (level < 20) return 'bg-red-500'
  if (level < 50) return 'bg-amber-400'
  return 'bg-emerald-500'
}

export default function App() {
  const { current, min, max, alertReadings } = getTankStats(readings)

  if (!current) {
    return <main className="grid min-h-screen place-items-center bg-slate-100 p-6 text-slate-700">No tank readings available.
    </main>
  }

  const isCurrentLevelLow = current.level_percent < 20

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 sm:p-10">
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-sky-700">Tank monitor</p>
        <h1 className="mt-1 text-3xl font-bold">Tank level dashboard</h1>
        <p className="mt-2 text-slate-600">Latest reading: {formatTime(current.timestamp)}</p>

        {isCurrentLevelLow && (
          <div className="mt-6 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900" role="alert">
            <strong>Low tank level:</strong> the current level is {current.level_percent}%. Refill the tank soon.
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <StatCard label="Current level" value={`${current.level_percent}%`} />
          <StatCard label="Today's minimum" value={`${min}%`} />
          <StatCard label="Today's maximum" value={`${max}%`} />
        </div>

        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center justify-between font-medium">
            <span>Tank level</span>
            <span>{current.level_percent}% full</span>
          </div>
          <div className="h-8 overflow-hidden rounded-full bg-slate-200" aria-label={`Tank is ${current.level_percent}% full`}>
            <div className={`h-full rounded-full transition-all ${levelColour(current.level_percent)}`} style={{ width: `${current.level_percent}%` }} />
          </div>
          <p className="mt-3 text-sm text-slate-500">Green: healthy, amber: getting low, red: below 20%.</p>
        </div>

        <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Earlier low-level readings today</h2>
          {alertReadings.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {alertReadings.map((reading) => (
                <li key={reading.timestamp} className="rounded-md bg-red-50 px-3 py-2 text-red-900">
                  {formatTime(reading.timestamp)} — {reading.level_percent}%
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-slate-600">No readings dropped below 20%.</p>
          )}
        </div>
      </section>
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value}</p>
    </article>
  )
}
