import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
    AlertCircle,
    CheckCircle2,
    LoaderCircle,
    X,
    BookOpen,
    Eye,
    EyeOff,
} from "lucide-react";
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
const buttonVariants = cva("button", {
    variants: {
        variant: {
            primary: "button-primary",
            secondary: "button-secondary",
            ghost: "button-ghost",
            destructive: "button-destructive",
        },
        size: { default: "", sm: "button-sm", icon: "button-icon" },
    },
    defaultVariants: { variant: "primary", size: "default" },
});
export function Button({
    asChild = false,
    className,
    variant,
    size,
    ...props
}: React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
    const Comp = asChild ? Slot : "button";
    return (
        <Comp
            className={cn(buttonVariants({ variant, size }), className)}
            {...props}
        />
    );
}
export function Input({
    className,
    ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input className={cn("input", className)} {...props} />;
}
export function PasswordInput(
    props: React.InputHTMLAttributes<HTMLInputElement>,
) {
    const [visible, setVisible] = React.useState(false);
    return (
        <div className="password-input">
            <Input {...props} type={visible ? "text" : "password"} />
            <button
                type="button"
                onClick={() => setVisible(!visible)}
                aria-label={
                    visible ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                aria-pressed={visible}
            >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    );
}
export function Textarea({
    className,
    ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    return <textarea className={cn("input textarea", className)} {...props} />;
}
export function Select({
    className,
    ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return <select className={cn("input select", className)} {...props} />;
}
export function Label({
    className,
    ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
    return <label className={cn("label", className)} {...props} />;
}
export function FieldError({
    id,
    children,
}: {
    id?: string;
    children?: React.ReactNode;
}) {
    return children ? (
        <p id={id} className="field-error" role="alert">
            <AlertCircle size={14} aria-hidden="true" />
            {children}
        </p>
    ) : null;
}
export function Field({
    label,
    id,
    error,
    hint,
    children,
    className,
}: {
    label: string;
    id: string;
    error?: string;
    hint?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn("field", className)}>
            <Label htmlFor={id}>{label}</Label>
            {children}
            {hint && (
                <p id={`${id}-hint`} className="field-hint">
                    {hint}
                </p>
            )}
            <FieldError id={`${id}-error`}>{error}</FieldError>
        </div>
    );
}
export function fieldA11y(id: string, error?: string, hint = false) {
    return {
        "aria-invalid": error ? (true as const) : undefined,
        "aria-describedby":
            [hint ? `${id}-hint` : "", error ? `${id}-error` : ""]
                .filter(Boolean)
                .join(" ") || undefined,
    };
}
export function Badge({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return <span className={cn("badge", className)}>{children}</span>;
}
export function Skeleton({ className }: { className?: string }) {
    return <div aria-hidden="true" className={cn("skeleton", className)} />;
}
export function Card({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return <div className={cn("panel", className)}>{children}</div>;
}
export function EmptyState({
    title,
    children,
    action,
}: {
    title: string;
    children: React.ReactNode;
    action?: React.ReactNode;
}) {
    return (
        <div className="empty-state">
            <span className="empty-icon">
                <BookOpen size={28} aria-hidden="true" />
            </span>
            <h2>{title}</h2>
            <p>{children}</p>
            {action}
        </div>
    );
}
export function Notice({
    children,
    kind = "success",
}: {
    children?: React.ReactNode;
    kind?: "success" | "error" | "info";
}) {
    return children ? (
        <div
            className={cn("notice", `notice-${kind}`)}
            role={kind === "error" ? "alert" : "status"}
        >
            {kind === "success" ? (
                <CheckCircle2 size={18} aria-hidden="true" />
            ) : (
                <AlertCircle size={18} aria-hidden="true" />
            )}
            <span>{children}</span>
        </div>
    ) : null;
}
export function SubmitButton({
    processing,
    children,
    ...props
}: React.ComponentProps<typeof Button> & { processing: boolean }) {
    return (
        <Button disabled={processing} {...props}>
            {processing && (
                <LoaderCircle className="spin" size={17} aria-hidden="true" />
            )}
            {processing ? "Guardando…" : children}
        </Button>
    );
}
export function Dialog({
    open,
    onOpenChange,
    title,
    description,
    children,
    fallbackFocusRef,
    returnFocusRef,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description: string;
    children: React.ReactNode;
    fallbackFocusRef?: React.RefObject<HTMLElement | null>;
    returnFocusRef?: React.RefObject<HTMLElement | null>;
}) {
    const restoreFocus = React.useRef<HTMLElement | null>(null);
    React.useLayoutEffect(() => {
        if (open && document.activeElement instanceof HTMLElement) {
            restoreFocus.current = document.activeElement;
        }
    }, [open]);
    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="dialog-overlay" />
                <DialogPrimitive.Content
                    className="dialog-content"
                    onCloseAutoFocus={(event) => {
                        const candidates = returnFocusRef
                            ? [
                                  returnFocusRef.current,
                                  fallbackFocusRef?.current,
                                  restoreFocus.current,
                              ]
                            : [restoreFocus.current, fallbackFocusRef?.current];
                        const target = candidates.find(
                            (element) =>
                                element?.isConnected &&
                                element !== document.body &&
                                element !== document.documentElement &&
                                !element.matches(
                                    ':disabled, [aria-disabled="true"]',
                                ),
                        );
                        if (target?.isConnected) {
                            event.preventDefault();
                            target.focus({ preventScroll: true });
                        }
                    }}
                >
                    <DialogPrimitive.Title className="dialog-title">
                        {title}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="dialog-description">
                        {description}
                    </DialogPrimitive.Description>
                    {children}
                    <DialogPrimitive.Close
                        className="button button-ghost button-icon dialog-close"
                        aria-label="Cerrar diálogo"
                    >
                        <X size={20} />
                    </DialogPrimitive.Close>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
