import { readingModes, type ReadingMode } from "@/app/lib/reader-data";

export function IconButton({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button aria-label={label} className="icon-button" type="button" title={label}>
      {children}
    </button>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
}) {
  return (
    <div className="section-heading">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {detail && <p className="section-detail">{detail}</p>}
    </div>
  );
}

export function BookCover({
  title,
  author,
  revealed = false,
}: {
  title: string;
  author: string;
  revealed?: boolean;
}) {
  return (
    <div
      className={`book-cover${revealed ? " book-cover-reveal" : ""}`}
      aria-label={`Book cover for ${title}`}
      role="img"
    >
      <span className="cover-mark" aria-hidden="true">
        MYSTERY
        <br />
        &amp; COMPANY
      </span>
      <span className="cover-ornament" aria-hidden="true">
        ✳
      </span>
      <span className="cover-title">{title}</span>
      <span className="cover-author">{author}</span>
      <span className="cover-edition">A READER DNA SELECTION</span>
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="progress-wrap">
      <div className="progress-label">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <progress aria-label={label} className="progress-bar" max={100} value={value}>
        {value}%
      </progress>
    </div>
  );
}

export function ModeSelector({
  selected,
  onSelect,
}: {
  selected: ReadingMode;
  onSelect: (mode: ReadingMode) => void;
}) {
  return (
    <div className="mode-grid" role="group" aria-label="Choose this month’s mystery mood">
      {readingModes.map((mode) => (
        <button
          aria-pressed={selected === mode.name}
          className={`mode-option${selected === mode.name ? " is-selected" : ""}`}
          key={mode.name}
          onClick={() => onSelect(mode.name)}
          type="button"
        >
          <span className="mode-icon" aria-hidden="true">
            {mode.icon}
          </span>
          <span className="mode-copy">
            <strong>{mode.name}</strong>
            <small>{mode.descriptor}</small>
          </span>
          <span className="mode-radio" aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}

export type ChoiceOption<Value extends string> = {
  value: Value;
  label: string;
  detail?: string;
  disabled?: boolean;
};

export function ChoiceGroup<Value extends string>({
  activeClassName = "source-active",
  ariaLabel,
  className,
  options,
  selected,
  onSelect,
}: {
  activeClassName?: string;
  ariaLabel: string;
  className: string;
  options: ChoiceOption<Value>[];
  selected: Value;
  onSelect: (value: Value) => void;
}) {
  return (
    <div aria-label={ariaLabel} className={className} role="group">
      {options.map((option) => (
        <button
          aria-pressed={selected === option.value}
          className={selected === option.value ? activeClassName : ""}
          disabled={option.disabled}
          key={option.value}
          onClick={() => onSelect(option.value)}
          type="button"
        >
          {option.label}
          {option.detail && <small>{option.detail}</small>}
        </button>
      ))}
    </div>
  );
}
