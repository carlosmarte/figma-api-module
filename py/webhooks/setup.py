"""
Setup script for figma-webhooks package.
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="figma-webhooks",
    version="0.1.0",
    author="Figma Webhooks Library",
    author_email="support@figma.com",
    description="A comprehensive Python library for managing Figma webhooks",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/figma/webhooks-python",
    project_urls={
        "Bug Tracker": "https://github.com/figma/webhooks-python/issues",
        "Documentation": "https://figma-webhooks.readthedocs.io",
        "Source Code": "https://github.com/figma/webhooks-python",
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
        "Topic :: Software Development :: Libraries :: Application Frameworks",
    ],
    python_requires=">=3.9,<3.12",
    install_requires=requirements,
    entry_points={
        "console_scripts": [
            "figma-webhooks=figma_webhooks.cli:app",
        ],
    },
    keywords="figma webhooks api design automation",
    include_package_data=True,
    zip_safe=False,
)