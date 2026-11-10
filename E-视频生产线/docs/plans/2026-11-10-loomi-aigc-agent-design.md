# Loomi AIGC Video Agent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the existing Loomi-style video workbench into a production-shaped video content editing Agent with a registry of AIGC skills and a Magpie reverse-proxy video provider that can run safely in mock mode or against configured credits.

**Architecture:** Keep the deterministic storyboard and Remotion renderer as the source of truth. Add a small skill registry and an `industrial-aigc-video` plan builder behind a provider-neutral `VideoGenerationProvider`; the Magpie adapter implements an OpenAI-compatible `/v1/videos` task lifecycle and never retries a create request automatically. Add explicit health and task endpoints, then expose the same state in the current React workbench as an AIGC panel.

**Tech Stack:** TypeScript, Fastify, Zod, React 19, Vite, Vitest, existing Remotion renderer.

---

### Task 1: Add the skill and provider contracts

**Files:**
- Create: `src/server/skills.ts`
- Create: `src/server/magpie.ts`
- Test: `tests/aigc-agent.test.ts`
- Test: `tests/magpie.test.ts`

Write failing tests for skill discovery, claim-safe planning, Magpie request shape, and deterministic mock tasks. Run `npm test -- tests/aigc-agent.test.ts tests/magpie.test.ts` and confirm the modules are missing.

### Task 2: Implement the AIGC plan builder and Magpie adapter

Implement only the behavior covered by the tests: registry metadata, bounded plan generation, a mock provider for local demos, and a real provider that uses `MAGPIE_BASE_URL` (with optional `MAGPIE_API_KEY`) without exposing secrets in responses.

### Task 3: Expose task APIs in Fastify

**Files:**
- Modify: `src/server/main.ts`
- Modify: `.env.example`

Add `/api/aigc/skills`, `/api/aigc/health`, `/api/aigc/plan`, `/api/aigc/videos`, and `/api/aigc/videos/:id`. Persist submitted task metadata under `data/aigc/tasks`, return `202` for asynchronous generation, and provide a local mock task when Magpie is not configured.

### Task 4: Add the AIGC workbench surface

**Files:**
- Create: `src/web/AigcStudio.tsx`
- Modify: `src/main.tsx`
- Modify: `src/styles.css`

Add an AIGC panel that lists installed skills, builds a bounded plan from a topic, starts a video generation task, polls status, and makes the provider/credit mode visible. Keep the existing brief → storyboard → render flow intact.

### Task 5: Verify and document

Run `npm run typecheck`, focused tests, `npm test`, and `npm run build`. Update `README.md` with Magpie configuration, mock mode, and the exact test command. Do not claim a real external generation unless the configured provider returns a completed task with a video URL.
