export function sortRouteRows<T extends { row_type: string }>(rows: T[]): T[] {
  const clockIn  = rows.filter(r => r.row_type === 'clock_in')
  const tasks    = rows.filter(r => r.row_type === 'task')
  const clockOut = rows.filter(r => r.row_type === 'clock_out')
  return [...clockIn, ...tasks, ...clockOut]
}
