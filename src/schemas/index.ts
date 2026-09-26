import {z} from 'zod';

// Contracts are written by hand on purpose: a server-side change must break a test,
// not silently compile against the server's own types.

const id = z.number().int().positive();
const isoDate = z.iso.datetime({offset: true});
// Postgres NUMERIC comes back as a string, e.g. "120.00"
const money = z.string().regex(/^-?\d+\.\d{2}$/);

export const Currency = z.enum(['UAH', 'USD', 'EUR']);
export type Currency = z.infer<typeof Currency>;

export const LoginResponse = z.object({message: z.literal('Login successful'), token: z.string().min(20)});

export const RegisterResponse = z.object({message: z.string(), userId: id});

export const Me = z.object({
    id,
    username: z.string(),
    vacation_days_per_year: z.number().int(),
    sick_days_per_year: z.number().int(),
    tab_order: z.array(z.string()),
});

export const Message = z.object({message: z.string()});

export const Task = z.object({
    id,
    user_id: id,
    name: z.string(),
    type: z.enum(['free', 'paid']),
    price: money.nullable(),
    currency: Currency.nullable(),
    is_done: z.boolean(),
    month: isoDate,
    created_at: isoDate,
});
export type Task = z.infer<typeof Task>;

export const LeaveType = z.enum(['vacation', 'sick']);
export const LeaveStatus = z.enum(['pending', 'approved', 'rejected']);

export const LeaveCreated = z.object({message: z.string(), leaveId: id});

export const LeaveRequest = z.object({
    id,
    user_id: id,
    type: LeaveType,
    start_date: isoDate,
    end_date: isoDate,
    status: LeaveStatus,
}).loose();
export type LeaveRequest = z.infer<typeof LeaveRequest>;

export const Service = z.object({
    id,
    user_id: id,
    name: z.string(),
    count_type: z.enum(['positive', 'negative']),
    cost_type: z.enum(['group', 'per_session']),
    total_quantity: z.number().int().nullable(),
    cost: money,
    icon: z.string().nullable(),
    created_at: isoDate,
    updated_at: isoDate,
});
export type Service = z.infer<typeof Service>;

export const ScheduledEvent = z.object({
    id,
    service_id: id,
    user_id: id,
    event_date: isoDate,
    status: z.enum(['upcoming', 'completed']),
    created_at: isoDate,
    updated_at: isoDate,
});
export type ScheduledEvent = z.infer<typeof ScheduledEvent>;

export const ServicesOverview = z.object({services: z.array(Service), events: z.array(ScheduledEvent)});

export const WishList = z.object({id, user_id: id, name: z.string(), created_at: isoDate});
export type WishList = z.infer<typeof WishList>;

export const WishListEntry = WishList.extend({
    is_shared: z.boolean(),
    shared_by_username: z.string().nullable(),
    access_level: z.literal('view_only').nullable(),
});

export const WishListItem = z.object({
    id,
    wish_list_id: id,
    name: z.string(),
    is_done: z.boolean(),
    is_paid: z.boolean(),
    currency: z.string().nullable(),
    amount: money.nullable(),
    created_at: isoDate,
});
export type WishListItem = z.infer<typeof WishListItem>;

export const ShareCreated = z.object({
    message: z.string(),
    sharedWishList: z.object({
        id,
        wish_list_id: id,
        shared_with_user_id: id,
        shared_by_user_id: id,
        access_level: z.literal('view_only'),
    }).loose(),
});

export const SharedUser = z.object({shared_id: id, user_id: id, username: z.string(), access_level: z.literal('view_only')});
