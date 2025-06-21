# LibraryPro - Bookstore Management System

## Overview

LibraryPro is a full-stack bookstore management system built for managing book inventory, processing sales, and exporting data to external platforms like Estante Virtual. The application features a modern React frontend with shadcn/ui components and an Express.js backend using PostgreSQL with Drizzle ORM.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query for server state management
- **UI Components**: shadcn/ui built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **Form Handling**: React Hook Form with Zod validation
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js with middleware for logging and error handling
- **Database**: PostgreSQL with connection pooling via Neon serverless
- **ORM**: Drizzle ORM for type-safe database operations
- **API Design**: RESTful API with structured error responses
- **File Processing**: Multer for image upload handling

## Key Components

### Database Schema
The application uses a relational database structure with the following core entities:
- **Books**: Main catalog with ISBN, title, author, publisher, pricing, and metadata
- **Inventory**: Stock management with quantity, location, and status tracking
- **Sales**: Transaction records with customer information and payment methods
- **Sale Items**: Line items linking sales to specific books with quantities and prices

### Core Features
1. **ISBN Search & Book Registration**: Automated book data retrieval from Google Books and Open Library APIs
2. **Inventory Management**: Real-time stock tracking with low-stock alerts
3. **Point of Sale (POS)**: Complete sales processing with multiple payment methods
4. **Export System**: Data export to Excel/CSV formats for Estante Virtual integration
5. **Image Analysis**: OpenAI integration for automatic book condition assessment
6. **Dashboard Analytics**: Sales metrics and inventory insights

### API Structure
- `/api/books` - Book catalog management (CRUD operations)
- `/api/inventory` - Stock management and tracking
- `/api/sales` - Sales processing and history
- `/api/dashboard/stats` - Analytics and metrics
- `/api/export` - Data export functionality
- `/api/search` - Book search by ISBN and text queries

## Data Flow

1. **Book Registration**: ISBN search → API data retrieval → Manual validation → Database storage
2. **Inventory Updates**: Stock changes → Database updates → Real-time UI refresh via TanStack Query
3. **Sales Processing**: Cart management → Payment processing → Inventory adjustment → Receipt generation
4. **Export Process**: Database query → Data transformation → File generation → Download delivery

## External Dependencies

### Third-party APIs
- **Google Books API**: Primary source for book metadata via ISBN
- **Open Library API**: Fallback for book information
- **OpenAI API**: Book condition analysis from images

### Key Libraries
- **Database**: `@neondatabase/serverless`, `drizzle-orm`, `drizzle-kit`
- **UI Components**: All `@radix-ui/*` packages, `class-variance-authority`
- **Utilities**: `date-fns`, `clsx`, `tailwind-merge`
- **File Processing**: `multer`, `xlsx` for Excel generation

## Deployment Strategy

### Development Environment
- **Runtime**: Replit with Node.js 20, PostgreSQL 16, and web modules
- **Process**: `npm run dev` starts both frontend and backend in development mode
- **Hot Reload**: Vite HMR for frontend, tsx for backend TypeScript execution

### Production Build
- **Frontend**: Vite builds optimized static assets to `dist/public`
- **Backend**: esbuild bundles server code with external dependencies
- **Deployment**: Autoscale deployment target with build and start commands
- **Environment**: Production environment variables for database and API keys

### Database Management
- **Migrations**: Drizzle Kit manages schema changes via `db:push` command
- **Connection**: Connection pooling through Neon serverless with WebSocket support
- **Environment**: `DATABASE_URL` required for all database operations

## Testing Guide

### Valid ISBNs for Testing
- **9780134685991** - "Effective Java" by Joshua Bloch (Programming)
- **9780596520687** - "JavaScript: The Definitive Guide" (Web Development)
- **9780321573513** - "Algorithms" by Robert Sedgewick (Computer Science)

### Quick Start Steps
1. Go to "Busca por ISBN" in the sidebar
2. Enter one of the valid ISBNs above
3. System will automatically fetch book data
4. Click "Adicionar ao Catálogo" to save
5. Test the POS system with the added book
6. Export data to Excel for Estante Virtual

## Changelog
- June 21, 2025. Initial setup and error corrections
  - Fixed Select component errors with empty values
  - Corrected ISBN search automatic data fetching
  - Resolved DOM manipulation errors
  - Updated filtering system to use "all" instead of empty strings
  - Improved error handling and user feedback

## User Preferences

Preferred communication style: Simple, everyday language.