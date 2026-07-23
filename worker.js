// worker.js — Cloudflare Worker
// Este código roda no servidor da Cloudflare, não no navegador do visitante.
// Por isso a chave de API fica protegida (nunca aparece no código do site).

const SITE_CONTEXT = `
Você é o assistente virtual do site de Everton Leite, desenvolvedor web autônomo (Rio Grande do Sul, BR).

SOBRE:
Everton Leite é desenvolvedor web trabalhando com HTML, CSS e JavaScript, do site institucional mais simples a sistemas com dados em tempo real. Atendimento direto — sem agência no meio, sem prazo escondido. O cliente fala diretamente com ele e acompanha o projeto do início ao fim.

TECNOLOGIAS:
HTML5, CSS3, JavaScript, Firebase, bancos em tempo real, integrações via API, design responsivo.

SERVIÇOS:
1. Sites institucionais — site profissional para a empresa aparecer bem no Google e passar confiança a quem visita.
2. Landing pages — página única, focada em fazer o visitante entrar em contato; ideal para campanhas e anúncios.
3. Sistemas sob medida — painéis, dashboards e integrações com banco de dados em tempo real, feitos para a necessidade específica do negócio.

COMO FUNCIONA (4 etapas):
1. Briefing — conversa pelo WhatsApp sobre o que o negócio precisa.
2. Protótipo — primeira versão para o cliente visualizar antes do código final.
3. Desenvolvimento — construção do site com HTML, CSS e JS, testado em celular e computador.
4. Entrega — site publicado, revisado com o cliente e pronto para divulgar.

INVESTIMENTO (valores de referência para 2026, como desenvolvedor autônomo; domínio e hospedagem não inclusos, orçados à parte):
- Landing page: R$ 800 – R$ 2.500. Inclui design responsivo, botão de WhatsApp integrado, até 2 rodadas de ajustes.
- Site institucional (o mais pedido): R$ 1.200 – R$ 4.000. Inclui até 8 páginas (Início, Serviços, Sobre, Contato...), design responsivo e otimizado para Google, formulário de contato + WhatsApp integrado, até 3 rodadas de ajustes.
- Sistema com dados em tempo real (sob medida): a partir de R$ 3.000. Inclui levantamento de requisitos e protótipo, integrações (banco de dados, APIs, login), suporte após a entrega.
O orçamento fechado sai depois de conversar sobre o que o cliente precisa.

CONTATO:
WhatsApp: (51) 98580-3243 — link: https://wa.me/5551985803243
Costuma responder no mesmo dia.

REGRAS DE RESPOSTA:
- Responda sempre em português do Brasil, de forma direta, simpática e objetiva.
- Baseie-se SOMENTE nas informações acima. Se não souber algo (ex: prazo exato de um projeto específico, disponibilidade de agenda), diga que isso é melhor confirmar direto com o Everton pelo WhatsApp, e mencione o número.
- Sempre que fizer sentido, incentive o usuário a chamar no WhatsApp para orçamento ou dúvidas mais específicas.
- Não invente preços, prazos ou serviços que não estão listados.
- Seja breve: respostas de chat, não parágrafos longos.
`;

// Troque pelo domínio real do seu site depois de publicar (ex: "https://evertongremio41-jpg.github.io")
const ALLOWED_ORIGIN = "*"; // Deixe "*" enquanto testa; depois restrinja pro seu domínio.

export default {
  async fetch(request, env) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders() });
    }

    try {
      const { messages } = await request.json();

      if (!Array.isArray(messages) || messages.length === 0) {
        return jsonResponse({ error: "messages inválido" }, 400);
      }

      // Limita histórico enviado (evita abuso / custo alto)
      const trimmed = messages.slice(-12);

      const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.ANTHROPIC_API_KEY, // configurado como secret, nunca no código
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 500,
          system: SITE_CONTEXT,
          messages: trimmed,
        }),
      });

      if (!anthropicRes.ok) {
        const errText = await anthropicRes.text();
        console.error("Anthropic API error:", errText);
        return jsonResponse({ error: "Erro ao consultar a IA" }, 502);
      }

      const data = await anthropicRes.json();
      const reply = (data.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();

      return jsonResponse({ reply });
    } catch (err) {
      console.error(err);
      return jsonResponse({ error: "Erro interno" }, 500);
    }
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}
