"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setSocioAction, setRolAction, setCuotaAction } from "./actions";

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
    <div className="border border-rail/60 clip-notch overflow-hidden">
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
              <tr key={u.id} className={`border-t border-rail/40 ${isPending ? "opacity-60" : ""}`}>
                <td className="px-3 py-3">
                  <div className="text-bone">{u.apellido}, {u.nombre}</div>
                  <div className="font-mono fluid-xs text-smoke">DNI {u.dni}</div>
                </td>
                <td className="px-3 py-3 font-mono fluid-xs text-ash">
                  <div>{u.email}</div>
                  <div className="text-smoke">{u.celular}</div>
                </td>
                <td className="px-3 py-3 text-center">
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
                    <div className="mt-1 font-mono fluid-xs text-smoke">desde {u.socio_desde}</div>
                  )}
                </td>
                <td className="px-3 py-3">
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
                <td className="px-3 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="bg-ink border border-rail/60 px-2 py-1.5 text-bone font-mono fluid-xs uppercase tracking-[.15em] focus:border-orange outline-none"
                  >
                    <option value="jugador">Jugador</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super</option>
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
