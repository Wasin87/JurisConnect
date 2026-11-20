import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import {
  BD_LEGAL_CORPUS,
  cosineSimilarity,
  scoreLexicalMatch,
  type LegalCorpusEntry,
} from './server/bdLegalCorpus.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '12mb' }));

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Cached embeddings for the verified Bangladesh legal corpus
const corpusEmbeddingsCache = new Map<string, number[]>();
let corpusWarmingPromise: Promise<void> | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

function parseGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err || 'AI service error');
  let status = 500;
  let message = raw;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.code && typeof parsed.error.code === 'number') {
      status = parsed.error.code;
    }
    if (parsed?.error?.message && typeof parsed.error.message === 'string') {
      message = parsed.error.message;
    }
  } catch {
    if (raw.includes('timed out')) status = 504;
    else if (raw.includes('503') || raw.includes('UNAVAILABLE')) status = 503;
    else if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) status = 429;
    else if (raw.includes('400') || raw.includes('API_KEY_INVALID')) status = 400;
    else if (raw.includes('403') || raw.includes('PERMISSION_DENIED')) status = 403;
  }
  if (status < 400 || status >= 600) status = 500;
  return { status, message };
}

async function runGeminiWithFastFallback<T>(
  invoke: (model: string, thinkingLevel: ThinkingLevel) => Promise<T>
): Promise<T> {
  try {
    return await withTimeout(
      invoke('gemini-4-hydrogen', ThinkingLevel.LOW),
      10000,
      'Primary Gemini model'
    );
  } catch (primaryErr) {
    const { status } = parseGeminiError(primaryErr);
    const isTransient = status === 503 || status === 504 || status === 429;
    if (!isTransient) {
      throw primaryErr;
    }
    console.warn('Primary model unavailable/slow, falling back to gemini-3.1-flash-lite');
    return await withTimeout(
      invoke('gemini-3.1-flash-lite', ThinkingLevel.MINIMAL),
      14000,
      'Fallback Gemini model'
    );
  }
}

function warmCorpusEmbeddingsInBackground(ai: GoogleGenAI) {
  if (corpusEmbeddingsCache.size === BD_LEGAL_CORPUS.length || corpusWarmingPromise) return;
  corpusWarmingPromise = (async () => {
    try {
      const missingEntries = BD_LEGAL_CORPUS.filter((e) => !corpusEmbeddingsCache.has(e.id));
      if (missingEntries.length === 0) return;
      const embedRes = await withTimeout(
        ai.models.embedContent({
          model: 'gemini-embedding-2',
          contents: missingEntries.map(
            (e) => `${e.actNameEn} (${e.actNameBn}) — ${e.section}: ${e.excerpt} ${e.summaryBn}`
          ),
        }),
        6000,
        'Corpus embedding warmup'
      );
      if (embedRes.embeddings && embedRes.embeddings.length === missingEntries.length) {
        missingEntries.forEach((entry, idx) => {
          const values = embedRes.embeddings?.[idx]?.values;
          if (Array.isArray(values) && values.length > 0) {
            corpusEmbeddingsCache.set(entry.id, values);
          }
        });
      }
    } catch {
      // Bilingual lexical retrieval remains active if embeddings service is busy
    } finally {
      corpusWarmingPromise = null;
    }
  })();
}

async function retrieveVerifiedSources(
  ai: GoogleGenAI | null,
  queryText: string,
  categoryHint?: string,
  topK = 3
): Promise<Array<{ entry: LegalCorpusEntry; score: number; method: 'hybrid-vector' | 'lexical' }>> {
  let queryVec: number[] | null = null;
  let usedVectors = false;

  if (ai) {
    warmCorpusEmbeddingsInBackground(ai);
    if (corpusEmbeddingsCache.size === BD_LEGAL_CORPUS.length) {
      try {
        const qRes = await withTimeout(
          ai.models.embedContent({
            model: 'gemini-embedding-2',
            contents: queryText.slice(0, 1500),
          }),
          2200,
          'Query embedding'
        );
        const qVals = qRes.embeddings?.[0]?.values;
        if (Array.isArray(qVals) && qVals.length > 0) {
          queryVec = qVals;
          usedVectors = true;
        }
      } catch {
        // Fallback immediately to bilingual lexical scoring
      }
    }
  }

  const ranked = BD_LEGAL_CORPUS.map((entry) => {
    const lexical = scoreLexicalMatch(queryText, entry);
    const catBoost = categoryHint && entry.category === categoryHint ? 0.15 : 0;
    let sim = 0;
    if (usedVectors && queryVec) {
      const docVec = corpusEmbeddingsCache.get(entry.id);
      if (docVec) {
        sim = cosineSimilarity(queryVec, docVec);
      }
    }
    // Normalized hybrid score (0..1+)
    const combined = usedVectors ? sim * 0.72 + Math.min(lexical / 12, 1) * 0.28 + catBoost : lexical / 10 + catBoost;
    return {
      entry,
      score: Number(combined.toFixed(3)),
      method: (usedVectors ? 'hybrid-vector' : 'lexical') as 'hybrid-vector' | 'lexical',
    };
  })
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return ranked;
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'jurisconnect-api', corpusCount: BD_LEGAL_CORPUS.length });
});

app.get('/api/rag/sources', (_req, res) => {
  res.json({
    sources: BD_LEGAL_CORPUS.map((e) => ({
      id: e.id,
      actNameEn: e.actNameEn,
      actNameBn: e.actNameBn,
      section: e.section,
      category: e.category,
      officialUrl: e.officialUrl,
    })),
  });
});

// 1. Bangla-First AI Legal Understanding & Explainable Case Assessment
app.post('/api/ai/analyze-case', async (req, res) => {
  try {
    const { title, description, category, district, submittedDocs, documentSummaries, language } = req.body ?? {};
    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      return res.status(400).json({ error: 'Case description of at least 5 characters is required.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'AI legal intelligence is unavailable because GEMINI_API_KEY is not configured in environment secrets.',
      });
    }

    const retrieved = await retrieveVerifiedSources(
      ai,
      `${title || ''} ${description} ${category || ''}`,
      typeof category === 'string' ? category : undefined,
      3
    );

    const sourcesContext = retrieved
      .map(
        (r, i) =>
          `[Source ${i + 1}: ${r.entry.actNameEn} | ${r.entry.section} | URL: ${r.entry.officialUrl}]\nExcerpt: ${r.entry.excerpt}`
      )
      .join('\n\n');

    const langInstruction =
      language === 'bn'
        ? 'Write summary, extractedFacts, missingInfo, followUpQuestions, riskNote, uncertaintyNote, and suggestedNextSteps in clear, respectful Bengali (বাংলা), keeping official statutory Act names accurate.'
        : 'Write all narrative fields in clear, precise English suitable for Bangladesh Legal Aid Officers and citizens (supporting Bangla names/terms cleanly).';

    const prompt = [
      `Analyze this citizen legal aid intake from ${district || 'Bangladesh'} (user-selected category: ${category || 'unspecified'}).`,
      `Title: ${title || 'Untitled intake'}`,
      `Original Citizen Statement (Bangla/English): ${description.slice(0, 2500)}`,
      `Checked Documents: ${Array.isArray(submittedDocs) && submittedDocs.length > 0 ? submittedDocs.join(', ') : 'None yet'}`,
      Array.isArray(documentSummaries) && documentSummaries.length > 0
        ? `Analyzed Document Evidence:\n${documentSummaries.slice(0, 5).join('\n')}`
        : 'Analyzed Document Evidence: None uploaded yet.',
      '',
      'RETRIEVED VERIFIED BANGLADESH STATUTORY SOURCES (cite ONLY from these; do NOT invent laws or sections):',
      sourcesContext,
      '',
      'Return structured explainable case intelligence:',
      '1. detectedCategory: best-fit enum among family_maintenance, land_property, domestic_violence, labor_wages, civil_dispute, criminal_defense.',
      '2. classification: specific legal classification grounded in the retrieved Bangladesh Acts.',
      '3. recommendedPriority: one of critical, high, medium, standard.',
      '4. summary: concise 2-3 sentence structured brief preserving facts without fabricating details.',
      '5. extractedFacts: up to 8 concise factual bullets directly stated in the complaint or document evidence (e.g., "Claimant: ...", "Location: ...", "Timeline/Duration: ...", "Claimed Amount/Relief: ...").',
      '6. missingInfo: up to 6 specific pieces of missing factual information needed for eligibility or legal filing.',
      '7. followUpQuestions: up to 4 clear, empathetic follow-up questions to ask the citizen.',
      '8. missingDocuments: up to 5 essential supporting documents needed for District Legal Aid Office verification.',
      '9. riskNote: safety, urgency, and ADR vs court escalation note.',
      '10. confidenceLevel: high, moderate, or low based on completeness of facts and documentary evidence.',
      '11. uncertaintyNote: honest explanation of gaps, unverified assertions, or ambiguities requiring human officer verification.',
      '12. citations: up to 3 exact Act + Section references drawn ONLY from the retrieved sources above.',
      '13. suggestedNextSteps: up to 4 advisory steps for the District Legal Aid Officer (never auto-reject).',
      '14. mediationRecommended: boolean whether pre-case/DLAO ADR mediation may be appropriate (false if immediate physical safety protection is required).',
    ].join('\n');

    const response = await runGeminiWithFastFallback((model, thinkingLevel) =>
      ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: `You are an Explainable Legal Aid Intelligence Analyst for JurisConnect in Bangladesh. ${langInstruction} Core principle: AI assists human legal-aid professionals; never invent laws, sections, or facts not present in the intake or retrieved corpus, and never present output as binding legal advice.`,
          thinkingConfig: { thinkingLevel },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedCategory: { type: Type.STRING },
            classification: { type: Type.STRING },
            recommendedPriority: { type: Type.STRING },
            summary: { type: Type.STRING },
            extractedFacts: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingInfo: { type: Type.ARRAY, items: { type: Type.STRING } },
            followUpQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingDocuments: { type: Type.ARRAY, items: { type: Type.STRING } },
            riskNote: { type: Type.STRING },
            confidenceLevel: { type: Type.STRING },
            uncertaintyNote: { type: Type.STRING },
            citations: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedNextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
            mediationRecommended: { type: Type.BOOLEAN },
          },
          required: [
            'detectedCategory',
            'classification',
            'recommendedPriority',
            'summary',
            'extractedFacts',
            'missingInfo',
            'followUpQuestions',
            'missingDocuments',
            'riskNote',
            'confidenceLevel',
            'uncertaintyNote',
            'citations',
            'suggestedNextSteps',
            'mediationRecommended',
          ],
        },
      },
    })
    );

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      return res.status(502).json({ error: 'Empty response received from Gemini API.' });
    }

    const parsed = JSON.parse(rawText);
    return res.json({
      ...parsed,
      advisoryNotice:
        language === 'bn'
          ? 'এআই-সহায়তায় প্রস্তুতকৃত পর্যালোচনা — চূড়ান্ত আইনি সিদ্ধান্ত কেবল অনুমোদিত কর্মকর্তা ও আইনজীবী গ্রহণ করবেন।'
          : 'AI-assisted advisory intelligence — authorized legal-aid officers retain all final legal decisions.',
      retrievalMethod: retrieved[0]?.method || 'lexical',
    });
  } catch (err) {
    const { status, message } = parseGeminiError(err);
    console.warn(`AI Case Analysis warning (${status}):`, message);
    return res.status(status).json({ error: message });
  }
});

// 2. AI Document Intelligence (Real Multimodal OCR & Traceable Fact Extraction)
app.post('/api/ai/analyze-document', async (req, res) => {
  try {
    const { fileName, mimeType, base64Data, language } = req.body ?? {};
    if (!base64Data || typeof base64Data !== 'string') {
      return res.status(400).json({ error: 'Document content (base64Data) is required.' });
    }

    const allowedMimeTypes = new Set([
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'text/plain',
    ]);
    const normalizedMime = mimeType === 'image/jpg' ? 'image/jpeg' : String(mimeType || '');
    if (!allowedMimeTypes.has(normalizedMime)) {
      return res.status(400).json({
        error: 'Unsupported document format. Please upload PDF, JPG, PNG, WEBP, or TXT.',
      });
    }

    // ~7.5MB raw binary cap (~10MB base64)
    if (base64Data.length > 10_500_000) {
      return res.status(400).json({
        error: 'Document exceeds maximum size limit (7 MB). Please upload a smaller scan or PDF.',
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Document Intelligence is unavailable because GEMINI_API_KEY is not configured in environment secrets.',
      });
    }

    const langInstruction =
      language === 'bn'
        ? 'Provide summary, missingFields, and traceableFact descriptions in clear Bengali (বাংলা) while preserving exact names, dates, and Bengali/English numbers from the document.'
        : 'Provide summary and descriptions in clear English while preserving exact Bengali or English names, dates, and numbers verbatim from the document.';

    const instructionText = [
      `Inspect the uploaded legal/supporting document ("${String(fileName || 'uploaded_document')}").`,
      langInstruction,
      'Perform genuine OCR and document extraction:',
      '- Identify detectedType (e.g., Marriage / Kabinnama Copy, Union Parishad Income Certificate, General Diary / FIR, Land Khatian / Deed, Legal Notice, Identity Card, or Unclear Document).',
      '- Extract important names, dates, monetary amounts, locations, and relevant document sections.',
      '- For every extracted fact, provide sourceLocation (e.g., "Page 1 · Top Header", "Clause 4", "Paragraph 2") so every fact is traceable.',
      '- NEVER fabricate or guess illegible text. If a field, seal, signature, or page is blurry or absent, state that explicitly in missingOrUnclearFields.',
    ].join('\n');

    const parts =
      normalizedMime === 'text/plain'
        ? [
            {
              text: `${instructionText}\n\nDOCUMENT TEXT:\n${Buffer.from(base64Data, 'base64').toString('utf8').slice(0, 20000)}`,
            },
          ]
        : [
            {
              inlineData: {
                mimeType: normalizedMime,
                data: base64Data,
              },
            },
            { text: instructionText },
          ];

    const response = await runGeminiWithFastFallback((model, thinkingLevel) =>
      ai.models.generateContent({
        model,
        contents: { parts },
        config: {
          systemInstruction:
            'You are a strict forensic Legal Aid Document Intelligence OCR engine. Extract only what is visibly present in the uploaded file. Every finding must include a page/section source reference. Never fabricate missing facts, dates, or signatures.',
          thinkingConfig: { thinkingLevel },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedType: { type: Type.STRING },
            summary: { type: Type.STRING },
            extractedNames: { type: Type.ARRAY, items: { type: Type.STRING } },
            extractedDates: { type: Type.ARRAY, items: { type: Type.STRING } },
            extractedAmounts: { type: Type.ARRAY, items: { type: Type.STRING } },
            traceableFindings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  fact: { type: Type.STRING },
                  sourceLocation: { type: Type.STRING },
                },
                required: ['fact', 'sourceLocation'],
              },
            },
            missingOrUnclearFields: { type: Type.ARRAY, items: { type: Type.STRING } },
            legibilityConfidence: { type: Type.STRING },
          },
          required: [
            'detectedType',
            'summary',
            'extractedNames',
            'extractedDates',
            'extractedAmounts',
            'traceableFindings',
            'missingOrUnclearFields',
            'legibilityConfidence',
          ],
        },
      },
    })
    );

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      return res.status(502).json({ error: 'Empty OCR response received from Gemini API.' });
    }

    const parsed = JSON.parse(rawText);
    return res.json(parsed);
  } catch (err) {
    const { status, message } = parseGeminiError(err);
    console.warn(`AI Document Intelligence warning (${status}):`, message);
    return res.status(status).json({ error: message });
  }
});

// 3. Bangladesh Legal RAG Query (Verified Statutory Retrieval + Grounded Synthesis)
app.post('/api/rag/query', async (req, res) => {
  try {
    const { question, category, language } = req.body ?? {};
    if (!question || typeof question !== 'string' || question.trim().length < 3) {
      return res.status(400).json({ error: 'A legal question of at least 3 characters is required.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Bangladesh Legal RAG is unavailable because GEMINI_API_KEY is not configured in environment secrets.',
      });
    }

    const retrieved = await retrieveVerifiedSources(
      ai,
      question.trim(),
      typeof category === 'string' ? category : undefined,
      3
    );

    const topScore = retrieved[0]?.score ?? 0;
    const sourcesBlock = retrieved
      .map(
        (item, idx) =>
          `[SOURCE ${idx + 1}]
ID: ${item.entry.id}
Act (EN): ${item.entry.actNameEn}
Act (BN): ${item.entry.actNameBn}
Section: ${item.entry.section}
URL: ${item.entry.officialUrl}
Verified Text: ${item.entry.excerpt}
Bangla Summary: ${item.entry.summaryBn}`
      )
      .join('\n\n');

    const langInstruction =
      language === 'bn'
        ? 'Answer in clear, formal Bengali (বাংলা) while preserving exact statutory names and section numbers.'
        : 'Answer in clear, accurate English suitable for Bangladesh citizens and legal-aid officers.';

    const response = await runGeminiWithFastFallback((model, thinkingLevel) =>
      ai.models.generateContent({
        model,
        contents: [
          `Question: ${question.trim().slice(0, 1200)}`,
          '',
          'RETRIEVED BANGLADESH LEGAL CORPUS EXCERPTS:',
          sourcesBlock,
          '',
          'Instructions:',
          '- Answer strictly using the retrieved verified sources above.',
          '- Clearly distinguish verified statutory provisions (cite exact Act & Section) from general procedural explanation.',
          '- If the retrieved corpus does not contain reliable statutory coverage for the specific question, set insufficientEvidence = true and state clearly what is outside the current corpus.',
          '- NEVER invent laws, section numbers, case citations, or court judgments.',
        ].join('\n'),
        config: {
          systemInstruction: `You are JurisConnect Bangladesh Legal RAG Engine. ${langInstruction}`,
          thinkingConfig: { thinkingLevel },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: { type: Type.STRING },
            verifiedProvisionsSummary: { type: Type.STRING },
            generalProceduralNote: { type: Type.STRING },
            insufficientEvidence: { type: Type.BOOLEAN },
            citedSourceIds: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            'answer',
            'verifiedProvisionsSummary',
            'generalProceduralNote',
            'insufficientEvidence',
            'citedSourceIds',
          ],
        },
      },
    })
    );

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      return res.status(502).json({ error: 'Empty RAG synthesis response from Gemini API.' });
    }

    const parsed = JSON.parse(rawText);
    const citedSet = new Set<string>(Array.isArray(parsed.citedSourceIds) ? parsed.citedSourceIds : []);
    const groundedCitations = retrieved
      .filter((r) => citedSet.size === 0 || citedSet.has(r.entry.id))
      .map((r) => ({
        sourceId: r.entry.id,
        actNameEn: r.entry.actNameEn,
        actNameBn: r.entry.actNameBn,
        section: r.entry.section,
        excerpt: language === 'bn' ? r.entry.summaryBn : r.entry.excerpt,
        officialUrl: r.entry.officialUrl,
        relevanceScore: r.score,
      }));

    return res.json({
      answer: parsed.answer,
      verifiedProvisionsSummary: parsed.verifiedProvisionsSummary,
      generalProceduralNote: parsed.generalProceduralNote,
      insufficientEvidence: Boolean(parsed.insufficientEvidence) || topScore < 0.25,
      retrievalMethod: retrieved[0]?.method || 'lexical',
      groundedCitations,
    });
  } catch (err) {
    const { status, message } = parseGeminiError(err);
    console.warn(`Bangladesh Legal RAG warning (${status}):`, message);
    return res.status(status).json({ error: message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });

    // Prevent Vite 8 @vite/client from opening an unsupported HMR WebSocket behind proxy
    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript');
      res.send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
  } else {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url) {
  return url;
}
export class ErrorOverlay extends HTMLElement {}
`);
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JurisConnect server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
