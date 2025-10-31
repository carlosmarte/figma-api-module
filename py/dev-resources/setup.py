"""Setup script for figma-dev-resources package."""

from setuptools import find_packages, setup

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

# Extract production requirements only (exclude dev dependencies)
production_requirements = []
for req in requirements:
    if any(dev_pkg in req for dev_pkg in ["pytest", "mypy", "ruff", "black", "isort"]):
        continue
    production_requirements.append(req)

setup(
    name="figma-dev-resources",
    version="0.1.0",
    author="Figma Dev Resources SDK Team",
    author_email="support@figma.com",
    description="Python SDK for Figma Dev Resources API",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/figma/dev-resources-sdk",
    project_urls={
        "Bug Tracker": "https://github.com/figma/dev-resources-sdk/issues",
        "Documentation": "https://figma-dev-resources-sdk.readthedocs.io",
        "Source Code": "https://github.com/figma/dev-resources-sdk",
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
        ],
    },
    entry_points={
        "console_scripts": [
            "figma-dev-resources=figma_dev_resources.cli:app",
        ],
    },
    keywords="figma api dev-resources sdk",
    include_package_data=True,
    zip_safe=False,
)