# GitHub Copilot Instructions for EasyFlows Pro

## Project Overview

EasyFlows Pro is a modern web application built with React, TypeScript, and Vite. It's a comprehensive business management platform with features for managing orders, campaigns, payments, training, and AI agents.

## Technology Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5 with SWC for fast compilation
- **Styling**: Tailwind CSS 3 with custom theme
- **UI Components**: shadcn-ui (Radix UI primitives)
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: React Router DOM v6
- **Backend**: Supabase
- **Error Tracking**: Sentry
- **Form Handling**: React Hook Form with Zod validation

## TypeScript Configuration

- Base URL is set to `"."` with path alias `@/*` pointing to `./src/*`
- TypeScript strict mode is disabled in `tsconfig.app.json` with `strict: false`
- Additional configuration from root `tsconfig.json`:
  - `strictNullChecks: false`
  - `noImplicitAny: false`
  - `noUnusedLocals: false`
  - `noUnusedParameters: false`
  - `skipLibCheck: true`
  - `allowJs: true`
- Always use TypeScript for new files (`.tsx` for components, `.ts` for utilities)

## Coding Standards

### React Components

- **Always use functional components** with hooks (no class components)
- **Use named exports** for components (not default exports)
- **Component structure**:
  ```tsx
  import { ReactNode } from "react";
  import { cn } from "@/lib/utils";
  
  interface ComponentProps {
    // Props definition
  }
  
  export function ComponentName({ prop1, prop2 }: ComponentProps) {
    // Component logic
    return (
      // JSX
    );
  }
  ```
- **Props**: Define interfaces for component props with clear, descriptive names
- **Hooks**: Place all hooks at the top of the component, before any conditional logic
- **Event handlers**: Name them with `handle` prefix (e.g., `handleClick`, `handleSubmit`)

### File Naming and Organization

- **Components**: PascalCase (e.g., `StatCard.tsx`, `QuickActions.tsx`)
- **Utilities**: camelCase (e.g., `utils.ts`, `helpers.ts`)
- **Component organization**: Group related components in subdirectories under `src/components`
- **Pages**: Place in `src/pages` directory with PascalCase naming
- **Hooks**: Place custom hooks in `src/hooks` directory with `use` prefix

### Import Conventions

- **Order of imports**:
  1. React and external libraries
  2. Internal components and utilities using `@/` alias
  3. Types and interfaces
  4. Assets and styles
- **Use path aliases**: Always use `@/` for imports from `src` directory
- **Examples**:
  ```tsx
  import { ReactNode } from "react";
  import { cn } from "@/lib/utils";
  import { Button } from "@/components/ui/button";
  ```

### Styling Guidelines

- **Use Tailwind CSS** for all styling (no inline styles or CSS modules)
- **Use the `cn()` utility** from `@/lib/utils` for conditional classes:
  ```tsx
  <div className={cn("base-classes", condition && "conditional-classes")} />
  ```
- **Follow the theme**: Use CSS variables for colors (e.g., `text-primary`, `bg-success`, `border-muted`)
- **Responsive design**: Mobile-first approach, use Tailwind responsive prefixes (`sm:`, `md:`, `lg:`, etc.)
- **Glass morphism**: This project uses glass effect styling with `.glass` and `.glass-hover` classes
- **Animations**: Use Tailwind animate classes and custom animations defined in config

### Component Patterns

- **UI Components**: Use shadcn-ui components from `@/components/ui`
- **Icons**: Use Lucide React icons
- **Form handling**: Use React Hook Form with Zod schemas for validation
- **Conditional rendering**: Prefer `&&` for simple conditions, ternary for if-else
- **State management**: Use React Query for server state, local state with `useState`
- **Side effects**: Use `useEffect` with proper dependency arrays

### Code Quality

- **Type safety**: Define proper TypeScript interfaces and types
- **Prop validation**: Use TypeScript interfaces for props (no PropTypes)
- **Error handling**: Always handle errors in async operations and API calls
- **Loading states**: Show loading indicators for async operations
- **Accessibility**: Use semantic HTML and ARIA attributes where needed

### API and Data Fetching

- **Use Supabase client** from `@/integrations/supabase/client`
- **Use React Query** for data fetching, caching, and synchronization
- **Error handling**: Wrap API calls in try-catch blocks and show user-friendly error messages
- **Loading states**: Use `isLoading`, `isError` from React Query hooks

### Security Best Practices

- **Never commit sensitive data** (API keys, tokens, passwords)
- **Use environment variables** for configuration (see `.env.example`)
- **Validate user input** on both client and server side
- **Sanitize data** before displaying to prevent XSS
- **Use Supabase RLS** (Row Level Security) for database access control

### Performance

- **Code splitting**: Vite automatically handles code splitting
- **Lazy loading**: Use React.lazy() and Suspense for route-based code splitting
- **Memoization**: Use `useMemo` and `useCallback` for expensive computations
- **Image optimization**: Use appropriate image formats and sizes
- **Bundle size**: Keep dependencies minimal, avoid heavy libraries

### Testing

- **No test suite currently configured** - if adding tests, consider Vitest (Vite-native)
- **Manual testing**: Test all user flows before committing
- **Browser compatibility**: Test in modern browsers (Chrome, Firefox, Safari, Edge)

### Git and Version Control

- **Commit messages**: Use clear, descriptive commit messages
- **Small commits**: Make focused commits that address a single concern
- **Branch naming**: Use descriptive branch names (e.g., `feature/add-login`, `fix/payment-bug`)

### Common Patterns in This Project

- **Multi-language support**: Some UI text includes French (e.g., "vs hier" meaning "vs yesterday" in date comparisons)
- **Business domain**: Focus on orders, campaigns, products, clients, payments, delivery
- **Role-based features**: Admin, supervisor, and caller roles with different permissions
- **Real-time features**: Chat and notifications with Supabase realtime

### Examples to Follow

**Good component structure**:
```tsx
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: ReactNode;
  color?: "primary" | "success" | "warning" | "destructive";
}

export function StatCard({ title, value, change, icon, color = "primary" }: StatCardProps) {
  const isPositive = change && change > 0;

  return (
    <div className="glass glass-hover rounded-xl p-5 animate-fade-in">
      <div className="flex items-start justify-between">
        {/* Component content */}
      </div>
    </div>
  );
}
```

**Good import structure**:
```tsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
```

### Anti-patterns to Avoid

- ❌ Default exports for components
- ❌ Class components
- ❌ Inline styles
- ❌ Any type (use proper TypeScript types)
- ❌ Mutating props or state directly
- ❌ Using `var` (use `const` and `let`)
- ❌ Committing console.log statements
- ❌ Large, monolithic components (break them down)
- ❌ Not handling loading and error states

### ESLint Configuration

- Follow the ESLint configuration in `eslint.config.js`
- Unused variables are allowed (`@typescript-eslint/no-unused-vars: off`)
- React Hooks rules are enforced
- React Refresh rules for HMR are active

### Build and Development

- **Dev server**: `npm run dev` (runs Vite dev server on port 8080 as configured in `vite.config.ts`)
- **Build**: `npm run build` (production build)
- **Build dev**: `npm run build:dev` (development build)
- **Lint**: `npm run lint` (run ESLint)
- **Preview**: `npm run preview` (preview production build)

### Additional Notes

- This project uses Lovable.dev platform for some development workflows
- The project includes Sentry for error tracking in production
- Component tagging is enabled in development mode via `lovable-tagger`
- Custom chunks are configured to group dependencies by package for better code splitting
