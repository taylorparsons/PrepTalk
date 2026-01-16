"""
FastAPI Router Template - Best Practices for Well-Structured API Endpoints

This template demonstrates:
- Proper router organization with APIRouter
- Service layer separation for business logic
- Dependency injection for reusable logic
- Pydantic models for request/response validation
- Proper error handling and HTTP status codes
- Async/await patterns for I/O operations
- Background tasks for non-blocking operations

Copy and modify this template when creating new FastAPI routers.
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field, validator
import logging

# Configure logging
logger = logging.getLogger(__name__)

# ============================================================================
# PYDANTIC MODELS (Request/Response Schemas)
# ============================================================================

class ResourceBase(BaseModel):
    """Base schema with common fields."""
    name: str = Field(..., min_length=1, max_length=100, description="Resource name")
    description: Optional[str] = Field(None, max_length=500, description="Optional description")
    is_active: bool = Field(True, description="Whether the resource is active")

    @validator('name')
    def name_must_not_be_empty(cls, v):
        """Validate that name is not just whitespace."""
        if not v.strip():
            raise ValueError('Name cannot be empty or whitespace')
        return v.strip()


class ResourceCreate(ResourceBase):
    """Schema for creating a new resource."""
    category: str = Field(..., description="Resource category")

    class Config:
        schema_extra = {
            "example": {
                "name": "Example Resource",
                "description": "An example resource for demonstration",
                "is_active": True,
                "category": "general"
            }
        }


class ResourceUpdate(BaseModel):
    """Schema for updating an existing resource (all fields optional)."""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None
    category: Optional[str] = None


class ResourceResponse(ResourceBase):
    """Schema for resource responses."""
    id: int
    category: str
    created_at: str
    updated_at: str

    class Config:
        orm_mode = True  # Enable compatibility with ORM models


class ResourceList(BaseModel):
    """Schema for paginated list responses."""
    total: int
    page: int
    page_size: int
    items: List[ResourceResponse]


# ============================================================================
# SERVICE LAYER (Business Logic)
# ============================================================================

class ResourceService:
    """
    Service layer for resource business logic.

    Separates business logic from API endpoints for:
    - Better testability
    - Reusability across endpoints
    - Cleaner endpoint functions
    - Easier maintenance
    """

    def __init__(self, db: Session):
        """Initialize service with database session."""
        self.db = db

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None
    ) -> ResourceList:
        """
        Get paginated list of resources.

        Args:
            skip: Number of records to skip (for pagination)
            limit: Maximum number of records to return
            is_active: Filter by active status (optional)

        Returns:
            ResourceList with pagination metadata
        """
        logger.info(f"Fetching resources: skip={skip}, limit={limit}, is_active={is_active}")

        # Build query
        query = self.db.query(Resource)
        if is_active is not None:
            query = query.filter(Resource.is_active == is_active)

        # Get total count
        total = query.count()

        # Get paginated results
        resources = query.offset(skip).limit(limit).all()

        return ResourceList(
            total=total,
            page=skip // limit + 1 if limit > 0 else 1,
            page_size=limit,
            items=resources
        )

    async def get_by_id(self, resource_id: int) -> ResourceResponse:
        """
        Get a single resource by ID.

        Args:
            resource_id: The resource ID to fetch

        Returns:
            The resource if found

        Raises:
            ValueError: If resource not found
        """
        logger.info(f"Fetching resource with id={resource_id}")

        resource = self.db.query(Resource).filter(Resource.id == resource_id).first()
        if not resource:
            logger.warning(f"Resource not found: id={resource_id}")
            raise ValueError(f"Resource with id {resource_id} not found")

        return resource

    async def create(self, resource_data: ResourceCreate) -> ResourceResponse:
        """
        Create a new resource.

        Args:
            resource_data: Resource creation data

        Returns:
            The created resource

        Raises:
            ValueError: If validation fails or resource already exists
        """
        logger.info(f"Creating resource: {resource_data.name}")

        # Check if resource with same name already exists
        existing = self.db.query(Resource).filter(
            Resource.name == resource_data.name
        ).first()

        if existing:
            logger.warning(f"Resource already exists: {resource_data.name}")
            raise ValueError(f"Resource with name '{resource_data.name}' already exists")

        # Create new resource
        db_resource = Resource(
            name=resource_data.name,
            description=resource_data.description,
            is_active=resource_data.is_active,
            category=resource_data.category
        )

        self.db.add(db_resource)
        self.db.commit()
        self.db.refresh(db_resource)

        logger.info(f"Resource created successfully: id={db_resource.id}")
        return db_resource

    async def update(
        self,
        resource_id: int,
        resource_data: ResourceUpdate
    ) -> ResourceResponse:
        """
        Update an existing resource.

        Args:
            resource_id: The resource ID to update
            resource_data: Resource update data

        Returns:
            The updated resource

        Raises:
            ValueError: If resource not found
        """
        logger.info(f"Updating resource: id={resource_id}")

        # Get existing resource
        resource = await self.get_by_id(resource_id)

        # Update only provided fields
        update_data = resource_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(resource, field, value)

        self.db.commit()
        self.db.refresh(resource)

        logger.info(f"Resource updated successfully: id={resource_id}")
        return resource

    async def delete(self, resource_id: int) -> None:
        """
        Delete a resource (soft delete by marking inactive).

        Args:
            resource_id: The resource ID to delete

        Raises:
            ValueError: If resource not found
        """
        logger.info(f"Deleting resource: id={resource_id}")

        resource = await self.get_by_id(resource_id)

        # Soft delete by marking as inactive
        resource.is_active = False
        self.db.commit()

        logger.info(f"Resource deleted successfully: id={resource_id}")

    async def permanent_delete(self, resource_id: int) -> None:
        """
        Permanently delete a resource from database.

        Args:
            resource_id: The resource ID to delete

        Raises:
            ValueError: If resource not found
        """
        logger.info(f"Permanently deleting resource: id={resource_id}")

        resource = await self.get_by_id(resource_id)

        self.db.delete(resource)
        self.db.commit()

        logger.info(f"Resource permanently deleted: id={resource_id}")


# ============================================================================
# DEPENDENCIES
# ============================================================================

def get_db():
    """
    Dependency to get database session.

    Yields database session and ensures it's closed after request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_resource_service(db: Session = Depends(get_db)) -> ResourceService:
    """
    Dependency to get resource service.

    Injects database session into service.
    """
    return ResourceService(db)


async def verify_resource_exists(
    resource_id: int,
    service: ResourceService = Depends(get_resource_service)
) -> ResourceResponse:
    """
    Dependency to verify resource exists and return it.

    This can be used in endpoints that need to ensure a resource exists
    before performing operations on it.

    Args:
        resource_id: The resource ID to verify
        service: Injected resource service

    Returns:
        The resource if found

    Raises:
        HTTPException: If resource not found
    """
    try:
        return await service.get_by_id(resource_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


# ============================================================================
# ROUTER DEFINITION
# ============================================================================

router = APIRouter(
    prefix="/resources",
    tags=["resources"],
    responses={
        404: {"description": "Resource not found"},
        500: {"description": "Internal server error"}
    }
)


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.get(
    "",
    response_model=ResourceList,
    status_code=status.HTTP_200_OK,
    summary="List all resources",
    description="Get a paginated list of resources with optional filtering"
)
async def list_resources(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum records to return"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    service: ResourceService = Depends(get_resource_service)
):
    """
    List all resources with pagination and filtering.

    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return (1-1000)
    - **is_active**: Optional filter by active status
    """
    try:
        return await service.get_all(skip=skip, limit=limit, is_active=is_active)
    except Exception as e:
        logger.error(f"Error listing resources: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while fetching resources"
        )


@router.get(
    "/{resource_id}",
    response_model=ResourceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get a resource by ID",
    description="Retrieve detailed information about a specific resource"
)
async def get_resource(
    resource: ResourceResponse = Depends(verify_resource_exists)
):
    """
    Get a specific resource by ID.

    The resource existence is verified by the dependency,
    so this endpoint just returns the result.
    """
    return resource


@router.post(
    "",
    response_model=ResourceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new resource",
    description="Create a new resource with the provided data"
)
async def create_resource(
    resource_data: ResourceCreate,
    background_tasks: BackgroundTasks,
    service: ResourceService = Depends(get_resource_service)
):
    """
    Create a new resource.

    Background tasks are queued to send notifications and update analytics
    without blocking the response.
    """
    try:
        resource = await service.create(resource_data)

        # Queue background tasks (non-blocking)
        background_tasks.add_task(send_creation_notification, resource.id)
        background_tasks.add_task(update_analytics, "resource_created", resource.id)

        return resource

    except ValueError as e:
        logger.warning(f"Validation error creating resource: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating resource: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the resource"
        )


@router.put(
    "/{resource_id}",
    response_model=ResourceResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a resource",
    description="Update an existing resource with the provided data"
)
async def update_resource(
    resource_id: int,
    resource_data: ResourceUpdate,
    background_tasks: BackgroundTasks,
    service: ResourceService = Depends(get_resource_service)
):
    """Update an existing resource."""
    try:
        resource = await service.update(resource_id, resource_data)

        # Queue background task to log audit trail
        background_tasks.add_task(log_audit_trail, "resource_updated", resource_id)

        return resource

    except ValueError as e:
        logger.warning(f"Resource not found for update: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error updating resource: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while updating the resource"
        )


@router.delete(
    "/{resource_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a resource",
    description="Soft delete a resource by marking it as inactive"
)
async def delete_resource(
    resource_id: int,
    service: ResourceService = Depends(get_resource_service)
):
    """
    Delete a resource (soft delete).

    The resource is marked as inactive rather than being removed from the database.
    """
    try:
        await service.delete(resource_id)
        return None  # 204 No Content

    except ValueError as e:
        logger.warning(f"Resource not found for deletion: {e}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error deleting resource: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while deleting the resource"
        )


# ============================================================================
# BACKGROUND TASK FUNCTIONS
# ============================================================================

async def send_creation_notification(resource_id: int):
    """Send notification when resource is created."""
    logger.info(f"Sending creation notification for resource {resource_id}")
    # TODO: Implement actual notification logic
    await asyncio.sleep(1)  # Simulate async operation
    logger.info(f"Notification sent for resource {resource_id}")


async def update_analytics(event_type: str, resource_id: int):
    """Update analytics for resource events."""
    logger.info(f"Updating analytics: {event_type} for resource {resource_id}")
    # TODO: Implement actual analytics logic
    await asyncio.sleep(0.5)  # Simulate async operation
    logger.info(f"Analytics updated for resource {resource_id}")


async def log_audit_trail(action: str, resource_id: int):
    """Log action to audit trail."""
    logger.info(f"Logging audit trail: {action} for resource {resource_id}")
    # TODO: Implement actual audit logging
    await asyncio.sleep(0.3)  # Simulate async operation
    logger.info(f"Audit trail logged for resource {resource_id}")


# ============================================================================
# USAGE EXAMPLE
# ============================================================================

"""
To use this router in your FastAPI application:

1. In main.py:
   ```python
   from fastapi import FastAPI
   from routers import resources

   app = FastAPI()

   app.include_router(
       resources.router,
       prefix="/api/v1",
       tags=["resources"]
   )
   ```

2. The endpoints will be available at:
   - GET    /api/v1/resources          - List resources
   - GET    /api/v1/resources/{id}     - Get resource by ID
   - POST   /api/v1/resources          - Create resource
   - PUT    /api/v1/resources/{id}     - Update resource
   - DELETE /api/v1/resources/{id}     - Delete resource

3. Test with curl:
   ```bash
   # List resources
   curl http://localhost:8000/api/v1/resources

   # Create resource
   curl -X POST http://localhost:8000/api/v1/resources \
        -H "Content-Type: application/json" \
        -d '{"name": "Test", "category": "general"}'

   # Get specific resource
   curl http://localhost:8000/api/v1/resources/1

   # Update resource
   curl -X PUT http://localhost:8000/api/v1/resources/1 \
        -H "Content-Type: application/json" \
        -d '{"name": "Updated Name"}'

   # Delete resource
   curl -X DELETE http://localhost:8000/api/v1/resources/1
   ```

4. Access interactive docs:
   - Swagger UI: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc
"""
