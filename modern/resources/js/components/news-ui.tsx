import "../../css/news.css";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import type { Acquisition, AcquisitionStatus } from "../library-types";
import { libraryDate } from "../library-format";
import { Badge } from "./ui";
import { BookCover } from "./book-cover";
import { usePresentationLink } from "./presentation-navigation";

export const acquisitionStatuses: Record<AcquisitionStatus, string> = {
    announced: "Anunciado",
    ordered: "Pedido",
    in_transit: "En camino",
    incorporated: "Incorporado",
    cancelled: "Cancelado",
};
export function AcquisitionStatusBadge({
    status,
}: {
    status: AcquisitionStatus;
}) {
    return (
        <Badge
            className={`library-status library-status-${status === "incorporated" ? "available" : status}`}
        >
            {acquisitionStatuses[status]}
        </Badge>
    );
}
export function AcquisitionDates({
    acquisition,
}: {
    acquisition: Acquisition;
}) {
    return (
        <dl className="acquisition-dates">
            {(
                [
                    ["Publicación editorial", acquisition.publication_on],
                    ["Llegada estimada", acquisition.expected_on],
                    ["Incorporación real", acquisition.incorporated_on],
                ] as const
            ).map(([label, date]) => (
                <div key={label}>
                    <dt>{label}</dt>
                    <dd>
                        {date ? (
                            <time dateTime={date}>{libraryDate(date)}</time>
                        ) : (
                            "Sin confirmar"
                        )}
                    </dd>
                </div>
            ))}
        </dl>
    );
}
export function NewsCard({
    acquisition,
    today,
}: {
    acquisition: Acquisition;
    today: string;
}) {
    const Link = usePresentationLink();
    const book = acquisition.book;
    const overdueEstimate =
        acquisition.status !== "incorporated" &&
        acquisition.expected_on &&
        acquisition.expected_on < today;
    return (
        <article className="news-card panel">
            <Link
                href={`/catalog/${book.id}`}
                className="news-cover"
                aria-label={`Ver ficha de ${book.title}`}
            >
                <BookCover
                    book={{
                        title: book.title,
                        author: book.author ?? "",
                        cover_color: book.cover_color ?? "olive",
                    }}
                />
            </Link>
            <div className="news-card-content">
                <div className="news-card-badges">
                    <AcquisitionStatusBadge status={acquisition.status} />
                    {acquisition.is_fictional && <Badge>Datos ficticios</Badge>}
                </div>
                <p className="eyebrow">{book.category}</p>
                <h2>
                    <Link href={`/catalog/${book.id}`}>{book.title}</Link>
                </h2>
                <p className="muted">{book.author}</p>
                <AcquisitionDates acquisition={acquisition} />
                {overdueEstimate && (
                    <p className="news-estimate-note">
                        <CalendarDays size={15} aria-hidden="true" /> Estimación
                        pendiente de actualizar; llegada sin confirmar.
                    </p>
                )}
                {acquisition.public_note && (
                    <p className="news-public-note">
                        {acquisition.public_note}
                    </p>
                )}
                <div className="library-actions">
                    <Link href={`/catalog/${book.id}`} className="text-link">
                        Consultar disponibilidad{" "}
                        <ArrowUpRight size={15} aria-hidden="true" />
                    </Link>
                    {acquisition.source_url && (
                        <a
                            href={acquisition.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-link"
                        >
                            Fuente{" "}
                            <span className="sr-only">
                                de {book.title} (abre otra pestaña)
                            </span>
                        </a>
                    )}
                </div>
            </div>
        </article>
    );
}
