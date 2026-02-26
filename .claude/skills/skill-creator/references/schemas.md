# Skill Creator JSON Schemas

## evals.json

```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 0,
      "prompt": "The user's task prompt",
      "expected_output": "Brief description of what success looks like",
      "files": [],
      "assertions": [
        {
          "name": "assertion_id",
          "description": "Human-readable description of what this checks",
          "type": "file_exists|row_count|contains_text|custom"
        }
      ]
    },
    {
      "id": 1,
      "prompt": "Another test prompt",
      "expected_output": "Expected result description",
      "files": ["path/to/input/file"],
      "assertions": []
    }
  ]
}
```

## eval_metadata.json (per test case)

```json
{
  "eval_id": 0,
  "eval_name": "descriptive-test-name",
  "prompt": "The user's task prompt",
  "assertions": [
    {
      "name": "output_created",
      "description": "Output file is created",
      "type": "file_exists"
    },
    {
      "name": "correct_format",
      "description": "Output is valid CSV with headers",
      "type": "csv_valid"
    }
  ]
}
```

## grading.json (per run output)

Used to record whether assertions passed or failed.

```json
{
  "expectations": [
    {
      "text": "Output file is created",
      "passed": true,
      "evidence": "File exists at /outputs/report.csv"
    },
    {
      "text": "All input rows preserved",
      "passed": false,
      "evidence": "Expected 150 rows, got 148. Rows 42 and 87 missing."
    }
  ]
}
```

**Field names are critical** - the viewer depends on exactly `text`, `passed`, and `evidence` (not `name`, `met`, `details`, etc.).

## timing.json (per run)

Captured from task completion notifications.

```json
{
  "total_tokens": 84852,
  "duration_ms": 23332,
  "total_duration_seconds": 23.3
}
```

## benchmark.json

Aggregated results across all test cases and configurations.

```json
{
  "skill_name": "my-skill",
  "iterations": [
    {
      "iteration": 1,
      "timestamp": "2025-02-26T12:34:56Z",
      "configurations": [
        {
          "name": "with_skill",
          "tests": [
            {
              "eval_id": 0,
              "eval_name": "test-name",
              "assertions": [
                {
                  "name": "assertion_name",
                  "pass_rate": 1.0,
                  "details": "passed 1/1 runs"
                }
              ],
              "tokens": {
                "mean": 45234,
                "stddev": 1234,
                "min": 43000,
                "max": 47000
              },
              "duration_seconds": {
                "mean": 12.3,
                "stddev": 0.4,
                "min": 11.8,
                "max": 12.9
              }
            }
          ],
          "overall": {
            "pass_rate": 0.95,
            "avg_tokens": 45234,
            "avg_duration_seconds": 12.3
          }
        },
        {
          "name": "without_skill",
          "tests": [...],
          "overall": {...}
        }
      ],
      "deltas": {
        "pass_rate_improvement": "+0.05",
        "token_difference": "-1200 (2.7% fewer)",
        "duration_difference": "-0.5s (3.9% faster)"
      }
    }
  ]
}
```

## feedback.json (from eval viewer)

User's qualitative feedback after reviewing test outputs.

```json
{
  "reviews": [
    {
      "run_id": "eval-0-with_skill",
      "feedback": "Great! The output looks clean and the formatting is perfect.",
      "timestamp": "2025-02-26T12:45:30Z"
    },
    {
      "run_id": "eval-0-without_skill",
      "feedback": "Missing some important columns",
      "timestamp": "2025-02-26T12:45:45Z"
    },
    {
      "run_id": "eval-1-with_skill",
      "feedback": "",
      "timestamp": "2025-02-26T12:46:00Z"
    }
  ],
  "status": "complete"
}
```

Empty feedback means the user thought it was fine.

## trigger-eval-set.json (for description optimization)

```json
[
  {
    "query": "ok so my boss sent me this xlsx file and wants me to add a profit margin column",
    "should_trigger": true
  },
  {
    "query": "write me a fibonacci function",
    "should_trigger": false
  },
  {
    "query": "extract tables from this PDF and put them in a spreadsheet",
    "should_trigger": true
  }
]
```

## Trigger Optimization Result

Output from `run_loop.py`:

```json
{
  "best_description": "Optimized description text here",
  "best_score": 0.92,
  "iterations": [
    {
      "iteration": 1,
      "description": "Original description",
      "train_score": 0.85,
      "test_score": 0.82
    },
    {
      "iteration": 2,
      "description": "Improved description v1",
      "train_score": 0.88,
      "test_score": 0.85
    }
  ]
}
```
