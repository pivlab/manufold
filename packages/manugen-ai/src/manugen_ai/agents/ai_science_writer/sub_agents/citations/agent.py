"""
An agent workflow to enhance content
using openalex, with evidence-card synthesis.
"""

from __future__ import annotations

import os

from google.adk.agents import Agent, SequentialAgent
from google.adk.tools import FunctionTool
from manugen_ai.agents.meta_agent import ResilientToolAgent
from manugen_ai.tools.tools import openalex_query, parse_list
from manugen_ai.utils import get_llm

MODEL_NAME = os.environ.get("MANUGENAI_MODEL_NAME")
LLM = get_llm(MODEL_NAME)

parse_list_tool = FunctionTool(func=parse_list)
oa_search_tool = FunctionTool(func=openalex_query)

# 1) Extract free-text topics (unchanged, but fixed wording)
agent_extract_topics = Agent(
    model=LLM,
    name="extract_topics",
    description="Extract 3-5 key research topics from the draft; output as a single comma-separated line.",
    instruction="""
You get the user's draft text in the user prompt.
List the 3-5 most relevant research topics as a comma-separated list:
topic one, topic two, ...
Return only the topics, no extra commentary or JSON.
Do NOT comment on the topics or provide explanations.
""",
    output_key="topics",
)

# 1b) Normalize topics (keeps output a clean comma-separated line)
agent_normalize_topics = Agent(
    model=LLM,
    name="normalize_topics",
    description="Normalize the comma-separated topics into a unique, cleaned list.",
    instruction="""
You receive a comma-separated list of topics in the user prompt.
- Lowercase
- Trim whitespace
- Deduplicate
- Singularize obvious plurals only if unambiguous
Return a single comma-separated line. No extra text.
""",
    output_key="topics",
)

# 2) Search OpenAlex (unchanged; resilient wrapper retained)
agent_search_openalex = ResilientToolAgent(
    Agent(
        model=LLM,
        name="search_open_alex",
        description="Use `openalex_query` on the list `topics` to get top paper URLs.",
        instruction="""
Call `openalex_query` with `{topics}`.
Return the mapping as `search_results` (topic → list of URLs).
Do NOT provide code to perform this action - invoke the tool calls.
""",
        tools=[oa_search_tool],
        output_key="search_results",
    ),
    max_retries=3,
)

# 3) Build Evidence Cards (MAP)
agent_build_evidence_cards = Agent(
    model=LLM,
    name="build_evidence_cards",
    description="Create YAML 'evidence cards' from the OpenAlex search results.",
    instruction="""
You get `search_results` like: {topic -> [url, ...]}.
For EACH url, create a YAML card with this exact schema:

- id: "OA<number>"            # increment from 1 across all cards in this run
  topic: "<topic>"
  url: "<url>"
  title: "<paper title or best available>"
  authors: ["Last, First", ...]       # best-effort; omit if unknown
  year: <yyyy>                         # best-effort; omit if unknown
  venue: "<journal or venue>"          # best-effort; omit if unknown
  key_findings:
    - "<factual finding 1>"
    - "<factual finding 2>"
  relevance: "<1-2 sentences on why this supports/extends the draft>"
  # include this only if a short verbatim excerpt is present:
  # quote: "<short verbatim excerpt>"

Rules:
- Include only facts supported by available metadata/abstract/snippet.
- If a field is unknown, omit it rather than guessing.
- De-duplicate identical URLs across topics by making one card and using the most relevant topic.
Return ONE YAML list only, with no extra commentary.
""",
    output_key="evidence_cards",
)

# 4) Topic Synthesis (REDUCE)
agent_topic_synthesis = Agent(
    model=LLM,
    name="topic_synthesis",
    description="Group evidence cards by topic and produce a concise synthesis per topic.",
    instruction="""
You receive:
- evidence_cards: a YAML list as defined earlier.

Task:
- Group cards by `topic`.
- For each topic, write a compact synthesis with:
  - 1-3 bullet takeaways that reflect consensus across cards
  - A “tensions” line if sources disagree
  - Inline bracket citations using the cards' `id`s, e.g., [OA3, OA7].

Return YAML with this shape:

topics:
  - topic: "<topic>"
    synthesis:
      takeaways:
        - "<point> [OA#,...]"
        - "<point> [#]"
      tensions: "<optional sentence> [OA#,...]"
      supporting_cards: ["OA#", "OA#", ...]

Return ONLY this YAML (no extra commentary).
""",
    output_key="topic_briefs",
)

# 5) Compose revised draft using evidence (GUARDED) — replaces 'agent_improve_draft'
agent_compose_with_evidence = Agent(
    model=LLM,
    name="compose_with_evidence",
    description="Rewrite the original draft using only supported claims, with inline [#] markers.",
    instruction="""
Inputs:
- Original draft (user prompt)
- topic_briefs (structured YAML)
- evidence_cards (YAML list with metadata)

Rewrite the draft by:
- Preserving the author's voice and structure where possible.
- Adding or revising sentences ONLY if you can attach at least one [#] marker from evidence_cards.
- Avoid generic claims that lack a marker.
- Place [#] immediately after the clause containing the fact.

Output only the revised draft text (no YAML).
Do NOT include any extra commentary.
Do NOT invent citations or facts.
Do NOT provide context on what the other agents or inputs were.
ONLY return the enhanced draft text.
""",
    output_key="enhanced_draft",
)

# 6) References from cards
agent_format_references = Agent(
    model=LLM,
    name="format_references",
    description="Generate a 'References' section from evidence_cards.",
    instruction="""
You receive the full `evidence_cards` YAML.
Produce a "References" section in plain text:
- One entry per unique card id, sorted by id.
- Format: [#] Authors. Title. Venue, Year. URL
- Omit unknown fields rather than invent them.
Return only the formatted references section.
""",
    output_key="references",
)

# 7) Attribution Check (final pass)
agent_attribution_check = Agent(
    model=LLM,
    name="attribution_check",
    description="Ensure every added factual sentence includes a valid [#] citation present in evidence_cards.",
    instruction="""
Inputs:
- enhanced_draft
- evidence_cards

Task:
- Flag any sentence that introduces new factual content but lacks [#] or cites an OA id not present.
- If issues exist, output a corrected version of the draft with proper markers and nothing else.
- If no issues, return the input `enhanced_draft`.

Return only the corrected draft (or the original if already valid).
Do NOT include any extra commentary.
Do NOT invent citations or facts.
Do NOT provide context on what the other agents or inputs were.
ONLY return the corrected draft text (or the original if already valid).
""",
    output_key="enhanced_draft",
)

# Full pipeline — updated
root_agent = SequentialAgent(
    name="citation_agent",
    description=(
        "Extract topics → normalize → search → evidence cards (map) → "
        "topic synthesis (reduce) → compose with citations → references → attribution check"
    ),
    sub_agents=[
        agent_extract_topics,
        agent_normalize_topics,
        agent_search_openalex,
        agent_build_evidence_cards,
        agent_topic_synthesis,
        agent_compose_with_evidence,
        agent_format_references,
        agent_attribution_check,
    ],
)
