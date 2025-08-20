"""Setup script for figma-comments package."""

import os
from setuptools import setup, find_packages

# Read the README file
here = os.path.abspath(os.path.dirname(__file__))
with open(os.path.join(here, "README.md"), encoding="utf-8") as f:
    long_description = f.read()

# Read the requirements file
with open(os.path.join(here, "requirements.txt"), encoding="utf-8") as f:
    requirements = [line.strip() for line in f if line.strip() and not line.startswith("#")]

# Extract production requirements (exclude dev dependencies)
prod_requirements = []
for req in requirements:
    if any(dev_keyword in req.lower() for dev_keyword in ["pytest", "mypy", "ruff", "black", "sphinx"]):
        continue
    prod_requirements.append(req)

setup(
    name="figma-comments",
    version="0.1.0",
    author="Your Name",
    author_email="your.email@example.com",
    description="A comprehensive Python library for Figma Comments API integration",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/your-org/figma-comments",
    project_urls={
        "Bug Reports": "https://github.com/your-org/figma-comments/issues",
        "Source": "https://github.com/your-org/figma-comments",
        "Documentation": "https://figma-comments.readthedocs.io",
    },
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: Multimedia :: Graphics :: Graphics Conversion",
        "Topic :: Internet :: WWW/HTTP :: Dynamic Content",
        "Topic :: Office/Business :: Groupware",
        "Typing :: Typed",
    ],
    python_requires=">=3.8",
    install_requires=prod_requirements,
    extras_require={
        "dev": [
            "pytest>=8.0.0",
            "pytest-asyncio>=0.23.0",
            "pytest-cov>=5.0.0",
            "pytest-mock>=3.14.0",
            "mypy>=1.8.0",
            "ruff>=0.3.0",
            "black>=24.0.0",
            "sphinx>=7.0.0",
            "sphinx-autodoc-typehints>=2.0.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "figma-comments=figma_comments.interfaces.cli:app",
        ],
    },
    keywords="figma api comments design collaboration",
    include_package_data=True,
    zip_safe=False,
)