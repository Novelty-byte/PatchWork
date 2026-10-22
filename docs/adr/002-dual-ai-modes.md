# ADR-002: Dual AI Intake Modes (Chat + Voice)

- **Status:** Accepted
- **Date:** 2026-10-23
- **Deciders:** PatchWork Team

## Context

The reporting process needed to accommodate different user preferences and accessibility needs. Two approaches were considered:

1. **Text-based chat only** — Simple but excludes non-writers and reduces accessibility
2. **Voice-only** — More accessible but intimidating for some users
3. **Both chat and voice** — Covers all user preferences

## Decision

We chose **dual AI intake modes** — both text chat and voice call — giving users the choice that best fits their situation.

## Consequences

### Positive
- **Inclusivity** — Supports both text and voice users
- **Accessibility** — Voice mode helps visually impaired users
- **Flexibility** — Users can choose based on their comfort level
- **Higher completion rates** — Users can switch modes mid-report
- **Modern UX** — Voice AI is a differentiator

### Negative
- **Higher complexity** — Two AI integration paths to maintain
- **More dependencies** — Vapi SDK adds bundle size
- **Browser compatibility** — Voice requires microphone access
- **Cost** — Vapi and Gemini API usage

## Alternatives Considered

### Text Chat Only
- **Pros:** Simpler, smaller bundle, works everywhere
- **Cons:** Excludes non-writers, less accessible

### Voice Only
- **Pros:** More natural, better accessibility
- **Cons:** Intimidating, requires microphone, not all environments

## Implementation Notes

- **Chat mode** uses Gemini API via `/api/chat`
- **Voice mode** uses Vapi Web SDK via `/api/vapi/config`
- Both modes feed the same AI intake pipeline
- Users can switch between modes freely
- Voice calls automatically transcribe to text for ticket creation