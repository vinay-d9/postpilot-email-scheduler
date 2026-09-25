import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type Props = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & { variant?: "primary" | "secondary" | "quiet" };

const variants = {
  primary: "bg-ink text-white hover:bg-ink/90 disabled:bg-ink/45",
  secondary: "border border-ink/15 bg-white text-ink hover:bg-mint/45 disabled:text-ink/40",
  quiet: "text-ink/65 hover:bg-ink/5 hover:text-ink"
};

export function Button({ children, variant = "primary", className = "", ...props }: Props) {
  return <button className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-lime disabled:cursor-not-allowed ${variants[variant]} ${className}`} {...props}>{children}</button>;
}
