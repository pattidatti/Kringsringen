---
description: Refines, critiques, and expands an implementation plan without removing existing content.
---

# Plan Refiner Workflow

This workflow is designed to take an existing `implementation_plan.md` (or creating one if it doesn't exist) and rigorously analyze it for gaps, edge cases, and clarity, adding detail without removing original context.

## Steps

1.  **Locate Plan**
    -   Check for `implementation_plan.md` in the artifacts directory.
    -   If it does not exist, create a basic structure based on the current user request.

2.  **Strategic Analysis (The "Ultrathink" Pass)**
    -   **Context Check**: Does the plan align with the `user_rules` (specifically "Intentional Minimalism" and "Avant-Garde Design")?
    -   **Completeness**: Are there missing steps? (e.g., "Add button" -> but where is the event handler? Where is the styling? Where is the accessibility label?)
    -   **Edge Cases**: What happens if the network fails? What if the data is empty? What if the user clicks twice?
    -   **Tech Alignment**: Does the plan use the correct stack (Tailwind, React, etc.)?

3.  **Refine & Expand**
    -   **Annotate**: Add "Implementation Details" subsections to vague steps.
    -   **Critique**: Add a "Risk Assessment" section if potential pitfalls are found.
    -   **Verify**: Add a "Verification Strategy" for every major feature (e.g., "Check console for errors", "Verify responsive layout at 320px").

4.  **Update Artifact**
    -   Write the updated content to `implementation_plan.md`.
    -   **CRITICAL**: Do NOT delete existing text unless it is factually incorrect. Prefer appending clarifications or using "Refined Strategy" subsections.
