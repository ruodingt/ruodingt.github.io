---
layout: post
title: "Production-Grade Agentic Patterns with Claude"
subtitle: "How to choose the right architecture — and when a $1/M-token model beats a $10/M-token one"
description: "A practical guide to four agentic patterns (routing, orchestrator-workers, evaluator-optimizer, autonomous agent) with a production design for support-ticket triage using Claude."
date: 2026-08-11
---

A single prompt is not enough. You need classification, then routing, then maybe iteration, then validation. The question is not "should I use an agent?" — it is "which pattern, and how do I not burn money doing it?"

This post covers four patterns, maps each to Claude's API, and designs a real triage system to show which fits and why.

---

## The Four Patterns

### 1. Routing Workflow

A classifier picks one of N fixed handlers. Your code does the routing — the LLM only labels.

Use when outcomes are finite, each branch needs different logic, and you need predictable cost.

**Claude features:**

- **`tool_choice` + `strict: true`**: Force the model to call one tool that returns a structured label. The schema is enforced — no malformed output.
- **Prompt caching**: System prompt and tool definition are identical across requests. Cache them; only the input varies.

<div class="mermaid">
flowchart LR
    T[Ticket] --> C{Classifier\nHaiku 4.5}
    C -->|critical| H1[Critical Handler]
    C -->|high| H2[High Handler]
    C -->|medium| H3[Medium Handler]
    C -->|low| H4[Low Handler]
    C -->|info| H5[Info Handler]
</div>

Cost: one LLM call per request.

```python
import anthropic

client = anthropic.Anthropic()

# Force the model to call exactly one tool — no free-form text escape
response = client.messages.create(
    model="claude-haiku-4-5",
    max_tokens=512,
    tools=[{
        "name": "classify",
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {"type": "string", "enum": ["billing", "technical", "general"]}
            },
            "required": ["category"],
            "additionalProperties": False,
        },
    }],
    tool_choice={"type": "any", "disable_parallel_tool_use": True},
    messages=[{"role": "user", "content": ticket_text}],
)
label = next(b for b in response.content if b.type == "tool_use").input["category"]
# Route in code — no second LLM call
```

---

### 2. Orchestrator-Workers

An orchestrator decomposes a task into subtasks, dispatches them to workers in parallel, and synthesises the results — all within one agentic conversation.

Use when a single prompt is not enough, subtasks are independent, and different subtasks need different tools.

**Claude features:**

- **Parallel tool use**: Multiple tool calls in a single response — fan-out without extra round trips.
- **Batch API**: For offline workloads, fan out via the Message Batches API at 50% cost.

<div class="mermaid">
flowchart TD
    O[Orchestrator\nSonnet 5] -->|parallel tool calls| W1[Worker 1]
    O -->|parallel tool calls| W2[Worker 2]
    O -->|parallel tool calls| W3[Worker 3]
    O -->|parallel tool calls| W4[Worker 4]
    W1 --> S[Synthesise\nsame conversation]
    W2 --> S
    W3 --> S
    W4 --> S
</div>

Cost: one conversation with N tool invocations. If workers are separate API calls (different models), add N calls.

```python
import anthropic

client = anthropic.Anthropic()

# Define worker tools
tools = [
    {"name": "search_docs", "input_schema": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]}},
    {"name": "check_status", "input_schema": {"type": "object", "properties": {"service": {"type": "string"}}, "required": ["service"]}},
    {"name": "query_database", "input_schema": {"type": "object", "properties": {"sql": {"type": "string"}}, "required": ["sql"]}},
]

# Claude calls multiple tools in parallel — one API call, fan-out
response = client.messages.create(
    model="claude-sonnet-5",
    max_tokens=1024,
    tools=tools,
    messages=[{"role": "user", "content": "Investigate why user #4521 can't log in."}],
)
# response.content contains multiple tool_use blocks
# Execute each, send results back, Claude synthesises
```

---

### 3. Evaluator-Optimiser Loop

One LLM generates, another evaluates, and the loop repeats until the output passes. Same model or different — what matters is the feedback loop.

Use when quality matters more than latency and the evaluation criteria are objective enough for an LLM to judge.

**Claude features:**

- **Multi-turn conversation**: Generator and evaluator share a conversation. The 1M context window absorbs many iterations.
- **Adaptive thinking**: Enable thinking on the evaluator so it reasons before giving feedback.
- **Strict tool use**: Force the evaluator to return `{pass: bool, feedback: string}`.

<div class="mermaid">
flowchart LR
    G[Generator] -->|output| E{Evaluator}
    E -->|pass| D[Done]
    E -->|feedback| G
</div>

Cost: two calls per iteration, three to five iterations typical.

```python
import anthropic

client = anthropic.Anthropic()

EVAL_TOOL = {
    "name": "evaluate",
    "strict": True,
    "input_schema": {
        "type": "object",
        "properties": {
            "pass": {"type": "boolean"},
            "feedback": {"type": "string"},
        },
        "required": ["pass", "feedback"],
        "additionalProperties": False,
    },
}

messages = [{"role": "user", "content": "Write a Python function that validates email addresses."}]

for _ in range(5):
    # Generate
    gen = client.messages.create(model="claude-sonnet-5", max_tokens=1024, messages=messages)
    output = next(b.text for b in gen.content if b.type == "text")
    messages.append({"role": "assistant", "content": output})

    # Evaluate
    ev = client.messages.create(
        model="claude-sonnet-5", max_tokens=512,
        tools=[EVAL_TOOL], tool_choice={"type": "any", "disable_parallel_tool_use": True},
        system="Evaluate the code against: correctness, edge cases, readability.",
        messages=messages + [{"role": "user", "content": "Evaluate the code above."}],
    )
    verdict = next(b for b in ev.content if b.type == "tool_use").input
    if verdict["pass"]:
        break
    messages.append({"role": "user", "content": f"Revise: {verdict['feedback']}"})
```

---

### 4. Autonomous Agent

An LLM with tools running in a loop — observe, reason, act — until the task is done or the budget runs out. The model decides what to do next at every step.

Use when the task is open-ended, you cannot predict the steps in advance, and the agent needs to interact with external systems.

**Claude features:**

- **Tool Runner**: The SDK's built-in agentic loop. No hand-written while-loop.
- **Computer use / Browser use**: GUI interaction.
- **Memory tool**: Persist state across sessions.

<div class="mermaid">
flowchart LR
    A[Observe] --> B[Reason\nClaude]
    B --> C[Act\ntool call]
    C --> A
    B -->|task complete| D[Done]
</div>

Cost: variable. Set iteration limits in your loop and `max_tokens` per call.

```python
import anthropic

client = anthropic.Anthropic()

# Define tools the agent can use
tools = [
    {"name": "read_file", "input_schema": {"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}},
    {"name": "run_query", "input_schema": {"type": "object", "properties": {"sql": {"type": "string"}}, "required": ["sql"]}},
    {"name": "send_email", "input_schema": {"type": "object", "properties": {"to": {"type": "string"}, "body": {"type": "string"}}, "required": ["to", "body"]}},
]

# Hand-written agentic loop — or use the Tool Runner SDK (see below)
messages = [{"role": "user", "content": "Find all users who churned last month and email them a win-back offer."}]

for _ in range(10):  # iteration limit
    response = client.messages.create(model="claude-sonnet-5", max_tokens=1024, tools=tools, messages=messages)
    if response.stop_reason == "end_turn":
        break  # task complete
    messages.append({"role": "assistant", "content": response.content})
    # Execute each tool call, send results back
    tool_results = []
    for block in response.content:
        if block.type == "tool_use":
            result = execute_tool(block.name, block.input)  # your implementation
            tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": result})
    messages.append({"role": "user", "content": tool_results})
```

Or skip the loop entirely with the **Tool Runner** SDK abstraction:

```python
# Tool Runner handles the agentic loop for you
runner = client.beta.messages.tool_runner(
    tools=[read_file_tool, run_query_tool, send_email_tool],  # BetaTool objects with handlers
    params=anthropic.BetaMessageNewParams(
        model="claude-sonnet-5",
        max_tokens=1024,
        messages=[{"role": "user", "content": "Find churned users and email them."}],
    ),
)
for message in runner:
    pass  # tools execute automatically
final = message  # final response
```

---

## Pattern Selection

| Criterion | Routing | Orchestrator-Workers | Evaluator-Optimiser | Autonomous Agent |
|---|---|---|---|---|
| Task shape | Fixed path | Parallel subtasks | Iterative refinement | Open-ended |
| LLM calls | 1 | 1 conversation + N tools | 2 × iterations | Variable |
| Latency | Low | Medium | High | Unpredictable |
| Cost | Low | Medium | High | Variable |
| Best for | Classification, triage | Multi-step research | Code gen, writing | Exploration |
| Claude fit | `tool_choice` + strict | Parallel tool use | Multi-turn + thinking | Tool Runner |

---

## Case Study: Support-Ticket Triage

### The problem

> A support-ticket system needs Claude to triage each ticket: classify severity, then route to one of five fixed downstream handlers. The number of steps and their order never varies.

This is a routing workflow: fixed outcomes, deterministic path, latency-sensitive, cost-sensitive. Orchestrator-workers has nothing to decompose. Evaluator-optimiser adds latency for no quality gain — classification does not benefit from self-critique. An autonomous agent is unpredictable and expensive.

### Architecture

<div class="mermaid">
flowchart TD
    Q[API Gateway / Queue] --> I[Ticket Ingestion Service]
    I -->|enriched ticket| C{Step 1: Classify\nClaude Haiku 4.5\nstrict tool use}
    C -->|severity label| R{Step 2: Route\npure code — no LLM}
    R -->|critical| H1[Critical Handler\nPage on-call · War room\nExec notify · SLA 15m]
    R -->|high| H2[High Handler\nAssign senior · Urgent ticket\nNotify lead · SLA 1h]
    R -->|medium| H3[Medium Handler\nQueue sprint · Notify PM\nSLA 8h]
    R -->|low| H4[Low Handler\nAuto-reply template\nSLA 24h]
    R -->|info| H5[Info Handler\nRAG search KB · Return docs\nSLA 24h]
</div>

### Why Haiku 4.5

Classification is shallow pattern matching with a tight schema. You do not need Opus at $5/$25 per MTok or Sonnet at $2/$10.

| Model | Input | Output | Quality for this task | Latency |
|---|---|---|---|---|
| Claude Haiku 4.5 | $1/MTok | $5/MTok | Excellent | Fastest |
| Claude Sonnet 5 | $2/MTok | $10/MTok | Marginal gain | Fast |
| Claude Opus 5 | $5/MTok | $25/MTok | Overkill | Moderate |

With `strict: true`, Haiku reliably produces well-structured output. If misclassification exceeds your tolerance, improve the prompt and add few-shot examples before upgrading the model — a well-prompted Haiku often beats a poorly-prompted Sonnet.

### Implementation

```python
import anthropic

client = anthropic.Anthropic()

CLASSIFY_TOOL = {
    "name": "classify_ticket",
    "strict": True,
    "description": "Classify a support ticket by severity and extract metadata.",
    "input_schema": {
        "type": "object",
        "properties": {
            "severity": {
                "type": "string",
                "enum": ["critical", "high", "medium", "low", "info"],
            },
            "product_area": {"type": "string"},
            "customer_sentiment": {
                "type": "string",
                "enum": ["frustrated", "neutral", "calm"],
            },
            "requires_escalation": {"type": "boolean"},
            "reasoning": {"type": "string"},
        },
        "required": [
            "severity", "product_area", "customer_sentiment",
            "requires_escalation", "reasoning",
        ],
        "additionalProperties": False,
    },
}

SYSTEM_PROMPT = """You are a support ticket classifier for a SaaS company.

Given a support ticket, determine:
1. Severity (critical/high/medium/low/info)
2. Which product area is affected
3. Customer sentiment
4. Whether this requires escalation

Guidelines:
- critical: system outage, data loss, security breach, complete service failure
- high: major feature broken, significant business impact, payment failures
- medium: feature partially working, degraded performance, workaround exists
- low: minor bug, cosmetic issue, feature request
- info: how-to question, documentation request, general inquiry

Escalate if: severity is critical, customer is on enterprise plan,
or sentiment is frustrated with high severity."""


def classify_ticket(ticket_text: str, customer_tier: str = "standard") -> dict:
    response = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=512,
        tools=[CLASSIFY_TOOL],
        tool_choice={"type": "any", "disable_parallel_tool_use": True},
        system=SYSTEM_PROMPT,
        messages=[{
            "role": "user",
            "content": f"Customer tier: {customer_tier}\n\nTicket:\n{ticket_text}",
        }],
    )
    tool_block = next(b for b in response.content if b.type == "tool_use")
    return tool_block.input


# Routing — pure code, no LLM

HANDLERS = {
    "critical": lambda t, c: {
        "actions": ["page_oncall", "create_incident", "notify_exec", "war_room"],
        "sla_minutes": 15,
    },
    "high": lambda t, c: {
        "actions": ["assign_senior", "create_urgent_ticket", "notify_lead"],
        "sla_minutes": 60,
    },
    "medium": lambda t, c: {
        "actions": ["queue_next_sprint", "notify_pm"],
        "sla_minutes": 480,
    },
    "low": lambda t, c: {
        "actions": ["auto_reply_template"],
        "sla_minutes": 1440,
    },
    "info": lambda t, c: {
        "actions": ["rag_search_kb", "return_docs"],
        "sla_minutes": 1440,
    },
}


def triage_ticket(ticket: dict) -> dict:
    classification = classify_ticket(
        ticket["body"],
        customer_tier=ticket.get("customer_tier", "standard"),
    )
    handler = HANDLERS[classification["severity"]]
    return {
        "ticket_id": ticket["id"],
        "classification": classification,
        "handler_result": handler(ticket, classification),
    }
```

### Cost

10K tickets/day. System prompt + tool definition (~1,500 tokens with few-shot examples) cached. Each ticket: ~300 tokens unique input, ~200 output.

| Model | Daily | Monthly |
|---|---|---|
| Haiku 4.5 | ~$10.50 | ~$315 |
| Sonnet 5 | ~$21 | ~$630 |
| Opus 5 | ~$52.50 | ~$1,575 |

Haiku saves $1,260/month vs Opus. Quality difference: negligible.

### Prompt caching

The cached prefix (~1,500 tokens with examples) falls short of Haiku's 4,096-token minimum. Two fixes:

1. **More examples.** Ten to fifteen few-shot cases covering edge cases exceed the threshold and improve accuracy.
2. **More context.** Add a product taxonomy or common-issue list to the system prompt — useful for the model and padding for the cache.

Once over the threshold, cache reads cost $0.10/MTok instead of $1/MTok — 90% cheaper on the cached portion.

### Production notes

- **Fallback**: If Haiku fails or returns garbage, keyword-based classification as a safety net.
- **Escalation**: If the classifier's reasoning mentions uncertainty, route to a human.
- **Monitoring**: Log every classification. Sample and human-validate periodically. Re-prompt or upgrade if accuracy drops.
- **Batch**: Non-urgent tickets (feature requests, info queries) via the Batch API at 50% cost.

### The plumbing: LiteLLM

The blog recommends Haiku for classification and Sonnet for generation — two models for two jobs. That creates three operational problems: two SDK integrations, no observability, and no resilience if Claude's API goes down.

[LiteLLM](https://github.com/BerriAI/litellm) solves all three. It is an open-source library that gives you one `completion()` interface for 100+ LLM providers, plus a self-hosted proxy server with virtual keys, spend tracking, guardrails, and an admin UI.

**Unified interface.** Same code, different model string:

```python
import litellm

# One callback for per-model cost, latency, and token counts
litellm.success_callback = ["langfuse"]

# Classification — Haiku
response = litellm.completion(
    model="anthropic/claude-haiku-4-5",
    tools=[CLASSIFY_TOOL],
    tool_choice={"type": "any", "disable_parallel_tool_use": True},
    messages=[...],
)

# Generation — Sonnet
response = litellm.completion(
    model="anthropic/claude-sonnet-5",
    messages=[...],
)
```

**Monitoring.** One line — `litellm.success_callback = ["langfuse"]` — gives you per-model cost, latency, token counts, and error rates. This is how you answer "is Haiku's misclassification rate acceptable?" with data, not vibes. Integrations include Langfuse, MLflow, Helicone, and OpenTelemetry.

**Fallback routing.** If Claude's API is down, LiteLLM routes to a fallback provider automatically:

```python
router = litellm.Router(model_list=[
    {"model_name": "claude-haiku", "litellm_params": {"model": "anthropic/claude-haiku-4-5"}},
    {"model_name": "claude-haiku", "litellm_params": {"model": "bedrock/anthropic.claude-haiku-4-5-20251001:0"}},
])
response = router.completion(model="claude-haiku", messages=[...])
```

For a triage system, downtime means tickets pile up. Fallback keeps the lights on.

**Spend tracking.** The proxy server gives per-key, per-team, per-model cost dashboards. The cost analysis above is a spreadsheet estimate; LiteLLM gives you the real numbers in production.

---

## Composing Patterns

Start with the simplest pattern that works. Add complexity only when it earns its keep.

**Routing only (today):**
Ticket → Classify (Haiku) → Route → Handler

**Routing + evaluator-optimiser (future):**
Ticket → Classify (Haiku) → Route → Handler → Draft response (Sonnet) → Evaluate (Sonnet) → Revise (max 2 loops)

**Routing + orchestrator-workers (future):**
Ticket → Classify (Haiku) → Route → Critical Handler → Orchestrator (Sonnet) fans out to: check status page, search similar incidents, draft incident report

---

## Key Takeaways

1. **Match pattern to task shape.** Fixed paths → routing. Parallel subtasks → orchestrator-workers. Iterative refinement → evaluator-optimiser. Open-ended → autonomous agent.

2. **Use the cheapest model that works.** Haiku at $1/MTok handles structured classification with `strict: true`. Do not pay 5x more for Opus when the task is shallow pattern matching.

3. **Routing is code, not LLM.** The dispatch logic is a switch statement. One LLM call to classify, then deterministic code.

4. **Cache aggressively.** System prompts and tool definitions are identical across requests. Prompt caching cuts the repeated portion to 10% of base cost.

5. **Start simple, compose later.** Add evaluator-optimiser loops or orchestrator-workers only when the simpler pattern is not enough.

---

*All pricing based on Claude API rates as of 2026. See [Anthropic Pricing](https://platform.claude.com/docs/en/about-claude/pricing) for current rates.*
