import { describe, expect, it } from 'vitest'
import { getTankStats } from './tankStats'

describe('getTankStats', () => {
  it('sorts readings and finds the daily values and low-level alerts', () => {
    const stats = getTankStats([
      { timestamp: '2026-11-02T20:00:00', level_percent: 55 },
      { timestamp: '2026-11-02T16:00:00', level_percent: 18 },
      { timestamp: '2026-11-02T06:00:00', level_percent: 78 },
    ])

    expect(stats.current?.level_percent).toBe(55)
    expect(stats.min).toBe(18)
    expect(stats.max).toBe(78)
    expect(stats.alertReadings).toHaveLength(1)
  })

  it('returns safe empty values when there are no readings', () => {
    expect(getTankStats([])).toMatchObject({ current: null, min: null, max: null, alertReadings: [] })
  })
})
