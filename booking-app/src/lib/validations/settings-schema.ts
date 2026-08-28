import { z } from 'zod'

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato orario non valido (HH:MM)')

export const bookingSettingsSchema = z.object({
  min_advance_minutes: z.number().int().min(0).max(1440),
  form_open_time: timeString,
  max_advance_days: z.number().int().min(1).max(365),
  slot_duration_minutes: z.number().int().min(15).max(480),
  restaurant_name: z.string().trim().min(1).max(120),
  restaurant_whatsapp_number: z
    .string()
    .trim()
    .regex(/^\+?\d{6,15}$/, 'Numero WhatsApp non valido (usa formato internazionale, es. +393331234567)')
    .optional()
    .or(z.literal('')),
})

export const openingHourSchema = z.object({
  day_of_week: z.number().int().min(0).max(6),
  shift_label: z.string().trim().min(1).max(40),
  open_time: timeString,
  close_time: timeString,
  is_closed: z.boolean(),
})

export const specialClosureSchema = z
  .object({
    date_start: z.string().date(),
    date_end: z.string().date(),
    all_day: z.boolean(),
    closed_from: timeString.optional().or(z.literal('')),
    closed_to: timeString.optional().or(z.literal('')),
    reason: z.string().trim().max(200).optional().or(z.literal('')),
  })
  .refine((data) => data.date_end >= data.date_start, {
    message: 'La data di fine deve essere successiva o uguale alla data di inizio',
    path: ['date_end'],
  })

export type BookingSettingsInput = z.infer<typeof bookingSettingsSchema>
export type OpeningHourInput = z.infer<typeof openingHourSchema>
export type SpecialClosureInput = z.infer<typeof specialClosureSchema>
