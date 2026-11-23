import { usePresentationLink } from "./presentation-navigation";
import type { ComponentType } from "react";
import { Button, EmptyState } from "./ui";
import type { Book, Stats } from "../types";
export default function HomeContent({
    stats,
    featured,
    categories,
    BookCard,
}: {
    BookCard: ComponentType<{ book: Book; index?: number }>;
    stats: Stats;
    featured: Book[];
    categories: { name: string; count: number }[];
}) {
    const Link = usePresentationLink();
    return (
        <>
            <section className="welcome-hero">
                <div className="hero-copy">
                    <p className="eyebrow">PARA MENTES CURIOSAS</p>
                    <h2>
                        Hay un mundo
                        <br />
                        en cada <em>página.</em>
                    </h2>
                    <p className="hero-description">
                        Explora el catálogo, encuentra libros por tema y
                        consulta sus fichas bibliográficas.
                    </p>
                    <div className="hero-actions">
                        <Button asChild>
                            <Link href="/catalog">Explorar catálogo</Link>
                        </Button>
                        <a href="#seleccion" className="text-link">
                            Ver libros destacados
                        </a>
                    </div>
                </div>
                <div className="hero-art">
                    <div className="editorial-books" aria-hidden="true">
                        <div className="editorial-book book-olive">
                            <span>
                                EL ARTE
                                <br />
                                DE MIRAR
                            </span>
                            <em>con otros ojos.</em>
                            <small>PERSPECTIVAS</small>
                        </div>
                        <div className="editorial-book book-cream">
                            <small>UNA BIBLIOTECA DE IDEAS</small>
                            <span>
                                Siempre
                                <br />
                                <em>hay algo</em>
                                <br />
                                por descubrir.
                            </span>
                            <b>a◦</b>
                        </div>
                        <div className="editorial-book book-rust">
                            <small>EXPLORAR · IMAGINAR</small>
                            <span>
                                MÁS
                                <br />
                                ALLÁ
                            </span>
                            <em>de lo conocido.</em>
                        </div>
                    </div>
                </div>
            </section>
            <div className="collection-overview" aria-label="La colección">
                <span>
                    <strong>{stats.books}</strong> fichas
                </span>
                <span>
                    <strong>{stats.authors}</strong> autores
                </span>
                <span>
                    <strong>{stats.categories}</strong> categorías
                </span>
            </div>

            <section id="seleccion" className="section-block">
                <div className="section-heading">
                    <div>
                        <h2>Libros destacados</h2>
                    </div>
                    <Link href="/catalog" className="text-link">
                        Ver catálogo
                    </Link>
                </div>
                {featured.length ? (
                    <div className="book-grid featured-grid">
                        {featured.slice(0, 4).map((book, index) => (
                            <BookCard key={book.id} book={book} index={index} />
                        ))}
                    </div>
                ) : (
                    <EmptyState title="Las primeras páginas están por llegar">
                        La colección se está preparando. Vuelve pronto para
                        descubrir los primeros títulos.
                    </EmptyState>
                )}
            </section>
            <section className="category-section">
                <div>
                    <h2>Explorar por tema</h2>
                    <p>Elige una categoría para filtrar el catálogo.</p>
                </div>
                <div className="category-list">
                    {categories.length ? (
                        categories.map((category) => (
                            <Link
                                key={category.name}
                                href={`/catalog?category=${encodeURIComponent(category.name)}`}
                            >
                                <span>{category.name}</span>
                                <small>
                                    {category.count}{" "}
                                    {category.count === 1 ? "libro" : "libros"}
                                </small>
                            </Link>
                        ))
                    ) : (
                        <Link href="/catalog">
                            <span>Explorar todas las ideas</span>
                        </Link>
                    )}
                </div>
            </section>
        </>
    );
}
