export type BookingSettings = {
  min_advance_minutes: number
  form_open_time: string // 'HH:MM:SS' o 'HH:MM'
  max_advance_days: number
  slot_duration_minutes: number
}

export type SpecialClosure = {
  date_start: string // 'YYYY-MM-DD'
  date_end: string
  all_day: boolean
  closed_from: string | null
  closed_to: string | null
}

export type OpeningHour = {
  day_of_week: number // 0 = domenica
  shift_label: string
  open_time: string
  close_time: string
  is_closed: boolean
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * Verifica se, ADESSO, il form pubblico può accettare una richiesta
 * per lo slot `slotStart`. Applica due regole indipendenti:
 * 1) il form è "chiuso" prima di form_open_time ogni giorno;
 * 2) serve un anticipo minimo di min_advance_minutes rispetto allo slot.
 */
export function isWithinBookingWindow(
  now: Date,
  slotStart: Date,
  settings: BookingSettings
): { allowed: boolean; reason?: string } {
  const nowMinutes = now.getHours() * 60 + now.getMinutes()
  const formOpenMinutes = parseTimeToMinutes(settings.form_open_time)

  if (nowMinutes < formOpenMinutes) {
    return {
      allowed: false,
      reason: `Le prenotazioni si aprono ogni giorno alle ${settings.form_open_time.slice(0, 5)}.`,
    }
  }

  const minutesUntilSlot = (slotStart.getTime() - now.getTime()) / 60000
  if (minutesUntilSlot < settings.min_advance_minutes) {
    return {
      allowed: false,
      reason: `Serve un anticipo minimo di ${settings.min_advance_minutes} minuti.`,
    }
  }

  const maxAdvanceMs = settings.max_advance_days * 24 * 60 * 60 * 1000
  if (slotStart.getTime() - now.getTime() > maxAdvanceMs) {
    return {
      allowed: false,
      reason: `Si può prenotare al massimo con ${settings.max_advance_days} giorni di anticipo.`,
    }
  }

  return { allowed: true }
}

/**
 * Verifica che lo slot richiesto rientri negli orari di apertura
 * configurati (turno) e non cada in una chiusura straordinaria.
 */
export function isSlotWithinOpeningHours(
  slotStart: Date,
  slotEnd: Date,
  openingHours: OpeningHour[],
  specialClosures: SpecialClosure[]
): { allowed: boolean; reason?: string } {
  const dayOfWeek = slotStart.getDay()
  const slotStartMinutes = slotStart.getHours() * 60 + slotStart.getMinutes()
  const slotEndMinutes = slotEnd.getHours() * 60 + slotEnd.getMinutes()

  const shiftsForDay = openingHours.filter(
    (h) => h.day_of_week === dayOfWeek && !h.is_closed
  )

  const fitsInAShift = shiftsForDay.some((shift) => {
    const openMinutes = parseTimeToMinutes(shift.open_time)
    const closeMinutes = parseTimeToMinutes(shift.close_time)
    return slotStartMinutes >= openMinutes && slotEndMinutes <= closeMinutes
  })

  if (!fitsInAShift) {
    return {
      allowed: false,
      reason: 'Il locale è chiuso in questo orario.',
    }
  }

  const dateStr = slotStart.toISOString().slice(0, 10)
  const isClosedByException = specialClosures.some((closure) => {
    if (dateStr < closure.date_start || dateStr > closure.date_end) {
      return false
    }
    if (closure.all_day) return true
    if (!closure.closed_from || !closure.closed_to) return false
    const fromMinutes = parseTimeToMinutes(closure.closed_from)
    const toMinutes = parseTimeToMinutes(closure.closed_to)
    return slotStartMinutes < toMinutes && slotEndMinutes > fromMinutes
  })

  if (isClosedByException) {
    return { allowed: false, reason: 'Il locale è chiuso in questa data.' }
  }

  return { allowed: true }
}

export function computeSlotEnd(
  slotStart: Date,
  settings: Pick<BookingSettings, 'slot_duration_minutes'>
): Date {
  return new Date(slotStart.getTime() + settings.slot_duration_minutes * 60000)
}
