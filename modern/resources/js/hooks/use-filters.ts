import { router } from "@inertiajs/react";
import { useEffect, useRef, useState } from "react";
export function useFilters<T extends Record<string, string>>(
    path: string,
    initial: T,
) {
    const initialJSON = JSON.stringify(initial);
    const [filters, setFilters] = useState<T>(initial);
    const first = useRef(true);
    const previous = useRef(JSON.stringify(initial));
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        const serialized = JSON.stringify(filters);
        if (serialized === previous.current) return;
        const timer = window.setTimeout(() => {
            previous.current = serialized;
            router.get(path, filters, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 300);
        return () => window.clearTimeout(timer);
    }, [filters, path]);
    useEffect(() => {
        const serialized = JSON.stringify(initial);
        if (serialized !== previous.current) {
            previous.current = serialized;
            setFilters(initial);
        }
    }, [initialJSON]);
    function change<K extends keyof T>(key: K, value: T[K]) {
        setFilters((current) => ({ ...current, [key]: value }));
    }
    return { filters, change, setFilters };
}
