# B2B Networking CRM

A modern, full-featured CRM system built with Next.js 15+ for managing B2B networking groups, members, meetings, and attendance tracking.

## 🚀 Features

### Core Functionality

- **Member Management** - Full CRUD operations with business categories, contact information, and activity notes
- **Group Management** - Create and manage networking groups with category exclusivity rules
- **Meeting Scheduling** - Schedule meetings with list and calendar views
- **Attendance Tracking** - Real-time attendance tracking with multiple status options
- **Admin Management** - User management system with role-based access control
- **Personal Settings** - Profile and password management for all users

### Key Highlights

- ✅ **Role-Based Access Control** - Super Admin and Admin roles with different permissions
- ✅ **View-Only Access** - Admins can view all data but only edit their own
- ✅ **Category Exclusivity** - Prevent multiple members from same category in a group
- ✅ **Activity Notes** - Track interactions with user attribution
- ✅ **Dual View Modes** - List and Calendar views for meetings
- ✅ **Real-Time Updates** - Instant feedback with toast notifications
- ✅ **Modern UI** - Clean, minimalist design with red accent theme

## 🛠️ Tech Stack

- **Framework:** Next.js 15+ (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Drizzle ORM
- **Authentication:** NextAuth.js v5 (beta)
- **UI Components:** shadcn/ui
- **Styling:** Tailwind CSS
- **Password Hashing:** bcryptjs
- **Forms:** react-hook-form + zod
- **Notifications:** Sonner (toast)

## 📋 Prerequisites

- Node.js 18+ installed
- PostgreSQL database
- npm or yarn package manager

## 🔧 Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd crm-project
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/crm_db
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   ```

   Generate a secure `NEXTAUTH_SECRET`:

   ```bash
   openssl rand -base64 32
   ```

4. **Set up the database**

   Generate and push the schema:

   ```bash
   npm run db:generate
   npm run db:push
   ```

5. **Seed initial admin user**

   ```bash
   npm run db:seed
   ```

   Default super admin credentials:

   - Username: `superadmin`
   - Password: `admin123`
   - ⚠️ **Change this password immediately after first login!**

6. **Start the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
crm-project/
├── app/
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── dashboard/        # Main dashboard
│   │   ├── members/          # Member management
│   │   ├── groups/           # Group management
│   │   ├── meetings/         # Meeting & attendance
│   │   ├── admin/            # User management (Super Admin only)
│   │   └── settings/         # User settings
│   ├── api/                  # API routes
│   │   ├── admin/            # Admin management APIs
│   │   ├── groups/           # Group APIs
│   │   ├── members/          # Member APIs
│   │   ├── meetings/         # Meeting APIs
│   │   └── settings/         # Settings APIs
│   ├── login/                # Login page
│   └── layout.tsx            # Root layout
├── components/
│   ├── nav/                  # Navigation components
│   └── ui/                   # shadcn/ui components
├── db/
│   ├── schema.ts             # Database schema
│   ├── index.ts              # DB connection
│   ├── seed.ts               # Seed script
│   └── migrations/           # Migration files
├── lib/
│   ├── auth.ts               # NextAuth configuration
│   ├── auth-utils.ts         # Auth helper functions
│   └── utils.ts              # Utility functions
├── types/
│   └── next-auth.d.ts        # NextAuth type extensions
└── middleware.ts             # Route protection
```

## 👥 User Roles

### Super Admin

- Full access to all features
- Can create, edit, and delete users
- Can manage all groups and meetings
- Can edit attendance for any meeting

### Admin (Group Leader)

- Can view all members, groups, and meetings
- Can create and manage their own groups
- Can schedule meetings for their groups
- Can track attendance for their meetings
- **View-only access** to other admins' groups/meetings

## 📊 Database Schema

### Tables

- **users** - Admin users with roles
- **members** - CRM members with business categories
- **groups** - Networking groups with leaders
- **group_members** - Member-group relationships
- **meetings** - Scheduled meetings
- **attendance** - Meeting attendance records
- **member_notes** - Activity notes for members

### Key Relationships

- Groups have one leader (user)
- Groups have many members (with category exclusivity)
- Meetings belong to groups
- Attendance tracks members at meetings
- Notes link members to users (who created the note)

## 🎨 Design System

### Color Theme

- **Primary:** Red (#DC2626)
- **Sidebar:** Dark gradient (black to gray)
- **Background:** White with gray accents
- **Text:** Gray scale for hierarchy

### UI Components

- **Cards:** Minimal borders, subtle shadows
- **Buttons:** Red primary, ghost secondary
- **Badges:** Color-coded status indicators
- **Forms:** Clean inputs with validation
- **Tables:** Zebra striping, hover effects
- **Tooltips:** Context-sensitive help
- **Toasts:** Success/error notifications

## 🔒 Security Features

- **Password Hashing:** bcrypt with salt rounds
- **Session Management:** JWT-based sessions
- **Route Protection:** Middleware-based auth
- **Role Verification:** Server-side checks on all APIs
- **CSRF Protection:** NextAuth.js built-in
- **Input Validation:** Zod schemas for all forms
- **SQL Injection Prevention:** Drizzle ORM parameterized queries

## 📝 Available Scripts

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint

# Database
npm run db:generate      # Generate migrations
npm run db:push          # Push schema to database
npm run db:seed          # Seed initial admin user
```

## 🚦 Getting Started Guide

### First Time Setup

1. **Login** with the default super admin credentials
2. **Change the default password** in Settings
3. **Create additional admin users** in the Admin panel
4. **Add members** to your CRM
5. **Create networking groups** and assign categories
6. **Add members to groups** (respecting category rules)
7. **Schedule meetings** for your groups
8. **Track attendance** during/after meetings

### Daily Usage

**For Group Leaders (Admins):**

1. Check the dashboard for quick stats
2. Review upcoming meetings in calendar view
3. Track attendance during meetings
4. Add activity notes to member profiles
5. Manage your group memberships

**For Super Admins:**

1. All of the above, plus:
2. Create and manage admin users
3. Oversee all groups and meetings
4. Handle system administration

## 🎯 Key Features Explained

### Category Exclusivity

When adding members to groups, the system ensures only one member per business category can join. This prevents competitors from being in the same networking group.

### View-Only Access

Regular admins can view all data for transparency, but can only edit/delete their own groups and meetings. Buttons are disabled with helpful tooltips.

### Activity Notes

Track all interactions with members. Notes show who created them and when, providing a complete activity history.

### Dual Meeting Views

- **List View:** Traditional list with detailed information
- **Calendar View:** Timeline-based view grouped by date

### Attendance Tracking

Four status options:

- **Attended:** Member was present (auto-timestamps)
- **No Show:** Member didn't attend
- **Excused:** Member sent apologies
- **Cancelled:** Meeting cancelled for this member

## 🐛 Troubleshooting

### Database Connection Issues

- Verify `DATABASE_URL` in `.env.local`
- Ensure PostgreSQL is running
- Check database exists and credentials are correct

### Authentication Issues

- Verify `NEXTAUTH_SECRET` is set
- Clear browser cookies and try again
- Check session expiry settings

### Build Errors

- Delete `.next` folder and rebuild
- Clear `node_modules` and reinstall
- Check for TypeScript errors with `npm run lint`

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs/overview)
- [NextAuth.js v5 Beta](https://authjs.dev/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

## 📄 License

This project is private and confidential.

## 🤝 Support

For issues or questions, please contact your system administrator.

---

**Built with ❤️ using Next.js and modern web technologies**
