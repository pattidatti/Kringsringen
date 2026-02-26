# Skill Creator Workflow Checklist

Use this checklist to track your progress through skill creation.

## Phase 1: Planning & Design

### Capture Intent
- [ ] Understand what the skill should do
- [ ] Identify when users should invoke this skill
- [ ] Clarify expected output format
- [ ] Decide if test cases are needed

### Interview & Research
- [ ] Ask about edge cases and failure modes
- [ ] Identify input/output formats with examples
- [ ] Define success criteria
- [ ] Check for external dependencies

## Phase 2: Draft & Test Cases

### Write SKILL.md
- [ ] Create YAML frontmatter (name, description, compatibility)
- [ ] Write clear "what it does" section
- [ ] Write "when to use" section with specific contexts
- [ ] Include step-by-step instructions or workflow
- [ ] Keep under 500 lines (reference external docs if needed)
- [ ] Explain the why, not just the what

### Create Test Cases
- [ ] Write 2-3 realistic user prompts
- [ ] Make prompts substantive, not abstract
- [ ] Include variety (different contexts, complexity levels)
- [ ] Define expected outputs (brief descriptions)
- [ ] Create assertions for each test case
- [ ] Save to `evals/evals.json`

## Phase 3: Initial Evaluation

### Run Tests
- [ ] Spawn with-skill subagent for each test case
- [ ] Spawn baseline subagent for each test case (in parallel)
- [ ] Capture timing.json from task completion notifications
- [ ] Save outputs to iteration-1 directory structure

### Create Assertions
- [ ] Draft objective, measurable assertions
- [ ] Make assertion descriptions clear and descriptive
- [ ] Add custom grading scripts if needed
- [ ] Update eval_metadata.json for each test
- [ ] Update evals/evals.json with final assertions

### Grade Outputs
- [ ] Run grader against each output
- [ ] Save grading.json with pass/fail for each assertion
- [ ] Generate benchmark.json from aggregated results
- [ ] Create benchmark.md with human-readable stats

### Review Results
- [ ] Launch eval-viewer for qualitative review
- [ ] Read output files carefully
- [ ] Look for patterns in what works/doesn't work
- [ ] Check assertions match expectations
- [ ] Wait for user feedback

## Phase 4: Iteration (Repeat as needed)

### Analyze Feedback
- [ ] Read feedback.json from eval viewer
- [ ] Identify specific complaints vs. compliments
- [ ] Generalize patterns (don't just fix individual cases)
- [ ] Decide what to change in the skill

### Improve Skill
- [ ] Update SKILL.md based on feedback
- [ ] Keep improvements lean and focused
- [ ] Explain the why in instructions
- [ ] Look for repeated work to bundle as scripts
- [ ] Don't overfit to test cases

### Rerun Tests
- [ ] Execute all test cases again into iteration-2 directory
- [ ] Run both with-skill and baseline versions
- [ ] Capture timing data
- [ ] Grade outputs with updated assertions if needed
- [ ] Generate new benchmark for comparison

### Review Again
- [ ] Launch eval-viewer with `--previous-workspace`
- [ ] Compare to previous iteration
- [ ] Assess improvement on feedback items
- [ ] Look for regressions
- [ ] Collect new feedback

### Decision Point
- [ ] User says "looks good" → Go to Phase 5
- [ ] Feedback is mostly empty → Go to Phase 5
- [ ] Still seeing issues → Loop back to Analyze Feedback

## Phase 5: Polish & Optimize

### Optimize Description (Optional but Recommended)

#### Generate Trigger Evals
- [ ] Create 20 trigger queries (mix should/should-not)
- [ ] Make should-trigger cases varied (casual, formal, different contexts)
- [ ] Make should-not-trigger cases near-misses (not obvious rejections)
- [ ] Review queries with user

#### Run Optimizer
- [ ] Execute trigger eval optimizer
- [ ] Monitor iterations and improvement
- [ ] Check final test score vs. train score (avoid overfitting)

#### Apply Result
- [ ] Update SKILL.md description with best_description
- [ ] Review before/after descriptions with user
- [ ] Note scoring improvement

## Phase 6: Final Validation

### Expand Test Set (Optional)
- [ ] Create additional test cases for coverage
- [ ] Test edge cases, uncommon scenarios
- [ ] Rerun tests at larger scale
- [ ] Verify improvements hold with more data

### Package
- [ ] Ensure skill is production-ready
- [ ] Run packaging script
- [ ] Generate `.skill` file
- [ ] Test that skill file can be installed

## Phase 7: Delivery

- [ ] Present `.skill` file to user
- [ ] Include README documenting skill
- [ ] List any dependencies or setup required
- [ ] Explain when/how to use the skill
- [ ] Provide feedback mechanism for future improvements

---

## Quick Reference: Stop Conditions

**Stop iterating when:**
- ✓ User explicitly says they're happy
- ✓ All feedback is empty (everything looks good)
- ✓ Not making progress (3+ iterations with minimal improvement)
- ✓ Resources (time, tokens) exceeded

**Always do before delivery:**
- ✓ Run full test suite (not just spot checks)
- ✓ Review description for triggering accuracy
- ✓ Create basic documentation
- ✓ Package for distribution

---

## Common Questions

**Q: How many test cases do I need?**
A: Start with 2-3 for iteration. Expand to 5-10+ for final validation.

**Q: Should assertions be strict or lenient?**
A: Objective and realistic. They should measure what matters, not nitpick.

**Q: When do I stop iterating?**
A: When user feedback is empty, or you've done 3-4 iterations without progress.

**Q: Do I need to optimize the description?**
A: Recommended. It dramatically improves triggering accuracy. Use `run_loop.py`.

**Q: Can I do this in Claude.ai?**
A: Yes, but without subagents. Run tests sequentially, skip quantitative benchmarking.

**Q: What if the skill is already pretty good?**
A: Go straight to optimize description → package.

**Q: What if results are all over the place?**
A: Test cases might be flaky. Run grader again, increase run count, or rewrite cases.
