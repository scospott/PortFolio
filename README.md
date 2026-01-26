# Portfolio – Assistant conversationnel IA (Gemini + Netlify)

Ce dépôt contient le code source de mon **portfolio personnel**, enrichi d’un **assistant conversationnel IA** destiné aux recruteurs.

**Important : ce projet utilise des Netlify Functions (serverless)**.  
Pour cette raison, le portfolio **ne fonctionne pas correctement lorsqu’il est ouvert via GitHub Pages**.

---

##  Accès au portfolio (version fonctionnelle)

**URL officielle à utiliser :**  
[**https://effulgent-toffee-8a2135.netlify.app**
](https://effulgent-toffee-8a2135.netlify.app/)
C’est **la seule URL** où :
- l’assistant conversationnel fonctionne,
- l’API serverless est accessible,
- les appels à Gemini sont opérationnels.

---

## 🧠 Fonctionnalités principales

- Portfolio statique (HTML, Tailwind CSS, JavaScript)
- Assistant conversationnel IA intégré
- Backend **serverless** via **Netlify Functions**
- Appels à l’API **Gemini**
- Architecture prête pour l’intégration d’un **RAG (Retrieval-Augmented Generation)**
- Historique de conversation côté client
- UX responsive (desktop / mobile)

---

## 🏗️ Architecture du projet

/
├── Front/ # Frontend (HTML / CSS / JS)
├── netlify/
│ └── functions/
│ └── chat.js # API serverless (assistant IA)
├── netlify.toml # Configuration Netlify
└── README.md
