import { useLayoutEffect, useRef, type AnchorHTMLAttributes } from "react";
import { Link, useLocation, useNavigationType } from "react-router-dom";
import { useReducedMotion } from "motion/react";

export function DemoLink({
  href,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const location = useLocation();
  const reduced = useReducedMotion();
  return (
    <Link
      {...props}
      to={href}
      viewTransition={
        !reduced &&
        /^\/catalog\/\d+$/.test(href) &&
        (location.pathname === "/" || location.pathname === "/catalog")
      }
      state={
        location.pathname === "/catalog" && /^\/catalog\/\d+/.test(href)
          ? {
              catalog: location.pathname + location.search,
              returnKey: location.key,
              book: Number(href.split("/").pop()),
            }
          : undefined
      }
    />
  );
}

const positions = new Map<string, { x: number; y: number; focus?: string }>();
export function NavigationRestoration() {
  const location = useLocation();
  const action = useNavigationType();
  const previousPath = useRef("");
  useLayoutEffect(() => {
    const manual = history.scrollRestoration;
    history.scrollRestoration = "manual";
    const saved = positions.get(location.key);
    const samePage = previousPath.current === location.pathname;
    function remember(event?: Event) {
      const active =
        event?.type === "click"
          ? (event.target as HTMLElement)?.closest<HTMLElement>(
              "[data-book-id]",
            )
          : (document.activeElement as HTMLElement | null);
      positions.set(location.key, {
        x: scrollX,
        y: scrollY,
        focus: active?.dataset.bookId
          ? `[data-book-id="${active.dataset.bookId}"]`
          : positions.get(location.key)?.focus,
      });
      if (positions.size > 80) positions.delete(positions.keys().next().value!);
    }
    if (action === "POP" && saved) {
      if (saved.focus)
        document
          .querySelector<HTMLElement>(saved.focus)
          ?.focus({ preventScroll: true });
      window.scrollTo({ left: saved.x, top: saved.y, behavior: "instant" });
    } else if (!samePage) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document
        .querySelector<HTMLElement>("main h1")
        ?.focus({ preventScroll: true });
    }
    let observer: MutationObserver | undefined;
    if (
      !(action === "POP" && saved) &&
      !samePage &&
      !document.querySelector("main h1")
    ) {
      observer = new MutationObserver(() => {
        const heading = document.querySelector<HTMLElement>("main h1");
        if (heading) {
          heading.focus({ preventScroll: true });
          observer?.disconnect();
        }
      });
      const main = document.querySelector("main");
      if (main) observer.observe(main, { childList: true, subtree: true });
    }
    document.addEventListener("click", remember, true);
    window.addEventListener("scroll", remember, { passive: true });
    previousPath.current = location.pathname;
    return () => {
      observer?.disconnect();
      document.removeEventListener("click", remember, true);
      window.removeEventListener("scroll", remember);
      history.scrollRestoration = manual;
    };
  }, [location.key, location.pathname, action]);
  return null;
}
