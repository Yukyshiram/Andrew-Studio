import { Head, Link, router, usePage } from "@inertiajs/react";
import * as NavigationDialog from "@radix-ui/react-dialog";
import { useEffect, useState, type ReactNode } from "react";
import {
    BookOpen,
    LayoutDashboard,
    Library,
    LogOut,
    Menu,
    Moon,
    Plus,
    Search,
    ShieldCheck,
    Sun,
    UserRound,
    Users,
    X,
} from "lucide-react";
import { roles, type SharedProps } from "../types";
import { Button, cn, Notice } from "./ui";

export function Brand({ compact = false }: { compact?: boolean }) {
    return (
        <Link
            href="/"
            className={cn("brand", compact && "brand-compact")}
            aria-label="Andrew's Bibliotecary, inicio"
        >
            <span className="brand-mark" aria-hidden="true">
                a<span>◦</span>
            </span>
            <span className="brand-text">
                andrew's<span>BIBLIOTECARY</span>
            </span>
        </Link>
    );
}

function ThemeToggle() {
    const [light, setLight] = useState(
        () => document.documentElement.dataset.theme === "light",
    );
    function toggle() {
        const next = !light;
        setLight(next);
        document.documentElement.dataset.theme = next ? "light" : "dark";
        try {
            localStorage.setItem("bibliotecary-theme", next ? "light" : "dark");
        } catch {
            /* Almacenamiento opcional. */
        }
    }
    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            aria-label={light ? "Activar tema oscuro" : "Activar tema claro"}
        >
            {light ? (
                <Moon size={18} aria-hidden="true" />
            ) : (
                <Sun size={18} aria-hidden="true" />
            )}
        </Button>
    );
}

function useSharedLayoutProps() {
    const { auth, can, flash } = usePage<Partial<SharedProps>>().props;
    return {
        user: auth?.user ?? null,
        can: {
            manageBooks: can?.manageBooks ?? false,
            manageUsers: can?.manageUsers ?? false,
            viewAudit: can?.viewAudit ?? false,
        },
        flash: flash ?? {},
    };
}

function NavigationContent({ mobile = false }: { mobile?: boolean }) {
    const { user, can } = useSharedLayoutProps();
    const { url } = usePage();
    const navigation = [
        {
            href: "/manage/circulation",
            icon: BookOpen,
            label: "Circulación",
            show: can.manageBooks,
        },
        {
            href: "/manage/inventory",
            icon: Library,
            label: "Ejemplares",
            show: can.manageBooks,
        },
        {
            href: "/manage/members",
            icon: Users,
            label: "Socios",
            show: can.manageBooks,
        },
        {
            href: "/manage/policy",
            icon: ShieldCheck,
            label: "Políticas",
            show: can.manageUsers,
        },
        {
            href: "/catalog",
            icon: Library,
            label: "Explorar catálogo",
            show: true,
        },
        {
            href: "/my-library",
            icon: LayoutDashboard,
            label: "Mi biblioteca",
            show: !!user,
        },
        {
            href: "/manage/books",
            icon: BookOpen,
            label: "Gestionar libros",
            show: can.manageBooks,
        },
        {
            href: "/manage/users",
            icon: Users,
            label: "Personas y roles",
            show: can.manageUsers,
        },
        {
            href: "/manage/audit",
            icon: ShieldCheck,
            label: "Historial de acciones",
            show: can.viewAudit,
        },
    ];
    return (
        <>
            <div className="sidebar-brand">
                <Brand />
                {mobile && (
                    <NavigationDialog.Close asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Cerrar navegación"
                        >
                            <X size={20} aria-hidden="true" />
                        </Button>
                    </NavigationDialog.Close>
                )}
            </div>
            <nav aria-label="Navegación principal">
                {navigation
                    .filter((item) => item.show)
                    .map((item) => {
                        const active =
                            url.split("?")[0] === item.href ||
                            (item.href.startsWith("/manage") &&
                                url.startsWith(`${item.href}/`));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn("nav-item", active && "active")}
                                aria-current={active ? "page" : undefined}
                            >
                                <item.icon size={19} aria-hidden="true" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
            </nav>
            <div className="sidebar-bottom">
                {user ? (
                    <>
                        <Link href="/profile" className="user-chip">
                            <span className="avatar" aria-hidden="true">
                                {user.name.slice(0, 1).toLocaleUpperCase("es")}
                            </span>
                            <span>
                                <strong>{user.name}</strong>
                                <small>{roles[user.role]}</small>
                            </span>
                            <UserRound size={16} aria-hidden="true" />
                        </Link>
                        <button
                            className="logout-button"
                            onClick={() => router.post("/logout")}
                        >
                            <LogOut size={16} aria-hidden="true" />
                            Cerrar sesión
                        </button>
                    </>
                ) : (
                    <>
                        <Button asChild>
                            <Link href="/login">Entrar a mi cuenta</Link>
                        </Button>
                        <Link className="subtle-link" href="/register">
                            Crear una cuenta
                        </Link>
                    </>
                )}
            </div>
        </>
    );
}

export function AppShell({
    children,
    title,
    eyebrow,
    actions,
}: {
    children: ReactNode;
    title: string;
    eyebrow?: string;
    actions?: ReactNode;
}) {
    const { can, flash } = useSharedLayoutProps();
    const { url } = usePage();
    const [menu, setMenu] = useState(false);
    useEffect(() => setMenu(false), [url]);
    useEffect(() => {
        const desktop = window.matchMedia("(min-width: 781px)");
        const closeOnDesktop = () => {
            if (desktop.matches) setMenu(false);
        };
        desktop.addEventListener("change", closeOnDesktop);
        return () => desktop.removeEventListener("change", closeOnDesktop);
    }, []);
    return (
        <NavigationDialog.Root open={menu} onOpenChange={setMenu}>
            <Head title={title} />
            <a className="skip-link" href="#contenido">
                Saltar al contenido
            </a>
            <div className="app-layout">
                <aside className="sidebar desktop-sidebar">
                    <NavigationContent />
                </aside>
                <NavigationDialog.Portal>
                    <NavigationDialog.Overlay className="mobile-scrim" />
                    <NavigationDialog.Content className="sidebar sidebar-open mobile-navigation">
                        <NavigationDialog.Title className="sr-only">
                            Tu biblioteca
                        </NavigationDialog.Title>
                        <NavigationDialog.Description className="sr-only">
                            Navega por la colección y las opciones de tu cuenta.
                        </NavigationDialog.Description>
                        <NavigationContent mobile />
                    </NavigationDialog.Content>
                </NavigationDialog.Portal>
                <div className="app-main">
                    <header className="topbar">
                        <div className="topbar-left">
                            <NavigationDialog.Trigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="mobile-only"
                                    aria-label="Abrir navegación"
                                >
                                    <Menu size={21} aria-hidden="true" />
                                </Button>
                            </NavigationDialog.Trigger>
                            <span className="topbar-label">{title}</span>
                        </div>
                        <div className="topbar-actions">
                            <Link href="/catalog" className="topbar-explore">
                                <Search size={16} aria-hidden="true" />
                                <span>Encuentra tu próxima idea</span>
                            </Link>
                            <ThemeToggle />
                            {can.manageBooks && (
                                <Button asChild size="sm" variant="secondary">
                                    <Link
                                        href="/manage/books/create"
                                        aria-label="Nuevo libro"
                                    >
                                        <Plus size={16} aria-hidden="true" />
                                        <span>Nuevo libro</span>
                                    </Link>
                                </Button>
                            )}
                        </div>
                    </header>
                    <main id="contenido" className="main-content" tabIndex={-1}>
                        <div className="page-heading">
                            <div>
                                {eyebrow && (
                                    <p className="eyebrow">{eyebrow}</p>
                                )}
                                <h1>{title}</h1>
                            </div>
                            {actions && (
                                <div className="heading-actions">{actions}</div>
                            )}
                        </div>
                        <div className="flash-container" aria-live="polite">
                            <Notice>{flash.success}</Notice>
                            <Notice kind="error">{flash.error}</Notice>
                        </div>
                        {children}
                    </main>
                    <footer className="app-footer">
                        <span>
                            Andrew's Bibliotecary{" "}
                            <span className="muted">
                                © {new Date().getFullYear()}
                            </span>
                        </span>
                        <span>Hecho para mentes curiosas.</span>
                    </footer>
                </div>
            </div>
        </NavigationDialog.Root>
    );
}

export function AuthLayout({
    children,
    title,
    description,
}: {
    children: ReactNode;
    title: string;
    description: string;
}) {
    const { flash } = useSharedLayoutProps();
    return (
        <>
            <Head title={title} />
            <a className="skip-link" href="#contenido">
                Saltar al contenido
            </a>
            <div className="auth-layout">
                <aside className="auth-story">
                    <Brand />
                    <div className="auth-story-content">
                        <span className="eyebrow">
                            UN LUGAR PARA LA CURIOSIDAD
                        </span>
                        <h2>
                            Cada página abre
                            <br />
                            una posibilidad.
                        </h2>
                        <div className="auth-book-art" aria-hidden="true">
                            <div>
                                IDEAS
                                <br />
                                <em>
                                    que nos
                                    <br />
                                    mueven.
                                </em>
                                <span>ANDREW'S BIBLIOTECARY</span>
                            </div>
                        </div>
                        <p>
                            Explora la colección. Conecta con otras
                            perspectivas.
                            <br />
                            Encuentra eso que todavía no sabías que buscabas.
                        </p>
                    </div>
                    <span className="auth-copyright">
                        Una biblioteca de ideas.
                    </span>
                </aside>
                <main className="auth-form-panel" id="contenido" tabIndex={-1}>
                    <div className="auth-top">
                        <Link href="/catalog" className="text-link">
                            Explorar sin cuenta
                        </Link>
                        <ThemeToggle />
                    </div>
                    <div className="auth-form-wrap">
                        <div className="auth-mobile-brand">
                            <Brand />
                        </div>
                        <p className="eyebrow">ANDREW'S BIBLIOTECARY</p>
                        <h1>{title}</h1>
                        <p className="auth-description">{description}</p>
                        <Notice>{flash.success}</Notice>
                        <Notice kind="error">{flash.error}</Notice>
                        {children}
                    </div>
                    <p className="auth-bottom">
                        Un espacio propio para descubrir.
                    </p>
                </main>
            </div>
        </>
    );
}
