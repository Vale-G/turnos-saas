type Relation<T> = T | T[] | null
export type ReportRow = {
  id?: string; fecha?: string; hora?: string; precio_acordado?: number | null; cancelado_por?: string | null
  estado: string | null
  servicio: Relation<{ id: string; nombre: string | null; precio: number | null }>
  staff: Relation<{ id: string; nombre: string | null }>
}

export function related<T>(value: Relation<T>): T | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined
}

export function reportFor(rows: ReportRow[], staffId: string) {
  let absent = 0, completed = 0, cancelled = 0, estimated = 0
  const bookings = rows.filter(row => !staffId || (related(row.staff)?.id ?? 'unassigned') === staffId)
  type Group = { name: string; count: number; amount: number }
  const services = new Map<string, Group>()
  const team = new Map<string, Group>()
  function add(groups: Map<string, Group>, id: string, name: string, amount: number) {
    const entry = groups.get(id) ?? { name, count: 0, amount: 0 }
    entry.count++
    entry.amount += amount
    groups.set(id, entry)
  }
  for (const row of bookings) {
    if (row.estado === 'no_asistio') absent++
    if (row.estado === 'cancelado') cancelled++
    if (row.estado !== 'completado') continue
    const service = related(row.servicio)
    const staff = related(row.staff)
    const price = Number(row.precio_acordado ?? service?.precio ?? 0)
    estimated += price
    completed++
    add(services, service?.id ?? 'unknown', service?.nombre ?? 'Servicio sin identificar', price)
    add(team, staff?.id ?? 'unassigned', staff?.nombre ?? 'Sin asignar', price)
  }
  const ranked = (groups: Map<string, Group>) => [...groups.entries()].sort(([, a], [, b]) =>
    b.amount - a.amount || b.count - a.count || a.name.localeCompare(b.name, 'es'))
  return { total: bookings.length, completed, cancelled, estimated,
    absent, open: bookings.length - completed - cancelled - absent,
    cancellationRate: bookings.length ? Math.round(cancelled * 100 / bookings.length) : null,
    services: ranked(services).slice(0, 5), team: ranked(team) }
}
