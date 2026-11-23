import { Link, useForm, usePage } from "@inertiajs/react";
import { AppShell } from "../../components/layout";
import { PaginationLinks } from "../../components/books";
import { NewsCard, acquisitionStatuses } from "../../components/news-ui";
import { PresentationNavigation } from "../../components/presentation-navigation";
import { LibraryErrors } from "../../components/library-ui";
import {
    Button,
    EmptyState,
    Field,
    Input,
    Select,
    fieldA11y,
} from "../../components/ui";
import type { Acquisition } from "../../library-types";
import type { Pagination, SharedProps } from "../../types";

type Filters = {
    q: string;
    category: string;
    status: string;
    date_field: string;
    from: string;
    to: string;
};
export default function News({
    acquisitions,
    filters,
    categories,
    today,
}: {
    acquisitions: Pagination<Acquisition>;
    filters: Filters;
    categories: string[];
    today: string;
}) {
    const { can } = usePage<SharedProps>().props;
    const search = useForm(filters);
    return (
        <AppShell
            title="Novedades de la biblioteca"
            eyebrow="EL PRÓXIMO CAPÍTULO"
            actions={
                can.manageBooks ? (
                    <Button asChild variant="secondary">
                        <Link href="/manage/acquisitions">
                            Gestionar incorporaciones
                        </Link>
                    </Button>
                ) : undefined
            }
        >
            <p className="page-description">
                Publicaciones anunciadas, títulos en camino e incorporaciones
                confirmadas. Las fechas previstas pueden cambiar y no equivalen
                a disponibilidad para préstamo.
            </p>
            <form
                className="panel news-filters"
                onSubmit={(event) => {
                    event.preventDefault();
                    search.get("/news", {
                        preserveState: true,
                        preserveScroll: true,
                        replace: true,
                    });
                }}
            >
                <div className="news-filter-grid">
                    <Field id="news-q" label="Buscar título o autor">
                        <Input
                            id="news-q"
                            type="search"
                            value={search.data.q}
                            maxLength={80}
                            onChange={(e) =>
                                search.setData("q", e.target.value)
                            }
                        />
                    </Field>
                    <Field id="news-category" label="Categoría">
                        <Select
                            id="news-category"
                            value={search.data.category}
                            onChange={(e) =>
                                search.setData("category", e.target.value)
                            }
                        >
                            <option value="">Todas</option>
                            {categories.map((category) => (
                                <option key={category}>{category}</option>
                            ))}
                        </Select>
                    </Field>
                    <Field id="news-status" label="Estado">
                        <Select
                            id="news-status"
                            value={search.data.status}
                            onChange={(e) =>
                                search.setData("status", e.target.value)
                            }
                        >
                            <option value="all">Todos</option>
                            {Object.entries(acquisitionStatuses)
                                .filter(([value]) => value !== "cancelled")
                                .map(([value, label]) => (
                                    <option value={value} key={value}>
                                        {label}
                                    </option>
                                ))}
                        </Select>
                    </Field>
                </div>
                <details
                    className="news-date-filters"
                    open={Boolean(
                        filters.from ||
                        filters.to ||
                        search.errors.from ||
                        search.errors.to,
                    )}
                >
                    <summary>Filtrar por fechas</summary>
                    <div className="news-filter-grid">
                        <Field id="news-date" label="Filtrar fechas de">
                            <Select
                                id="news-date"
                                value={search.data.date_field}
                                onChange={(e) =>
                                    search.setData("date_field", e.target.value)
                                }
                            >
                                <option value="expected_on">
                                    Llegada estimada
                                </option>
                                <option value="publication_on">
                                    Publicación editorial
                                </option>
                                <option value="incorporated_on">
                                    Incorporación real
                                </option>
                            </Select>
                        </Field>
                        <Field
                            id="news-from"
                            label="Desde"
                            error={search.errors.from}
                        >
                            <Input
                                id="news-from"
                                type="date"
                                value={search.data.from}
                                {...fieldA11y("news-from", search.errors.from)}
                                onChange={(e) =>
                                    search.setData("from", e.target.value)
                                }
                            />
                        </Field>
                        <Field
                            id="news-to"
                            label="Hasta"
                            error={search.errors.to}
                        >
                            <Input
                                id="news-to"
                                type="date"
                                value={search.data.to}
                                {...fieldA11y("news-to", search.errors.to)}
                                onChange={(e) =>
                                    search.setData("to", e.target.value)
                                }
                            />
                        </Field>
                    </div>
                </details>
                <LibraryErrors errors={search.errors} />
                <div className="library-actions">
                    <Button type="submit" disabled={search.processing}>
                        {search.processing ? "Buscando…" : "Aplicar filtros"}
                    </Button>
                    <Button asChild variant="ghost">
                        <Link href="/news">Limpiar filtros</Link>
                    </Button>
                </div>
            </form>
            <p className="library-context" role="status">
                {acquisitions.total}{" "}
                {acquisitions.total === 1 ? "incorporación" : "incorporaciones"}{" "}
                con estos filtros
            </p>
            <PresentationNavigation value={Link}>
                <section
                    className="news-grid"
                    aria-label="Novedades y próximas incorporaciones"
                >
                    {acquisitions.data.map((acquisition) => (
                        <NewsCard
                            key={acquisition.id}
                            acquisition={acquisition}
                            today={today}
                        />
                    ))}
                </section>
            </PresentationNavigation>
            {!acquisitions.data.length && (
                <EmptyState title="Las próximas historias llegarán aquí">
                    Todavía no hay incorporaciones con estos filtros. Puedes
                    explorar el catálogo mientras se confirman nuevas fechas.
                </EmptyState>
            )}
            <PaginationLinks pagination={acquisitions} />
        </AppShell>
    );
}
