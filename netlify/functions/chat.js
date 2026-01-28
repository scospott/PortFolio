/**
 * Netlify Function: chat.js
 * Strategy:
 * - Load rag/index.json once (cold start) => in-memory INDEX
 * - Embed user question (Gemini embedContent)
 * - Cosine similarity vs all chunks
 * - Select top-K
 * - Build strict context budget (truncate)
 * - Optional "no-LLM" fallback for high-confidence fact questions
 * - Generate with Gemini (generateContent) with low temp + max tokens
 * - Retry with exponential backoff on 429
 */

const fs = require("fs");
const path = require("path");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Models
const EMBEDDING_MODEL = "text-embedding-004";
const GENERATION_MODEL = "gemini-2.5-flash";

const EMBEDDING_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;
const GENERATION_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GENERATION_MODEL}:generateContent`;

// Retrieval / context budgets
const TOP_K = 6;                 // retrieve more, then we budget context
const MAX_CONTEXT_CHARS = 2600;  // hard cap for all context sent to LLM
const MAX_CHUNK_CHARS = 900;     // cap per chunk
const MIN_SCORE_FOR_CONTEXT = 0.20; // ignore irrelevant chunks

// "No-LLM" fallback
const FALLBACK_SCORE = 0.88; // high confidence threshold

// Response config
const GEN_TEMPERATURE = 0.2;

// ---------- Load index (cold start) ----------
const INDEX_PATH = path.join(__dirname, "rag", "index.json");
let INDEX = [];

try {
  const raw = fs.readFileSync(INDEX_PATH, "utf-8");
  INDEX = JSON.parse(raw);
  console.log(` Index chargé : ${INDEX.length} chunks`);
} catch (err) {
  console.error(" Impossible de charger rag/index.json", err);
  INDEX = [];
}

// ---------- Utils ----------
function json(statusCode, obj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(obj),
  };
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);

  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function normalizeQuestion(q) {
  return String(q || "").trim();
}

function isSimpleIdentityQuestion(q) {
  const s = q.toLowerCase();
  // small set, expand if needed
  return (
    s.includes("comment tu t'appelles") ||
    s.includes("comment t'appelles") ||
    s.includes("ton nom") ||
    s === "tu t'appelles comment ?" ||
    s === "c'est quoi ton nom ?" ||
    s.includes("qui es-tu") ||
    s.includes("qui es tu")
  );
}

function isProjectQuestion(q) {
  const s = q.toLowerCase();
  return (
    s.includes("tes projets") ||
    s.includes("tes projet") ||
    s.includes("projets") ||
    s.includes("projet")
  );
}

function buildSources(chunks) {
  return chunks.map(c => ({
    file: c.source_file,
    section: c.section_title,
  }));
}

// Build a strict context within MAX_CONTEXT_CHARS, with per-chunk cap.
function buildContext(topChunks) {
  let total = 0;
  const parts = [];

  for (const c of topChunks) {
    if (total >= MAX_CONTEXT_CHARS) break;

    // Only keep reasonably relevant chunks
    if (typeof c.score === "number" && c.score < MIN_SCORE_FOR_CONTEXT) continue;

    const header = `Source: ${c.source_file} / ${c.section_title}\n`;
    const allowed = Math.max(0, MAX_CHUNK_CHARS - header.length);
    let text = c.text || "";

    // per-chunk cap
    if (text.length > allowed) text = text.slice(0, allowed) + "…";

    // global cap
    const block = header + text;
    const remaining = MAX_CONTEXT_CHARS - total;

    if (block.length <= remaining) {
      parts.push(block);
      total += block.length;
    } else {
      // Add partial block if space remains
      parts.push(block.slice(0, remaining) + "…");
      total += remaining;
      break;
    }
  }

  return parts.join("\n\n---\n\n").trim();
}

async function embed(text) {
  const resp = await fetch(EMBEDDING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY,
    },
    body: JSON.stringify({
      content: { parts: [{ text }] },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Embedding Gemini (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  const emb = data?.embedding?.values;
  if (!Array.isArray(emb)) throw new Error("Embedding invalide (pas de vecteur)");
  return emb;
}

async function generateWithRetry(prompt) {
  const maxRetries = 3;
  let delayMs = 900;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const resp = await fetch(GENERATION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: GEN_TEMPERATURE,
        },
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    if (resp.status === 429 && attempt < maxRetries) {
      const retryAfter = resp.headers.get("retry-after");
      const waitMs = retryAfter ? Number(retryAfter) * 1000 : delayMs;
      console.log(`Gemini 429 (attempt ${attempt}/${maxRetries}) → wait ${waitMs}ms`);
      await new Promise(r => setTimeout(r, waitMs));
      delayMs *= 2;
      continue;
    }

    const errText = await resp.text();
    throw new Error(`Generation Gemini (${resp.status}): ${errText}`);
  }

  throw new Error("Generation Gemini: retries exhausted");
}

// ---------- Handler ----------
exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" });
  }

  if (!GEMINI_API_KEY) {
    return json(500, { error: "GEMINI_API_KEY manquante" });
  }

  if (!INDEX.length) {
    return json(500, { error: "Index RAG introuvable ou vide (rag/index.json)" });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const question = normalizeQuestion(payload.message);
  if (!question) {
    return json(400, { error: "Message manquant" });
  }

  try {
    // 1) Embed question
    const qEmbedding = await embed(question);

    // 2) Score all chunks (skip invalid)
    const scored = INDEX
      .filter(c => Array.isArray(c.embedding) && c.embedding.length)
      .map(c => ({
        ...c,
        score: cosineSimilarity(qEmbedding, c.embedding),
      }));

    if (!scored.length) {
      return json(500, { error: "Index invalide (embeddings absents)" });
    }

    // 3) Top-K
    const topChunks = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_K);

    // Debug (optional): comment out in prod
    console.log(
      "Top chunks:",
      topChunks.map(c => ({
        id: c.id,
        score: Number(c.score).toFixed(3),
        title: c.section_title,
        file: c.source_file,
      }))
    );

    // 4) Fallback without generation (high confidence)
    // For identity-like questions: if top chunk very strong, answer directly
    if (topChunks[0] && topChunks[0].score >= FALLBACK_SCORE && isSimpleIdentityQuestion(question)) {
      // Try to extract a clean first sentence/line
      const firstLine = String(topChunks[0].text || "").split("\n").find(Boolean) || "";
      const reply = firstLine.trim() || "Je ne dispose pas de cette information.";
      return json(200, {
        reply,
        sources: buildSources([topChunks[0]]),
      });
    }

    // For broad "projects" questions: we can also answer from retrieved context if confident
    if (topChunks[0] && topChunks[0].score >= FALLBACK_SCORE && isProjectQuestion(question)) {
      // Return a short summary from first chunk; still safe if it contains project list
      const snippet = String(topChunks[0].text || "").slice(0, 220).trim();
      const reply = snippet ? `${snippet}${snippet.endsWith(".") ? "" : "."}` : "Je ne dispose pas de cette information.";
      return json(200, {
        reply,
        sources: buildSources([topChunks[0]]),
      });
    }

    // 5) Build strict context
    const context = buildContext(topChunks);

    // If context ended up empty (all scores low), be honest
    if (!context) {
      return json(200, {
        reply: "Je ne dispose pas de cette information.",
        sources: [],
      });
    }

    // 6) Prompt (persona + strict grounding)
    const prompt = `
Tu es un assistant conversationnel qui répond AU NOM de Scott Thomas.
Tu incarnes Scott Thomas et tu réponds toujours à la première personne du singulier (“je”).

RÈGLES STRICTES :
- Tu réponds uniquement à partir des informations fournies ci-dessous.
- Tu ne dois jamais inventer d’informations.
- Si une information n’est pas présente, dis : "Je ne dispose pas de cette information."
- Tu ne parles jamais de documents, contexte, chunks, ni de sources internes.
- Tu ne mentionnes jamais que tu es une IA.

STYLE :
- Ton professionnel, naturel, orienté recruteur.
- Réponse courte (max 6 phrases).
- Si la question est large, propose une clarification en 1 phrase à la fin.

INFORMATIONS :
${context}

QUESTION DU RECRUTEUR :
${question}

Réponds maintenant comme Scott Thomas.
`.trim();

    // 7) Generate
    const answer = await generateWithRetry(prompt);

    // If model returns empty, fallback
    const final = String(answer || "").trim() || "Je ne dispose pas de cette information.";

    return json(200, {
      reply: final,
      sources: buildSources(topChunks),
    });
  } catch (err) {
    console.error("Erreur RAG", err);

    const msg = String(err?.message || err);
    const isRateLimit = msg.includes("(429)") || msg.includes("429");

    return json(isRateLimit ? 503 : 500, {
      error: isRateLimit
        ? "Service temporairement limité (quota). Réessaiez plus tard."
        : "Erreur interne",
    });
  }
};
