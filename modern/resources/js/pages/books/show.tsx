import { Link, usePage } from "@inertiajs/react";
import { ArrowLeft, Pencil, BookOpen } from "lucide-react";
import { AppShell } from "../../components/layout";
import { BookCard, BookCover } from "../../components/books";
import { InteractiveBook } from "../../components/interactive-book";
import { Badge, Button, Notice } from "../../components/ui";
import type { Book, SharedProps } from "../../types";
export default function BookShow({
    book,
    related,
}: {
    book: Book;
    related: Book[];
}) {
    const { can } = usePage<SharedProps>().props;
    return (
        <AppShell
            title={book.title}
            eyebrow="UNA NUEVA PERSPECTIVA"
            actions={
                can.manageBooks && !book.deleted_at ? (
                    <Button asChild variant="secondary">
                        <Link href={`/manage/books/${book.id}/edit`}>
                            <Pencil size={16} />
                            Editar ficha
                        </Link>
                    </Button>
                ) : undefined
            }
        >
            <Link className="text-link back-link" href="/catalog">
                <ArrowLeft size={16} />
                Volver a la colección
            </Link>
            {book.deleted_at && (
                <Notice kind="info">
                    Este libro está archivado y no forma parte del catálogo
                    activo.
                </Notice>
            )}
            <article className="book-detail">
                <div className="detail-cover-stage">
                    <InteractiveBook book={book} />
                    <span className="detail-cover-note">
                        UNA BIBLIOTECA DE IDEAS / #
                        {String(book.id).padStart(4, "0")}
                    </span>
                </div>
                <div className="detail-content">
                    <Badge>{book.category || "General"}</Badge>
                    <p className="detail-author">
                        Una obra de <strong>{book.author}</strong>
                    </p>
                    <div className="detail-divider" />
                    <h2>Entre sus páginas.</h2>
                    <p className="book-description">
                        {book.description ||
                            "Esta ficha aún no tiene una descripción. Su título es una invitación a descubrirla."}
                    </p>
                    <dl className="book-facts">
                        <div>
                            <dt>Autor</dt>
                            <dd>{book.author}</dd>
                        </div>
                        <div>
                            <dt>Casa editorial</dt>
                            <dd>
                                {book.publisher || "Sin editorial registrada"}
                            </dd>
                        </div>
                        <div>
                            <dt>Año de publicación</dt>
                            <dd>
                                {book.publication_year ||
                                    "Sin fecha registrada"}
                            </dd>
                        </div>
                        <div>
                            <dt>Categoría</dt>
                            <dd>{book.category || "General"}</dd>
                        </div>
                    </dl>
                    <div className="detail-footnote">
                        <BookOpen size={18} />
                        <p>
                            La ficha es una invitación a conocer la obra.
                            <br />
                            La biblioteca reúne información de su colección.
                        </p>
                    </div>
                </div>
            </article>
            {related.length > 0 && (
                <section className="section-block">
                    <div className="section-heading">
                        <div>
                            <p className="eyebrow">LA CURIOSIDAD CONTINÚA</p>
                            <h2>Otras páginas que explorar.</h2>
                        </div>
                        <Link
                            className="text-link"
                            href={`/catalog?category=${encodeURIComponent(book.category)}`}
                        >
                            Seguir el hilo
                        </Link>
                    </div>
                    <div className="book-grid">
                        {related.slice(0, 4).map((relatedBook, index) => (
                            <BookCard
                                key={relatedBook.id}
                                book={relatedBook}
                                index={index}
                            />
                        ))}
                    </div>
                </section>
            )}
        </AppShell>
    );
}
