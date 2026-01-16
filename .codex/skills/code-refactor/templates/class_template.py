"""
Class Template - Best Practices for Well-Structured Classes

Copy this template when extracting classes during refactoring.
Follows SOLID principles and Python best practices.
"""

from typing import Any, List, Dict, Optional, Protocol
from abc import ABC, abstractmethod
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


# OPTION 1: Regular Class (Most Common)
class ClassName:
    """
    One-line description of what this class represents.
    
    Detailed explanation of the class purpose:
    - What responsibility does it have?
    - What problem does it solve?
    - How does it fit into the larger system?
    
    Attributes:
        public_attribute: Description of public attribute
        _protected_attribute: Description of protected attribute (internal use)
        
    Example:
        >>> obj = ClassName(name="example", value=42)
        >>> obj.process()
        'Processing example with value 42'
        
    Note:
        - This class is thread-safe / not thread-safe (delete one)
        - This class is immutable / mutable (delete one)
    """
    
    # Class-level constants
    DEFAULT_VALUE = 100
    MAX_RETRIES = 3
    
    def __init__(
        self,
        name: str,
        value: int,
        optional: Optional[str] = None
    ):
        """
        Initialize the ClassName.
        
        Args:
            name: Required name identifier
            value: Numeric value for processing
            optional: Optional configuration parameter
            
        Raises:
            ValueError: If name is empty or value is negative
        """
        # Validate inputs
        if not name:
            raise ValueError("name cannot be empty")
        if value < 0:
            raise ValueError("value must be non-negative")
        
        # Public attributes (no underscore)
        self.name = name
        self.value = value
        self.optional = optional or "default"
        
        # Protected attributes (single underscore - internal use)
        self._state = "initialized"
        self._cache: Dict[str, Any] = {}
        
        # Private attributes (double underscore - name mangling)
        self.__internal_counter = 0
        
        logger.debug(f"Initialized {self.__class__.__name__} with name={name}")
    
    # PUBLIC METHODS
    # These form the public API of the class
    
    def process(self) -> str:
        """
        Main processing method.
        
        Returns:
            String result of processing
            
        Raises:
            RuntimeError: If object is in invalid state
        """
        if self._state != "initialized":
            raise RuntimeError(f"Invalid state: {self._state}")
        
        logger.info(f"Processing {self.name}")
        
        # Delegate to private methods
        self._validate()
        result = self._do_processing()
        self._update_state()
        
        return result
    
    def reset(self) -> None:
        """Reset the object to initial state."""
        self._state = "initialized"
        self._cache.clear()
        self.__internal_counter = 0
        logger.debug(f"Reset {self.name}")
    
    # PROTECTED METHODS
    # These can be used by subclasses but not external code
    
    def _validate(self) -> None:
        """Validate internal state before processing."""
        if self.value > 1000:
            logger.warning(f"Value {self.value} is very large")
    
    def _do_processing(self) -> str:
        """Perform the actual processing logic."""
        self.__internal_counter += 1
        return f"Processing {self.name} with value {self.value}"
    
    def _update_state(self) -> None:
        """Update internal state after processing."""
        self._state = "processed"
    
    # PROPERTY DECORATORS
    # Use properties for computed attributes or controlled access
    
    @property
    def status(self) -> str:
        """Current status of the object."""
        return self._state
    
    @property
    def is_processed(self) -> bool:
        """Whether processing has been completed."""
        return self._state == "processed"
    
    # SPECIAL METHODS (Dunder Methods)
    
    def __repr__(self) -> str:
        """Developer-friendly representation."""
        return f"{self.__class__.__name__}(name={self.name!r}, value={self.value})"
    
    def __str__(self) -> str:
        """User-friendly string representation."""
        return f"{self.name}: {self.value}"
    
    def __eq__(self, other: object) -> bool:
        """Equality comparison."""
        if not isinstance(other, ClassName):
            return NotImplemented
        return self.name == other.name and self.value == other.value
    
    def __hash__(self) -> int:
        """Hash for use in sets/dicts (only if immutable)."""
        return hash((self.name, self.value))


# OPTION 2: Dataclass (For Simple Data Containers)
@dataclass
class DataContainer:
    """
    Simple data container using dataclass.
    
    Use dataclasses when you just need to store data with minimal logic.
    Automatically generates __init__, __repr__, __eq__, etc.
    
    Attributes:
        name: Name identifier
        value: Numeric value
        tags: List of tag strings
    """
    name: str
    value: int
    tags: List[str] = None
    
    def __post_init__(self):
        """Called after __init__ for additional validation."""
        if self.tags is None:
            self.tags = []
        
        if not self.name:
            raise ValueError("name cannot be empty")


# OPTION 3: Abstract Base Class (For Interfaces/Protocols)
class ProcessorInterface(ABC):
    """
    Abstract base class defining the processor interface.
    
    Use ABC when you want to enforce that subclasses implement certain methods.
    This creates a contract that all processors must follow.
    """
    
    @abstractmethod
    def process(self, data: str) -> str:
        """
        Process the data.
        
        All subclasses must implement this method.
        
        Args:
            data: Input data to process
            
        Returns:
            Processed data
        """
        pass
    
    @abstractmethod
    def validate(self, data: str) -> bool:
        """
        Validate the data.
        
        Args:
            data: Input data to validate
            
        Returns:
            True if valid, False otherwise
        """
        pass


class ConcreteProcessor(ProcessorInterface):
    """Concrete implementation of ProcessorInterface."""
    
    def process(self, data: str) -> str:
        """Process the data by converting to uppercase."""
        if not self.validate(data):
            raise ValueError("Invalid data")
        return data.upper()
    
    def validate(self, data: str) -> bool:
        """Validate that data is non-empty."""
        return bool(data)


# OPTION 4: Protocol (For Duck Typing - Python 3.8+)
class Drawable(Protocol):
    """
    Protocol for objects that can be drawn.
    
    Unlike ABC, this doesn't require inheritance.
    Any class with draw() and get_bounds() methods satisfies this protocol.
    """
    
    def draw(self) -> None:
        """Draw the object."""
        ...
    
    def get_bounds(self) -> tuple[int, int, int, int]:
        """Get bounding box (x, y, width, height)."""
        ...


# COMPOSITION EXAMPLE
class ComposedClass:
    """
    Example of composition over inheritance.
    
    Instead of inheriting from multiple classes, compose them.
    This is more flexible and avoids multiple inheritance issues.
    """
    
    def __init__(self, name: str):
        self.name = name
        
        # Compose other objects
        self._validator = ConcreteProcessor()
        self._logger = logging.getLogger(__name__)
        
    def process(self, data: str) -> str:
        """Process data using composed processor."""
        self._logger.info(f"Processing data for {self.name}")
        return self._validator.process(data)


# CONTEXT MANAGER EXAMPLE
class ResourceManager:
    """
    Example of a class that can be used as a context manager.
    
    Use this pattern for resources that need setup/cleanup.
    """
    
    def __init__(self, resource_name: str):
        self.resource_name = resource_name
        self._resource = None
        
    def __enter__(self):
        """Acquire the resource."""
        logger.info(f"Acquiring {self.resource_name}")
        self._resource = f"Resource: {self.resource_name}"
        return self._resource
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Release the resource."""
        logger.info(f"Releasing {self.resource_name}")
        self._resource = None
        return False  # Don't suppress exceptions


# SINGLETON EXAMPLE (Use Sparingly!)
class Singleton:
    """
    Singleton pattern - only one instance exists.
    
    WARNING: Use sparingly! Singletons make testing difficult.
    Consider dependency injection instead.
    """
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance


# USAGE EXAMPLES
if __name__ == "__main__":
    # Regular class
    obj = ClassName("test", 42)
    print(obj.process())
    print(f"Status: {obj.status}")
    
    # Dataclass
    container = DataContainer("data", 100, ["tag1", "tag2"])
    print(container)
    
    # Abstract base class
    processor = ConcreteProcessor()
    result = processor.process("hello")
    print(f"Processed: {result}")
    
    # Context manager
    with ResourceManager("database") as resource:
        print(f"Using: {resource}")
    
    # Composition
    composed = ComposedClass("composed")
    print(composed.process("world"))
