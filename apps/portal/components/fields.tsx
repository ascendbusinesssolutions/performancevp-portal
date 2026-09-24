import { type ReactNode, useId } from "react";

import { INPUT_CLASS } from "./ui";

/**
 * Form fields beyond the text input in ui.tsx. Every field has a visible label; control boundaries
 * use grey-80 (3:1 on white); focus is visible.
 */

export interface Option {
  value: string;
  label: string;
}

export function SelectField({
  label,
  name,
  options,
  defaultValue,
  required = false,
  hint,
  disabled,
}: {
  label: string;
  name: string;
  options: readonly Option[];
  defaultValue?: string;
  required?: boolean;
  hint?: string;
  disabled?: boolean;
}) {
  // An explicit label, not a wrapping one: a label wrapping a select takes every option into its
  // text, which garbles the field's name for assistive technology.
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-grey">
        {label}
      </label>
      <select
        id={id}
        className={INPUT_CLASS}
        name={name}
        defaultValue={defaultValue}
        required={required}
        disabled={disabled}
        aria-describedby={hint ? `${id}-hint` : undefined}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-grey">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function CheckboxField({
  label,
  name,
  value,
  defaultChecked,
  disabled,
  hint,
}: {
  label: ReactNode;
  name: string;
  value?: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-3 py-1 text-sm text-slate">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="mt-0.5 size-4 shrink-0 accent-slate focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate"
      />
      <span>
        {label}
        {hint ? <span className="block text-xs text-grey">{hint}</span> : null}
      </span>
    </label>
  );
}

export function RadioGroup({
  legend,
  name,
  options,
  defaultValue,
  required = true,
  disabled,
}: {
  legend: string;
  name: string;
  options: readonly Option[];
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <fieldset>
      <legend className="text-sm text-grey">{legend}</legend>
      <div className="mt-1 space-y-1">
        {options.map((option) => (
          <label key={option.value} className="flex items-start gap-3 py-1 text-sm text-slate">
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={defaultValue === option.value}
              required={required}
              disabled={disabled}
              className="mt-0.5 size-4 shrink-0 accent-slate focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
