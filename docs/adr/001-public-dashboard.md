# ADR-001: Public Community Dashboard (No Manager Login)

- **Status:** Accepted
- **Date:** 2026-10-23
- **Deciders:** PatchWork Team

## Context

The PatchWork platform needed a way for community members to view and track reported issues. Two approaches were considered:

1. **Private manager dashboard** with login and authentication
2. **Public community dashboard** accessible to anyone

## Decision

We chose a **public community dashboard with no manager login**. Any resident can open the dashboard to view active issues and mark them as solved.

## Consequences

### Positive
- **Lower barrier to entry** — No account creation or login required
- **Community engagement** — Residents can upvote and confirm issues
- **Transparency** — Everyone sees the same information
- **Simpler maintenance** — No user authentication system to manage
- **Faster resolution** — Anyone can mark issues as solved

### Negative
- **Less control** — Cannot restrict access to specific users
- **Potential spam** — Open to all users (mitigated by rate limiting)
- **No role-based actions** — Cannot distinguish between residents and managers

## Alternatives Considered

### Private Dashboard with Login
- **Pros:** Access control, role-based permissions, audit trail
- **Cons:** Higher complexity, slower adoption, requires user management

### Hybrid Approach
- **Pros:** Public view + private management
- **Cons:** Complex implementation, inconsistent user experience

## Implementation Notes

- Dashboard accessible at `/dashboard`
- No authentication required
- Rate limiting prevents abuse
- Upvotes tracked per device (localStorage)
- Solved reports auto-remove after 12 hours