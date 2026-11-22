import type { Book, User } from "./types";

export type CopyStatus =
    "available" | "held" | "loaned" | "repair" | "lost" | "withdrawn";
export interface BookCopy {
    id: number;
    book_id: number;
    barcode: string;
    location: string;
    condition: "good" | "worn" | "damaged" | "lost";
    status: CopyStatus;
    book: Pick<Book, "id" | "title">;
}
export interface Member {
    id: number;
    user_id: number;
    card_number: string;
    status: "active" | "suspended";
    phone: string | null;
    expires_on: string | null;
    loan_limit: number | null;
    user: Pick<User, "id" | "name" | "email" | "deleted_at">;
}
export interface LibraryTerms {
    timezone: string;
    currency: string;
    max_loans: number;
    loan_days: number;
    max_renewals: number;
    pickup_days: number;
    grace_days: number;
    daily_fine_cents: number;
    lost_charge_cents: number;
    damage_charge_cents: number;
    block_balance_cents: number;
    block_overdue: boolean;
    closed_weekdays: number[];
    closure_dates: string[];
    version: number;
}
