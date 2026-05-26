"use client";

import { useMemo, useState } from "react";
import {
  AsYouType,
  getCountryCallingCode,
  getExampleNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/min";
import examples from "libphonenumber-js/examples.mobile.json";

/**
 * Lista curada de países para el dropdown — primero los relevantes para
 * el público de la cancha (Argentina + LATAM + España), después algunos
 * extras comunes. Si después hace falta agregar más, sumar acá.
 */
const COUNTRIES: ReadonlyArray<{ code: CountryCode; name: string; flag: string }> = [
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "BR", name: "Brasil", flag: "🇧🇷" },
  { code: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "PE", name: "Perú", flag: "🇵🇪" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "MX", name: "México", flag: "🇲🇽" },
  { code: "ES", name: "España", flag: "🇪🇸" },
  { code: "US", name: "EE.UU.", flag: "🇺🇸" },
  { code: "CA", name: "Canadá", flag: "🇨🇦" },
  { code: "IT", name: "Italia", flag: "🇮🇹" },
  { code: "FR", name: "Francia", flag: "🇫🇷" },
  { code: "DE", name: "Alemania", flag: "🇩🇪" },
  { code: "GB", name: "Reino Unido", flag: "🇬🇧" },
];

const COUNTRIES_BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

function dialFor(country: CountryCode): string {
  return `+${getCountryCallingCode(country)}`;
}

function placeholderFor(country: CountryCode): string {
  try {
    const example = getExampleNumber(country, examples);
    return example?.formatNational() ?? "";
  } catch {
    return "";
  }
}

export function PhoneInput({
  name,
  defaultValue,
  required,
  id,
}: {
  /** Nombre del hidden input que el form action recibe (en formato E.164). */
  name: string;
  /** Si viene un número guardado, intenta parsearlo y precargarlo. */
  defaultValue?: string;
  required?: boolean;
  id?: string;
}) {
  const initial = useMemo(() => {
    if (defaultValue) {
      const parsed = parsePhoneNumberFromString(defaultValue, "AR");
      if (parsed?.country && COUNTRIES_BY_CODE.has(parsed.country)) {
        return {
          country: parsed.country,
          display: parsed.formatNational(),
        };
      }
    }
    return { country: "AR" as CountryCode, display: "" };
  }, [defaultValue]);

  const [country, setCountry] = useState<CountryCode>(initial.country);
  const [display, setDisplay] = useState(initial.display);

  const onChangeNumber = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // AsYouType formatea progresivamente mientras el user tipea. Si
    // borra caracteres, soporta backspace bien (no se traba con los
    // separadores que el mismo formatter agregó).
    const formatter = new AsYouType(country);
    setDisplay(formatter.input(raw));
  };

  const onChangeCountry = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as CountryCode;
    setCountry(next);
    // Reformatear el display con el nuevo país (los mismos dígitos
    // pueden formatearse distinto).
    if (display) {
      const digits = display.replace(/\D/g, "");
      const formatter = new AsYouType(next);
      setDisplay(formatter.input(digits));
    }
  };

  // Lo que se manda al server: E.164 si es válido, sino el raw con prefijo
  // del país (el server validará con zod o lo que sea).
  const submitValue = useMemo(() => {
    const parsed = parsePhoneNumberFromString(display, country);
    if (parsed?.isValid()) return parsed.format("E.164");
    // No es válido todavía — mandamos el mejor esfuerzo (dial + display)
    // para que el server pueda devolver error si hace falta.
    if (display.trim()) return `${dialFor(country)} ${display}`.trim();
    return "";
  }, [display, country]);

  return (
    <div className="flex items-stretch gap-2">
      <div className="relative">
        <select
          value={country}
          onChange={onChangeCountry}
          aria-label="País"
          className="appearance-none bg-carbon border border-rail/60 pl-3 pr-8 py-2.5 font-sans text-bone focus:border-orange outline-none transition cursor-pointer"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code} className="bg-carbon">
              {c.flag} {dialFor(c.code)} {c.name}
            </option>
          ))}
        </select>
        <span
          aria-hidden
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-smoke text-xs"
        >
          ▼
        </span>
      </div>

      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={display}
        onChange={onChangeNumber}
        placeholder={placeholderFor(country)}
        className="flex-1 min-w-0 bg-carbon border border-rail/60 px-3 py-2.5 font-sans text-bone focus:border-orange outline-none transition"
      />

      <input type="hidden" name={name} value={submitValue} required={required} />
    </div>
  );
}
