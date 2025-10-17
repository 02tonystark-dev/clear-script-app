# PharmaCare Frontend

React + TypeScript + Vite + Tailwind CSS

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Default API URL is http://localhost:5000
```

3. Make sure backend is running on port 5000

4. Start development server:
```bash
npm run dev
```

Frontend will run on http://localhost:5173

## Features

- 🔐 User authentication (signup/login)
- 📊 Dashboard with statistics
- 💊 Medicine inventory management
- 🛒 Sales tracking and recording
- 📁 Category management
- 🔔 Low stock alerts
- 🎨 Modern UI with Tailwind CSS
- 🌙 Dark mode support
- 📱 Responsive design

## Project Structure

```
frontend/
├── src/
│   ├── components/     # Reusable UI components
│   │   ├── ui/        # shadcn/ui components
│   │   └── Layout.tsx # Main layout with navigation
│   ├── hooks/         # Custom React hooks
│   │   └── useAuth.tsx
│   ├── lib/           # Utilities and API client
│   │   ├── api.ts     # API client for backend
│   │   └── utils.ts   # Helper functions
│   ├── pages/         # Page components
│   │   ├── Auth.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Inventory.tsx
│   │   └── Sales.tsx
│   ├── App.tsx        # Main app with routing
│   ├── main.tsx       # Entry point
│   └── index.css      # Global styles
├── public/            # Static assets
└── index.html
```

## Build for Production

```bash
npm run build
```

Build output will be in `dist/` directory.

## Troubleshooting

### API Connection Error
- Ensure backend is running on http://localhost:5000
- Check VITE_API_URL in .env file
- Verify CORS is enabled in backend

### Authentication Issues
- Check browser console for errors
- Verify JWT_SECRET matches between frontend and backend
- Clear localStorage: `localStorage.clear()`

### Styling Issues
- Run `npm install` to ensure all dependencies are installed
- Check if tailwind.config.ts is properly configured
