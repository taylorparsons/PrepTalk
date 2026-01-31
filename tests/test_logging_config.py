from app import logging_config


def test_logger_name_is_preptalk():
    assert logging_config._LOGGER_NAME == "preptalk"
