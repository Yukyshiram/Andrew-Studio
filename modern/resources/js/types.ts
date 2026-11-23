export type Role = "reader" | "librarian" | "admin";
export interface User {
    id: number;
    name: string;
    email: string;
    role: Role;
    created_at?: string;
    deleted_at?: string | null;
}
export interface SharedProps {
    [key: string]: unknown;
    auth: { user: User | null };
    can: { manageBooks: boolean; manageUsers: boolean; viewAudit: boolean };
    flash: { success?: string; error?: string };
    appName: string;
    errors: Record<string, string>;
    securityNonce?: string;
}
export interface Book {
    id: number;
    title: string;
    author: string;
    publisher: string;
    publication_year: string;
    description: string;
    category: string;
    cover_color: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string | null;
    legacy_id?: number | null;
    isbn?: string | null;
    edition?: string | null;
    language?: string;
    available_copies?: number;
    total_copies?: number;
}
export interface Pagination<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    from: number | null;
    to: number | null;
    total: number;
    current_page: number;
    last_page: number;
    per_page: number;
}
export interface Stats {
    books: number;
    authors: number;
    publishers: number;
    categories: number;
    archived?: number;
    users?: number;
}
export interface AuditEvent {
    id: number;
    action: string;
    subject_type: string;
    subject_id: number;
    metadata?: Record<string, unknown> | null;
    created_at: string;
    actor?: { name: string } | null;
}
export const roles: Record<Role, string> = {
    reader: "Lector",
    librarian: "Bibliotecario",
    admin: "Administrador",
};
export function dateLabel(value: string) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(
              date,
          );
}
export function actionLabel(action: string) {
    const labels: Record<string, string> = {
        created: "Registro creado",
        updated: "Registro actualizado",
        archived: "Registro archivado",
        restored: "Registro restaurado",
        deleted: "Registro desactivado",
        login: "Inicio de sesión",
        logout: "Cierre de sesión",
        "book.created": "Libro incorporado",
        "book.updated": "Ficha actualizada",
        "book.archived": "Libro archivado",
        "book.restored": "Libro restaurado",
        "acquisition.created": "Incorporación registrada",
        "acquisition.updated": "Incorporación actualizada",
        "books.archived_all": "Catálogo archivado",
        "user.created": "Cuenta creada",
        "user.updated": "Cuenta actualizada",
        "user.deleted": "Cuenta desactivada",
        "user.role_updated": "Rol actualizado",
        "profile.updated": "Perfil actualizado",
        "password.updated": "Contraseña actualizada",
    };
    return labels[action] ?? action.replaceAll("_", " ").replaceAll(".", " · ");
}
