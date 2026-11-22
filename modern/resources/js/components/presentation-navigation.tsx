import {
    createContext,
    useContext,
    type ComponentType,
    type AnchorHTMLAttributes,
} from "react";

export type PresentationLinkProps = Pick<
    AnchorHTMLAttributes<HTMLAnchorElement>,
    "className" | "children" | "aria-label"
> & { href: string };
const Navigation = createContext<ComponentType<PresentationLinkProps>>(
    (props) => <a {...props} />,
);
export const PresentationNavigation = Navigation.Provider;
export function usePresentationLink() {
    return useContext(Navigation);
}
