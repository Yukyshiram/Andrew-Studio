import { AppShell } from "../components/layout";
import HomeContent from "../components/home-content";
import { BookCard } from "../components/books";
import { PresentationNavigation } from "../components/presentation-navigation";
import { Link } from "@inertiajs/react";
import type { Book, Stats } from "../types";
export default function Welcome(props: {
    stats: Stats;
    featured: Book[];
    categories: { name: string; count: number }[];
}) {
    return (
        <AppShell title="Una biblioteca de ideas">
            <PresentationNavigation value={Link}>
                <HomeContent {...props} BookCard={BookCard} />
            </PresentationNavigation>
        </AppShell>
    );
}
