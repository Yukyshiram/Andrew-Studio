import { Link } from "@inertiajs/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Book, Pagination } from "../types";
import { Badge, cn } from "./ui";
export { BookCover, coverColor } from "./book-cover";
import { BookCover } from "./book-cover";
export function BookCard({ book }: { book: Book; index?: number }) {
    return (
        <article className="book-card">
            <Link
                href={`/catalog/${book.id}`}
                className="book-card-cover"
                aria-label={`Ver ${book.title}`}
            >
                <BookCover book={book} />
            </Link>
            <div className="book-card-info">
                <Badge>{book.category || "General"}</Badge>
                <h3>
                    <Link href={`/catalog/${book.id}`}>{book.title}</Link>
                </h3>
                <p>{book.author}</p>
                <span className="book-meta">
                    {book.publication_year || "Sin fecha"}
                    <span> / </span>
                    {book.publisher || "Sin editorial"}
                </span>
            </div>
        </article>
    );
}
function pageLabel(label: string) {
    const clean = label
        .replace(/<[^>]*>/g, "")
        .replaceAll("&laquo;", "")
        .replaceAll("&raquo;", "")
        .replaceAll("&hellip;", "…")
        .trim();
    return /previous/i.test(clean)
        ? "Anterior"
        : /next/i.test(clean)
          ? "Siguiente"
          : clean;
}
export function PaginationLinks<T>({
    pagination,
}: {
    pagination: Pagination<T>;
}) {
    return (
        <div className="pagination">
            <p>
                {pagination.total
                    ? `${pagination.from ?? 0}–${pagination.to ?? 0} de ${pagination.total}`
                    : "0 registros"}
            </p>
            {pagination.last_page > 1 && (
                <nav aria-label="Paginación">
                    <ul>
                        {pagination.links.map((link, i) => {
                            const label = pageLabel(link.label);
                            return (
                                <li key={`${label}-${i}`}>
                                    {link.url ? (
                                        <Link
                                            href={link.url}
                                            preserveScroll
                                            preserveState
                                            className={cn(
                                                "page-link",
                                                link.active && "active",
                                            )}
                                            aria-current={
                                                link.active ? "page" : undefined
                                            }
                                            aria-label={
                                                /^\d+$/.test(label)
                                                    ? `Página ${label}`
                                                    : label
                                            }
                                        >
                                            {label === "Anterior" ? (
                                                <ArrowLeft size={17} />
                                            ) : label === "Siguiente" ? (
                                                <ArrowRight size={17} />
                                            ) : (
                                                label
                                            )}
                                        </Link>
                                    ) : (
                                        <span
                                            className="page-link disabled"
                                            aria-disabled="true"
                                        >
                                            {label === "Anterior" ? (
                                                <ArrowLeft
                                                    size={17}
                                                    aria-label="Anterior"
                                                />
                                            ) : label === "Siguiente" ? (
                                                <ArrowRight
                                                    size={17}
                                                    aria-label="Siguiente"
                                                />
                                            ) : (
                                                label
                                            )}
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </nav>
            )}
        </div>
    );
}
