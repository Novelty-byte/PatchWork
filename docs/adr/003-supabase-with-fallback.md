# ADR-003: Supabase Database with Local JSON Fallback

- **Status:** Accepted
- **Date:** 2026-10-23
- **Deciders:** PatchWork Team

## Context

The platform needed reliable data persistence while remaining functional in various deployment scenarios. Two approaches were considered:

1. **Supabase only** — Requires external dependency, fails if Supabase is down
2. **Local JSON only** — Simple but doesn't scale for production
3. **Supabase primary with JSON fallback** — Best of both worlds

## Decision

We chose **Supabase as the primary database with a local JSON file as fallback**. The system automatically uses Supabase when configured and falls back to local storage when it's not available or fails.

## Consequences

### Positive
- **Reliability** — Works even if Supabase is unavailable
- **Flexibility** — Supports both production and development scenarios
- **No vendor lock-in** — Data is also stored locally
- **Easy testing** — Can test without external dependencies
- **Graceful degradation** — Automatic fallback on errors

### Negative
- **Data inconsistency** — Local and Supabase data can diverge
- **Complexity** — Two storage paths to maintain
- **Limited scalability** — JSON file doesn't scale for large datasets
- **No real-time sync** — Local changes don't propagate to Supabase

## Alternatives Considered

### Supabase Only
- **Pros:** Single source of truth, real-time features, scales well
- **Cons:** External dependency, fails if unavailable

### Local JSON Only
- **Pros:** Simple, no external dependencies, fast
- **Cons:** Doesn't scale, no real-time features, single point of failure

## Implementation Notes

- **Primary storage**: Supabase PostgreSQL with `reports` table
- **Fallback storage**: `data/reports.json` file
- **Automatic fallback**: On Supabase errors, system uses local data
- **Write-through**: Data is written to both local and Supabase
- **Read-through**: Reads from Supabase first, falls back to local
- **GPS coordinates**: Stored in location string (not as separate columns in Supabase)