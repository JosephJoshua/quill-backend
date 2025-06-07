# Quill Backend

This repository contains the backend service for **Quill**, an intelligent language learning platform designed to help users improve their language skills through literature. Quill leverages AI to provide a Socratic tutoring experience, personalized content analysis, and a sophisticated spaced repetition system (SRS) for vocabulary retention.

The backend is built with the [NestJS](https://nestjs.com/) framework, providing a scalable and modular architecture.

## Core Features
-   **AI-Powered Tutor**: Engages users in Socratic conversations about literary texts to enhance comprehension and expression, powered by large language models via OpenRouter.
-   **Content Analysis Pipeline**: Automatically processes uploaded texts (PDFs, plain text) to assess CEFR difficulty, extract key vocabulary and grammar points, and generate comprehension questions.
-   **Retrieval-Augmented Generation (RAG)**: Uses Azure AI Search to provide contextually-aware responses during tutor chats, ensuring the conversation stays relevant to the source material.
-   **Spaced Repetition System (SRS)**: A built-in flashcard system using the FSRS (Free Spaced Repetition Scheduler) algorithm to optimize learning and memory retention.
-   **User Proficiency Assessment**: Evaluates user-written text to estimate their CEFR level, providing valuable feedback on their strengths and areas for improvement.
-   **Robust Backend Architecture**:
    -   Built with **NestJS** and **TypeScript**.
    -   Uses **PostgreSQL** with **TypeORM** for data persistence.
    -   Integrates **BullMQ** and **Redis** for managing background jobs like content indexing and AI-powered memory synthesis.
    -   Secure authentication using **JWT** and **Passport.js**.
-   **Cloud Integration**: Leverages **Azure Blob Storage** for file uploads and **Azure AI Search** for advanced text and vector search capabilities.

## Technology Stack

| Category           | Technology                                                              |
| ------------------ | ----------------------------------------------------------------------- |
| **Framework** | [NestJS](https://nestjs.com/)                                           |
| **Language** | [TypeScript](https://www.typescriptlang.org/)                           |
| **Database** | [PostgreSQL](https://www.postgresql.org/), [TypeORM](https://typeorm.io/) |
| **AI Services** | [OpenRouter](https://openrouter.ai/)          |
| **Search** | [Azure AI Search](https://azure.microsoft.com/en-us/products/ai-search) |
| **File Storage** | [Azure Blob Storage](https://azure.microsoft.com/en-us/products/storage/blobs) |
| **Job Queue** | [BullMQ](https://bullmq.io/)                                            |
| **Caching** | [Redis](https://redis.io/)                                              |
| **Authentication** | JWT, Passport.js                                                        |
| **Package Manager**| [pnpm](https://pnpm.io/)                                                |

---

## Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/en/) (v20 or higher recommended)
-   [pnpm](https://pnpm.io/installation)
-   An [Azure](https://azure.microsoft.com/) account.
-   An [OpenRouter.ai](https://openrouter.ai/) API key.

### 1. Environment Setup

Create a `.env` file in the root directory by copying the example below. Fill in the values with your credentials.

```env
# .env.example

# Application
NODE_ENV=development
PORT=3000

# Database (PostgreSQL)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=your_postgres_password
DATABASE_NAME=quill

# Authentication (JWT)
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRATION_TIME=7d

# Redis (for Caching and BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS_ENABLED=false

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING="your_azure_storage_connection_string"
AZURE_STORAGE_CONTAINER_NAME="content"

# Azure AI Search
AZURE_SEARCH_ENDPOINT="[https://your-search-service.search.windows.net](https://your-search-service.search.windows.net)"
AZURE_SEARCH_KEY="your_azure_search_admin_key"
AZURE_SEARCH_INDEX_NAME="quill-content-index"

# OpenRouter.ai
OPENROUTER_API_KEY="your_openrouter_api_key"
OPENROUTER_REFERRER="http://localhost:3000"
OPENROUTER_SITE_NAME="Quill Development"
```

### 2. Installation

Install the project dependencies using pnpm:

```bash
pnpm install
```

### 3. Running the Application

To run the application in development mode with live-reloading:

```bash
pnpm run start:dev
```

The application will be available at `http://localhost:3000`.

### Scripts

-   `pnpm run start`: Start the application in development mode.
-   `pnpm run start:prod`: Build and run the application for production.
-   `pnpm run build`: Build the project for production.
-   `pnpm run lint`: Lint the codebase.
-   `pnpm run format`: Format the code with Prettier.
-   `pnpm run test`: Run unit tests.
-   `pnpm run test:e2e`: Run end-to-end tests.

---

## API Overview

The backend is organized into several modules, each handling a core feature:

-   **/auth**: Handles user registration, login, and JWT generation.
-   **/users**: Manages user profiles and proficiency assessments.
-   **/content**: Manages uploading, processing, and retrieving learning content.
-   **/tutor**: Powers the AI chat functionality.
-   **/quizzes**: Handles quiz submission and grading.
-   **/srs**: Manages the Spaced Repetition System (flashcards and reviews).

## License

This project is licensed under the MIT license.
