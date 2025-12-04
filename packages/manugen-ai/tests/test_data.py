"""
Tests for the 'data' module, mostly consisting of embedding models.
"""

import json
from pathlib import Path

import pytest
from manugen_ai.data import create_withdrarxiv_embeddings, search_withdrarxiv_embeddings


@pytest.mark.slow
def test_create_withdrarxiv_embedding():
    """ "
    Test creating the withdrarxiv embeddings database using a table of retracted
    papers from arXiv and an embedding model, either via Gemini's API or via
    a local Flag embedding model.

    The test is marked 'slow' and thus excluded from the default test suite
    for a few reasons:
    - it takes ~2 minutes to run using the Gemini embeddings API, which incurs
      API usage costs
    - it takes a lot longer with the flag embeddings, which require
      downloading a large model file, BAAI/bge-m3, from Hugging Face.
    - the withdrarxiv dataset on which it relies can't be included in the repo
      and must be manually downloaded; see test_create_withdrarxiv_embedding()'s
      docstring for details.

    Depending on the value of the env var USE_GEMINI_EMBEDDINGS, this test will
    use either Google's Gemini embeddings via Google's API (if set to "1") or
    the "flag" embedding model from Hugging Face. The Gemini embeddings require
    that the GOOGLE_API_KEY env var be set to a valid API key.

    The Flag embedding model uses the FLAGEMBEDDING_MODEL_OR_PATH env var
    to determine where the model is already located, or if given a model
    what model to download. By default it'll download "BAAI/bge-m3" from
    Hugging Face.
    """
    datafiles_dir = (
        Path(__file__).resolve().parent.parent / "src" / "manugen_ai" / "data"
    )
    target_db = "withdrarxiv_test_embeddings.duckdb"

    try:
        # construct the db; we're mostly seeing if this runs without throwing anything
        resulting_db_path = create_withdrarxiv_embeddings(target_db)

        # check that the resulting db path is what we passed in
        assert resulting_db_path == target_db

        # ensure the db file was actually created
        full_db_path = datafiles_dir / target_db
        assert full_db_path.exists()

    finally:
        full_db_path = datafiles_dir / target_db
        full_db_path.unlink(missing_ok=True)


def test_search_withdrarxiv_embeddings():
    """
    Test searching the withdrarxiv embeddings.

    As of 2025-12-03, the retraction db produced these results for the query
    "What is the role of quantum entanglement in quantum computing?":
    [
        {"related_retraction_reasons":"Just because interleaving bisimilarity based ACP cannot be reversed, some conclusions of this paper are wrong and cannot be remedied, I beg to withdraw this paper"},
        {"related_retraction_reasons":"a wrong formula"},
        {"related_retraction_reasons":"The paper is withdrawn because of many flaws in the manuscript"}
    ]
    """
    results = json.loads(
        search_withdrarxiv_embeddings(
            "What is the role of quantum entanglement in quantum computing?", top_k=3
        )
    )

    assert len(results) == 3
    for result in results:
        assert "related_retraction_reasons" in result
