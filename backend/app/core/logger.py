"""
Centralized logging configuration for PPE Compliance System
"""
import logging
import sys
from pathlib import Path
from logging.handlers import RotatingFileHandler
from .config import settings


def setup_logger(name: str = "ppe_compliance") -> logging.Logger:
    """
    Setup and configure application logger

    Args:
        name: Logger name (default: ppe_compliance)

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)

    # Avoid adding handlers multiple times
    if logger.handlers:
        return logger

    # Set log level based on environment
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO
    logger.setLevel(log_level)

    # Create logs directory if it doesn't exist
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)

    # Console handler with color support
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_formatter)

    # File handler with rotation (max 10MB, keep 5 backup files)
    file_handler = RotatingFileHandler(
        log_dir / "ppe_compliance.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    file_handler.setLevel(logging.INFO)
    file_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(file_formatter)

    # Error file handler (only errors and above)
    error_handler = RotatingFileHandler(
        log_dir / "errors.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5,
        encoding='utf-8'
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(file_formatter)

    # Add handlers to logger
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)
    logger.addHandler(error_handler)

    return logger


# Create default logger instance
logger = setup_logger()


def get_logger(name: str = None) -> logging.Logger:
    """
    Get a logger instance for a specific module

    Args:
        name: Module name (e.g., __name__)

    Returns:
        Logger instance
    """
    if name:
        return logging.getLogger(f"ppe_compliance.{name}")
    return logger
