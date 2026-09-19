import fs from "fs";

const FILE = "./knowledge.json";

function loadKnowledge() {
  try {
    if (!fs.existsSync(FILE)) {
      return { articles: [] };
    }

    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch (error) {
    console.error("❌ Failed loading knowledge:", error);
    return { articles: [] };
  }
}

function saveKnowledge(data) {
  fs.writeFileSync(
    FILE,
    JSON.stringify(data, null, 2)
  );
}


// Add new article
export function addKnowledgeArticle(article) {
  const data = loadKnowledge();

  const newArticle = {
    id: Date.now(),
    title: article.title,
    category: article.category || "General",
    keywords: article.keywords,
    content: article.content,
    uses: 0,
    createdBy: article.createdBy,
    createdAt: Date.now()
  };

  data.articles.push(newArticle);

  saveKnowledge(data);

  return newArticle;
}


// Remove article
export function removeKnowledgeArticle(id) {
  const data = loadKnowledge();

  data.articles = data.articles.filter(
    article => article.id !== id
  );

  saveKnowledge(data);
}


// Get all articles
export function getKnowledgeArticles() {
  return loadKnowledge().articles;
}


// ============================================================
// SMART LOCAL SEARCH
// ============================================================

// Words that carry little meaning in support questions.
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "am", "at", "be", "been", "can", "could",
  "do", "does", "for", "from", "get", "how", "i", "if", "in", "is",
  "it", "me", "my", "of", "on", "or", "please", "the", "this", "to",
  "what", "when", "where", "which", "who", "why", "with", "would",
  "you", "your", "we", "our", "they", "them", "about"
]);

function normalizeWord(word) {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9']/g, "")
    .replace(/'s$/, "");
}

function tokenize(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .map(normalizeWord)
    .filter(word => word.length > 1 && !STOP_WORDS.has(word));
}

// Small stemmer for common support wording: "applying" → "apply",
// "developers" → "developer", "released" → "release".
function wordForms(word) {
  const forms = new Set([word]);

  if (word.endsWith("ies") && word.length > 4) forms.add(`${word.slice(0, -3)}y`);
  if (word.endsWith("ing") && word.length > 5) forms.add(word.slice(0, -3));
  if (word.endsWith("ed") && word.length > 4) forms.add(word.slice(0, -2));
  if (word.endsWith("es") && word.length > 4) forms.add(word.slice(0, -2));
  if (word.endsWith("s") && word.length > 3) forms.add(word.slice(0, -1));

  return [...forms];
}

function hasRelatedWord(words, target) {
  const targetForms = wordForms(target);

  return words.some(word => {
    const candidateForms = wordForms(word);
    return targetForms.some(form =>
      candidateForms.some(candidate =>
        candidate === form ||
        (form.length >= 5 && candidate.length >= 5 &&
          (candidate.startsWith(form) || form.startsWith(candidate)))
      )
    );
  });
}

function phraseMatches(question, phrase) {
  const normalizedQuestion = question.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const normalizedPhrase = phrase.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
  return normalizedPhrase.length > 2 && normalizedQuestion.includes(normalizedPhrase);
}

function scoreArticle(question, article) {
  const questionWords = tokenize(question);
  const keywords = Array.isArray(article.keywords) ? article.keywords : [];
  const titleWords = tokenize(article.title);
  const contentWords = tokenize(article.content);
  let score = 0;

  // Exact multi-word keyword/phrase matches are highly meaningful.
  for (const keyword of keywords) {
    if (phraseMatches(question, keyword)) score += keyword.trim().includes(" ") ? 8 : 5;
  }

  // Match the question against article fields, not just keywords.
  for (const word of questionWords) {
    if (hasRelatedWord(keywords.flatMap(tokenize), word)) score += 5;
    if (hasRelatedWord(titleWords, word)) score += 4;
    if (hasRelatedWord(contentWords, word)) score += 1;
  }

  // Reward shared concepts, but keep the threshold high enough to avoid
  // replying to unrelated ticket messages.
  const meaningfulQuestionWords = new Set(questionWords);
  const articleWords = new Set([
    ...keywords.flatMap(tokenize),
    ...titleWords,
    ...contentWords,
  ]);
  const sharedConcepts = [...meaningfulQuestionWords]
    .filter(word => hasRelatedWord([...articleWords], word)).length;

  if (sharedConcepts >= 2) score += 4;
  if (questionWords.length === 0) return 0;
  return score;
}

// Search knowledge using natural-language relevance scoring.
export function searchKnowledge(question) {
  const data = loadKnowledge();
  const articles = Array.isArray(data.articles) ? data.articles : [];
  const ranked = articles
    .map((article, index) => ({
      article,
      score: scoreArticle(question, article),
      index,
    }))
    .sort((a, b) => b.score - a.score || b.article.uses - a.article.uses || a.index - b.index);

  // Require a meaningful match instead of replying from one incidental word.
  const best = ranked[0];
  if (!best || best.score < 5) return null;

  best.article.uses = Number(best.article.uses || 0) + 1;
  saveKnowledge(data);
  return best.article;
}