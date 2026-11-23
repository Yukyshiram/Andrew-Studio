import { m as motion, AnimatePresence, useReducedMotion } from "motion/react";
import { DemoLink } from "./navigation";
import { BookCover } from "../../modern/resources/js/components/book-cover";
import { Badge } from "../../modern/resources/js/components/ui";
import type { Book } from "../../modern/resources/js/types";
import type { Ref } from "react";
import { AvailabilityLabel } from "./library-ui";

export function DemoBookCard({
  book,
  index = 0,
  ref,
}: {
  book: Book;
  index?: number;
  ref?: Ref<HTMLElement>;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.article
      ref={ref}
      layout={reduced ? false : "position"}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.24, delay: Math.min(index, 4) * 0.025 }}
      className="book-card"
    >
      <DemoLink
        href={`/catalog/${book.id}`}
        className="book-card-cover"
        aria-label={`Ver ${book.title}`}
        data-book-id={book.id}
      >
        <div
          className="cover-transition"
          style={{ viewTransitionName: `cover-${book.id}` }}
        >
          <BookCover book={book} />
        </div>
        <span className="cover-invitation" aria-hidden="true">
          Descubrir la ficha <span>↗</span>
        </span>
      </DemoLink>
      <div className="book-card-info">
        <Badge>{book.category}</Badge>
        <h3>
          <DemoLink href={`/catalog/${book.id}`}>{book.title}</DemoLink>
        </h3>
        <p>{book.author}</p>
        <AvailabilityLabel bookId={book.id} />
        <span className="book-meta">
          {book.publication_year} / {book.publisher}
        </span>
      </div>
    </motion.article>
  );
}
export function BookGrid({ books }: { books: Book[] }) {
  const reduced = useReducedMotion();
  return (
    <motion.div layout={!reduced} className="book-grid">
      <AnimatePresence initial={false} mode="popLayout">
        {books.map((book, index) => (
          <DemoBookCard key={book.id} book={book} index={index} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
