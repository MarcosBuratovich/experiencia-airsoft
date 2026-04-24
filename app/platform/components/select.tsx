"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption = { value: string; label: string };

type Props = {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  required?: boolean;
};

type PanelPos = {
  top: number;
  left: number;
  width: number;
  direction: "down" | "up";
};

const PANEL_MAX_HEIGHT = 256; // matches max-h-64

/**
 * Custom select alineado al sistema tactico: mismo alto que los inputs,
 * clip-notch, chevron animado y panel flotante con keyboard nav.
 * El panel se renderiza via portal a document.body para escapar de cualquier
 * contenedor con overflow-hidden / clip-path.
 */
export function Select({
  name,
  value,
  onChange,
  options,
  placeholder = "Elegí una opción",
  disabled,
  className = "",
  id,
  required,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [pos, setPos] = useState<PanelPos | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const autoId = useId();
  const listId = id ?? `select-${autoId}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentLabel = useMemo(
    () => options.find((o) => o.value === value)?.label ?? "",
    [options, value],
  );
  const currentIndex = options.findIndex((o) => o.value === value);

  const recalcPos = () => {
    if (!buttonRef.current) return;
    const r = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const spaceAbove = r.top;
    const direction: "down" | "up" =
      spaceBelow < PANEL_MAX_HEIGHT && spaceAbove > spaceBelow ? "up" : "down";
    setPos({
      top: direction === "down" ? r.bottom + 4 : r.top - 4,
      left: r.left,
      width: r.width,
      direction,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    recalcPos();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => recalcPos();
    const onResize = () => recalcPos();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        listRef.current &&
        !listRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setActiveIndex(currentIndex >= 0 ? currentIndex : 0);
      queueMicrotask(() => listRef.current?.focus());
    }
  }, [open, currentIndex]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, (i < 0 ? -1 : i) + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, (i < 0 ? 0 : i) - 1));
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(options.length - 1);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < options.length) {
        onChange(options[activeIndex].value);
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
  };

  const panel =
    open && pos && mounted
      ? createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            onKeyDown={handleKey}
            style={{
              position: "fixed",
              top: pos.direction === "down" ? pos.top : undefined,
              bottom:
                pos.direction === "up"
                  ? window.innerHeight - pos.top
                  : undefined,
              left: pos.left,
              width: pos.width,
              maxHeight: PANEL_MAX_HEIGHT,
            }}
            className="z-[100] bg-carbon border border-orange clip-notch shadow-[0_18px_50px_-12px_rgba(255,107,26,0.55)] overflow-y-auto focus:outline-none"
          >
            {options.map((opt, i) => {
              const selected = opt.value === value;
              const active = i === activeIndex;
              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    buttonRef.current?.focus();
                  }}
                  className={`px-3 py-2.5 cursor-pointer flex items-center gap-2 transition ${
                    active ? "bg-orange text-ink" : "text-bone"
                  } ${selected && !active ? "border-l-2 border-orange pl-[10px]" : ""}`}
                >
                  <span className="flex-1">{opt.label}</span>
                  {selected && (
                    <span
                      className="font-mono fluid-xs uppercase tracking-[.2em] opacity-60"
                      aria-hidden
                    >
                      ✓
                    </span>
                  )}
                </li>
              );
            })}
          </ul>,
          document.body,
        )
      : null;

  return (
    <div className={`relative ${className}`}>
      {name && (
        <input type="hidden" name={name} value={value} required={required} />
      )}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleKey}
        className={`w-full flex items-center justify-between gap-2 bg-carbon border px-3 py-2.5 text-left text-bone transition outline-none ${
          open ? "border-orange" : "border-rail/60 hover:border-rail"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer focus:border-orange"}`}
      >
        <span className={currentLabel ? "font-sans" : "text-smoke font-sans"}>
          {currentLabel || placeholder}
        </span>
        <svg
          width="10"
          height="7"
          viewBox="0 0 10 7"
          aria-hidden
          className={`shrink-0 transition-transform text-ash ${open ? "rotate-180" : ""}`}
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="square" />
        </svg>
      </button>

      {panel}
    </div>
  );
}
