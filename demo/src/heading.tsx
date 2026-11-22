import type { ReactNode } from "react";
export function Heading({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children?: ReactNode;
}) {
  return (
    <div className="demo-page-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1 tabIndex={-1}>{title}</h1>
      {children && <p>{children}</p>}
    </div>
  );
}
