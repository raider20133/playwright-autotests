import dotenv from 'dotenv';
import {z} from 'zod';

dotenv.config({quiet: true});

const EnvSchema = z.object({
    BASE_URL: z.url(),
    API_BASE_URL: z.url(),
    // The app's registration code — the only secret the suite needs
    SECRET_PASSWORD: z.string().min(1, 'SECRET_PASSWORD (the registration code) is required'),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
    throw new Error(`Invalid test environment:\n${z.prettifyError(parsed.error)}\nSee .env.example`);
}

export const env = {
    appUrl: parsed.data.BASE_URL,
    apiUrl: parsed.data.API_BASE_URL,
    registrationCode: parsed.data.SECRET_PASSWORD,
} as const;
