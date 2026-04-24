"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSocioAction, setRolAction, setCuotaAction } from "./actions";
import { Select } from "../../components/select";

type Usuario = {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  dni: string;
  celular: string;
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

export function UsuariosList({ usuarios }: { usuarios: Usuario[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const toggleSocio = (u: Usuario) => {
    setPendingId(u.id);
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

  const saveCuota = (id: string, monto: number) => {
    setPendingId(id);
    startTransition(async () => {
      await setCuotaAction(id, monto);
      setPendingId(null);
      router.refresh();
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
                <p className="text-smoke">{u.celular}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="sect-label mb-1 block">Cuota</span>
                  <input
                    type="number"
                    min={0}
                    defaultValue={u.cuota_mensual}
                    disabled={!u.socio}
                    onBlur={(e) => {
                      const v = Number(e.target.value) || 0;
                      if (v !== u.cuota_mensual) saveCuota(u.id, v);
                    }}
                    className="w-full bg-ink border border-rail/60 px-2 py-2 text-bone font-mono fluid-xs focus:border-orange outline-none disabled:opacity-40"
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
                    <input
                      type="number"
                      min={0}
                      defaultValue={u.cuota_mensual}
                      disabled={!u.socio}
                      onBlur={(e) => {
                        const v = Number(e.target.value) || 0;
                        if (v !== u.cuota_mensual) saveCuota(u.id, v);
                      }}
                      className="w-24 bg-ink border border-rail/60 px-2 py-1.5 text-bone font-mono fluid-xs focus:border-orange outline-none disabled:opacity-40"
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
