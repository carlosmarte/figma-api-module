"""
Setup script for figma-variables package.
"""

from setuptools import setup, find_packages
from pathlib import Path

# Read the README file
this_directory = Path(__file__).parent
long_description = (this_directory / "README.md").read_text(encoding="utf-8")

# Read requirements
requirements = []
with open("requirements.txt") as f:
    for line in f:
        line = line.strip()
        if line and not line.startswith("#") and not line.startswith("-"):
            # Extract package name without version constraints for setup.py
            package = line.split(">=")[0].split("==")[0].split("<")[0].split("[")[0]
            requirements.append(package)

setup(
    name="figma-variables",
    version="0.1.0",
    description="Comprehensive Python library for Figma Variables API (Enterprise only)",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Figma Variables Team",
    author_email="support@figma.com",
    url="https://github.com/figma/figma-variables-python",
    project_urls={
        "Documentation": "https://figma-variables-python.readthedocs.io",
        "Source": "https://github.com/figma/figma-variables-python",
        "Issues": "https://github.com/figma/figma-variables-python/issues",
    },
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    python_requires=">=3.9",
    install_requires=[
        "httpx>=0.27.0",
        "pydantic>=2.7.0",
        "typer[all]>=0.12.0",
        "rich>=13.7.0",
    ],
    extras_require={
        "server": [
            "fastapi>=0.110.0",
            "uvicorn[standard]>=0.29.0",
        ],
        "dev": [
            "pytest>=8.0.0",
            "pytest-asyncio>=0.23.0",
            "pytest-cov>=5.0.0",
            "pytest-mock>=3.14.0",
            "mypy>=1.8.0",
            "ruff>=0.3.0",
            "pre-commit>=3.7.0",
        ],
        "docs": [
            "mkdocs>=1.5.0",
            "mkdocs-material>=9.5.0",
            "mkdocstrings[python]>=0.24.0",
        ],
        "all": [
            "fastapi>=0.110.0",
            "uvicorn[standard]>=0.29.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "figma-variables=figma_variables.cli:app",
        ],
    },
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Internet :: WWW/HTTP :: HTTP Servers",
        "Framework :: FastAPI",
        "Framework :: AsyncIO",
    ],
    keywords="figma variables design tokens api enterprise",
    license="MIT",
    include_package_data=True,
    zip_safe=False,
)