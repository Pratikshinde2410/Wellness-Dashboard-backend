import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const clientListSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    health_condition: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const clientIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid client ID'),
  }),
});

export const clientReportsSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid client ID'),
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});

export const csvRowSchema = z.object({
  report_id: z.string().min(1),
  client_id: z.string().min(1),
  report_date: z.string().min(1),
  hemoglobin: z.coerce.number().min(0).max(25),
  vitamin_d: z.coerce.number().min(0).max(200),
  cholesterol: z.coerce.number().min(0).max(500),
  blood_sugar_fasting: z.coerce.number().min(0).max(600),
  creatinine: z.coerce.number().min(0).max(20),
  urine_protein: z.enum(['Negative', 'Trace', 'Positive']),
  bmi: z.coerce.number().min(5).max(80),
  doctor_notes: z.string().optional().default(''),
});

const passwordRules = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain an uppercase letter')
  .regex(/[a-z]/, 'Must contain a lowercase letter')
  .regex(/[0-9]/, 'Must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Must contain a special character');

export const updateProfileSchema = z.object({
  body: z
    .object({
      full_name: z.string().min(1).max(100).optional(),
      mobile: z.string().min(10).max(15).optional(),
      city: z.string().min(1).max(100).optional(),
      state: z.string().min(1).max(100).optional(),
      age: z.coerce.number().int().min(1).max(120).optional(),
      gender: z.string().min(1).max(50).optional(),
      occupation: z.string().min(1).max(100).optional(),
      health_condition: z.string().min(1).max(200).optional(),
      beauty_goal: z.string().min(1).max(200).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required',
    }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordRules,
  }),
});

export const reportBodySchema = z.object({
  body: z.object({
    report_id: z.string().min(1),
    report_date: z.string().min(1),
    hemoglobin: z.coerce.number().min(0).max(25),
    vitamin_d: z.coerce.number().min(0).max(200),
    cholesterol: z.coerce.number().min(0).max(500),
    blood_sugar_fasting: z.coerce.number().min(0).max(600),
    creatinine: z.coerce.number().min(0).max(20),
    urine_protein: z.enum(['Negative', 'Trace', 'Positive']),
    bmi: z.coerce.number().min(5).max(80),
    doctor_notes: z.string().optional().default(''),
  }),
});

export const createClientSchema = z.object({
  body: z.object({
    full_name: z.string().min(1).max(100),
    email: z.string().email(),
    mobile: z.string().min(10).max(15),
    city: z.string().min(1),
    state: z.string().min(1),
    age: z.coerce.number().int().min(1).max(120),
    gender: z.string().min(1),
    occupation: z.string().min(1),
    health_condition: z.string().min(1),
    beauty_goal: z.string().min(1),
    password: passwordRules,
    role: z.enum(['user', 'admin']).optional().default('user'),
  }),
});

export const updateClientSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid client ID'),
  }),
  body: z
    .object({
      full_name: z.string().min(1).max(100).optional(),
      mobile: z.string().min(10).max(15).optional(),
      city: z.string().min(1).optional(),
      state: z.string().min(1).optional(),
      age: z.coerce.number().int().min(1).max(120).optional(),
      gender: z.string().min(1).optional(),
      occupation: z.string().min(1).optional(),
      health_condition: z.string().min(1).optional(),
      beauty_goal: z.string().min(1).optional(),
      role: z.enum(['user', 'admin']).optional(),
      is_active: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field is required',
    }),
});

export const reportIdSchema = z.object({
  params: z.object({
    reportId: z.string().min(1),
  }),
});

export const updateReportSchema = z.object({
  params: z.object({
    reportId: z.string().min(1),
  }),
  body: reportBodySchema.shape.body.partial().refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field is required',
  }),
});

export const adminReportsListSchema = z.object({
  query: z.object({
    search: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
});
