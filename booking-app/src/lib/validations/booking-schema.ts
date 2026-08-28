import { z } from 'zod'

export const createBookingSchema = z.object({
  table_id: z.string().uuid(),
  party_size: z.number().int().min(1).max(20),
  customer_name: z.string().trim().min(2).max(120),
  customer_phone: z
    .string()
    .trim()
    .min(6)
    .max(20)
    .regex(/^[+\d][\d\s]*$/, 'Numero di telefono non valido'),
  start_at: z.string().datetime(), // ISO string, UTC
})

export type CreateBookingInput = z.infer<typeof createBookingSchema>
