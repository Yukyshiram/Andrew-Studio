import { BookCover } from "./book-cover";
import type { Book } from "../types";

/** La cubierta es decorativa; la ficha accesible permanece siempre visible. */
export function InteractiveBook({
    book,
    transitionName,
}: {
    book: Book;
    transitionName?: string;
}) {
    return (
        <div className="interactive-book-stage">
            <div
                className="physical-book"
                style={{ viewTransitionName: transitionName }}
                aria-hidden="true"
            >
                <div className="physical-pages">
                    <span>
                        UNA BIBLIOTECA
                        <br />
                        DE IDEAS
                    </span>
                    <strong>{book.category}</strong>
                    <small>{book.publication_year}</small>
                </div>
                <div className="physical-cover">
                    <BookCover book={book} />
                </div>
                <div className="physical-spine" />
            </div>
        </div>
    );
}
