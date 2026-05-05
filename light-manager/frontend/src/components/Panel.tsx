import type { ReactNode } from "react";

type Props = {
  title?: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export default function Panel({
  title,
  icon,
  right,
  children,
  className = "",
  bodyClassName = "",
}: Props) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <header className="panel-header">
          <span className="corner" aria-hidden="true" />
          {icon}
          <span className="flex-1 truncate">{title}</span>
          {right && <span className="ml-auto">{right}</span>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}
