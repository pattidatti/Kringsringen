---
description: Performs a comprehensive performance audit of the codebase and runtime.
---

# Performance Audit Workflow

This workflow assesses the application for performance bottlenecks, both in code structure and runtime behavior.

## Steps

1.  **Static Code Analysis**
    -   **Bundle Size**: Check `package.json` for heavy dependencies (e.g., Lodash where native methods suffice, moment.js vs date-fns).
    -   **Asset Check**: List all images in `public/` or `src/assets`. Flag any images > 500KB or non-WebP/AVIF formats.
    -   **React Patterns**: Scan for:
        -   Inline object/array definitions in `useEffect` dependencies (causes infinite loops).
        -   Missing `key` props in lists.
        -   Lack of `React.memo` or `useMemo` in computationally expensive components.

2.  **Runtime Analysis (Mental Simulation)**
    -   **Render Cycles**: Identify components that likely re-render too often (e.g., global state context providers wrapping the entire app without memoization).
    -   **Event Listeners**: Check for `addEventListener` without cleanup in `useEffect`.
    -   **Animation Performance**: Verify animations use `transform` and `opacity` (GPU accelerated) rather than `top`, `left`, `width`, or `height` (triggers layout thrashing).

3.  **Report Generation**
    -   Create or update `performance_audit.md` in the artifacts directory.
    -   Structure:
        -   **Executive Summary**: High-level health check.
        -   **Critical Issues**: Immediate fixes required.
        -   **Warnings**: Potential future problems.
        -   **Optimizations**: Specific code snippets to improve performance.

4.  **Action Plan**
    -   Propose a set of refactoring tasks to address the findings.
