import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

import logoUrl from "../images/LOGO.svg";

type NavItem = { label: string; to: string };

const NAV: NavItem[] = [
  { label: "Mission", to: "/global" },
  { label: "Operators", to: "/admin" },
];

type Props = {
  subtitle?: string;
  right?: ReactNode;
  showNav?: boolean;
};

export default function TopBar({ subtitle, right, showNav = true }: Props) {
  const location = useLocation();

  return (
    <header className="border-b border-[var(--color-edge)] bg-[var(--color-void)]/80 backdrop-blur">
      <div className="mx-auto flex max-w-[1800px] items-center gap-6 px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center group">
          <img
            src={logoUrl}
            alt="APOGASA · ARTEMIS"
            className="h-7 brightness-0 invert opacity-80 group-hover:opacity-100 transition-opacity"
          />
        </Link>

        {subtitle && (
          <span className="hidden md:block font-display text-[11px] tracking-[0.28em] text-[var(--color-ink-dim)] uppercase border-l border-[var(--color-edge)] pl-6">
            {subtitle}
          </span>
        )}

        {showNav && (
          <nav className="ml-auto flex items-center gap-1">
            {NAV.map((item) => {
              const active = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`font-display text-[11px] tracking-[0.22em] uppercase px-3 py-1.5 border transition-colors ${
                    active
                      ? "border-[var(--color-accent)] text-[var(--color-accent-bright)] bg-[var(--color-accent-deep)]/40"
                      : "border-transparent text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:border-[var(--color-edge)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        {right && <div className={showNav ? "" : "ml-auto"}>{right}</div>}
      </div>
    </header>
  );
}
