# 📚 PatchWork Documentation

Welcome to the PatchWork project documentation. This directory contains comprehensive technical guides and specifications for developers, maintainers, and contributors.

---

## 🧭 Documentation Index

### Core Technical Guides

- **[Architecture Overview](ARCHITECTURE.md)**  
  System design, data flow diagrams, microservice layers, and component interactions.

- **[API Reference](API.md)**  
  Complete REST API endpoint documentation, request/response formats, error codes, and rate limits.

- **[Developer Setup & Workflow](DEVELOPER.md)**  
  Prerequisites, local development environment setup, project conventions, testing, and debugging.

- **[Deployment Guide](DEPLOYMENT.md)**  
  Production deployment procedures for Vercel, Supabase database configuration, AI key setup, and security checklists.

---

## 🏛️ Architecture Decision Records (ADRs)

Key architectural decisions documented for historical context and design rationale:

- **[ADR-001: Public Community Dashboard](adr/001-public-dashboard.md)** — Decision to keep the dashboard open and accessible without user login.
- **[ADR-002: Dual AI Intake Modes](adr/002-dual-ai-modes.md)** — Rationale for combining AI text chat with Vapi voice assistant integration.
- **[ADR-003: Supabase with Local JSON Fallback](adr/003-supabase-with-fallback.md)** — Strategy for reliable persistence with offline and zero-dependency fallback.

---

## 🚀 Quick Navigation

- Need to run the project locally? Check **[DEVELOPER.md](DEVELOPER.md)**
- Need to integrate with the API? Check **[API.md](API.md)**
- Want to understand how the AI intake works? Check **[ARCHITECTURE.md](ARCHITECTURE.md)**
- Deploying to production? Check **[DEPLOYMENT.md](DEPLOYMENT.md)**
