"""
Setup script for figma-library-analytics package.
"""

from setuptools import find_packages, setup

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

# Filter out development dependencies
production_requirements = [
    req for req in requirements
    if not any(dev_pkg in req for dev_pkg in ["pytest", "mypy", "ruff", "black", "isort", "pre-commit"])
]

setup(
    name="figma-library-analytics",
    version="0.1.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="Python SDK and API for Figma Library Analytics",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/yourorg/figma-library-analytics",
    project_urls={
        "Bug Tracker": "https://github.com/yourorg/figma-library-analytics/issues",
        "Documentation": "https://figma-library-analytics.readthedocs.io",
        "Source Code": "https://github.com/yourorg/figma-library-analytics",
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
        "Topic :: Internet :: WWW/HTTP :: HTTP Servers",
    ],
    python_requires=">=3.9",
    install_requires=production_requirements,
    extras_require={
        "dev": [
            "pytest>=8.0.0",
            "pytest-asyncio>=0.23.0",
            "pytest-cov>=5.0.0",
            "pytest-mock>=3.14.0",
            "mypy>=1.8.0",
            "ruff>=0.3.0",
            "black>=24.0.0",
            "isort>=5.13.0",
            "pre-commit>=3.6.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "figma-analytics=figma_library_analytics.cli:app",
        ],
    },
    keywords=["figma", "analytics", "design", "api", "sdk"],
    include_package_data=True,
    zip_safe=False,
)