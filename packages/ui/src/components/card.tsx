import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export function Card({ title, children, className = "", ...props }: CardProps) {
  return (
    <div className={`rounded-lg border bg-card p-6 ${className}`} {...props}>
      {title && <h3 className="mb-4 font-semibold">{title}</h3>}
      {children}
    </div>
  );
}
