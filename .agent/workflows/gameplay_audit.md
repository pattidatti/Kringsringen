---
description: Audits the gameplay loops, mechanics, and "fun" factor.
---

# Gameplay Audit Workflow

This workflow focuses on the game design, mechanics implementation, and player experience (Game Feel).

## Steps

1.  **Mechanics Review**
    -   **Core Loop**: specific analysis of the `update()` loop in the main game scene.
    -   **Input Handling**: Check for input lag potential (e.g., logic dependent on complex calculations before input processing).
    -   **Collision**: Verify hitbox generation logic. Are hitboxes too large/small? (Check `Physics` configuration).
    -   **Feedback**: Does the game provide visual/audio feedback for every player action? (e.g., "Screen shake on hit", "Particle effect on jump").

2.  **Code Architecture (Game Specific)**
    -   **Delta Time**: Ensure all movement and time-based logic uses `delta` time to be frame-rate independent.
    -   **Object Pooling**: different checks for high-frequency objects (bullets, particles). Are they pooled or instantiated/destroyed every frame?
    -   **State Management**: How is game state (HP, Score) synced with UI? (Check for tight coupling vs event-driven updates).

3.  **Balance & Tuning**
    -   **Values**: Review hardcoded constants (magic numbers) for speed, damage, health. Suggest moving them to a configuration object/file.
    -   **Progression**: simple check of difficulty curves (e.g., enemy spawn rates, health scaling).

4.  **Report Generation**
    -   Create or update `gameplay_audit.md`.
    -   Sections:
        -   **Game Feel**: Subjective analysis of "juiciness".
        -   **Mechanics**: objective analysis of code correctness.
        -   **Technical Debt**: Game-specific code issues.
        -   **Recommendations**: Concrete steps to improve the game.
