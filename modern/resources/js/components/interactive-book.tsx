import { useState } from "react";
import { RotateCcw, BookOpen } from "lucide-react";
import { BookCover } from "./book-cover";
import { Button } from "./ui";
import type { Book } from "../types";

/** La cubierta es decorativa; la ficha accesible permanece siempre visible. */
export function InteractiveBook({
    book,
    transitionName,
}: {
    book: Book;
    transitionName?: string;
}) {
    const [open, setOpen] = useState(false);
    return (
        <div className="interactive-book-stage">
            <div
                className={`physical-book ${open ? "is-open" : ""}`}
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
            <Button
                variant="ghost"
                className="book-open-control"
                onClick={() => setOpen(!open)}
                aria-pressed={open}
            >
                {open ? <RotateCcw size={16} /> : <BookOpen size={16} />}
                {open ? "Cerrar portada" : "Abrir portada"}
            </Button>
        </div>
    );
}
