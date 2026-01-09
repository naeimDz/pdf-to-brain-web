# Jules API Documentation

## Introduction
The Jules API lets you programmatically access Jules's capabilities to automate and enhance your software development lifecycle. You can use the API to create custom workflows, automate tasks like bug fixing and code reviews, and embed Jules's intelligence directly into the tools you use every day, such as Slack, Linear, and GitHub.

**Note**: The Jules API is in an alpha release.

## Authentication
Header: `X-Goog-Api-Key: YOUR_API_KEY`

## Core Resources
- **Source**: An input source (e.g., GitHub repo).
- **Session**: A continuous unit of work (requires a Source).
- **Activity**: A single unit of work within a Session.

## Endpoints
- Base URL: `https://jules.googleapis.com/v1alpha`
- List Sources: `GET /sources`
- Create Session: `POST /sessions`
    - Requires `sourceContext` (GitHub repo)
    - Body: `{ "prompt": "...", "sourceContext": { ... } }`
- Get/List Activities: `GET /sessions/{id}/activities`
- Send Message: `POST /sessions/{id}:sendMessage`

## Analysis for PDF-to-Brain
This API is designed for **Agentic Coding** (modifying code repositories). It requires a `sourceContext` (like a GitHub repo) to initialize a session.
For general text analysis (PDF-to-Brain), this model is likely **overkill or unsuitable** without a dummy repository context.
The project currently uses **Gemini**, which is perfectly suited for general text summarization and Q&A.
