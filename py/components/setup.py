"""Setup script for figma-components package."""

from setuptools import setup, find_packages
import os

# Read README file
def read_file(filename):
    """Read a file and return its contents."""
    with open(os.path.join(os.path.dirname(__file__), filename), encoding='utf-8') as f:
        return f.read()

# Read requirements
def read_requirements(filename):
    """Read requirements from file."""
    with open(filename, encoding='utf-8') as f:
        return [line.strip() for line in f if line.strip() and not line.startswith('#')]

setup(
    name="figma-components",
    version="0.1.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="Python library for interacting with Figma's Components, Component Sets, and Styles APIs",
    long_description=read_file("README.md"),
    long_description_content_type="text/markdown",
    url="https://github.com/yourusername/figma-components",
    project_urls={
        "Bug Reports": "https://github.com/yourusername/figma-components/issues",
        "Source": "https://github.com/yourusername/figma-components",
        "Documentation": "https://figma-components.readthedocs.io",
    },
    packages=find_packages(where="src"),
    package_dir={"": "src"},
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
    ],
    python_requires=">=3.9,<3.12",
    install_requires=[
        "httpx>=0.27.0,<1.0.0",
        "pydantic>=2.7.0,<3.0.0",
        "typer[all]>=0.12.0,<1.0.0",
        "rich>=13.7.0,<14.0.0",
        "fastapi>=0.110.0,<1.0.0",
        "uvicorn[standard]>=0.29.0,<1.0.0",
    ],
    extras_require={
        "dev": [
            "pytest>=8.0.0,<9.0.0",
            "pytest-asyncio>=0.23.0,<1.0.0",
            "pytest-cov>=5.0.0,<6.0.0",
            "pytest-mock>=3.14.0,<4.0.0",
            "mypy>=1.8.0,<2.0.0",
            "ruff>=0.3.0,<1.0.0",
            "black>=24.0.0,<25.0.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "figma-components=figma_components.cli:app",
        ],
    },
    keywords="figma components api design tokens",
    zip_safe=False,
    include_package_data=True,
)