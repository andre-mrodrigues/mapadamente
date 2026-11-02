import Anthropic from "@anthropic-ai/sdk";

// Lê as situações que a pessoa escreveu e liga cada uma às áreas do Mapa da Mente.
// Precisa da variável ANTHROPIC_API_KEY configurada no Netlify.

const AREAS = {
  soc: "Comunicação e interação social",
  sen: "Sensorial",
  rot: "Rotina e interesses intensos",
  cam: "Camuflagem social (masking)",
  bur: "Burnout e shutdown",
  tda: "Atenção e impulsividade (TDAH)",
  ahs: "Altas habilidades",
  int: "Intensidade e sentido",
  hum: "Humor cíclico",
  phq: "Depressão (últimas 2 semanas)",
  gad: "Ansiedade (últimas 2 semanas)",
  fri: "Traços frios",
};

const SCHEMA = {
  type: "object",
  properties: {
    leituras: {
      type: "array",
      items: {
        type: "object",
        properties: {
          areas: { type: "array", items: { type: "string", enum: Object.keys(AREAS) } },
          porque: { type: "string" },
          ajuda: { type: "string" },
        },
        required: ["areas", "porque", "ajuda"],
        additionalProperties: false,
      },
    },
  },
  required: ["leituras"],
  additionalProperties: false,
};

const SYSTEM = `Você escreve a parte "situações do dia a dia" do resultado do Mapa da Mente, um teste de autoconhecimento e triagem sobre neurodivergência em português do Brasil. Ele não dá diagnóstico.

Para cada situação contada pela pessoa, devolva:
- areas: de 0 a 3 códigos das áreas do teste que melhor explicam a situação, da mais forte para a mais fraca. Use as pontuações da pessoa para desempatar. Deixe vazio se a situação não tiver relação com nenhuma área.
- porque: 2 ou 3 frases explicando o mecanismo por trás da situação, ligando ao que a pessoa escreveu e às áreas escolhidas. Fale com a pessoa ("você"), em linguagem simples e acolhedora.
- ajuda: 1 ou 2 frases com algo prático que costuma ajudar, e o tipo de profissional quando fizer sentido (psiquiatra para humor, depressão e ansiedade; neuropsicólogo para autismo, TDAH e altas habilidades).

Regras: nunca afirme que a pessoa tem um transtorno; use "pode", "costuma", "conversa com". Não invente fatos sobre a vida dela além do que ela escreveu. Se a situação mencionar se machucar ou não querer viver, recomende procurar ajuda hoje e o CVV (188). Devolva uma leitura por situação, na mesma ordem.

Áreas do teste (código: nome):
${Object.entries(AREAS).map(([k, v]) => `${k}: ${v}`).join("\n")}`;

export default async (req) => {
  if (req.method !== "POST") return new Response("Use POST", { status: 405 });
  let body;
  try { body = await req.json(); } catch { return Response.json({ erro: "json inválido" }, { status: 400 }); }

  const situacoes = (Array.isArray(body.situacoes) ? body.situacoes : [])
    .map((s) => String(s || "").trim()).filter(Boolean).slice(0, 3).map((s) => s.slice(0, 600));
  if (!situacoes.length) return Response.json({ leituras: [] });

  const escores = Object.entries(body.escores || {})
    .filter(([k]) => k in AREAS)
    .map(([k, v]) => `${k}: ${String(v).slice(0, 40)}`).join("\n");

  const pedido = `Pontuações da pessoa no teste:\n${escores || "(não informadas)"}\n\nSituações contadas:\n${situacoes.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 2000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: pedido }],
    });
    if (response.stop_reason === "refusal") return Response.json({ erro: "recusado" }, { status: 422 });
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const data = JSON.parse(text);
    const leituras = (data.leituras || []).slice(0, situacoes.length).map((l) => ({
      areas: (l.areas || []).filter((a) => a in AREAS).slice(0, 3),
      porque: String(l.porque || ""),
      ajuda: String(l.ajuda || ""),
    }));
    return Response.json({ leituras });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return Response.json({ erro: "limite" }, { status: 429 });
    if (err instanceof Anthropic.AuthenticationError) return Response.json({ erro: "chave" }, { status: 500 });
    if (err instanceof Anthropic.APIError) return Response.json({ erro: "api" }, { status: 502 });
    return Response.json({ erro: "falha" }, { status: 500 });
  }
};

export const config = { path: "/api/ler-situacoes" };
