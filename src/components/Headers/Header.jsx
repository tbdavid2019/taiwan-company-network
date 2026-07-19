import React from "react";
import { Link } from "react-router-dom";

function Header({ breadcrumbs = [], eyebrow, title, description, actions }) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        {breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {breadcrumbs.map((item, index) => (
              <React.Fragment key={`${item.label}-${index}`}>
                {index > 0 && <span aria-hidden="true">/</span>}
                {item.to ? <Link className="transition-colors hover:text-primary" to={item.to}>{item.label}</Link> : <span className="max-w-56 truncate text-foreground">{item.label}</span>}
              </React.Fragment>
            ))}
          </nav>
        )}
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export default Header;
