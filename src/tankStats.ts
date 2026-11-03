export type TankReading = {
  timestamp: string
  level_percent: number
}

export type TankStats = {
  sortedReadings: TankReading[]
  current: TankReading | null
  min: number | null
  max: number | null
  alertReadings: TankReading[]
}

// The latest reading defines "today" because this dashboard uses fixed mock data.
export function getTankStats(readings: TankReading[]): TankStats {
  const sortedReadings = [...readings].sort(
    (first, second) => new Date(first.timestamp).getTime() - new Date(second.timestamp).getTime(),
  )

  const current = sortedReadings.length > 0 ? sortedReadings[sortedReadings.length - 1] : null

  if (!current) {
    return { sortedReadings, current: null, min: null, max: null, alertReadings: [] }
  }

  const today = current.timestamp.slice(0, 10)
  const todayReadings = sortedReadings.filter((reading) => reading.timestamp.slice(0, 10) === today)
  const levels = todayReadings.map((reading) => reading.level_percent)

  return {
    sortedReadings,
    current,
    min: Math.min(...levels),
    max: Math.max(...levels),
    // The latest low reading is shown in the banner; this list is for earlier dips.
    alertReadings: todayReadings.filter(
      (reading) => reading.timestamp !== current.timestamp && reading.level_percent < 20,
    ),
  }
}
