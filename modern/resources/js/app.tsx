import "../css/app.css";
import "../css/motion.css";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import type { ComponentType } from "react";
try {
    document.documentElement.dataset.theme =
        localStorage.getItem("bibliotecary-theme") === "light"
            ? "light"
            : "dark";
} catch {
    document.documentElement.dataset.theme = "dark";
}
const pages = import.meta.glob<{ default: ComponentType }>("./pages/**/*.tsx");
createInertiaApp({
    title: (title) => `${title} · Andrew's Bibliotecary`,
    resolve: async (name) => {
        const page = pages[`./pages/${name}.tsx`];
        if (!page) throw new Error(`Página desconocida: ${name}`);
        return (await page()).default;
    },
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: { color: "#e8bd72", showSpinner: false },
});
