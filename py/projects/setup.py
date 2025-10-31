#!/usr/bin/env python3
"""Setup script for figma-projects package."""

from setuptools import setup, find_packages
import os

# Read the README file
current_dir = os.path.abspath(os.path.dirname(__file__))
with open(os.path.join(current_dir, "README.md"), encoding="utf-8") as f:
    long_description = f.read()

# Read requirements
with open(os.path.join(current_dir, "requirements.txt"), encoding="utf-8") as f:
    requirements = [line.strip() for line in f if line.strip() and not line.startswith("#")]

setup(
    name="figma-projects",
    version="0.1.0",
    description="A comprehensive Python library for Figma Projects integration",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Figma Projects Team",
    author_email="info@figmaprojects.dev",
    url="https://github.com/figma/projects-python",
    project_urls={
        "Bug Reports": "https://github.com/figma/projects-python/issues",
        "Source": "https://github.com/figma/projects-python",
        "Documentation": "https://figma-projects.readthedocs.io",
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
        "Topic :: Software Development :: User Interfaces",
    ],
    python_requires=">=3.9",
    install_requires=requirements,
    entry_points={
        "console_scripts": [
            "figma-projects=figma_projects.cli:app",
        ],
    },
    include_package_data=True,
    zip_safe=False,
    keywords="figma projects api sdk cli server",
)