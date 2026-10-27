import { useId } from 'react';

interface SegmentedProps<T extends string | number> {
  label: string;
  value: T;
  options: readonly { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

/** Accessible radio-group styled as a segmented control. */
export function Segmented<T extends string | number>({ label, value, options, onChange, disabled = false }: SegmentedProps<T>) {
  const name = useId();
  return (
    <fieldset className="segmented" disabled={disabled}>
      <legend>{label}</legend>
      <div className="segmented-options">
        {options.map((option) => (
          <label key={String(option.value)} className={option.value === value ? 'active' : ''} title={option.hint}>
            <input
              type="radio"
              name={name}
              value={String(option.value)}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <label className="toggle-row">
      <span>
        <span className="toggle-label">{label}</span>
        {description && <span className="toggle-description">{description}</span>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-thumb" />
      </span>
    </label>
  );
}
