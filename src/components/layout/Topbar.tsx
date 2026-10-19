import { useState, type FormEvent } from "react";
import type { Ruta } from "../../app/ruta";
import type { Parcela } from "../../data/tipos";
import { Icon, ThemeToggle } from "../ui";
import "./layout.css";

export function Topbar({ ruta, navegar, parcelas }: {
  ruta: Extract<Ruta, { vista: "mapa" }>;
  navegar: (r: Ruta) => void;
  parcelas: Parcela[] | undefined;
}) {
  const parcela = parcelas?.find((p) => p.id === ruta.parcela);
  const estado = parcela?.estado ?? ruta.estado;
  return (
    <header className="topbar">
      {/* La marca regresa a la página de inicio */}
      <button type="button" className="brand brand--boton" onClick={() => navegar({ vista: "inicio" })} aria-label="Ir al inicio">
        <span className="brand-mark"><Icon name="leaf" size={19} /></span>
        <div><strong>AgroCebada</strong><small>FIRA · Reto 2026</small></div>
      </button>
      <nav className="breadcrumbs" aria-label="Ruta">
        <button type="button" onClick={() => navegar({ vista: "inicio" })}>Inicio</button>
        <Icon name="chevron" size={14} />
        <button type="button" className={estado ? "" : "active"} onClick={() => navegar({ vista: "mapa" })}>Zona de estudio</button>
        {estado && <><Icon name="chevron" size={14} />
          <button type="button" className={parcela ? "" : "active"} onClick={() => navegar({ vista: "mapa", estado })}>{estado}</button></>}
        {parcela && <><Icon name="chevron" size={14} /><button type="button" className="active" aria-current="page">{parcela.id}</button></>}
      </nav>
      <Buscador ids={parcelas?.map((p) => p.id) ?? []} onEncontrada={(id) => navegar({ vista: "mapa", parcela: id })} />
      <div className="dataset-badge"><span /> Datos del reto <b>{parcelas ? `${parcelas.length} parcelas` : "…"}</b></div>
      <ThemeToggle />
    </header>
  );
}

function Buscador({ ids, onEncontrada }: { ids: string[]; onEncontrada: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [error, setError] = useState(false);
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const t = q.trim().toUpperCase();
    // Acepta "AGC_011", "agc_11" o "11"
    const num = t.match(/(\d+)$/)?.[1];
    const id = ids.find((x) => x === t) ?? (num ? ids.find((x) => x === `AGC_${num.padStart(3, "0")}`) : undefined);
    if (id) { setError(false); setQ(""); onEncontrada(id); } else setError(true);
  };
  return (
    <form className="search-wrap" onSubmit={enviar} role="search">
      <div className={`search ${error ? "search--error" : ""}`}>
        <Icon name="search" size={17} />
        <input value={q} onChange={(e) => { setQ(e.target.value); setError(false); }} placeholder="Buscar parcela por ID"
          aria-label="Buscar parcela por ID" aria-invalid={error} />
        <span className="key" aria-hidden="true">↵</span>
      </div>
      {error && <div className="search-error" role="alert">Sin resultados para “{q}”</div>}
    </form>
  );
}
