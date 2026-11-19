import { redirect } from "next/navigation";
import { existeUsuario, usuarioAtual } from "@backend/auth";

// lê o banco a cada acesso; nunca pré-renderizar no build
export const dynamic = "force-dynamic";

export default async function Inicio() {
  if (!existeUsuario()) redirect("/primeiro-acesso");
  const u = await usuarioAtual();
  if (!u) redirect("/login");
  redirect(u.perfil === "coordenacao" ? "/painel" : "/avaliar");
}
