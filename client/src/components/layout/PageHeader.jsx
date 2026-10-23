/** Editorial page header: mono eyebrow, serif title, quiet description, actions on the right, closed by a rule. */
export function PageHeader({ eyebrow, title, description, actions, children }) {
  return (
    <header className="border-b border-ink-200 pb-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
          <h1 className="font-display text-[34px] leading-[1.05] tracking-[-0.01em] text-ink-900 sm:text-[40px]">{title}</h1>
          {description && <p className="mt-2 max-w-2xl text-[14px] text-ink-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
