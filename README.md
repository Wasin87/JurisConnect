# JurisConnect

**Bridging People to Justice.**  
An AI-powered Legal Aid Intelligence & Case Management Platform for Bangladesh.

---

## Core Architecture & Capabilities

1. **Bangla-First AI Legal Understanding (`/api/ai/analyze-case`)**
   - Converts natural Bangla and English citizen complaints into structured case intelligence (legal category, urgency triage, extracted facts, missing eligibility documents, follow-up questions, and bilingual summary).
   - Preserves the citizen's original statement verbatim alongside structured AI intelligence.

2. **AI Document Intelligence & Multimodal OCR (`/api/ai/analyze-document`)**
   - Accepts PDF, JPG, PNG, WEBP, and TXT files uploaded during intake or inside the Case Detail Drawer.
   - Extracts text, structured facts, unclear/missing fields, and legibility confidence traceable to page/section (`sourceLocation`) and stores metadata in `/cases/{caseId}/documents/{docId}`.

3. **Bangladesh Legal RAG System (`/api/rag/query`, `/api/rag/sources`)**
   - Hybrid retrieval combining `gemini-embedding-2` cosine vector similarity and bilingual Bangla/English lexical scoring over curated Bangladesh statutory sources (`server/bdLegalCorpus.ts`):
     - Legal Aid Services Act, 2000 & NLASO Eligibility Policy, 2014 (incl. Section 21A pre-case mediation)
     - Family Courts Act, 2023 & Muslim Family Laws Ordinance, 1961
     - Domestic Violence (Prevention and Protection) Act, 2010
     - Bangladesh Labour Act, 2006
     - Specific Relief Act, 1877 & State Acquisition and Tenancy Act, 1950
     - Code of Civil Procedure (Section 89A ADR) & Code of Criminal Procedure, 1898
   - Enforces anti-fabrication rules with explicit insufficient-evidence flags when statutory context is missing.

4. **Explainable AI & Human-Supervised Workflow**
   - Displays AI confidence (`high` / `medium` / `low`), uncertainty notes, extracted facts, citations, missing info, and suggested next steps inside the Case Detail Drawer.
   - Authorized officers (`dlao_officer`, `supervisor`, `admin`) can **Approve**, **Correct**, or **Override** AI assessments with mandatory rationale logged to the immutable timeline and audit trail. Zero automatic rejections occur.

5. **End-to-End Rural Unpaid Maintenance Demonstration**
   - Inside **Apply for Legal Aid** (`ApplicationWizard`), click **"Load Fictional Demo (বাংলা)"** to populate a realistic fictional rural unpaid maintenance complaint in Bangla and walk through Bangla-first AI extraction, RAG statutory grounding, submission, and DLAO officer review.

6. **Multi-Channel Intake & 6 RBAC Workspaces**
   - Channels: Online Web, UDC Assisted Desk, DLAO Referral, 16699 Helpline, and `*16699#` Offline USSD Simulator.
   - Roles: `citizen`, `dlao_officer`, `panel_lawyer`, `mediator`, `supervisor`, and `admin`, enforced in `firestore.rules` with isolated private contact PII (`/users/{uid}/private/pii`).

---

## External Services & Environment Variables

| Variable | Purpose | Where Set |
| --- | --- | --- |
| `GEMINI_API_KEY` | Server-side Gemini AI inference (`gemini-4-hydrogen`, `gemini-embedding-2`) | Runtime Secrets / `.env` (never exposed to browser) |
| `APP_URL` | Hosted Cloud Run service URL | Injected at runtime |
| Firebase (`jurisconnect-41c3e`) | Authentication, real-time Firestore database (`ai-studio-4cb8cc8a-5d52-4241-be53-8ecb884a995d`), security rules | Configured in `firebase-applet-config.json` & `firestore.rules` |

---

## Local Development & Production

```bash
# Install dependencies
npm install

# Run Express + Vite dev server on port 3000
npm run dev

# Build client bundle for production
npm run build

# Start production Express server
npm start
```
