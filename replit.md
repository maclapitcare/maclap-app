# replit.md

## Overview

This is a modern cash tracking application for Maclap business, designed as a full-stack web application. Its main purpose is to provide comprehensive financial management, including transaction tracking (cash in/out), pending payment management, utility meter readings, and general note-taking. The system features real-time data synchronization, enabling businesses to efficiently manage their daily financial operations and gain insights through advanced analytics and reporting. The project aims to streamline cash flow, enhance financial visibility, and provide robust tools for business intelligence and record-keeping.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript.
- **Routing**: Wouter for lightweight client-side routing.
- **State Management**: Zustand for authentication, TanStack Query for server state.
- **UI Components**: Shadcn/ui (Radix UI primitives).
- **Styling**: Tailwind CSS with custom design tokens and responsive design (mobile-first).
- **Build Tool**: Vite.
- **UI/UX Design**: Clean, professional interface with consistent spacing, responsive layouts, real-time update indicators, global search, toast notifications, gradient backgrounds, and glassmorphism effects. Features include quick entry buttons, detailed transaction history, a redesigned dashboard with cleaner layouts and visual hierarchy, and an improved notes section.
- **Key Features**: Login screen with user selection, bottom navigation with five main tabs (Transaction, Dashboard, Notes, Pending Payments, Meter Readings), quick cash in/out entry, dashboard analytics with time filtering and user-wise balance analysis, settings page with CSV export, password change, and record deletion. Enhanced transaction pages for fast entry, comprehensive search with text and date filtering, and redesigned notes with auto-title generation and search.
- **Authentication**: Local authentication with hardcoded admin users (Puneet and Sonu), session persistence via Zustand/localStorage, and route-based guards. Includes WebAuthn API integration for biometric/fingerprint authentication.
- **Data Models**: Transactions, Pending Payments, Meter Readings, Notes.
- **Data Flow**: Login -> Zustand state -> Route protection. Client form submission -> Firebase Firestore -> Real-time listeners update UI. Search queries filter state from Firebase subscriptions. Real-time sync via Firebase `onSnapshot` listeners.
- **Offline Functionality**: IndexedDB for offline data storage with automatic sync when online. Includes an offline indicator and background sync.
- **User Experience Enhancements**: Bulk selection for deletion, professional audio feedback for transactions and buttons, comprehensive edit functionality for notes and recent transactions (today + yesterday), MacLap logo with gradient colors, and professional PWA configuration with custom app icon.
- **Dashboard Analytics**: Interactive charts using Recharts for 7-day cash flow, user performance comparison, smart insights, period filtering (months/years), real-time search, and enhanced user balance cards.
- **Export Functionality**: Enhanced PDF and Excel exports with date range filtering, user balance summaries, MacLap branding, professional formatting, and color-coded tables.

### Backend
- **Runtime**: Node.js with Express.js.
- **Language**: TypeScript with ES modules.
- **Database Integration**: Drizzle ORM with PostgreSQL dialect.
- **Session Management**: Express sessions with PostgreSQL session store.
- **Development**: Hot reload with Vite integration.
- **Deployment**: Replit autoscale deployment target with Node.js 20. Configured for production builds using Vite (frontend) and ESBuild (backend). SPA fallback routing for production.
- **Database Management**: Schema defined in `shared/schema.ts` with Zod validation. Drizzle Kit for migrations.
- **User Roles**: Role-based authentication (`admin`, `super_admin`), with Puneet as `super_admin` able to edit today's transaction amounts and assign transaction ownership.
- **Notification System**: Daily reminders using Web Notifications API and a service worker for persistent notifications.
- **Transaction Safeguards**: 2-second cooldown for transaction submissions and duplicate prevention.

## External Dependencies

- **Firebase**: Real-time database and synchronization (Firestore).
- **Drizzle ORM**: Database schema management and migrations.
- **Neon Database**: PostgreSQL hosting (serverless).
- **Shadcn/ui**: Pre-built accessible components.
- **TanStack Query**: Server state management and caching.
- **Recharts**: Charting library for data visualization.
- **Vite**: Build tool.
- **TypeScript**: Static type checking.
- **Tailwind CSS**: Utility-first styling.
- **ESLint/Prettier**: Code quality and formatting.