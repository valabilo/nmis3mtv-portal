"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
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
  const optionRefs = useRef(new Map());
  const searchRef = useRef("");
  const searchTimerRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeValue, setActiveValue] = useState(value);
  const sortedOptions = useMemo(
    () =>
      [...options].sort((a, b) =>
        String(a.label || "").localeCompare(String(b.label || ""), "en", {
          sensitivity: "base",
        }),
      ),
    [options],
  );
  const selected =
    sortedOptions.find((option) => option.value === value) || sortedOptions[0];

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(
    () => () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    setActiveValue(value);
  }, [value]);

  function focusOption(option) {
    if (!option) return;
    setActiveValue(option.value);
    window.requestAnimationFrame(() => {
      const node = optionRefs.current.get(option.value);
      node?.scrollIntoView({ block: "nearest" });
      node?.focus();
    });
  }

  function chooseOption(nextValue) {
    onChange(nextValue);
    setOpen(false);
  }

  function handleTypeAhead(event) {
    if (event.key.length !== 1 || event.altKey || event.ctrlKey || event.metaKey) {
      return false;
    }

    const typed = event.key.toLowerCase();
    searchRef.current += typed;
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => {
      searchRef.current = "";
    }, 700);

    const match =
      sortedOptions.find((option) =>
        String(option.label || "").toLowerCase().startsWith(searchRef.current),
      ) ||
      sortedOptions.find((option) =>
        String(option.label || "").toLowerCase().startsWith(typed),
      );

    if (match) {
      setOpen(true);
      focusOption(match);
    }

    return true;
  }

  function handleButtonKeyDown(event) {
    if (handleTypeAhead(event)) {
      event.preventDefault();
      return;
    }

    if (["ArrowDown", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      focusOption(selected);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  function handleOptionKeyDown(event, option) {
    if (handleTypeAhead(event)) {
      event.preventDefault();
      return;
    }

    const currentIndex = sortedOptions.findIndex((item) => item.value === option.value);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusOption(sortedOptions[Math.min(currentIndex + 1, sortedOptions.length - 1)]);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusOption(sortedOptions[Math.max(currentIndex - 1, 0)]);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      chooseOption(option.value);
    } else if (event.key === "Escape") {
      setOpen(false);
      rootRef.current?.querySelector("button")?.focus();
    }
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
        onKeyDown={handleButtonKeyDown}>
        <span>{selected?.label || "Select"}</span>
        <ChevronDownIcon aria-hidden="true" />
      </button>
      {open ? (
        <div id={menuId} className={styles.selectMenu} role="listbox">
          {sortedOptions.map((option) => (
            <button
              key={option.value}
              ref={(node) => {
                if (node) optionRefs.current.set(option.value, node);
                else optionRefs.current.delete(option.value);
              }}
              type="button"
              role="option"
              aria-selected={option.value === value}
              tabIndex={option.value === activeValue ? 0 : -1}
              className={
                option.value === value
                  ? styles.selectOptionActive
                  : styles.selectOption
              }
              onClick={() => chooseOption(option.value)}
              onKeyDown={(event) => handleOptionKeyDown(event, option)}>
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
      {hint ? <span className="form-hint">{hint}</span> : null}
    </div>
  );
}
