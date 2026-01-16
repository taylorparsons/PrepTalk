"""
Async Function Template

Use this template for creating async functions that handle I/O-bound operations,
API calls, database queries, or concurrent tasks.
"""

import asyncio
import httpx
from typing import List, Optional, Any


# === BASIC ASYNC FUNCTION TEMPLATE ===

async def async_function_name(param1: str, param2: int) -> dict:
    """
    Brief description of what this async function does.
    
    Args:
        param1: Description of first parameter
        param2: Description of second parameter
    
    Returns:
        Description of return value
    
    Raises:
        ValueError: When validation fails
        httpx.HTTPError: When API call fails
    
    Example:
        >>> result = await async_function_name("value", 42)
        >>> print(result)
        {'status': 'success', 'data': ...}
    """
    # Validate inputs
    if not param1:
        raise ValueError("param1 cannot be empty")
    
    # Perform async operation
    result = await some_async_operation(param1, param2)
    
    # Return result
    return result


# === ASYNC FUNCTION WITH MULTIPLE API CALLS ===

async def fetch_multiple_resources(resource_ids: List[str]) -> List[dict]:
    """
    Fetch multiple resources concurrently using asyncio.gather.
    
    This pattern is ideal when you need to make multiple independent API calls
    and want them to execute concurrently for better performance.
    """
    async with httpx.AsyncClient() as client:
        # Create tasks for concurrent execution
        tasks = [
            fetch_single_resource(client, resource_id) 
            for resource_id in resource_ids
        ]
        
        # Execute all tasks concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions if needed
        successful = [r for r in results if not isinstance(r, Exception)]
        return successful


async def fetch_single_resource(client: httpx.AsyncClient, resource_id: str) -> dict:
    """Helper function to fetch a single resource."""
    response = await client.get(f"https://api.example.com/resources/{resource_id}")
    response.raise_for_status()
    return response.json()


# === ASYNC FUNCTION WITH ERROR HANDLING ===

async def safe_async_operation(url: str, max_retries: int = 3) -> Optional[dict]:
    """
    Perform async operation with retry logic and comprehensive error handling.
    
    Args:
        url: The URL to fetch
        max_retries: Maximum number of retry attempts
    
    Returns:
        Response data if successful, None if all retries failed
    """
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                return response.json()
                
        except httpx.TimeoutException:
            if attempt == max_retries - 1:
                print(f"Timeout after {max_retries} attempts")
                return None
            await asyncio.sleep(2 ** attempt)  # Exponential backoff
            
        except httpx.HTTPError as e:
            print(f"HTTP error on attempt {attempt + 1}: {e}")
            if attempt == max_retries - 1:
                return None
            await asyncio.sleep(1)
            
        except Exception as e:
            print(f"Unexpected error: {e}")
            return None


# === ASYNC CONTEXT MANAGER ===

class AsyncDatabaseConnection:
    """
    Example async context manager for database connections.
    
    Usage:
        async with AsyncDatabaseConnection() as db:
            result = await db.query("SELECT * FROM users")
    """
    
    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.connection = None
    
    async def __aenter__(self):
        """Acquire database connection."""
        self.connection = await self._connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Release database connection."""
        if self.connection:
            await self.connection.close()
    
    async def _connect(self):
        """Establish database connection."""
        # Simulated async connection
        await asyncio.sleep(0.1)
        return {"connected": True}
    
    async def query(self, sql: str) -> List[dict]:
        """Execute database query."""
        if not self.connection:
            raise RuntimeError("Not connected to database")
        # Simulated query execution
        await asyncio.sleep(0.1)
        return [{"id": 1, "name": "Example"}]


# === ASYNC GENERATOR FOR STREAMING ===

async def stream_large_dataset(chunk_size: int = 100):
    """
    Async generator for processing large datasets incrementally.
    
    This pattern is ideal for:
    - Processing large files
    - Streaming API responses
    - Pagination through large result sets
    
    Usage:
        async for chunk in stream_large_dataset():
            await process_chunk(chunk)
    """
    offset = 0
    while True:
        # Fetch next chunk
        chunk = await fetch_data_chunk(offset, chunk_size)
        
        if not chunk:
            break  # No more data
        
        yield chunk
        offset += chunk_size


async def fetch_data_chunk(offset: int, limit: int) -> List[dict]:
    """Fetch a chunk of data from an API or database."""
    await asyncio.sleep(0.1)  # Simulated async operation
    return [{"id": i} for i in range(offset, offset + limit)]


# === ASYNC WITH TIMEOUT ===

async def operation_with_timeout(timeout_seconds: float = 5.0) -> dict:
    """
    Execute async operation with timeout.
    
    Args:
        timeout_seconds: Maximum time to wait for operation
    
    Returns:
        Operation result
    
    Raises:
        asyncio.TimeoutError: If operation exceeds timeout
    """
    try:
        result = await asyncio.wait_for(
            slow_async_operation(),
            timeout=timeout_seconds
        )
        return result
    except asyncio.TimeoutError:
        print(f"Operation timed out after {timeout_seconds}s")
        raise


async def slow_async_operation() -> dict:
    """Simulated slow operation."""
    await asyncio.sleep(10)  # This will timeout
    return {"status": "completed"}


# === RATE-LIMITED ASYNC FUNCTION ===

async def rate_limited_fetch(
    urls: List[str], 
    max_concurrent: int = 10
) -> List[dict]:
    """
    Fetch URLs with rate limiting using Semaphore.
    
    This pattern prevents overwhelming the server by limiting
    the number of concurrent requests.
    
    Args:
        urls: List of URLs to fetch
        max_concurrent: Maximum number of concurrent requests
    
    Returns:
        List of responses
    """
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def fetch_with_limit(url: str) -> dict:
        async with semaphore:
            async with httpx.AsyncClient() as client:
                response = await client.get(url)
                return response.json()
    
    tasks = [fetch_with_limit(url) for url in urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results


# === ASYNC FUNCTION WITH CLEANUP ===

async def async_operation_with_cleanup(resource_path: str) -> dict:
    """
    Template for async operations that require cleanup.
    
    Use try/finally to ensure cleanup happens even if operation fails.
    """
    resource = None
    try:
        # Acquire resource
        resource = await acquire_resource(resource_path)
        
        # Perform operation
        result = await process_resource(resource)
        
        return result
        
    finally:
        # Always cleanup
        if resource:
            await release_resource(resource)


async def acquire_resource(path: str):
    """Acquire a resource asynchronously."""
    await asyncio.sleep(0.1)
    return {"path": path, "handle": "resource_handle"}


async def process_resource(resource: dict) -> dict:
    """Process the acquired resource."""
    await asyncio.sleep(0.1)
    return {"status": "processed", "resource": resource}


async def release_resource(resource: dict):
    """Release the acquired resource."""
    await asyncio.sleep(0.1)
    print(f"Released resource: {resource['path']}")


# === MAIN ASYNC RUNNER PATTERN ===

async def main():
    """
    Main async function that coordinates multiple async operations.
    
    This is the typical entry point for async applications.
    """
    # Example 1: Sequential async calls
    result1 = await async_function_name("example", 42)
    print(f"Sequential result: {result1}")
    
    # Example 2: Concurrent async calls
    results = await fetch_multiple_resources(["id1", "id2", "id3"])
    print(f"Concurrent results: {len(results)} items")
    
    # Example 3: Using async context manager
    async with AsyncDatabaseConnection("sqlite:///db.sqlite") as db:
        data = await db.query("SELECT * FROM users")
        print(f"Database results: {len(data)} rows")
    
    # Example 4: Async generator
    async for chunk in stream_large_dataset(chunk_size=10):
        print(f"Processing chunk: {len(chunk)} items")
        if len(chunk) < 10:
            break  # Last chunk


if __name__ == "__main__":
    # Run the main async function
    asyncio.run(main())
