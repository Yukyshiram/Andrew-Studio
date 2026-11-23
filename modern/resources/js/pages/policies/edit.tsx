import { useForm } from "@inertiajs/react";
import { useState } from "react";
import { AppShell } from "../../components/layout";
import {
    Button,
    Card,
    Dialog,
    Field,
    Input,
    Notice,
    SubmitButton,
    Textarea,
    fieldA11y,
} from "../../components/ui";
import type { LibraryTerms } from "../../library-types";

const numericFields = [
    ["max_loans", "Préstamos simultáneos", 1, 100],
    ["loan_days", "Duración del préstamo (días naturales)", 1, 365],
    ["max_renewals", "Renovaciones permitidas", 0, 20],
    ["pickup_days", "Plazo de recogida (días naturales)", 1, 30],
    ["grace_days", "Gracia antes de multa (días abiertos)", 0, 30],
    ["daily_fine_cents", "Multa por día abierto (centavos)", 0, 100000],
    ["lost_charge_cents", "Cargo por pérdida (centavos)", 0, 100000000],
    ["damage_charge_cents", "Cargo por daño (centavos)", 0, 100000000],
    ["block_balance_cents", "Saldo máximo permitido (centavos)", 0, 100000000],
] as const;
const weekdays = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
];
export default function Policy({ policy }: { policy: LibraryTerms }) {
    const form = useForm(policy);
    const [confirm, setConfirm] = useState(false);
    const [dates, setDates] = useState(policy.closure_dates.join("\n"));
    return (
        <AppShell title="Políticas bibliotecarias" eyebrow="ADMINISTRACIÓN">
            <Notice>
                Los importes se expresan en centavos: 100 = una unidad
                monetaria. No hay cobros en línea. Las tarifas iniciales son
                cero; configura únicamente las aprobadas por tu biblioteca. Un
                saldo máximo de 0 desactiva el bloqueo por deuda; con otro valor
                se bloquea al superarlo, incluyendo cargos calculados pendientes
                de registrar.
            </Notice>
            <form
                className="library-form"
                onSubmit={(event) => {
                    event.preventDefault();
                    setConfirm(true);
                }}
            >
                <Card>
                    <h2>Préstamos y cargos</h2>
                    <p>
                        Versión {policy.version}. Los préstamos existentes
                        conservan su calendario y condiciones.
                    </p>
                    <div className="form-grid">
                        {numericFields.map(([key, label, min, max]) => (
                            <Field
                                id={`policy-${key}`}
                                key={key}
                                label={label}
                                error={form.errors[key]}
                            >
                                <Input
                                    id={`policy-${key}`}
                                    type="number"
                                    min={min}
                                    max={max}
                                    required
                                    step={1}
                                    value={form.data[key]}
                                    onChange={(event) =>
                                        form.setData(
                                            key,
                                            Number(event.target.value),
                                        )
                                    }
                                    {...fieldA11y(
                                        `policy-${key}`,
                                        form.errors[key],
                                    )}
                                />
                            </Field>
                        ))}
                        {(
                            [
                                ["timezone", "Zona horaria IANA", 80],
                                [
                                    "currency",
                                    "Moneda (código de tres letras)",
                                    3,
                                ],
                            ] as const
                        ).map(([key, label, max]) => (
                            <Field
                                id={`policy-${key}`}
                                key={key}
                                label={label}
                                error={form.errors[key]}
                            >
                                <Input
                                    id={`policy-${key}`}
                                    maxLength={max}
                                    value={form.data[key]}
                                    required
                                    onChange={(event) =>
                                        form.setData(key, event.target.value)
                                    }
                                    {...fieldA11y(
                                        `policy-${key}`,
                                        form.errors[key],
                                    )}
                                />
                            </Field>
                        ))}
                    </div>
                    <label className="checkbox-row">
                        <input
                            type="checkbox"
                            checked={form.data.block_overdue}
                            onChange={(event) =>
                                form.setData(
                                    "block_overdue",
                                    event.target.checked,
                                )
                            }
                        />{" "}
                        Bloquear nuevas entregas y renovaciones cuando existan
                        préstamos vencidos
                    </label>
                </Card>
                <Card>
                    <h2>Calendario</h2>
                    <p>
                        El vencimiento se desplaza al siguiente día abierto.
                        Debe quedar al menos un día abierto por semana.
                    </p>
                    <fieldset className="library-weekdays">
                        <legend>Días de cierre semanal</legend>
                        {weekdays.map((label, day) => (
                            <label key={day} className="checkbox-row">
                                <input
                                    type="checkbox"
                                    checked={form.data.closed_weekdays.includes(
                                        day,
                                    )}
                                    onChange={(event) =>
                                        form.setData(
                                            "closed_weekdays",
                                            event.target.checked
                                                ? [
                                                      ...form.data
                                                          .closed_weekdays,
                                                      day,
                                                  ]
                                                : form.data.closed_weekdays.filter(
                                                      (value) => value !== day,
                                                  ),
                                        )
                                    }
                                />
                                {label}
                            </label>
                        ))}
                    </fieldset>
                    <Field
                        id="closure-dates"
                        label="Cierres extraordinarios"
                        hint="Una fecha AAAA-MM-DD por línea."
                        error={form.errors.closure_dates}
                    >
                        <Textarea
                            id="closure-dates"
                            value={dates}
                            onChange={(event) => {
                                setDates(event.target.value);
                                form.setData(
                                    "closure_dates",
                                    event.target.value
                                        .split(/\r?\n/)
                                        .map((value) => value.trim())
                                        .filter(Boolean),
                                );
                            }}
                            {...fieldA11y(
                                "closure-dates",
                                form.errors.closure_dates,
                            )}
                        />
                    </Field>
                    {Object.entries(form.errors)
                        .filter(
                            ([key]) =>
                                key.startsWith("closure_dates.") ||
                                key === "closed_weekdays",
                        )
                        .map(([key, error]) => (
                            <p role="alert" className="field-error" key={key}>
                                {error}
                            </p>
                        ))}
                </Card>
                <SubmitButton processing={form.processing}>
                    Revisar cambios
                </SubmitButton>
            </form>
            <Dialog
                open={confirm}
                onOpenChange={setConfirm}
                title="Actualizar la política"
                description="Las nuevas solicitudes y entregas usarán estos parámetros. El cambio quedará auditado; no modifica las condiciones de préstamos anteriores."
            >
                <div className="dialog-actions">
                    <Button variant="ghost" onClick={() => setConfirm(false)}>
                        Cancelar
                    </Button>
                    <SubmitButton
                        processing={form.processing}
                        onClick={() =>
                            form.put("/manage/policy", {
                                preserveScroll: true,
                                onSuccess: () => setConfirm(false),
                                onError: () => setConfirm(false),
                            })
                        }
                    >
                        Guardar política
                    </SubmitButton>
                </div>
            </Dialog>
        </AppShell>
    );
}
