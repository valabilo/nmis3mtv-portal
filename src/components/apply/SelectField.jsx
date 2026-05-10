"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import styles from "./FormSteps.module.css";

export default function SelectField({
  id,
  label,
  required = false,
  value,
  options,
  onChange,
  disabled = false,
  hint,
}) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const menuId = `${fieldId}-menu`;
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  function chooseOption(nextValue) {
    onChange(nextValue);
    setOpen(false);
  }

  return (
    <div className={styles.selectField} ref={rootRef}>
      <label htmlFor={fieldId}>
        {label} {required ? <span className="req">*</span> : null}
      </label>
      <button
        id={fieldId}
        type="button"
        className={styles.selectButton}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}>
        <span>{selected?.label || "Select"}</span>
        <ChevronDownIcon aria-hidden="true" />
      </button>
      {open ? (
        <div id={menuId} className={styles.selectMenu} role="listbox">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={
                option.value === value
                  ? styles.selectOptionActive
                  : styles.selectOption
              }
              onClick={() => chooseOption(option.value)}>
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
      {hint ? <span className="form-hint">{hint}</span> : null}
    </div>
  );
}
