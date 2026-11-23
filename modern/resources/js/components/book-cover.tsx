import type { CSSProperties } from "react";
import type { Book } from "../types";
import { cn } from "./ui";
export function coverColor(value: string) {
    const colors: Record<string, string> = {
        olive: "#52614c",
        amber: "#80653e",
        blue: "#395c6a",
        rose: "#89545d",
        terracotta: "#9b563f",
        purple: "#67516e",
    };
    return colors[value] ?? (/^#[0-9a-f]{6}$/i.test(value) ? value : "#52614c");
}
export function BookCover({
    book,
    className,
}: {
    book: Pick<Book, "title" | "author" | "cover_color">;
    className?: string;
}) {
    return (
        <div
            aria-hidden="true"
            className={cn("book-cover", className)}
            style={{ "--cover": coverColor(book.cover_color) } as CSSProperties}
        >
            <span className="cover-publisher">ANDREW'S · BIBLIOTECARY</span>
            <span className="cover-symbol">
                a<span>◦</span>
            </span>
            <span className="cover-title">{book.title}</span>
            <span className="cover-author">{book.author}</span>
            <span className="cover-rule" />
        </div>
    );
}
