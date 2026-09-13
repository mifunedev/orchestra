"""test example module."""

import unittest
import os
from langgraph.store.base import SearchItem
from src.schemas.entities import SearchFilter
from src.services.source import Source
from src.utils.migrations import run_migrations
from seeds.user_seeder import seed_admin
from tests import get_test_user
from src.services.project import ProjectService
from langchain_core.documents import Document


class TestProjectService(unittest.IsolatedAsyncioTestCase):
    @classmethod
    def setUpClass(cls):
        os.environ["APP_ENV"] = "test"
        run_migrations()

    async def asyncSetUp(self):
        await seed_admin()
        self.project_id = "test-project-id"
        self.user = await get_test_user()
        self.project_service = ProjectService(
            user_id=self.user.id,
        )
        self.VALID_SOURCES = [
            Source(
                id="test-source-id",
                type="web_scrape",
                content={
                    "urls": ["https://github.com/mifunedev/a2a-langgraph"],
                },
            ),
        ]

    @unittest.skip("Skipping vector search test")
    async def test_vector_search(self):
        VALID_DOCS = [
            Document(
                page_content="Python is a programming language",
                metadata={
                    "language": "Python",
                    "topic": "programming",
                },
            ),
            Document(
                page_content="Tennis is a sport",
                metadata={
                    "sport": "Tennis",
                    "topic": "sports",
                },
            ),
        ]
        await self.project_service.add_docs(project_id=self.project_id, docs=VALID_DOCS)
        results: list[SearchItem] = await self.project_service.search(
            SearchFilter(filter={"project_id": self.project_id}, query="python programming")
        )
        assert results[0].value["page_content"] == VALID_DOCS[0].model_dump()["page_content"]
        assert results[0].value["metadata"] == VALID_DOCS[0].model_dump()["metadata"]

    async def test_source_lifecycle(self):
        # Create and get sources
        await self.project_service.add_sources(project_id=self.project_id, sources=self.VALID_SOURCES)
        sources: list[Source] = await self.project_service.get_sources(self.project_id)
        assert len(sources) == 1
        assert sources[0].type == "web_scrape"

        # Delete source
        await self.project_service.delete_source(source_id=self.VALID_SOURCES[0].id)
