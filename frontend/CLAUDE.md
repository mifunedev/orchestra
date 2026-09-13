# CLAUDE.md - Frontend

This file provides guidance to AI agents when working with the Orchestra frontend.

## Quick Start

### 1. Install Dependencies

```bash
cd frontend

# Install packages
npm install
```

### 2. Environment Configuration

The frontend uses environment files stored at `frontend/.env`.

```bash
# Copy example env if setting up for first time
cp .example.env .env
```

### 3. Start the Application

**Default (port 5173):**

```bash
npm run dev
```

**For Claude/AI development (port 8030, all interfaces):**

```bash
npm run dev:claude
```

**With explicit port:**

```bash
npx vite --port 3000
```

## Common Commands

| Command                 | Description                                               |
| ----------------------- | --------------------------------------------------------- |
| `npm run dev`           | Start dev server on port 5173                             |
| `npm run dev:claude`    | Start dev server on port 8030 (0.0.0.0)                   |
| `npm run build`         | Build for production (outputs to `../backend/src/public`) |
| `npm run format`        | Format code with Prettier                                 |
| `npm run lint`          | Run ESLint                                                |
| `npm run test`          | Run all tests                                             |
| `npm run test:watch`    | Run tests in watch mode                                   |
| `npm run test:coverage` | Run tests with coverage report                            |

## Project Structure

```
frontend/
├── src/
│   ├── components/        # UI components
│   │   ├── buttons/       # Button components
│   │   ├── cards/         # Card components
│   │   ├── drawers/       # Drawer/slide-out panels
│   │   ├── forms/         # Form components
│   │   ├── icons/         # Custom icons
│   │   ├── inputs/        # Input components
│   │   ├── lists/         # List components
│   │   ├── menus/         # Menu components
│   │   ├── modals/        # Modal dialogs
│   │   ├── nav/           # Navigation components
│   │   ├── panels/        # Panel components
│   │   ├── popovers/      # Popover components
│   │   ├── sections/      # Page sections
│   │   ├── settings/      # Settings components
│   │   ├── timeline/      # Timeline components
│   │   ├── tools/         # Tool-related components
│   │   ├── tooltips/      # Tooltip components
│   │   ├── ui/            # shadcn/ui base components
│   │   └── viewers/       # Content viewers
│   ├── context/           # React context providers
│   │   ├── AgentContext   # Agent state management
│   │   ├── AppContext     # Global app state
│   │   ├── ChatContext    # Chat state management
│   │   ├── ProjectContext # Project state
│   │   ├── PromptContext  # Prompt state
│   │   └── ThemeContext   # Theme management
│   ├── hooks/             # Custom React hooks
│   ├── layouts/           # Layout components
│   ├── lib/
│   │   ├── config/        # App configuration
│   │   ├── entities/      # TypeScript types/interfaces
│   │   ├── reducers/      # State reducers
│   │   ├── services/      # API service layer
│   │   └── utils/         # Utility functions
│   ├── pages/             # Page components
│   │   ├── agents/        # Agent management pages
│   │   ├── chat/          # Chat interface pages
│   │   ├── projects/      # Project management pages
│   │   ├── prompts/       # Prompt management pages
│   │   ├── schedules/     # Schedule management pages
│   │   ├── settings/      # Settings pages
│   │   └── threads/       # Thread management pages
│   ├── routes/            # React Router configuration
│   ├── styles/            # Global styles
│   ├── tests/             # Test files
│   │   ├── hooks/         # Hook tests
│   │   ├── mocks/         # Test mocks
│   │   └── services/      # Service tests
│   └── validations/       # Zod validation schemas
├── public/                # Static assets
├── mock/                  # Mock data for development
└── vite.config.ts         # Vite configuration
```

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui (New York style)
- **Routing**: React Router v7
- **State**: React Context + Custom Hooks
- **Forms**: React Hook Form + Zod
- **Testing**: Vitest + Testing Library
- **Formatting**: Prettier + ESLint

## Code Style

### File Naming

- Components: `PascalCase.tsx` (e.g., `ChatMessage.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useChat.ts`)
- Services: `camelCase.ts` with `Service` suffix (e.g., `agentService.ts`)
- Tests: `*.test.ts` or `*.test.tsx` suffix

### Component Structure

```tsx
// Imports
import { useState } from "react";
import { Button } from "@/components/ui/button";

// Types (if needed)
interface MyComponentProps {
	title: string;
	onAction?: () => void;
}

// Component
export function MyComponent({ title, onAction }: MyComponentProps) {
	const [state, setState] = useState(false);

	return (
		<div>
			<h1>{title}</h1>
			<Button onClick={onAction}>Click</Button>
		</div>
	);
}
```

### Import Aliases

Use `@/` alias for src imports:

```tsx
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { agentService } from "@/lib/services";
```

### Styling Guidelines

- Use Tailwind CSS utility classes
- Use CSS variables from `src/styles/globals.css` for theming
- shadcn/ui components are in `src/components/ui/`
- Prefer composition over custom CSS

## Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest run src/hooks/useModelVisibility.test.ts
```

### Test File Locations

- Hook tests: `src/tests/hooks/` or co-located (e.g., `useModelVisibility.test.ts`)
- Service tests: `src/tests/services/`
- Component tests: Co-located with component or in `src/tests/`

### Testing Guidelines

- Use Testing Library for component tests
- Test observable behavior, not implementation details
- Mock API calls using `src/tests/mocks/`
- Do NOT add functionality to tests that should live within the method being tested

## API Integration

### Service Layer

All API calls go through service files in `src/lib/services/`:

- `authService.ts` - Authentication
- `agentService.ts` - Agent CRUD
- `threadService.ts` - Thread management
- `projectService.ts` - Project management
- `promptService.ts` - Prompt management
- `scheduleService.ts` - Schedule management
- `modelService.ts` - Model configuration
- `settingService.ts` - User settings
- `serverService.ts` - Server status
- `toolService.ts` - Tool management

### API Client

Use `src/lib/utils/apiClient.ts` for HTTP requests:

```tsx
import { apiClient } from "@/lib/utils/apiClient";

const response = await apiClient.get("/api/agents");
```

### Streaming

For SSE/streaming responses, use `src/lib/utils/streamClient.ts`.

## Development Proxy

The Vite dev server proxies `/api` requests to the backend:

```ts
// vite.config.ts
proxy: {
  "/api": {
    target: "http://localhost:8000",
    changeOrigin: true,
  },
}
```

Ensure the backend is running on port 8000 (or adjust the proxy).

## Build & Deployment

Production builds output to `../backend/src/public` and are served by the FastAPI backend:

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Design & Planning Workflow

When asked to plan or design a frontend feature:

### Preferred: Playwright MCP (if available)

Use Playwright MCP tools for visual validation and design planning:

1. Navigate to relevant pages
2. Take snapshots/screenshots of current UI state
3. Validate designs against existing patterns
4. Test interactions and capture results

### Fallback: TDD-First Research

If Playwright MCP is not working or unavailable:

1. **Research the codebase** - Start by exploring existing patterns
2. **Write tests first** - Define expected behavior via tests
3. **Implement to pass tests** - Build the feature to satisfy test cases
4. **Iterate** - Refine based on test results

## UI Validation on Completion

**IMPORTANT**: When completing tasks that involve UI changes, provide visual validation using browser tools BEFORE marking the task as done.

### Validation Checklist

Before marking a UI task complete:

- [ ] All tests pass (`npm run test`)
- [ ] No console errors in browser
- [ ] UI renders correctly at different viewport sizes
- [ ] Interactions work as expected
- [ ] Take screenshot using browser tools if visual verification is needed
- [ ] Provide step-by-step validation instructions for manual testing
