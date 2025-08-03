# MyBadgeLife - Digital Badge Management Platform

**A comprehensive platform for discovering, managing, and analyzing digital badges with AI-powered features.**

![MyBadgeLife Logo](src/assets/mybadgelife-logo.jpg)

## 🚀 Project Status: MVP+ COMPLETE

MyBadgeLife is a production-ready digital badge management platform that helps users discover, organize, and track their digital credentials and achievements.

## ✨ Key Features

### 🔍 Badge Discovery & Management
- **Smart Badge Search**: Find badges using AI-powered image analysis and web search
- **Personal Collection**: Organize and manage your badge portfolio
- **Badge Verification**: Comprehensive validation and authentication system

### 🤖 AI-Powered Analysis
- **Image Recognition**: Upload badge images for automatic identification
- **Smart Matching**: AI-driven badge matching and recommendation system
- **Analysis Results**: Detailed insights and badge information extraction

### 👥 User Management & Teams
- **Role-Based Access**: Admin, Maker, and User roles with appropriate permissions
- **Team Organization**: Collaborative badge management for organizations
- **User Profiles**: Comprehensive user management system

### 📧 Communication System
- **Email Notifications**: Automated emails for badge approvals, rejections, and updates
- **Discord Integration**: Real-time notifications via Discord webhooks
- **Customizable Preferences**: User-controlled notification settings

### 📊 Analytics & Monitoring
- **Usage Analytics**: Track platform engagement and user behavior
- **Admin Dashboard**: Comprehensive management tools for administrators
- **Performance Monitoring**: Real-time system health and metrics

### 🔒 Security & Authentication
- **Secure Authentication**: Powered by Supabase Auth
- **Row Level Security**: Database-level access control
- **Role-Based Permissions**: Granular access control system

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** with custom design system
- **shadcn/ui** components
- **React Query** for data management
- **React Router** for navigation

### Backend & Database
- **Supabase** for backend services
- **PostgreSQL** database with RLS
- **Edge Functions** for serverless computing
- **Real-time subscriptions**

### AI & External Services
- **Replicate** for AI image analysis
- **SerpApi** for web search capabilities
- **Discord** webhooks for notifications
- **Email** service integration

## 🚀 Quick Start

### Prerequisites
- Node.js & npm ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

### Installation
```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd mybadgelife

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Setup
The project uses Supabase for backend services. The configuration is automatically handled through the Lovable platform.

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   └── ...             # Feature-specific components
├── hooks/              # Custom React hooks
├── pages/              # Route components
├── integrations/       # External service integrations
└── lib/               # Utility functions

supabase/
├── functions/          # Edge Functions
└── migrations/        # Database migrations
```

## 🗄 Database Schema

The platform uses a comprehensive PostgreSQL schema with 16 tables:
- User management (profiles, roles, teams)
- Badge system (badges, confirmations, embeddings)
- Analytics and tracking
- Email preferences and notifications
- Admin and role management

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Key Development Features
- Hot reload for instant development feedback
- TypeScript for type safety
- Tailwind CSS for rapid styling
- Component-based architecture

## 🚀 Deployment

Deploy easily through the [Lovable Platform](https://lovable.dev/projects/3003b4bd-c0a0-45ce-acf7-2885a1d84907):
1. Click "Publish" in the Lovable editor
2. Your app will be deployed automatically
3. Connect a custom domain in Project Settings if needed

## 🤝 Contributing

This project is built with [Lovable](https://lovable.dev) - an AI-powered development platform. 

### Making Changes
1. **Via Lovable**: Visit the project URL and start prompting for changes
2. **Local Development**: Clone the repo and push changes
3. **GitHub**: Edit files directly or use Codespaces

All changes sync automatically between Lovable and the repository.

## 📝 License

This project is part of the Lovable ecosystem. See the Lovable platform for terms and conditions.

## 🆘 Support

- [Lovable Documentation](https://docs.lovable.dev/)
- [Lovable Discord Community](https://discord.com/channels/1119885301872070706/1280461670979993613)
- [Video Tutorials](https://www.youtube.com/watch?v=9KHLTZaJcR8&list=PLbVHz4urQBZkJiAWdG8HWoJTdgEysigIO)

---

**Built with ❤️ using [Lovable](https://lovable.dev)**