

const fs = require("fs");
const path = require("path");

const KNOWLEDGE_DIR = path.join(__dirname, "..", "knowledge");
const OUTPUT_DIR = path.join(__dirname, "..", "rag");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "chunks.json");

const FILE_TYPE_MAP = {
  "about.md": "about",
  "projects_deep_dive.md": "project",
  "experience_star.md": "star",
  "faq_recruiter.md": "faq",
};

function cleanText(text) {
  return text
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Découpe un fichier markdown en sections ##
function splitBySections(markdown) {
  const lines = markdown.split("\n");
  const sections = [];

  let currentTitle = null;
  let currentContent = [];

  for (const line of lines) {
    if (line.startsWith("## ")) {
      // Sauvegarder la section précédente
      if (currentTitle) {
        sections.push({
          title: currentTitle,
          content: cleanText(currentContent.join("\n")),
        });
      }
      currentTitle = line.replace("## ", "").trim();
      currentContent = [];
    } else if (!line.startsWith("# ")) {
      // Ignorer les titres H1
      currentContent.push(line);
    }
  }

  // Dernière section
  if (currentTitle) {
    sections.push({
      title: currentTitle,
      content: cleanText(currentContent.join("\n")),
    });
  }

  return sections;
}

// Programme principal
function buildChunks() {
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    throw new Error("Le dossier Knowledge/ est introuvable.");
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }

  const chunks = [];
  let globalIndex = 1;

  const files = fs.readdirSync(KNOWLEDGE_DIR).filter(f => f.endsWith(".md"));

  for (const file of files) {
    const filePath = path.join(KNOWLEDGE_DIR, file);
    const raw = fs.readFileSync(filePath, "utf-8");

    const type = FILE_TYPE_MAP[file] || "unknown";
    const sections = splitBySections(raw);

    sections.forEach((section, idx) => {
      if (!section.content) return;

      chunks.push({
        id: `${type}_${String(globalIndex).padStart(3, "0")}`,
        text: section.content,
        source_file: file,
        section_title: section.title,
        type,
      });

      globalIndex++;
    });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(chunks, null, 2), "utf-8");


}

buildChunks();
