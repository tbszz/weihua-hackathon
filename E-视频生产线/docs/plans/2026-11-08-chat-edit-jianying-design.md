# Chat Editing and Jianying Export

**Goal:** Add a natural chat based editing mode and export the resulting edit as a Jianying-compatible draft package, while keeping the 名场面穿越 Skill as a separate workflow.

**Architecture:** Keep the deterministic storyboard and Remotion renderer as the source of truth. Add a chat edit adapter that turns plain-language requests into bounded storyboard edits; the adapter is a domain tool boundary in the Loomi style and does not replace the agent runtime. Keep the user supplied 名场面穿越 Skill and its dedicated `Chuanyue` entry point isolated. Add a server-side export route that materializes the same storyboard, generated voice files, and source media references into a Jianying draft folder and downloadable archive.

**Tech Stack:** TypeScript, Fastify, React, Remotion, FFmpeg, PowerShell `Compress-Archive` on Windows.

---

## Interaction

The brief and storyboard screens expose a conversation box for requests such as “把第 3 段缩短到 6 秒”“删掉最后一段” or “把节奏调快一点”. The assistant returns a proposed storyboard diff, applies only bounded edits, and keeps the existing manual controls. The 名场面穿越 Skill remains an explicit separate workflow and is never treated as a template.

## Rendering

The renderer continues to use the existing TTS and QC path. It receives the edited storyboard as its render input, so existing outputs and validation remain compatible. The separate Skill continues to use `npm run chuanyue -- <project.json>` and the `Chuanyue` Remotion composition.

## Jianying package

`POST /api/export/jianying` creates a project directory containing `draft_content.json`, `draft_meta_info.json`, `manifest.json`, and a README. Video, voice, and music materials are represented as Jianying material entries and timeline segments with absolute local paths where available. The directory is compressed into a `.zip` for download. If the desktop build uses a different Jianying schema revision, the manifest preserves the source storyboard and can be regenerated without rerendering.

## Verification

Unit tests cover bounded chat edits, rejection of unsupported numerical claims, and draft package generation. The normal typecheck, test suite, and Vite build remain the final checks.
