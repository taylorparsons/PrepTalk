"""
Function Template - Best Practices for Well-Structured Functions

Copy this template when creating new functions after refactoring.
Modify sections marked with TODO to match your specific needs.
"""

from typing import Any, List, Dict, Optional
import logging

# Configure logging
logger = logging.getLogger(__name__)


def function_name(
    required_param: str,
    optional_param: Optional[int] = None,
    flag: bool = False
) -> Dict[str, Any]:
    """
    One-line summary of what this function does.
    
    More detailed explanation of the function's purpose, including:
    - What problem it solves
    - When to use it
    - Any important assumptions or constraints
    
    Args:
        required_param: Description of this parameter and its expected format.
            Can span multiple lines if needed.
        optional_param: Description of optional parameter. Defaults to None.
            Explain what None means for this function.
        flag: Description of boolean flag. Defaults to False.
    
    Returns:
        Dictionary containing:
            - 'result': The primary output value
            - 'status': Status string ('success' or 'error')
            - 'message': Human-readable status message
    
    Raises:
        ValueError: If required_param is empty or invalid format
        TypeError: If parameters are wrong type
        RuntimeError: If operation fails for any reason
    
    Example:
        >>> result = function_name("test_input", optional_param=42)
        >>> print(result['status'])
        'success'
        
        >>> result = function_name("", optional_param=10)
        Traceback (most recent call last):
        ValueError: required_param cannot be empty
    
    Note:
        - This function is thread-safe / not thread-safe (delete one)
        - Performance: O(n) time complexity
        - This function has side effects: [describe] / no side effects
    """
    # TODO: Replace with your actual implementation
    
    # 1. INPUT VALIDATION
    # Validate early, fail fast
    if not required_param:
        logger.error("required_param cannot be empty")
        raise ValueError("required_param cannot be empty")
    
    if optional_param is not None and optional_param < 0:
        logger.error(f"optional_param must be non-negative, got {optional_param}")
        raise ValueError("optional_param must be non-negative")
    
    # 2. SETUP / INITIALIZATION
    # Declare all variables used in the function
    result_data = {}
    status = "pending"
    message = ""
    
    try:
        # 3. MAIN LOGIC
        # Break complex logic into labeled sections
        
        # Section 1: Process input
        logger.debug(f"Processing input: {required_param}")
        processed_input = _process_input(required_param)
        
        # Section 2: Perform operation
        if flag:
            logger.debug("Flag enabled, using alternate logic")
            result_data = _alternate_logic(processed_input, optional_param)
        else:
            logger.debug("Using standard logic")
            result_data = _standard_logic(processed_input, optional_param)
        
        # Section 3: Validate output
        if not _validate_output(result_data):
            raise RuntimeError("Output validation failed")
        
        # 4. SUCCESS PATH
        status = "success"
        message = "Operation completed successfully"
        logger.info(f"Function completed successfully: {message}")
        
    except ValueError as e:
        # 5. ERROR HANDLING
        # Handle expected errors gracefully
        status = "error"
        message = f"Validation error: {str(e)}"
        logger.warning(f"Validation error in function_name: {e}")
        raise
        
    except Exception as e:
        # Handle unexpected errors
        status = "error"
        message = f"Unexpected error: {str(e)}"
        logger.error(f"Unexpected error in function_name: {e}", exc_info=True)
        raise RuntimeError(message) from e
    
    finally:
        # 6. CLEANUP (if needed)
        # Release resources, close connections, etc.
        logger.debug("Cleanup completed")
    
    # 7. RETURN
    # Return consistent structure
    return {
        "result": result_data,
        "status": status,
        "message": message
    }


# HELPER FUNCTIONS
# Extract complex logic into private helper functions

def _process_input(input_data: str) -> str:
    """
    Private helper function to process input.
    
    Private functions start with underscore to indicate they're internal.
    They should have docstrings too, but can be shorter.
    
    Args:
        input_data: Raw input to process
        
    Returns:
        Processed input string
    """
    # TODO: Implement input processing
    return input_data.strip().lower()


def _standard_logic(processed_input: str, param: Optional[int]) -> Dict[str, Any]:
    """Standard processing logic."""
    # TODO: Implement standard logic
    return {
        "input": processed_input,
        "param": param,
        "processed": True
    }


def _alternate_logic(processed_input: str, param: Optional[int]) -> Dict[str, Any]:
    """Alternate processing logic when flag is enabled."""
    # TODO: Implement alternate logic
    return {
        "input": processed_input,
        "param": param,
        "alternate": True
    }


def _validate_output(output: Dict[str, Any]) -> bool:
    """
    Validate the output meets requirements.
    
    Args:
        output: Output dictionary to validate
        
    Returns:
        True if valid, False otherwise
    """
    # TODO: Implement validation logic
    return bool(output)


# CONSTANTS
# Define magic numbers and strings as constants at module level
DEFAULT_TIMEOUT = 30  # seconds
MAX_RETRIES = 3
VALID_STATUSES = {"success", "error", "pending"}


# DECORATOR EXAMPLES
# Use decorators to add cross-cutting concerns without modifying function logic

import functools
import time
from typing import Callable

# Timing Decorator
def timing_decorator(func: Callable) -> Callable:
    """
    Decorator to measure and log function execution time.
    
    Usage:
        @timing_decorator
        def my_function():
            pass
    """
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        elapsed = time.time() - start_time
        logger.info(f"{func.__name__} took {elapsed:.2f}s")
        return result
    return wrapper

# Retry Decorator
def retry(max_attempts: int = 3, delay: float = 1.0):
    """
    Decorator to retry function on failure.
    
    Args:
        max_attempts: Maximum number of retry attempts
        delay: Delay between retries in seconds
    
    Usage:
        @retry(max_attempts=5, delay=2.0)
        def flaky_function():
            pass
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_attempts):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if attempt == max_attempts - 1:
                        logger.error(f"{func.__name__} failed after {max_attempts} attempts")
                        raise
                    logger.warning(f"{func.__name__} attempt {attempt + 1} failed: {e}")
                    time.sleep(delay)
        return wrapper
    return decorator

# Validation Decorator
def validate_inputs(**validators):
    """
    Decorator to validate function inputs.
    
    Args:
        validators: Keyword arguments mapping param names to validation functions
    
    Usage:
        @validate_inputs(
            name=lambda x: len(x) > 0,
            age=lambda x: x >= 0
        )
        def create_user(name: str, age: int):
            pass
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Get function signature
            sig = inspect.signature(func)
            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()
            
            # Validate each specified parameter
            for param_name, validator in validators.items():
                if param_name in bound_args.arguments:
                    value = bound_args.arguments[param_name]
                    if not validator(value):
                        raise ValueError(f"Validation failed for {param_name}: {value}")
            
            return func(*args, **kwargs)
        return wrapper
    return decorator

# Cache Decorator
def cache_result(ttl_seconds: int = 60):
    """
    Decorator to cache function results.
    
    Args:
        ttl_seconds: Time-to-live for cached results
    
    Usage:
        @cache_result(ttl_seconds=300)
        def expensive_computation(x):
            pass
    """
    def decorator(func: Callable) -> Callable:
        cache = {}
        cache_times = {}
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from arguments
            key = str(args) + str(kwargs)
            current_time = time.time()
            
            # Check if cached result exists and is still valid
            if key in cache:
                if current_time - cache_times[key] < ttl_seconds:
                    logger.debug(f"Cache hit for {func.__name__}")
                    return cache[key]
            
            # Compute and cache result
            logger.debug(f"Cache miss for {func.__name__}")
            result = func(*args, **kwargs)
            cache[key] = result
            cache_times[key] = current_time
            return result
        return wrapper
    return decorator

# Example function with multiple decorators
@timing_decorator
@retry(max_attempts=3, delay=1.0)
@validate_inputs(required_param=lambda x: len(x) > 0)
def decorated_function(required_param: str, optional_param: int = 0) -> dict:
    """
    Example showing how to stack multiple decorators.
    
    Execution order:
    1. timing_decorator (outermost)
    2. retry
    3. validate_inputs (innermost, closest to function)
    """
    logger.info(f"Processing {required_param} with {optional_param}")
    return {"result": "success"}

# USAGE EXAMPLE
if __name__ == "__main__":
    # Example usage for testing
    # This block only runs when file is executed directly
    
    # Test successful case
    result = function_name("test_input", optional_param=42, flag=True)
    print(f"Result: {result}")
    
    # Test error case
    try:
        result = function_name("", optional_param=10)
    except ValueError as e:
        print(f"Caught expected error: {e}")
