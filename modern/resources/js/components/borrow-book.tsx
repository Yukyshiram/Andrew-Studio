import { Link, useForm, usePage } from "@inertiajs/react";
import { useState } from "react";
import { Button, Dialog, Notice, SubmitButton } from "./ui";
import { LibraryErrors } from "./library-ui";
import type { Book, SharedProps } from "../types";

export function BorrowBook({
    book,
    hasMembership,
}: {
    book: Book;
    hasMembership: boolean;
}) {
    const { auth, can } = usePage<SharedProps>().props;
    const [open, setOpen] = useState(false);
    const form = useForm({ book_id: book.id });
    const available = (book.available_copies ?? 0) > 0;
    return (
        <section
            className="library-borrow"
            aria-label="Disponibilidad y solicitud"
        >
            <p>
                <strong>
                    {book.total_copies
                        ? `${book.available_copies ?? 0} de ${book.total_copies} ejemplares disponibles`
                        : "Sin ejemplares incorporados"}
                </strong>
            </p>
            {can.manageBooks && (
                <Button asChild variant="secondary">
                    <Link
                        href={`/manage/inventory?q=${encodeURIComponent(book.title)}`}
                    >
                        Gestionar ejemplares
                    </Link>
                </Button>
            )}
            {!auth.user ? (
                <Button asChild>
                    <Link href="/login">Inicia sesión para solicitar</Link>
                </Button>
            ) : !hasMembership ? (
                can.manageBooks ? (
                    <p className="library-context">
                        Atiende las solicitudes desde Circulación. Si también
                        deseas tomar préstamos, registra tu cuenta como socio.
                    </p>
                ) : (
                    <Notice kind="info">
                        Tu cuenta requiere alta de socio. Solicítala al personal
                        para poder reservar o tomar libros en préstamo.
                    </Notice>
                )
            ) : (
                <>
                    <Button onClick={() => setOpen(true)}>
                        {available ? "Solicitar préstamo" : "Reservar título"}
                    </Button>
                    <p>
                        El personal valida la solicitud y confirma después la
                        entrega.{" "}
                        {available
                            ? "La disponibilidad puede cambiar mientras se atiende."
                            : "La reserva quedará en espera hasta que haya un ejemplar disponible."}
                    </p>
                    <LibraryErrors errors={form.errors} />
                    <Dialog
                        open={open}
                        onOpenChange={setOpen}
                        title={
                            available ? "Solicitar préstamo" : "Reservar título"
                        }
                        description={`Solicitar ${book.title} no equivale a una entrega física. Se revisarán tu membresía, cupo y restricciones antes de preparar un ejemplar.`}
                    >
                        <div className="dialog-actions">
                            <Button
                                variant="ghost"
                                onClick={() => setOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <SubmitButton
                                processing={form.processing}
                                onClick={() =>
                                    form.post("/my-library/requests", {
                                        onSuccess: () => setOpen(false),
                                        onError: () => setOpen(false),
                                    })
                                }
                            >
                                Enviar solicitud
                            </SubmitButton>
                        </div>
                    </Dialog>
                </>
            )}
        </section>
    );
}
