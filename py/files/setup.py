"""Setup script for figma-files package."""
from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="figma-files",
    version="0.1.0",
    author="thinkeloquent",
    description="Python SDK for Figma Files API",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/thinkeloquent/figma-files-sdk",
    project_urls={
        "Bug Tracker": "https://github.com/thinkeloquent/figma-files-sdk/issues",
        "Documentation": "https://figma-files-sdk.readthedocs.io/",
    },
    package_dir={"": "src"},
    packages=find_packages(where="src"),
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
        "Topic :: Internet :: WWW/HTTP :: Dynamic Content",
        "Typing :: Typed",
    ],
    python_requires=">=3.9",
    install_requires=requirements,
    extras_require={
        "dev": [
            "pytest>=8.0.0",
            "pytest-asyncio>=0.23.0",
            "pytest-cov>=5.0.0",
            "pytest-mock>=3.14.0",
            "mypy>=1.8.0",
            "ruff>=0.3.0",
            "pre-commit>=3.6.0",
        ],
        "docs": [
            "mkdocs>=1.5.0",
            "mkdocs-material>=9.5.0",
            "mkdocstrings[python]>=0.24.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "figma-files=figma_files.cli:app",
        ],
    },
    keywords="figma api sdk client files design automation",
    include_package_data=True,
    zip_safe=False,
)