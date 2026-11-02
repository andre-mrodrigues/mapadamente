import { getStore } from "@netlify/blobs";

// Grava um resultado do Mapa da Mente na store "respostas" do Netlify Blobs.
// Só grava com consentimento; cada sessão vira uma chave nova (não sobrescreve).

const corta = (v, n) => String(v ?? "").slice(0, n);

export default async (req) => {
  if (req.method !== "POST") return new Response("Use POST", { status: 405 });
  let b;
  try { b = await req.json(); } catch { return Response.json({ erro: "json inválido" }, { status: 400 }); }
  if (b.consentimento !== true) return Response.json({ erro: "sem consentimento" }, { status: 400 });
  const sessao = corta(b.sessao, 64).replace(/[^a-zA-Z0-9-]/g, "");
  if (sessao.length < 8) return Response.json({ erro: "sessão inválida" }, { status: 400 });

  const registro = {
    recebido_em: new Date().toISOString(),
    sessao,
    versao: corta(b.versao, 20),
    nome: corta(b.nome, 120),
    idade: corta(b.idade, 10),
    medicacao: corta(b.medicacao, 300),
    escores: b.escores && typeof b.escores === "object" ? b.escores : {},
    respostas: Array.isArray(b.respostas) ? b.respostas.slice(0, 200) : [],
    situacoes: Array.isArray(b.situacoes) ? b.situacoes.slice(0, 3).map((s) => corta(s, 600)) : [],
    leitura_ia: Array.isArray(b.leitura_ia) ? b.leitura_ia.slice(0, 3) : null,
  };
  const texto = JSON.stringify(registro);
  if (texto.length > 100000) return Response.json({ erro: "grande demais" }, { status: 413 });

  const store = getStore("respostas");
  const chave = `${registro.recebido_em.slice(0, 10)}/${sessao}`;
  const { modified } = await store.setJSON(chave, registro, {
    onlyIfNew: true,
    metadata: { nome: registro.nome.slice(0, 60), data: registro.recebido_em },
  });
  return Response.json({ ok: true, novo: modified, chave });
};

export const config = { path: "/api/salvar-resposta" };
