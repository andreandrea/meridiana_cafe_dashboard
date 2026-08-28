import { z } from 'zod'

export const tableSchema = z.object({
  label: z.string().trim().min(1).max(60),
  seats_min: z.number().int().min(1).max(30),
  seats_max: z.number().int().min(1).max(30),
  pos_x: z.number().min(0).max(100),
  pos_y: z.number().min(0).max(100),
  shape: z.enum(['round', 'rect']),
  is_active: z.boolean(),
}).refine((data) => data.seats_max >= data.seats_min, {
  message: 'La capienza massima deve essere >= capienza minima',
  path: ['seats_max'],
})

export type TableInput = z.infer<typeof tableSchema>
