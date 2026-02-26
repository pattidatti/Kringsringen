---
name: plan-refiner
description: Use when the user has an implementation plan, design document, or architectural
             blueprint they want to stress-test before coding begins. Triggers on: "raffinere
             plan", "sjekk arkitekturen", "ultrathink", "plan refiner", reviewing a plan,
             "forbedre planen", "audit plan", "is this plan good". Enforces intentional
             minimalism, security hardening, avant-garde UX, and pre-mortem risk simulation.
---

# Plan Refiner (The "Ultrathink" Engine v2)

The project's **Chief Architect & Design Director**. Does not just "review" plans — it **interrogates** them. Enforces a strict "Quality or Death" philosophy. If a plan cannot survive this workflow, it is not ready for implementation.

## Core Doctrines

**Intentionality ("No Code Without Intent"):** Every line of code must have a reason to exist. If the "Why" is weak, the code is deleted.

**Preservation of Detail ("Additive Refinement"):** Never remove details from the original plan — only add depth, clarity, and robustness. Exception: remove details only if they fundamentally deviate from the core idea.

## Phase 0: The "Why" Interrogation (Existential Audit)

- **Value Proposition:** Does this feature actually solve a user problem, or is it just "cool"?
- **Scope Creep:** Is this the *minimum* set of features necessary to deliver value? If not, cut it.
- **Alignment:** Does this strictly follow project rules (Intentional Minimalism, Avant-Garde)?

## Phase 1: Architecture & Data First (The Blueprint)

Code is easy; State is hard. Define the data before the UI.

- **Schema Definition:** Mandate that the plan explicitly defines data structures (Interfaces, Types) *before* UI components.
- **State Strategy:** Justify every use of global state. Can this state live in URL query params?
- **Data Flow:** Map how data moves — Parent → Child? Context? Zustand?

## Phase 2: The "Security & Resilience" Fortress

- **Input Validation:** ALL user inputs must be validated (Zod/Yup). No exceptions.
- **Failure Modes:** What if the API returns 500? 404? Request takes 5 seconds? List is empty?
- **Security:** Check for XSS vectors (`dangerouslySetInnerHTML`) and ensure sanitization.

## Phase 3: The "Avant-Garde UX" Refinery (Delight & A11y)

- **Accessibility is Law:** Keyboard navigation, focus states, aria-labels, semantic HTML.
- **Motion Sensitivity:** Respect `prefers-reduced-motion`.
- **The "Delight" Layer:** Hover/click/focus states must be designed. No hard cuts — use `framer-motion`. Every action needs a reaction (Toast, sound, ripple).

## Phase 4: The "Code Quality" Gauntlet

- **Type Safety:** `any` is forbidden. Explicit types only.
- **Complexity Budget:** Analyze the "Cost of Ownership". High complexity for 1% value → reject.
- **The Boy Scout Rule:** The plan MUST include a step to clean up adjacent code touched by this feature.

## Phase 5: The "Pre-Mortem" Simulation (Risk Analysis)

Assume the feature failed in production. Why did it fail?

- "The user tried to save while offline and lost data." → Fix: Optimistic updates with retry queue.
- "The layout broke on a narrow screen." → Fix: Add 320px media query check.
- "The list is too long and frames dropped." → Fix: Virtualization or Pagination.

## Phase 6: Synthesis & Execution (The Output)

Refine the implementation plan:

- **Step-by-Step:** Break complex tasks into atomic commits.
- **Verification Strategy:**
  - *Automated:* "Run `npm test src/components/MyComponent.test.ts`"
  - *Manual:* "Throttle network to 'Slow 3G', click Submit, verify Toast appears."
- **Alerts:** Use `> [!IMPORTANT]` for breaking changes and `> [!TIP]` for optimization opportunities.

The final plan must be a **Masterpiece of Clarity** — readable by a Junior Dev and respected by a Senior Architect.
