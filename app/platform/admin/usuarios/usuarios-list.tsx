"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setSocioAction,
  setRolAction,
  setCuotaAction,
  setPlayerNumberAction,
} from "./actions";
import { Select } from "../../components/select";
import { ContactoWa } from "../../components/contacto-wa";
import type { FriendlyError } from "@/lib/errors";
import { ErrorBanner } from "../../../_components/error-banner";

type Usuario = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  dni: string;
  celular: string;
  player_number: string | null;
  role: string;
  socio: boolean;
  socio_desde: string | null;
  cuota_mensual: number;
  created_at: string;
};

const ROLE_OPTS = [
  { value: "jugador", label: "Jugador" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super" },
];

export function UsuariosList({
  usuarios,
  cuotaDeclarada,
}: {
  usuarios: Usuario[];
  cuotaDeclarada: number;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [errorByUser, setErrorByUser] = useState<Record<string, FriendlyError | null>>(
    {},
  );
  const [personalizando, setPersonalizando] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const router = useRouter();

  const toggleSocio = (u: Usuario) => {
    setPendingId(u.id);
    setPersonalizando((prev) => {
      const n = new Set(prev);
      n.delete(u.id);
      return n;
    });
    startTransition(async () => {
      await setSocioAction(u.id, !u.socio);
      setPendingId(null);
      router.refresh();
    });
  };

  const changeRole = (id: string, role: string) => {
    setPendingId(id);
    startTransition(async () => {
      await setRolAction(id, role);
      setPendingId(null);
      router.refresh();
    });
  };

  const startPersonalizar = (id: string) => {
    setPersonalizando((prev) => new Set(prev).add(id));
  };

  // Sale del modo edición y guarda solo si cambió respecto al valor actual.
  const finishCuota = (id: string, monto: number, actual: number) => {
    setPersonalizando((prev) => {
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
    if (monto === actual) return;
    setPendingId(id);
    startTransition(async () => {
      await setCuotaAction(id, monto);
      setPendingId(null);
      router.refresh();
    });
  };

  const savePlayerNumber = (u: Usuario, valor: string) => {
    const v = valor.trim();
    if ((v || null) === (u.player_number || null)) return;
    setPendingId(u.id);
    setErrorByUser((p) => ({ ...p, [u.id]: null }));
    startTransition(async () => {
      const res = await setPlayerNumberAction(u.id, v || null);
      if ("error" in res && res.error) {
        setErrorByUser((p) => ({ ...p, [u.id]: res.error ?? null }));
      } else {
        router.refresh();
      }
      setPendingId(null);
    });
  };

  if (!usuarios.length) {
    return (
      <div className="border border-rail/60 bg-carbon fluid-card clip-notch">
        <p className="font-mono fluid-xs text-smoke uppercase tracking-[.25em]">Sin resultados.</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile — cards */}
      <ul className="md:hidden space-y-3">
        {usuarios.map((u) => {
          const isPending = pendingId === u.id;
          return (
            <li
              key={u.id}
              className={`border border-rail/60 bg-carbon clip-notch p-4 ${isPending ? "opacity-60" : ""}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="text-bone truncate">
                    {u.apellido}, {u.nombre}
                  </p>
                  <p className="font-mono fluid-xs text-smoke">DNI {u.dni}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSocio(u)}
                  className={`shrink-0 px-3 py-1.5 font-mono fluid-xs uppercase tracking-[.2em] border transition cursor-pointer ${
                    u.socio
                      ? "bg-orange text-ink border-orange"
                      : "border-rail/60 text-ash hover:border-orange"
                  }`}
                >
                  Socio · {u.socio ? "Sí" : "No"}
                </button>
              </div>
              <div className="font-mono fluid-xs text-ash space-y-0.5 mb-3">
                <p className="truncate">{u.email}</p>
                <p className="text-smoke">
                  <ContactoWa
                    celular={u.celular}
                    nombre={u.nombre}
                    variant="inline"
                  />
                </p>
              </div>
              <div className="mb-3">
                <span className="sect-label mb-1 block">N° de jugador</span>
                <input
                  inputMode="numeric"
                  maxLength={6}
                  defaultValue={u.player_number ?? ""}
                  placeholder="—"
                  onBlur={(e) => savePlayerNumber(u, e.target.value)}
                  className="w-full bg-ink border border-rail/60 px-2 py-2 text-bone font-mono tracking-[.2em] fluid-xs focus:border-orange outline-none"
                />
                <ErrorBanner error={errorByUser[u.id]} variant="inline" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="sect-label mb-1 block">Cuota</span>
                  <CuotaControl
                    u={u}
                    cuotaDeclarada={cuotaDeclarada}
                    editando={personalizando.has(u.id)}
                    onEditar={() => startPersonalizar(u.id)}
                    onSave={(v) => finishCuota(u.id, v, u.cuota_mensual)}
                  />
                </div>
                <div>
                  <span className="sect-label mb-1 block">Rol</span>
                  <Select
                    value={u.role}
                    onChange={(v) => changeRole(u.id, v)}
                    options={ROLE_OPTS}
                  />
                </div>
              </div>
              {u.socio && u.socio_desde && (
                <p className="mt-2 font-mono fluid-xs text-smoke">
                  Socio desde {u.socio_desde}
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {/* Desktop — tabla */}
      <div className="hidden md:block border border-rail/60 clip-notch overflow-hidden">
        <table className="w-full">
          <thead className="bg-carbon">
            <tr className="font-mono fluid-xs uppercase tracking-[.2em] text-smoke">
              <th className="text-left px-3 py-3">Jugador</th>
              <th className="text-left px-3 py-3">N°</th>
              <th className="text-left px-3 py-3">Contacto</th>
              <th className="text-center px-3 py-3">Socio</th>
              <th className="text-left px-3 py-3">Cuota</th>
              <th className="text-left px-3 py-3">Rol</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const isPending = pendingId === u.id;
              return (
                <tr
                  key={u.id}
                  className={`border-t border-rail/40 ${isPending ? "opacity-60" : ""}`}
                >
                  <td className="px-3 py-3 align-top">
                    <div className="text-bone">
                      {u.apellido}, {u.nombre}
                    </div>
                    <div className="font-mono fluid-xs text-smoke">DNI {u.dni}</div>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <input
                      inputMode="numeric"
                      maxLength={6}
                      defaultValue={u.player_number ?? ""}
                      placeholder="—"
                      onBlur={(e) => savePlayerNumber(u, e.target.value)}
                      className="w-24 bg-ink border border-rail/60 px-2 py-1.5 text-bone font-mono tracking-[.2em] fluid-xs focus:border-orange outline-none"
                    />
                    <ErrorBanner error={errorByUser[u.id]} variant="inline" className="mt-1 max-w-[10rem]" />
                  </td>
                  <td className="px-3 py-3 align-top font-mono fluid-xs text-ash">
                    <div>{u.email}</div>
                    <div className="text-smoke">{u.celular}</div>
                  </td>
                  <td className="px-3 py-3 align-top text-center">
                    <button
                      type="button"
                      onClick={() => toggleSocio(u)}
                      className={`px-3 py-1.5 font-mono fluid-xs uppercase tracking-[.2em] border transition cursor-pointer ${
                        u.socio
                          ? "bg-orange text-ink border-orange"
                          : "border-rail/60 text-ash hover:border-orange"
                      }`}
                    >
                      {u.socio ? "Sí" : "No"}
                    </button>
                    {u.socio && u.socio_desde && (
                      <div className="mt-1 font-mono fluid-xs text-smoke">
                        desde {u.socio_desde}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <CuotaControl
                      u={u}
                      cuotaDeclarada={cuotaDeclarada}
                      editando={personalizando.has(u.id)}
                      onEditar={() => startPersonalizar(u.id)}
                      onSave={(v) => finishCuota(u.id, v, u.cuota_mensual)}
                    />
                  </td>
                  <td className="px-3 py-3 align-top min-w-[10rem]">
                    <Select
                      value={u.role}
                      onChange={(v) => changeRole(u.id, v)}
                      options={ROLE_OPTS}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/**
 * Cuota de socio: bloqueada por defecto mostrando el valor (que arranca en la
 * cuota declarada en precios). El botón "Personalizar" habilita editarla.
 */
function CuotaControl({
  u,
  cuotaDeclarada,
  editando,
  onEditar,
  onSave,
}: {
  u: Usuario;
  cuotaDeclarada: number;
  editando: boolean;
  onEditar: () => void;
  onSave: (monto: number) => void;
}) {
  if (!u.socio) {
    return (
      <input
        type="number"
        disabled
        defaultValue={u.cuota_mensual}
        className="w-full md:w-24 bg-ink border border-rail/60 px-2 py-2 md:py-1.5 text-bone font-mono fluid-xs outline-none opacity-40"
      />
    );
  }
  if (editando) {
    return (
      <input
        type="number"
        min={0}
        autoFocus
        defaultValue={u.cuota_mensual}
        onBlur={(e) => onSave(Number(e.target.value) || 0)}
        className="w-full md:w-24 bg-ink border border-orange px-2 py-2 md:py-1.5 text-bone font-mono fluid-xs focus:border-orange outline-none"
      />
    );
  }
  const esPersonalizada = u.cuota_mensual !== cuotaDeclarada;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono fluid-xs text-bone tabular-nums">
        ${u.cuota_mensual.toLocaleString("es-AR")}
      </span>
      <button
        type="button"
        onClick={onEditar}
        className="font-mono text-[10px] uppercase tracking-[.15em] text-smoke hover:text-orange cursor-pointer text-left"
      >
        {esPersonalizada ? "Personalizada · editar" : "Personalizar"}
      </button>
    </div>
  );
}
