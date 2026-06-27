/** Returns today's date as YYYY-MM-DD in Mountain Time (America/Denver). */
export function getTodayMT(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const get = (type: string) => parts.find(p => p.type === type)!.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Returns the most recent Monday as YYYY-MM-DD, computed in Mountain Time. */
export function getMostRecentMondayMT(): string {
  const today = getTodayMT()
  const [year, month, day] = today.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  const dow = d.getDay() // 0=Sun, 1=Mon
  const diff = dow === 0 ? 6 : dow - 1
  d.setDate(d.getDate() - diff)
  return formatDateLocal(d)
}

/** Add N calendar days to a YYYY-MM-DD string. */
export function addDaysToDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  d.setDate(d.getDate() + days)
  return formatDateLocal(d)
}

/** Format a Date object as YYYY-MM-DD using local time. */
function formatDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/** Format YYYY-MM-DD as "Friday, Jun 27" for display. */
export function formatFriendlyDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
}
