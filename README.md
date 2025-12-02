# Audit Department Dashboard - React Client

Modern React + TypeScript + Vite dashboard application for audit department management.

## 🚀 Technology Stack

- **React 18** - Modern UI library
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Zustand** - Lightweight state management
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Tailwind CSS** - Utility-first CSS
- **Chart.js** - Data visualization
- **React Query** - Server state management

## 📦 Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🏗️ Project Structure

```
client/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── ui/          # Base UI components (Button, Input, Card, etc.)
│   │   └── layout/      # Layout components (Header, Sidebar, etc.)
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── store/           # State management (Zustand)
│   ├── hooks/           # Custom React hooks
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── assets/          # Static assets
│   └── styles/          # Global styles
├── public/              # Public assets
└── index.html           # HTML entry point
```

## 🎯 Features

- ✅ **Type-Safe**: Full TypeScript support
- ✅ **Modern UI**: Beautiful, responsive design with Tailwind CSS
- ✅ **Component Library**: Reusable, accessible UI components
- ✅ **State Management**: Zustand for global state
- ✅ **API Integration**: Axios with interceptors
- ✅ **Authentication**: Protected routes and role-based access
- ✅ **Performance**: Optimized with React Query
- ✅ **Developer Experience**: Hot reload, ESLint, path aliases

## 📱 Pages

1. **Dashboard** - Overview with key metrics and charts
2. **Task Manager** - Task management system
3. **Access Management** - User and role management
4. **Risk Management** - Risk assessment and tracking

## 🔐 Authentication

The application supports:
- Email/Password login (for external users)
- Google OAuth (for internal users)
- Session-based authentication
- Role-based access control

## 🎨 UI Components

Base component library includes:
- Button (primary, secondary, outline, ghost, danger variants)
- Input (with validation and icons)
- Select (styled dropdown)
- Textarea (resizable)
- Card (with header, body, footer)
- Badge (status indicators)
- Loading (spinner with sizes)

## 🔧 Development

### Code Style
- Use TypeScript strict mode
- Follow React best practices
- Use functional components with hooks
- Implement proper error handling

### Path Aliases
```typescript
@/components/* → src/components/*
@/pages/* → src/pages/*
@/services/* → src/services/*
@/hooks/* → src/hooks/*
@/types/* → src/types/*
@/utils/* → src/utils/*
@/assets/* → src/assets/*
@/styles/* → src/styles/*
```

## 📊 Migration Progress

### ✅ Phase 1: Setup (COMPLETED)
- [x] React + TypeScript + Vite setup
- [x] Component library
- [x] API layer refactoring
- [x] State management (Zustand)
- [x] Routing setup
- [x] Authentication flow

### 🔄 Phase 2: Core Components (IN PROGRESS)
- [ ] Chart components (Chart.js integration)
- [ ] Form components
- [ ] Advanced layout components

### 📋 Phase 3: Pages
- [ ] Dashboard page (with charts)
- [ ] Task Manager page
- [ ] Access Management page
- [ ] Risk Management page

### 🎯 Phase 4: Advanced Features
- [ ] React Query integration
- [ ] Testing setup (Vitest)
- [ ] Performance optimization
- [ ] Error boundaries
- [ ] Analytics

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

Private - Audit Department Dashboard

