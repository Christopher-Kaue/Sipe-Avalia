import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="casca" style={{ display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <span className="carimbo" style={{ fontSize: 22 }}><small>Nº</small>404</span>
        <h1 style={{ fontSize: 40, margin: "24px 0 10px" }}>Página não encontrada</h1>
        <p className="discreto" style={{ marginBottom: 28 }}>O endereço não existe ou o trabalho foi removido da lista do evento.</p>
        <Link href="/avaliar" className="btn btn-primario">Buscar pelo código →</Link>
      </div>
    </main>
  );
}
