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

export interface CirculationRecord {
    id: number;
    book_id: number;
    member_id: number;
    book: Book;
    member?: Member;
    status:
        | "pending"
        | "waiting"
        | "ready"
        | "fulfilled"
        | "rejected"
        | "cancelled"
        | "expired";
    requested_at: string;
    queue_position: number;
    ready_until: string | null;
    decision_reason: string | null;
    allocation: {
        copy_id: number;
        copy: Pick<BookCopy, "id" | "barcode" | "location">;
    } | null;
}
export interface LibraryNotice {
    id: number;
    kind: string;
    message: string;
    created_at: string;
    read_at: string | null;
}
export interface Loan {
    id: number;
    member_id: number;
    copy: BookCopy;
    member?: Member;
    status: "active" | "returned" | "lost";
    due_on: string;
    checked_out_at: string;
    renewal_count: number;
    returned_at: string | null;
    returned_condition: string | null;
    terms: LibraryTerms;
}
