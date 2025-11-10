"""
Tests for various agents
"""

import pytest
import re
from manugen_ai.agents.capitalizer.agent import root_agent as capitalizer_agent
from manugen_ai.agents.ai_science_writer.sub_agents.citations.agent import root_agent as citations_agent
from manugen_ai.utils import run_agent_workflow


@pytest.mark.asyncio
async def test_agent_capitalizer():
    APP_NAME = "app"
    USER_ID = "user"
    SESSION_ID = "001"
    expected_output = "This is a sentence to correct."

    # retry 5 times
    for attempt in range(5):
        _, session_state, _ = await run_agent_workflow(
            agent=capitalizer_agent,
            prompt="""
            this is a sentence to correct
            """,
            app_name=APP_NAME,
            user_id=USER_ID,
            session_id=SESSION_ID,
            verbose=True,
        )
        if "output" in session_state and session_state["output"] == expected_output:
            break
        if attempt == 4:
            # Final attempt failed, raise assertion
            assert "output" in session_state.keys()
            assert session_state["output"] == expected_output

@pytest.mark.asyncio
async def test_agent_citations():

    # retry 5 times
    for attempt in range(5):
        _, session_state, _ = await run_agent_workflow(
            agent=citations_agent,
            prompt="""
            CellProfiler is a free open-source software designed to 
            enable biologists without training in computer vision or 
            programming to quantitatively measure phenotypes from 
            thousands of images automatically. More information can
            be found in the CellProfiler Wiki.
            """,
            app_name="app",
            user_id="user",
            session_id="001",
            verbose=True,
        )
        """if "output" in session_state and session_state["output"] == expected_output:
            break
        if attempt == 4:
            # Final attempt failed, raise assertion
            assert "output" in session_state.keys()
            assert session_state["output"] == expected_output"""
        if "enhanced_draft" in session_state and len(re.findall(r'\[\d+\]', session_state["enhanced_draft"])) >= 3:
            break
        if attempt == 4:
            assert "enhanced_draft" in session_state.keys()
            assert len(re.findall(r'\[\d+\]', session_state["enhanced_draft"])) >= 3