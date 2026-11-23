import { useSearchParams } from "react-router-dom";
import {
  Field,
  Input,
  Select,
  EmptyState,
} from "../../modern/resources/js/components/ui";
import {
  NewsCard,
  acquisitionStatuses,
} from "../../modern/resources/js/components/news-ui";
import { useCollection } from "./collection";
import { useDemoLibrary } from "./library-context";
import { Heading } from "./heading";
import "./library.css";

export default function News() {
  const { state } = useDemoLibrary();
  const { books } = useCollection();
  const [params, setParams] = useSearchParams();
  const category = params.get("category") ?? "",
    status = params.get("status") ?? "",
    from = params.get("from") ?? "",
    to = params.get("to") ?? "",
    q = params.get("q") ?? "";
  const dateField =
    params.get("date") === "publication"
      ? "publicationOn"
      : params.get("date") === "incorporated"
        ? "incorporatedOn"
        : "expectedOn";
  const rows = state.news
    .map((row) => ({
      ...row,
      book: books.find((book) => book.id === row.bookId)!,
    }))
    .filter((row) => !row.book.deleted_at);
  const visible = rows.filter(
    (row) =>
      (!category || row.book.category === category) &&
      (!status || row.status === status) &&
      `${row.book.title} ${row.book.author}`
        .toLocaleLowerCase("es")
        .includes(q.toLocaleLowerCase("es")) &&
      ((!from && !to) ||
        (row[dateField] &&
          (!from || row[dateField]! >= from) &&
          (!to || row[dateField]! <= to))),
  );
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true, preventScrollReset: true });
  }
  return (
    <>
      <Heading eyebrow="EN EL HORIZONTE · DEMOSTRACIÓN" title="Novedades">
        Incorporaciones y próximas llegadas. Todas las fechas, títulos y
        anuncios de esta muestra son ficticios.
      </Heading>
      <div className="demo-library-filters">
        <Field label="Buscar novedades" id="news-search">
          <Input
            id="news-search"
            type="search"
            value={q}
            onChange={(event) => filter("q", event.target.value)}
            maxLength={200}
          />
        </Field>
        <Field label="Categoría" id="news-category">
          <Select
            id="news-category"
            value={category}
            onChange={(event) => filter("category", event.target.value)}
          >
            <option value="">Todos los temas</option>
            {[...new Set(rows.map((row) => row.book.category))].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </Select>
        </Field>
        <Field label="Estado de incorporación" id="news-status">
          <Select
            id="news-status"
            value={status}
            onChange={(event) => filter("status", event.target.value)}
          >
            <option value="">Todos los estados</option>
            {["announced", "ordered", "in_transit", "incorporated"].map(
              (value) => (
                <option key={value} value={value}>
                  {
                    acquisitionStatuses[
                      value as keyof typeof acquisitionStatuses
                    ]
                  }
                </option>
              ),
            )}
          </Select>
        </Field>
      </div>
      <details className="demo-news-dates">
        <summary>Filtrar por fechas</summary>
        <div className="demo-library-filters">
          <Field label="Tipo de fecha" id="news-date">
            <Select
              id="news-date"
              value={params.get("date") ?? "expected"}
              onChange={(event) => filter("date", event.target.value)}
            >
              <option value="expected">Llegada estimada</option>
              <option value="publication">Publicación editorial</option>
              <option value="incorporated">Incorporación</option>
            </Select>
          </Field>
          <Field label="Desde" id="news-from">
            <Input
              id="news-from"
              type="date"
              value={from}
              onChange={(event) => filter("from", event.target.value)}
            />
          </Field>
          <Field label="Hasta" id="news-to">
            <Input
              id="news-to"
              type="date"
              value={to}
              onChange={(event) => filter("to", event.target.value)}
            />
          </Field>
        </div>
        {from && to && from > to && (
          <p className="error" role="alert">
            La fecha final debe ser igual o posterior a la inicial.
          </p>
        )}
      </details>
      <p className="library-context" role="status">
        {visible.length} novedades ficticias. Una llegada estimada no añade
        ejemplares al inventario.
      </p>
      <div className="news-grid">
        {visible.map((row) => (
          <NewsCard
            key={row.id}
            today={state.today}
            acquisition={{
              id: row.id,
              book_id: row.bookId,
              book: row.book,
              status: row.status,
              publication_on: row.publicationOn,
              expected_on: row.expectedOn,
              incorporated_on: row.incorporatedOn,
              is_fictional: true,
              source_url: null,
              public_note: row.note,
            }}
          />
        ))}
      </div>
      {!visible.length && (
        <EmptyState title="Sin novedades con estos filtros">
          Prueba otro estado, tema o intervalo de fechas.
        </EmptyState>
      )}
    </>
  );
}
