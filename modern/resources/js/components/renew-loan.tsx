import { useForm } from "@inertiajs/react";
import { useRef, useState } from "react";
import type { Loan } from "../library-types";
import { LibraryErrors, libraryDate } from "./library-ui";
import { Button, Dialog, SubmitButton } from "./ui";

export function RenewLoanButton({
    loan,
    staff = false,
}: {
    loan: Loan;
    staff?: boolean;
}) {
    const [open, setOpen] = useState(false);
    const token = useRef("");
    const fallback = useRef<HTMLSpanElement>(null);
    const form = useForm({ operation_key: "" });
    const exhausted = loan.renewal_count >= loan.terms.max_renewals;

    return (
        <span className="library-renewal" ref={fallback} tabIndex={-1}>
            <Button
                variant="ghost"
                disabled={exhausted}
                onClick={() => {
                    token.current = crypto.randomUUID();
                    form.clearErrors();
                    setOpen(true);
                }}
                aria-label={`Renovar préstamo de ${loan.copy.barcode}`}
            >
                {exhausted
                    ? "Límite de renovaciones alcanzado"
                    : "Renovar préstamo"}
            </Button>
            <Dialog
                open={open}
                onOpenChange={setOpen}
                fallbackFocusRef={fallback}
                title="Renovar préstamo"
                description={`Vencimiento actual: ${libraryDate(loan.due_on)}. Se comprobarán la membresía, los límites, los vencimientos y las solicitudes de otras personas. La biblioteca calculará la nueva fecha.`}
            >
                <form
                    className="library-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        form.transform(() => ({
                            operation_key: token.current,
                        }));
                        form.post(
                            `${staff ? "/manage/circulation" : "/my-library"}/loans/${loan.id}/renew`,
                            {
                                preserveScroll: true,
                                onSuccess: () => setOpen(false),
                            },
                        );
                    }}
                >
                    <LibraryErrors errors={form.errors} />
                    <p>
                        La nueva fecha se mostrará en tus préstamos al
                        confirmar.
                    </p>
                    <div className="dialog-actions">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setOpen(false)}
                        >
                            Conservar fecha
                        </Button>
                        <SubmitButton processing={form.processing}>
                            Confirmar renovación
                        </SubmitButton>
                    </div>
                </form>
            </Dialog>
        </span>
    );
}
