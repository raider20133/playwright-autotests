import dotenv from 'dotenv';
import {z} from 'zod';

dotenv.config({quiet: true});

const EnvSchema = z.object({
    BASE_URL: z.url(),
    API_BASE_URL: z.url(),
    // SECRET_PASSWORD is the legacy name of the same value
    REGISTRATION_CODE: z.string().min(1, 'REGISTRATION_CODE (or SECRET_PASSWORD) is required'),
});

const parsed = EnvSchema.safeParse({
    ...process.env,
    REGISTRATION_CODE: process.env.REGISTRATION_CODE || process.env.SECRET_PASSWORD,
});

if (!parsed.success) {
    throw new Error(`Invalid test environment:\n${z.prettifyError(parsed.error)}\nSee .env.example`);
}

export const env = {
    appUrl: parsed.data.BASE_URL,
    apiUrl: parsed.data.API_BASE_URL,
    registrationCode: parsed.data.REGISTRATION_CODE,
} as const;
