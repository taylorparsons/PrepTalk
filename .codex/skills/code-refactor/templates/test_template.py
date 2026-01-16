"""
Test Template - Best Practices for Testing Refactored Code

Copy this template when writing tests for refactored code.
Covers unit tests, integration tests, and common testing patterns.
"""

import pytest
import unittest
from unittest.mock import Mock, patch, MagicMock
from typing import Any
import tempfile
import os

# TODO: Import your module here
# from mymodule import function_to_test, ClassToTest


# FIXTURES
# Use fixtures to set up common test data

@pytest.fixture
def sample_data():
    """Provide sample data for tests."""
    return {
        "name": "test",
        "value": 42,
        "items": ["item1", "item2", "item3"]
    }


@pytest.fixture
def temp_file():
    """Create a temporary file for testing."""
    fd, path = tempfile.mkstemp()
    yield path
    os.close(fd)
    os.unlink(path)


@pytest.fixture
def mock_database():
    """Provide a mock database connection."""
    db = Mock()
    db.query.return_value = [{"id": 1, "name": "test"}]
    return db


# BASIC UNIT TESTS
class TestFunctionName:
    """Test suite for function_name."""
    
    def test_basic_functionality(self, sample_data):
        """Test that function works with valid input."""
        # TODO: Replace with actual function
        result = function_to_test(sample_data["name"])
        
        assert result is not None
        assert isinstance(result, dict)
        assert result["status"] == "success"
    
    def test_empty_input_raises_error(self):
        """Test that function raises ValueError for empty input."""
        with pytest.raises(ValueError, match="cannot be empty"):
            function_to_test("")
    
    def test_none_input_raises_error(self):
        """Test that function raises TypeError for None input."""
        with pytest.raises(TypeError):
            function_to_test(None)
    
    def test_with_optional_parameters(self, sample_data):
        """Test function with optional parameters provided."""
        result = function_to_test(
            sample_data["name"],
            optional_param=100,
            flag=True
        )
        
        assert result["status"] == "success"
    
    def test_edge_case_maximum_value(self):
        """Test function with maximum valid value."""
        result = function_to_test("test", optional_param=999999)
        assert result is not None
    
    def test_edge_case_minimum_value(self):
        """Test function with minimum valid value."""
        result = function_to_test("test", optional_param=0)
        assert result is not None


# CLASS TESTS
class TestClassName:
    """Test suite for ClassName."""
    
    @pytest.fixture
    def instance(self):
        """Create a test instance."""
        # TODO: Replace with actual class
        return ClassToTest(name="test", value=42)
    
    def test_initialization(self):
        """Test that class initializes correctly."""
        obj = ClassToTest(name="test", value=42)
        
        assert obj.name == "test"
        assert obj.value == 42
        assert obj.status == "initialized"
    
    def test_initialization_with_invalid_name_raises_error(self):
        """Test that invalid name raises ValueError."""
        with pytest.raises(ValueError, match="name cannot be empty"):
            ClassToTest(name="", value=42)
    
    def test_process_method(self, instance):
        """Test the main process method."""
        result = instance.process()
        
        assert isinstance(result, str)
        assert instance.is_processed
        assert instance.status == "processed"
    
    def test_reset_method(self, instance):
        """Test that reset restores initial state."""
        instance.process()
        assert instance.status == "processed"
        
        instance.reset()
        assert instance.status == "initialized"
    
    def test_process_fails_when_not_initialized(self, instance):
        """Test that process fails in invalid state."""
        instance._state = "invalid"
        
        with pytest.raises(RuntimeError, match="Invalid state"):
            instance.process()
    
    def test_equality(self):
        """Test equality comparison."""
        obj1 = ClassToTest("test", 42)
        obj2 = ClassToTest("test", 42)
        obj3 = ClassToTest("other", 42)
        
        assert obj1 == obj2
        assert obj1 != obj3
    
    def test_string_representation(self, instance):
        """Test __str__ and __repr__ methods."""
        str_repr = str(instance)
        repr_repr = repr(instance)
        
        assert "test" in str_repr
        assert "ClassToTest" in repr_repr


# MOCKING AND PATCHING
class TestWithMocks:
    """Test suite demonstrating mocking."""
    
    @patch('mymodule.external_api_call')
    def test_with_mocked_external_call(self, mock_api):
        """Test function that makes external API calls."""
        # Configure mock
        mock_api.return_value = {"status": "success", "data": "test"}
        
        # TODO: Replace with actual function
        result = function_that_calls_api()
        
        # Verify mock was called correctly
        mock_api.assert_called_once()
        assert result["status"] == "success"
    
    def test_with_mock_database(self, mock_database):
        """Test function using mocked database."""
        # TODO: Replace with actual function
        result = function_that_queries_db(mock_database)
        
        # Verify database was queried
        mock_database.query.assert_called()
        assert result is not None


# PARAMETERIZED TESTS
@pytest.mark.parametrize("input_value,expected", [
    ("hello", "HELLO"),
    ("world", "WORLD"),
    ("", ""),
    ("123", "123"),
])
def test_string_processing(input_value, expected):
    """Test string processing with multiple inputs."""
    # TODO: Replace with actual function
    result = process_string(input_value)
    assert result == expected


@pytest.mark.parametrize("value,should_pass", [
    (0, True),
    (42, True),
    (100, True),
    (-1, False),
    (-100, False),
])
def test_validation(value, should_pass):
    """Test validation logic with various values."""
    if should_pass:
        # TODO: Replace with actual function
        result = validate_value(value)
        assert result is True
    else:
        with pytest.raises(ValueError):
            validate_value(value)


# INTEGRATION TESTS
class TestIntegration:
    """Integration tests that test multiple components together."""
    
    def test_end_to_end_workflow(self, temp_file, sample_data):
        """Test complete workflow from input to output."""
        # TODO: Replace with actual workflow
        # Step 1: Process input
        processed = process_input(sample_data)
        
        # Step 2: Save to file
        save_to_file(processed, temp_file)
        
        # Step 3: Load from file
        loaded = load_from_file(temp_file)
        
        # Step 4: Verify round-trip
        assert loaded == processed
    
    def test_error_handling_in_workflow(self, temp_file):
        """Test that errors are handled properly in workflow."""
        # TODO: Replace with actual workflow
        with pytest.raises(ValueError):
            process_invalid_input()


# PERFORMANCE TESTS
class TestPerformance:
    """Tests to verify performance after refactoring."""
    
    def test_performance_with_large_dataset(self):
        """Test that function handles large datasets efficiently."""
        import time
        
        large_data = list(range(10000))
        
        start = time.time()
        # TODO: Replace with actual function
        result = process_large_dataset(large_data)
        duration = time.time() - start
        
        # Should complete in under 1 second
        assert duration < 1.0
        assert len(result) == len(large_data)
    
    @pytest.mark.slow
    def test_memory_usage(self):
        """Test memory usage with large data (mark as slow)."""
        import sys
        
        # TODO: Replace with actual function
        large_object = create_large_object()
        size = sys.getsizeof(large_object)
        
        # Should not exceed 10MB
        assert size < 10 * 1024 * 1024


# PROPERTY-BASED TESTS (requires hypothesis)
try:
    from hypothesis import given, strategies as st
    
    @given(st.text(min_size=1), st.integers(min_value=0, max_value=1000))
    def test_property_based(text_input, int_input):
        """Property-based test using hypothesis."""
        # TODO: Replace with actual function
        result = function_to_test(text_input, int_input)
        
        # Properties that should always hold
        assert result is not None
        assert isinstance(result, dict)
        assert "status" in result

except ImportError:
    # Hypothesis not installed, skip these tests
    pass


# TEST UTILITIES
def assert_valid_result(result: dict) -> None:
    """Helper function to validate result structure."""
    assert isinstance(result, dict)
    assert "status" in result
    assert result["status"] in {"success", "error"}
    assert "message" in result


# FIXTURES FOR DIFFERENT SCENARIOS
@pytest.fixture
def success_scenario():
    """Setup for success test scenario."""
    return {
        "input": "valid_input",
        "expected_status": "success"
    }


@pytest.fixture
def error_scenario():
    """Setup for error test scenario."""
    return {
        "input": "invalid_input",
        "expected_error": ValueError
    }


# MARK TESTS WITH CATEGORIES
@pytest.mark.unit
def test_unit_example():
    """Unit test example."""
    pass


@pytest.mark.integration
def test_integration_example():
    """Integration test example."""
    pass


@pytest.mark.slow
def test_slow_example():
    """Slow test that can be skipped during quick runs."""
    pass


# SKIP/XFAIL EXAMPLES
@pytest.mark.skip(reason="Feature not implemented yet")
def test_future_feature():
    """Test for feature that will be implemented."""
    pass


@pytest.mark.xfail(reason="Known bug, fix in progress")
def test_known_issue():
    """Test for known issue being worked on."""
    assert False, "This is expected to fail"


# UNITTEST-STYLE TESTS (alternative to pytest)
class TestUnittyleStyle(unittest.TestCase):
    """Example using unittest style instead of pytest."""
    
    def setUp(self):
        """Run before each test."""
        self.test_data = {"name": "test", "value": 42}
    
    def tearDown(self):
        """Run after each test."""
        self.test_data = None
    
    def test_example(self):
        """Example test using unittest assertions."""
        # TODO: Replace with actual function
        result = function_to_test(self.test_data["name"])
        
        self.assertIsNotNone(result)
        self.assertIsInstance(result, dict)
        self.assertEqual(result["status"], "success")


# RUN TESTS
if __name__ == "__main__":
    # Run with pytest
    pytest.main([__file__, "-v"])
    
    # Or run with unittest
    # unittest.main()
