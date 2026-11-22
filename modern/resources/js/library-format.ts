export function libraryDate(value: string | null, timezone = "UTC") {
    if (!value) return "Sin fecha";
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    return new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeZone: dateOnly ? "UTC" : timezone,
    }).format(new Date(dateOnly ? `${value}T12:00:00Z` : value));
}
