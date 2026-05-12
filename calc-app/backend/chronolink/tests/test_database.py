import pytest
from unittest.mock import MagicMock, patch
from app.database import get_session

def test_get_session_yields_session():
    # Arrange
    mock_session_instance = MagicMock()
    mock_session_class = MagicMock(return_value=mock_session_instance)
    mock_session_instance.__enter__.return_value = mock_session_instance

    # Act & Assert
    with patch("app.database.Session", mock_session_class):
        with patch("app.database.engine", MagicMock()):
            generator = get_session()
            session = next(generator)

            # Assert we got the mocked session from __enter__
            assert session == mock_session_instance

            # Assert context manager was started
            mock_session_instance.__enter__.assert_called_once()

            # Try to exhaust the generator
            with pytest.raises(StopIteration):
                next(generator)

            # Assert context manager was correctly exited
            mock_session_instance.__exit__.assert_called_once()
