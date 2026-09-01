import { romeWallTimeToUtc, utcToRomeParts } from './timezone'

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
 *
 * Tutti gli orari (now incluso) vengono letti nel fuso orario del
 * locale (Europe/Rome), non in quello del server: su Vercel il
 * runtime gira in UTC, quindi confrontare .getHours() direttamente
 * produrrebbe uno sfasamento di 1-2 ore rispetto all'orario italiano.
 */
export function isWithinBookingWindow(
  now: Date,
  slotStart: Date,
  settings: BookingSettings
): { allowed: boolean; reason?: string } {
  const nowRome = utcToRomeParts(now)
  const nowMinutes = nowRome.hour * 60 + nowRome.minute
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
 * Verifica se uno slot (in minuti-dalla-mezzanotte, ora di Roma) cade
 * dentro una chiusura straordinaria per quella data. Estratta come
 * funzione a sé per essere riusabile sia nel controllo server-side
 * completo (isSlotWithinOpeningHours) sia nella generazione degli
 * slot mostrati al cliente (generateShiftSlots) — altrimenti il
 * cliente vedrebbe orari "disponibili" in giorni segnati come chiusi
 * dall'admin, scoprendo l'errore solo all'invio della richiesta.
 */
export function isClosedByException(
  dateStr: string,
  slotStartMinutes: number,
  slotEndMinutes: number,
  specialClosures: SpecialClosure[]
): boolean {
  return specialClosures.some((closure) => {
    if (dateStr < closure.date_start || dateStr > closure.date_end) {
      return false
    }
    if (closure.all_day) return true
    if (!closure.closed_from || !closure.closed_to) return false
    const fromMinutes = parseTimeToMinutes(closure.closed_from)
    const toMinutes = parseTimeToMinutes(closure.closed_to)
    return slotStartMinutes < toMinutes && slotEndMinutes > fromMinutes
  })
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
  const startRome = utcToRomeParts(slotStart)
  const endRome = utcToRomeParts(slotEnd)
  const dayOfWeek = startRome.weekday
  const slotStartMinutes = startRome.hour * 60 + startRome.minute
  const slotEndMinutes = endRome.hour * 60 + endRome.minute

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

  if (
    isClosedByException(
      startRome.dateStr,
      slotStartMinutes,
      slotEndMinutes,
      specialClosures
    )
  ) {
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

/**
 * Genera gli orari (HH:MM) prenotabili all'interno di un turno per una
 * data specifica, a intervalli fissi, già filtrati per le regole di
 * prenotazione (anticipo minimo, apertura form, anticipo massimo) e
 * per garantire che l'intero slot (durata inclusa) rientri nel turno.
 */
export function generateShiftSlots(
  dateStr: string,
  shift: Pick<OpeningHour, 'open_time' | 'close_time'>,
  settings: BookingSettings,
  now: Date,
  specialClosures: SpecialClosure[] = [],
  intervalMinutes = 30
): string[] {
  const openMinutes = parseTimeToMinutes(shift.open_time)
  const closeMinutes = parseTimeToMinutes(shift.close_time)
  const lastStartMinutes = closeMinutes - settings.slot_duration_minutes

  const slots: string[] = []
  for (let t = openMinutes; t <= lastStartMinutes; t += intervalMinutes) {
    const hh = String(Math.floor(t / 60)).padStart(2, '0')
    const mm = String(t % 60).padStart(2, '0')
    const timeStr = `${hh}:${mm}`
    const candidate = romeWallTimeToUtc(dateStr, timeStr)
    const slotEndMinutes = t + settings.slot_duration_minutes
    if (
      isWithinBookingWindow(now, candidate, settings).allowed &&
      !isClosedByException(dateStr, t, slotEndMinutes, specialClosures)
    ) {
      slots.push(timeStr)
    }
  }
  return slots
}
