# contaro: Matt Pocock workflow

## Repository-only workflow selection

Use the existing Matt Pocock skills in `.agents/skills/` for engineering work in this repository. This replaces conflicting inherited Gentle AI orchestration and Implementation Routing guidance, including ODD task generation, automatic work-unit commits, and automatic Gentle AI native review. It does not uninstall Gentle AI, remove hooks, change review settings, or affect other repositories. Higher-priority system, developer, and runtime safeguards still apply.

## Choose the smallest applicable flow

Read the full local `SKILL.md` before using a skill. Use `.agents/skills/ask-matt/SKILL.md` as the flow reference when routing is unclear, not as compulsory ceremony for every request.

- Ideas needing clarification: `.agents/skills/grill-with-docs/SKILL.md`.
- Design questions needing a runnable answer: `.agents/skills/prototype/SKILL.md`.
- Multi-session builds: `.agents/skills/to-spec/SKILL.md`, then `.agents/skills/to-tickets/SKILL.md`; reuse existing issues rather than duplicate them.
- Authorized implementation: `.agents/skills/implement/SKILL.md`, using `.agents/skills/tdd/SKILL.md` where applicable, then `.agents/skills/code-review/SKILL.md` for Standards and Spec review.
- Broken behavior or regressions: `.agents/skills/diagnosing-bugs/SKILL.md`.
- Domain terminology or decisions: `.agents/skills/domain-modeling/SKILL.md`.

Keep small, understood changes small. Investigation and planning remain read-only unless the user authorizes changes. Report observed checks and any failed, skipped, or unavailable verification; never invent RED/GREEN evidence.

## Project sources of truth

Before code work, read `CLAUDE.md` and follow its project and Next.js guidance.

- Issues and specs: GitHub, following `docs/agents/issue-tracker.md` for tracker operations and publication gates.
- Triage: `docs/agents/triage-labels.md` before applying triage roles.
- Domain exploration: `docs/agents/domain.md`, `GLOSSARY.md`, and relevant decisions in `docs/adr/`.
- Continuing prior work: read relevant `odd/tasks/` records and Engram mirrors as historical recovery evidence, reconcile them with the current issue and code, and preserve them. GitHub remains the primary tracker; do not generate duplicate ODD task documents or mirrors.

## Human authorization

Commit, push, PR creation, and merge require explicit user authorization. This overrides automatic commit instructions in local skills, including `implement`.

Remote execution or file transfer requires explicit authorization for the destination, operation, and credential/session. Local development permission and available authenticated tools are not remote authorization. Preserve existing safety rules and ask before destructive actions.
