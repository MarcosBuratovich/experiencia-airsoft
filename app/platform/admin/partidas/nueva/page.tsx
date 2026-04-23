import { NuevaPartidaForm } from "./nueva-form";

export default function NuevaPartidaPage() {
  return (
    <div className="max-w-xl mx-auto">
      <div className="mb-8">
        <p className="sect-label mb-2">Admin · crear</p>
        <h1 className="sect-title fluid-3xl">Nueva partida</h1>
      </div>
      <NuevaPartidaForm />
    </div>
  );
}
