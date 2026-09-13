from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import Response
from fastapi import status
from fastapi_cache.decorator import cache
from langgraph.store.postgres import AsyncPostgresStore

from src.schemas.examples import Examples
from src.schemas.entities import Document, SearchFilter
from src.services.source import Source
from src.contexts.service import ServiceContext
from src.schemas.models import ProtectedUser
from src.services.db import get_store
from src.utils.auth import verify_credentials
from src.repos.project_repo import Project
from src.schemas.entities.store import ProjectUpdate
from src.utils.logger import logger


router = APIRouter(tags=["Project"], prefix="/projects")


################################################################################
### Search Projects
################################################################################
@router.post("/search", name="Query Projects", operation_id="orchestra_search_projects", tags=["mcp"])
async def search_projects(
    project_search: SearchFilter = Body(...),
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    service_context = ServiceContext(user_id=user.id, store=store)

    # If id and query are provided, return the documents from the project
    if "id" in project_search.filter and project_search.query:
        doc_repo = service_context.project_service.project_repo.source_repo.doc_repo
        documents = await doc_repo._search(
            SearchFilter(
                filter={"metadata": {"$eq": {"project_id": project_search.filter["id"]}}},
                limit=project_search.limit,
                offset=project_search.offset,
                query=project_search.query,
            )
        )
        result_documents = []
        for document in documents:
            doc_dict = Document.model_validate(document.value).model_dump()
            if document.score >= project_search.score_threshold:
                doc_dict["score"] = document.score
                result_documents.append(doc_dict)
        return {"documents": result_documents}

    if "source_id" in project_search.filter:
        documents = await service_context.project_service.project_repo.list_documents(
            project_search.filter["source_id"],
        )
        return {"documents": [document.model_dump() for document in documents]}

    # If id is provided, return the project
    if "id" in project_search.filter and project_search.filter:
        project = await service_context.project_service.get(project_search.filter["id"])
        return {"project": project.model_dump(exclude_none=True)}

    # If id is not provided, return all projects
    projects: list[Project] = await service_context.project_service.search(project_search)
    return {"projects": [project.model_dump(exclude_none=True) for project in projects]}


################################################################################
### Create Project
################################################################################
@router.post("", name="Create Project", operation_id="orchestra_create_project", tags=["mcp"])
async def create_project(
    project: Project = Body(openapi_examples=Examples.PROJECT_EXAMPLES),
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    service_context = ServiceContext(user_id=user.id, store=store)
    project: Project = await service_context.project_service.create(project)
    return {"project_id": project.id}


################################################################################
### Get Project
################################################################################
@router.get(
    "/{project_id}",
    name="Get Project",
    operation_id="orchestra_get_project",
    tags=["mcp"],
)
@cache(expire=30)
async def get_project(
    project_id: str,
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    service_context = ServiceContext(user_id=user.id, store=store)
    try:
        project: Project = await service_context.project_service.get(project_id)
        return {"project": project.model_dump(exclude_none=True)}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


################################################################################
### Update Project
################################################################################
@router.put(
    "/{project_id}",
    name="Update Project",
    operation_id="orchestra_update_project",
    tags=["mcp"],
)
async def update_project(
    project_id: str,
    project: ProjectUpdate = Body(...),
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    """Update project name and/or description. Only provided fields will be updated."""
    service_context = ServiceContext(user_id=user.id, store=store)
    try:
        update_data = {k: v for k, v in project.model_dump(exclude_unset=True).items()}
        updated_project: Project = await service_context.project_service.update(
            project_id,
            update_data,
        )
        return {"project": updated_project.model_dump(exclude_none=True)}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except Exception as e:
        logger.exception(f"Error updating project {project_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error",
        ) from e


################################################################################
### Delete Project
################################################################################
@router.delete(
    "/{project_id}",
    name="Delete Project",
    operation_id="orchestra_delete_project",
    tags=["mcp"],
)
async def delete_project(
    project_id: str,
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    service_context = ServiceContext(user_id=user.id, store=store)
    await service_context.project_service.delete(project_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


################################################################################
### Get Project Sources
################################################################################
@router.get(
    "/{project_id}/sources",
    name="Get Project Sources",
    operation_id="orchestra_get_project_sources",
    tags=["mcp"],
)
@cache(expire=30)
async def get_project_sources(
    project_id: str,
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    try:
        service_context = ServiceContext(user_id=user.id, store=store)
        sources: list[Source] = await service_context.project_service.get_sources(project_id)
        return {"sources": [source.model_dump(exclude_none=True) for source in sources]}
    except Exception as e:
        logger.exception(f"Error getting sources for project {project_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


################################################################################
### Add Project Sources
################################################################################
@router.post(
    "/{project_id}/sources",
    name="Add Project Sources",
    operation_id="orchestra_add_project_sources",
    tags=["mcp"],
)
async def add_project_sources(
    project_id: str,
    sources: list[Source] = Body(openapi_examples=Examples.SOURCE_EXAMPLES),
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    try:
        service_context = ServiceContext(user_id=user.id, store=store)
        sources: list[Source] = await service_context.project_service.add_sources(project_id, sources)
        return {"sources": [source.model_dump(exclude_none=True) for source in sources]}
    except Exception as e:
        logger.exception(f"Error adding sources to project {project_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


################################################################################
### Delete Project Sources
################################################################################
@router.delete(
    "/{project_id}/sources/{source_id}",
    name="Delete Project Source",
    operation_id="orchestra_delete_project_source",
    tags=["mcp"],
)
async def delete_project_source(
    project_id: str,
    source_id: str,
    user: ProtectedUser = Depends(verify_credentials),
    store: AsyncPostgresStore = Depends(get_store),
):
    try:
        service_context = ServiceContext(user_id=user.id, store=store)
        await service_context.project_service.delete_source(source_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        logger.exception(f"Error deleting source {source_id} from project {project_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
