import React from "react";
import { Link } from "react-router-dom";

function AdminFooter() {
  return (
    <footer className="mx-auto w-full max-w-[1600px] px-4 pb-6 text-xs text-muted-foreground sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-4">
        <span>Taiwan Company Network · Relationship data explorer</span>
        <span className="flex items-center gap-2">
          <Link
            className="underline-offset-4 hover:text-foreground hover:underline"
            to="/skill"
          >
            Skill
          </Link>
          <span aria-hidden="true">·</span>
          <span>AGPL-3.0-or-later</span>
          <span aria-hidden="true">·</span>
          <a
            className="underline-offset-4 hover:text-foreground hover:underline"
            href="https://david888.com"
            rel="noreferrer"
            target="_blank"
          >
            david888.com
          </a>
        </span>
      </div>
    </footer>
  );
}

export default AdminFooter;
