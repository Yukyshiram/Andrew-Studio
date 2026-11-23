import { Search, ShieldCheck } from "lucide-react";
import { AppShell } from "../../components/layout";
import { PaginationLinks } from "../../components/books";
import { Badge, EmptyState, Input } from "../../components/ui";
import {
    actionLabel,
    dateLabel,
    type AuditEvent,
    type Pagination,
} from "../../types";
import { useFilters } from "../../hooks/use-filters";
export default function AuditIndex({
    events,
    filters: serverFilters,
}: {
    events: Pagination<AuditEvent>;
    filters: { q?: string };
}) {
    const { filters, change } = useFilters("/manage/audit", {
        q: serverFilters.q ?? "",
    });
    return (
        <AppShell title="Historial de acciones" eyebrow="HISTORIAL DE ACCIONES">
            <div className="audit-intro">
                <ShieldCheck size={26} />
                <p>
                    Una mirada a las acciones que cuidan la biblioteca. Consulta
                    quién hizo cada cambio y cuándo ocurrió.
                </p>
            </div>
            <div className="catalog-toolbar">
                <div className="search-field">
                    <Search size={19} aria-hidden="true" />
                    <label htmlFor="audit-search" className="sr-only">
                        Buscar en el historial
                    </label>
                    <Input
                        id="audit-search"
                        type="search"
                        placeholder="Buscar una acción, persona o registro…"
                        value={filters.q}
                        onChange={(e) => change("q", e.target.value)}
                    />
                </div>
                <span className="toolbar-total">
                    {events.total} {events.total === 1 ? "evento" : "eventos"}
                </span>
            </div>
            {events.data.length ? (
                <div
                    className="table-wrap"
                    tabIndex={0}
                    role="region"
                    aria-label="Historial de acciones, tabla desplazable"
                >
                    <table className="data-table audit-table">
                        <caption className="sr-only">
                            Historial de acciones en la biblioteca
                        </caption>
                        <thead>
                            <tr>
                                <th>Acción</th>
                                <th>Persona</th>
                                <th>Registro</th>
                                <th>Fecha</th>
                                <th>Detalle</th>
                            </tr>
                        </thead>
                        <tbody>
                            {events.data.map((event) => (
                                <tr key={event.id}>
                                    <td>
                                        <strong>
                                            {actionLabel(event.action)}
                                        </strong>
                                        <small className="audit-id">
                                            Evento #{event.id}
                                        </small>
                                    </td>
                                    <td>{event.actor?.name ?? "Sistema"}</td>
                                    <td>
                                        <Badge>
                                            {/book/i.test(event.subject_type)
                                                ? "Libro"
                                                : /user/i.test(
                                                        event.subject_type,
                                                    )
                                                  ? "Cuenta"
                                                  : event.subject_type ||
                                                    "Sistema"}
                                            {event.subject_id
                                                ? ` #${event.subject_id}`
                                                : ""}
                                        </Badge>
                                    </td>
                                    <td>
                                        <time dateTime={event.created_at}>
                                            {dateLabel(event.created_at)}
                                        </time>
                                        <small className="audit-id">
                                            {new Date(
                                                event.created_at,
                                            ).toLocaleTimeString("es-MX", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </small>
                                    </td>
                                    <td>
                                        {event.metadata &&
                                        Object.keys(event.metadata).length ? (
                                            <details className="audit-details">
                                                <summary>Ver detalle</summary>
                                                <dl>
                                                    {Object.entries(
                                                        event.metadata,
                                                    )
                                                        .filter(
                                                            ([key]) =>
                                                                !/password|token|secret/i.test(
                                                                    key,
                                                                ),
                                                        )
                                                        .map(([key, value]) => (
                                                            <div key={key}>
                                                                <dt>
                                                                    {metadataLabel(
                                                                        key,
                                                                    )}
                                                                </dt>
                                                                <dd>
                                                                    {metadataValue(
                                                                        value,
                                                                    )}
                                                                </dd>
                                                            </div>
                                                        ))}
                                                </dl>
                                            </details>
                                        ) : (
                                            <span className="muted">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState title="El historial está en calma.">
                    {filters.q
                        ? "No hay acciones que coincidan con tu búsqueda. Prueba con otros términos."
                        : "Los próximos cambios aparecerán aquí con su fecha y responsable."}
                </EmptyState>
            )}
            <PaginationLinks pagination={events} />
        </AppShell>
    );
}
function metadataLabel(key: string) {
    const labels: Record<string, string> = {
        title: "Título",
        name: "Nombre",
        count: "Cantidad",
        role: "Rol",
        old_role: "Rol anterior",
        new_role: "Nuevo rol",
        fields: "Campos",
        changes: "Cambios",
        source: "Origen",
        archived: "Archivados",
        before: "Antes",
        after: "Después",
    };
    return labels[key] ?? key.replaceAll("_", " ");
}
function metadataValue(value: unknown): string {
    if (value === null) return "Sin valor";
    if (typeof value === "boolean") return value ? "Sí" : "No";
    if (Array.isArray(value)) return value.map(metadataValue).join(", ");
    if (typeof value === "object")
        return Object.entries(value as Record<string, unknown>)
            .filter(([key]) => !/password|token|secret/i.test(key))
            .map(
                ([key, item]) =>
                    `${metadataLabel(key)}: ${metadataValue(item)}`,
            )
            .join(" · ");
    return String(value);
}
