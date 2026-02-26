---
description: The "Ultrathink" Engine v2. A recursive, self-improving neural audit for implementation plans. Enforces architectural purity, security, and avant-garde design.
---

# Plan Refiner Workflow (The "Ultrathink" Engine v2)

This workflow is the project's **Chief Architect & Design Director**. It does not just "review" plans; it **interrogates** them. It enforces a strict "Quality or Death" philosophy. If a plan cannot survive this workflow, it is not ready for implementation.

## The Core Doctrines

### 1. Intentionality ("No Code Without Intent")
Every line of code must have a reason to exist. If the "Why" is weak, the code is deleted.

### 2. Preservation of Detail ("Additive Refinement")
**CRITICAL**: You must **NEVER remove details** from the original plan, only add to them to increase depth, clarity, and robustness.
*Exception*: Details may be removed **ONLY** if they fundamentally deviate from the core idea or violate the `user_rules`.

## Workflow Phases

### 0. Phase 0: The "Why" Interrogation (Existential Audit)
Before a single technical decision is made, ask:
-   **Value Proposition**: Does this feature actually solve a user problem, or is it just "cool"?
-   **Scope Creep**: Is this the set of features *minimum* necessary to deliver value? If not, cut it.
-   **Alignment**: Does this strictly follow `user_rules` (Intentional Minimalism, Avant-Garde)?

### 1. Phase 1: Architecture & Data First (The Blueprint)
Code is easy; State is hard. Define the data before the UI.
-   **Schema Definition**: Mandate that the plan explicitly defines data structures (Interfaces, Types) *before* UI components.
-   **State Strategy**:
    -   Global vs. Local: Justify every use of global state.
    -   URL as State: Can this state be stored in the URL query params? (Deep linking).
-   **Data Flow**: Map how data moves. Parent -> Child? Context? Zustand?

### 2. Phase 2: The "Security & Resilience" Fortress
-   **Input Validation**: ALL user inputs must be validated (Zod/Yup). No exceptions.
-   **Failure Modes**:
    -   Network: What if the API returns 500? 404? 401?
    -   Latency: What if the request takes 5 seconds? (Skeleton loaders, optimistic UI).
    -   Empty States: What if the list is empty? (No generic "No data" text; use helpful, actionable empty states).
-   **Security**: Check for XSS vectors (dangerouslySetInnerHTML) and ensure proper sanitization.

### 3. Phase 3: The "Avant-Garde UX" Refinery (Delight & A11y)
-   **Accessibility is Law**:
    -   **Keyboard**: All interactions must be keyboard accessible (Focus states, Tab index).
    -   **Screen Readers**: Aria-labels, semantic HTML (No `div` buttons).
    -   **Motion Sensitivity**: Respect `prefers-reduced-motion`.
-   **The "Delight" Layer**:
    -   **Micro-interactions**: Hover, click, and focus states must be designed, not default.
    -   **Transitions**: No hard cuts. Use `framer-motion` for layout changes.
    -   **Feedback**: Every action needs a reaction (Toast, sound, ripple).

### 4. Phase 4: The "Code Quality" Gauntlet (Maintenance)
-   **Type Safety**: `any` is forbidden. Explicit types only.
-   **Complexity Budget**: Analyze the "Cost of Ownership". If a feature adds 500 lines of complexity for 1% value, reject it.
-   **Refactoring Mandate**: **The Boy Scout Rule**: The plan MUST include a step to clean up adjacent code touched by this feature.
-   **Documentation**: Require TSDoc for every public function.

### 5. Phase 5: The "Pre-Mortem" Simulation (Risk Analysis)
Assume the feature failed in production. Why did it fail?
-   **Prediction**: "The user tried to save while offline and lost data." -> **Fix**: Implement optimistic updates with retry queue.
-   **Prediction**: "The layout broke on a Galaxy Fold." -> **Fix**: Add 320px media query check to verification.
-   **performance**: "The list is too long and frames dropped." -> **Fix**: Virtualization (TanStack Virtual) or Pagination.

### 6. Phase 6: Synthesis & Execution (The Output)
-   **Refine the `implementation_plan.md`**:
    -   **Step-by-Step**: Break down complex tasks into atomic commits.
    -   **Verification Strategy**:
        -   *Automated*: "Run `npm test src/components/MyComponent.test.ts`"
        -   *Manual*: "Open DevTools, throttle network to 'Slow 3G', click Submit, verify Toast appears."
    -   **Alerts**: Use `> [!IMPORTANT]` for breaking changes and `> [!TIP]` for optimization opportunities.

## Output Format
The final plan must be a **Masterpiece of Clarity**. Use headers, bullet points, and code blocks. It should be readable by a Junior Dev and respected by a Senior Architect.
