import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { m as motion } from "motion/react";
import {
  Library,
  LayoutDashboard,
  Home,
  Info,
  Menu,
  X,
  Sun,
  Moon,
  Search,
  ArrowLeft,
  PanelLeft,
} from "lucide-react";
import { DemoLink } from "./navigation";
import { Button, cn } from "../../modern/resources/js/components/ui";

function ThemeToggle() {
  const [light, setLight] = useState(
    () => document.documentElement.dataset.theme === "light",
  );
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={light ? "Activar tema oscuro" : "Activar tema claro"}
      onClick={() => {
        document.documentElement.dataset.theme = light ? "dark" : "light";
        setLight(!light);
        try {
          localStorage.setItem("bibliotecary-theme", light ? "dark" : "light");
        } catch {
          /* Preferencia opcional. */
        }
      }}
    >
      {light ? (
        <Moon size={18} aria-hidden="true" />
      ) : (
        <Sun size={18} aria-hidden="true" />
      )}
    </Button>
  );
}
function Navigation({
  admin,
  mobile = false,
  close,
}: {
  admin: boolean;
  mobile?: boolean;
  close: () => void;
}) {
  const { pathname } = useLocation();
  const links = admin
    ? [
        { href: "/demo/admin", label: "Resumen", Icon: LayoutDashboard },
        {
          href: "/demo/admin/books",
          label: "Gestión de fichas",
          Icon: Library,
        },
      ]
    : [
        { href: "/", label: "Inicio", Icon: Home },
        { href: "/catalog", label: "Catálogo", Icon: Library },
        { href: "/about", label: "Acerca del proyecto", Icon: Info },
      ];
  return (
    <>
      <div className="demo-brand-row">
        <DemoLink
          href="/"
          className="brand"
          aria-label="Andrew's Bibliotecary, inicio"
          onClick={close}
        >
          <span className="brand-mark" aria-hidden="true">
            a<span>◦</span>
          </span>
          <span className="brand-text">
            andrew's<span>BIBLIOTECARY</span>
          </span>
        </DemoLink>
        {mobile && (
          <Dialog.Close asChild>
            <Button variant="ghost" size="icon" aria-label="Cerrar navegación">
              <X size={20} aria-hidden="true" />
            </Button>
          </Dialog.Close>
        )}
      </div>
      {admin && <p className="admin-nav-label">Panel administrador</p>}
      <nav
        className="main-navigation"
        aria-label={mobile ? "Navegación móvil" : "Navegación principal"}
      >
        {links.map(({ href, label, Icon }) => {
          const active =
            pathname === href ||
            (href === "/catalog" && pathname.startsWith("/catalog/"));
          return (
            <DemoLink
              key={href}
              href={href}
              onClick={close}
              className={cn("nav-item", active && "active")}
              aria-current={active ? "page" : undefined}
            >
              {active && (
                <motion.span
                  layoutId={`navigation-${admin ? "admin" : "visitor"}-${mobile ? "mobile" : "desktop"}`}
                  className="active-nav-surface"
                  transition={{ duration: 0.2 }}
                />
              )}
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
            </DemoLink>
          );
        })}
      </nav>
      <div className="sidebar-bottom demo-secondary-navigation">
        {admin ? (
          <DemoLink href="/catalog" onClick={close} className="text-link">
            <ArrowLeft size={16} aria-hidden="true" />
            Volver a la biblioteca
          </DemoLink>
        ) : (
          <DemoLink
            href="/demo/admin"
            onClick={close}
            className="admin-entry"
            aria-label="Probar panel administrador"
          >
            <PanelLeft size={19} aria-hidden="true" />
            <span>
              Probar panel administrador<small>Demostración interactiva</small>
            </span>
          </DemoLink>
        )}
      </div>
    </>
  );
}
export function Shell({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();
  const openedAt = useRef(pathname);
  const admin =
    pathname === "/demo/admin" || pathname.startsWith("/demo/admin/");
  const context = admin
    ? pathname.endsWith("/books")
      ? "Administración / Fichas"
      : "Administración / Resumen"
    : pathname === "/"
      ? "Inicio"
      : pathname === "/catalog"
        ? "Catálogo"
        : pathname.startsWith("/catalog/")
          ? "Ficha del libro"
          : pathname === "/about"
            ? "Acerca del proyecto"
            : "Biblioteca";
  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    const query = matchMedia("(min-width:781px)");
    const change = () => {
      if (query.matches) setMenu(false);
    };
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  return (
    <Dialog.Root
      open={menu}
      onOpenChange={(open) => {
        if (open) openedAt.current = pathname;
        setMenu(open);
      }}
    >
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <div className={cn("app-layout demo-app", admin && "demo-admin")}>
        <aside className="sidebar desktop-sidebar">
          <Navigation admin={admin} close={() => {}} />
        </aside>
        <Dialog.Portal>
          <Dialog.Overlay className="mobile-scrim" />
          <Dialog.Content
            className={cn(
              "sidebar sidebar-open mobile-navigation",
              admin && "admin-mobile-navigation",
            )}
            onCloseAutoFocus={(event) => {
              if (openedAt.current !== pathname) {
                event.preventDefault();
                (
                  document.querySelector<HTMLElement>("main h1") ??
                  document.querySelector<HTMLElement>("main")
                )?.focus({ preventScroll: true });
              }
            }}
          >
            <Dialog.Title className="sr-only">
              {admin
                ? "Navegación de administración"
                : "Navegación de la biblioteca"}
            </Dialog.Title>
            <Dialog.Description className="sr-only">
              {admin
                ? "Resumen, gestión de fichas y regreso a la biblioteca."
                : "Inicio, catálogo y acerca del proyecto."}
            </Dialog.Description>
            <Navigation admin={admin} mobile close={() => setMenu(false)} />
          </Dialog.Content>
        </Dialog.Portal>
        <div className="app-main">
          <header className="topbar">
            <div className="topbar-left">
              <Dialog.Trigger asChild>
                <Button
                  className="mobile-only"
                  variant="ghost"
                  size="icon"
                  aria-label="Abrir navegación"
                >
                  <Menu size={21} aria-hidden="true" />
                </Button>
              </Dialog.Trigger>
              <span className="context-title">{context}</span>
            </div>
            <div className="topbar-actions">
              {admin ? (
                <DemoLink href="/catalog" className="text-link header-return">
                  <ArrowLeft size={16} aria-hidden="true" />
                  <span>Volver a la biblioteca</span>
                </DemoLink>
              ) : (
                pathname !== "/catalog" && (
                  <DemoLink href="/catalog" className="topbar-explore">
                    <Search size={16} aria-hidden="true" />
                    <span>Buscar libros</span>
                  </DemoLink>
                )
              )}
              <ThemeToggle />
            </div>
          </header>
          {admin && (
            <div className="admin-mode-bar">
              <span className="demo-mode-badge">Modo demostración</span>
              <p>
                Los cambios duran en esta pestaña y se reinician al recargar.
              </p>
            </div>
          )}
          <main
            id="contenido"
            tabIndex={-1}
            className="main-content page-content"
          >
            {children}
          </main>
          <footer className="app-footer">
            <span>Andrew's Bibliotecary © 2026</span>
            {!admin && (
              <DemoLink href="/demo/admin" className="mobile-admin-entry">
                Probar panel administrador
              </DemoLink>
            )}
            <DemoLink href="/about">Acerca del proyecto</DemoLink>
          </footer>
        </div>
      </div>
    </Dialog.Root>
  );
}
