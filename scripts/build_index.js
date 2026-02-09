require("dotenv").config();

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
console.log(GEMINI_API_KEY ? "GEMINI_API_KEY chargée" : "GEMINI_API_KEY absente");



// Chemins
const CHUNKS_FILE = path.join(__dirname, "..", "rag", "chunks.json");
const OUTPUT_FILE = path.join(__dirname, "..", "rag", "index.json");

// Config Gemini
const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent`;

if (!GEMINI_API_KEY) {
  throw new Error("Variable d'environnement GEMINI_API_KEY manquante");
}

// Overlap
const OVERLAP_CHARS = 300;


// Ajoute un overlap du chunk précédent 
function applyOverlap(chunks) {
  const result = [];

  for (let i = 0; i < chunks.length; i++) {
    const current = chunks[i];
    const previous = chunks[i - 1];

    let text = current.text;

    if (
      previous &&
      previous.source_file === current.source_file
    ) {
      const overlap = previous.text.slice(-OVERLAP_CHARS);
      text = `${overlap}\n\n${text}`;
    }

    result.push({ ...current, text });
  }

  return result;
}

// Appel API Gemini pour embeddings
async function embedText(text) {
  const resp = await fetch(EMBEDDING_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY,
    },
    body: JSON.stringify({
      content: {
        parts: [{ text }],
      },
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Erreur embedding Gemini: ${resp.status} ${err}`);
  }

  const data = await resp.json();

  const embedding = data?.embedding?.values;
  if (!Array.isArray(embedding)) {
    throw new Error("Embedding invalide reçu de Gemini");
  }

  return embedding;
}

// Hash stable 
function hashText(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}


async function buildIndex() {
  if (!fs.existsSync(CHUNKS_FILE)) {
    throw new Error("chunks.json introuvable. Lance build_chunks.js d'abord.");
  }

  const raw = fs.readFileSync(CHUNKS_FILE, "utf-8");
  const chunks = JSON.parse(raw);

  console.log(`${chunks.length} chunks chargés`);

  const chunksWithOverlap = applyOverlap(chunks);
  const index = [];

  for (let i = 0; i < chunksWithOverlap.length; i++) {
    const chunk = chunksWithOverlap[i];
    console.log(`🔹 Embedding ${chunk.id} (${i + 1}/${chunksWithOverlap.length})`);

    const embedding = await embedText(chunk.text);

    index.push({
      id: chunk.id,
      text: chunk.text,
      embedding,
      source_file: chunk.source_file,
      section_title: chunk.section_title,
      type: chunk.type,
      hash: hashText(chunk.text),
    });

    // Petite pause pour éviter le rate limit
    await new Promise(r => setTimeout(r, 120));
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2), "utf-8");

 
}

// Lancement
buildIndex().catch(err => {
  console.error(" Erreur build_index:", err.message);
  process.exit(1);
});
