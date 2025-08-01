# Badge Database - Complete Features Documentation

## Project Overview
**Badge Database** (formerly MyBadgeLife) is a comprehensive web application for tracking and managing electronic badges from conferences, conventions, and hacker events. The application allows users to catalog their badge collections, maintain wishlists, and provides admin tools for badge makers and administrators.

## Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom design system
- **Backend**: Supabase (PostgreSQL database, authentication, storage)
- **UI Components**: Shadcn/UI component library
- **Authentication**: Supabase Auth (Google OAuth)
- **Storage**: Supabase Storage for badge images
- **Deployment**: Lovable platform

---

## Core Features Implemented

### 1. User Authentication & Authorization System
**Implementation**: Multi-tier authentication system with role-based access control

**Features**:
- Google OAuth integration via Supabase Auth
- Automatic profile creation on first login
- Role-based access control (User, Maker, Admin)
- Badge Maker approval workflow
- Profile management with maker status requests

**User Roles**:
- **User**: Basic access - view badges, track ownership/wishlist
- **Badge Maker**: Can create/edit badges for assigned team (requires approval)
- **Admin**: Full system access - user management, badge management, team management

**Files**: `src/hooks/useAuth.ts`, `src/hooks/useRoles.ts`, `src/hooks/useAdminAccess.ts`

### 2. Badge Management System
**Implementation**: Complete CRUD system for badge database

**Features**:
- Badge creation with metadata (name, description, year, category, team, maker)
- Badge categorization (Elect Badge, None Elect Badge, SAO, Tool, Misc)
- Image upload and storage via Supabase Storage
- Badge editing (restricted to makers/admins based on team assignment)
- Badge retirement marking
- External link support
- Maker attribution

**Database Schema**:
```sql
badges (
  id, name, description, year, image_url, external_link,
  maker_id, team_name, category, retired, created_at, updated_at
)
```

**Files**: `src/hooks/useBadges.ts`, `src/pages/BadgeRegister.tsx`, `src/components/AddBadgeModal.tsx`

### 3. Personal Badge Tracking
**Implementation**: Individual user badge ownership and wishlist system

**Features**:
- Mark badges as "OWNED" or "WANTED"
- Personal collection statistics (owned count, wanted count, total available)
- Badge filtering by ownership status
- Individual user badge history tracking

**Database Schema**:
```sql
ownership (
  id, user_id, badge_id, status ('own'/'want'), created_at
)
```

**Files**: `src/hooks/useBadges.ts`, `src/components/BadgeCard.tsx`

### 4. Badge Discovery & Search
**Implementation**: Comprehensive badge browsing and search functionality

**Features**:
- Search across badge names, descriptions, and maker names
- Real-time search filtering
- Categorized badge sections (My Badges, Wishlist, All Badges)
- Badge explorer for unauthenticated users
- Responsive grid layout with loading states

**Files**: `src/pages/Index.tsx`, `src/components/BadgeExplorer.tsx`

### 5. Image Upload & Processing System
**Implementation**: Multi-stage image upload and badge creation workflow

**Features**:
- Camera capture interface for badge scanning
- Direct image upload to Supabase Storage
- Upload management in admin panel
- Badge creation from uploaded images
- Anonymous upload support for testing
- Upload cleanup after badge creation

**Database Schema**:
```sql
uploads (
  id, user_id, image_url, badge_guess_id, created_at
)
```

**Files**: `src/components/CameraCapture.tsx`, `src/hooks/useBadges.ts`

### 6. Team Management System
**Implementation**: Team-based organization for badge makers

**Features**:
- Team creation and management (admin only)
- User assignment to teams
- Team-based badge editing permissions
- Team member management
- Badge maker assignment to specific teams

**Database Schema**:
```sql
teams (id, name, description, created_at, updated_at)
team_members (id, team_id, user_id, created_at)
```

**Files**: `src/hooks/useTeams.ts`, admin panel team management section

### 7. Administrative Panel
**Implementation**: Comprehensive admin interface for system management

**Features**:
- **Upload Management**: View and process uploaded images
- **Badge Management**: Edit badges, manage metadata, assign teams
- **Team Management**: Create/edit/delete teams, manage members
- **User Management**: View users, assign roles, manage permissions

**Access Control**:
- Admins: Full access to all features
- Badge Makers: Access to badge management for assigned team
- Users: No admin access

**Files**: `src/pages/Admin.tsx`, `src/components/RoleManagementModal.tsx`

### 8. Role & Permission System
**Implementation**: Granular permission system with function-based access control

**Features**:
- Dynamic role assignment (admin, moderator, user)
- Permission checking functions for specific actions
- Role display and management
- Maker approval workflow
- Team-based editing restrictions

**Database Schema**:
```sql
user_roles (id, user_id, role, created_at)
profiles (id, email, display_name, role, wants_to_be_maker, maker_approved, assigned_team)
```

**Files**: `src/hooks/useRoles.ts`, `src/hooks/useAdminAccess.ts`, `src/hooks/useRoleDisplay.ts`

### 9. Discord Notification System
**Implementation**: Automated Discord notifications for key events

**Features**:
- New user registration notifications
- Badge maker request notifications
- Webhook-based notifications via Supabase Edge Functions

**Files**: `supabase/functions/send-discord-notification/index.ts`

### 10. Welcome & Onboarding Experience
**Implementation**: User-friendly landing page for new visitors

**Features**:
- Feature showcase cards
- Call-to-action buttons for scanning and exploring
- Badge explorer preview for unauthenticated users
- Seamless transition to authenticated experience

**Files**: `src/components/WelcomeScreen.tsx`

---

## Database Architecture

### Core Tables
1. **profiles** - Extended user information beyond Supabase auth
2. **badges** - Badge metadata and information
3. **ownership** - User badge tracking (owned/wanted)
4. **uploads** - Temporary image uploads for badge creation
5. **teams** - Team organization for badge makers
6. **team_members** - Team membership relationships
7. **user_roles** - Role-based access control

### Row Level Security (RLS)
- Comprehensive RLS policies on all tables
- User data isolation
- Role-based access enforcement
- Admin override capabilities

---

## Security Features

### Authentication Security
- Google OAuth integration
- Supabase Auth token management
- Session handling with timeouts

### Data Security
- Row Level Security (RLS) on all tables
- Role-based access control
- Team-based editing restrictions
- Admin-only user management

### API Security
- Supabase API key management
- Service role key for admin operations
- CORS configuration for edge functions

---

## Performance Optimizations

### Frontend Performance
- Badge data caching with 5-minute expiry
- Loading states and skeleton screens
- Lazy loading and code splitting
- Responsive design with mobile optimization

### Backend Performance
- Database indexing on frequently queried columns
- Efficient query patterns with select projections
- Connection pooling via Supabase

---

## User Experience Features

### Design System
- Custom Tailwind CSS design system
- HSL-based color tokens
- Consistent typography (mono fonts)
- Dark/light mode support
- Responsive grid layouts

### Interactive Elements
- Toast notifications for user feedback
- Modal dialogs for focused interactions
- Loading states throughout the application
- Error handling with user-friendly messages

### Mobile Experience
- Responsive design for all screen sizes
- Touch-friendly button sizing
- Mobile-optimized camera interface
- Simplified navigation on small screens

---

## Questions to Help Complete Documentation

To create the most comprehensive documentation, I have a few questions:

1. **Original PRD**: Do you have the original Product Requirements Document? This would help me compare what was planned vs. what was implemented.

2. **Scope Changes**: Are there any features we added that weren't in the original plan? Or any planned features we didn't implement?

3. **Known Issues**: Are there any current bugs or limitations I should document?

4. **Future Plans**: Are there any planned features or improvements you'd like documented?

5. **API Integration**: The camera capture mentions "AI will identify the badge automatically" - was this planned as a future feature, or should this be documented as a limitation?

6. **Deployment Details**: Should I include information about the current deployment setup and any custom domain configuration?

This documentation covers all the major features I can identify from the codebase. Would you like me to expand on any particular section or add information about specific aspects of the system?