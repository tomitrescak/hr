# HR & Project Management System

A full-stack HR & Project Management System built with Next.js, TypeScript, and modern web technologies. Features competency tracking, project management with Kanban boards, weekly planning, and review systems.

## 🚀 Features

- **People Management**: Track team member profiles, competencies, and development plans
- **Project Management**: Kanban boards for task tracking with OKRs and responsibilities
- **Competency System**: 7 types of competencies with proficiency tracking
- **Course Management**: Link courses to competencies with LLM-assisted extraction
- **Weekly Planning**: Assign people to projects or courses with conflict detection
- **Review System**: Weekly reviews with competency delta tracking
- **Role-based Access**: USER and PROJECT_MANAGER roles with appropriate permissions
- **Audit Trail**: Complete change log history for all mutations

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **API**: tRPC with React Query
- **Authentication**: NextAuth.js with JWT
- **Package Manager**: pnpm
- **Icons**: Lucide React

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hr
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your values:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/hr_project_management"
   
   # NextAuth
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here"
   
   # LLM Configuration (Optional)
   LLM_API_URL="https://api.openai.com/v1/chat/completions"
   LLM_API_KEY="your-llm-api-key-here"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   pnpm prisma generate
   
   # Run migrations
   pnpm prisma migrate dev
   
   # Seed the database
   pnpm prisma:seed
   ```

5. **Start the development server**
   ```bash
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 👥 Default Users

The seed script creates these default users for testing:

### Project Manager
- **Email**: alice@example.com
- **Password**: password123
- **Role**: PROJECT_MANAGER
- **Permissions**: Full access to all features

### Regular Users  
- **Email**: bob@example.com / carol@example.com
- **Password**: password123
- **Role**: USER
- **Permissions**: Can view data, update own profile, submit reviews

## 🗂 Project Structure

```
├── app/                    # Next.js App Router pages
├── components/             # React components
│   ├── layout/            # Layout components (navigation, etc.)
│   └── ui/                # shadcn/ui components + custom components
├── lib/                   # Utility libraries
│   ├── auth.ts           # NextAuth configuration
│   ├── db.ts             # Prisma client
│   ├── trpc/             # tRPC setup and routers
│   └── utils.ts          # Utility functions
├── prisma/               # Database schema and seeds
│   ├── schema.prisma     # Database schema
│   └── seed.ts           # Seed data script
├── types/                # TypeScript type definitions
└── utils/                # Additional utilities
```

## 📊 Database Schema

The system includes these main entities:

- **Users & People**: Authentication and profile management
- **Competencies**: 7 types (Knowledge, Skill, Tech Tool, Ability, Value, Behaviour, Enabler)
- **Courses**: Training courses linked to competencies
- **Projects**: With OKRs, responsibilities, and tasks
- **Assignments**: Weekly assignment of people to projects/courses  
- **Reviews**: Weekly reviews with competency progression tracking
- **Change Logs**: Complete audit trail of all changes

## 🔐 Authentication & Authorization

### Roles
- **USER**: Can view data, update own profile, submit reviews
- **PROJECT_MANAGER**: All USER permissions plus create/edit projects, courses, assignments

### Protected Routes
Most routes require authentication. Role-specific features are enforced both in the UI and API layers.

## 🎯 API Routes

The tRPC API provides these routers:
- `/api/trpc/auth.*` - Authentication and user management
- More routers will be added for people, projects, courses, etc.

## 🚧 Development Status

### ✅ Completed
- [x] Project setup and configuration
- [x] Database schema and models
- [x] Authentication system
- [x] tRPC API infrastructure
- [x] Core UI components
- [x] Database seeds and migrations

### 🔄 In Progress / Planned
- [ ] Person Management Pages
- [ ] Project Management Pages  
- [ ] Course and Competency Management
- [ ] Planning and Assignment System
- [ ] Review System
- [ ] LLM Integration
- [ ] Change Log and History Tracking
- [ ] Docker Configuration

## 📝 Available Scripts

```bash
# Development
pnpm dev                  # Start development server
pnpm build               # Build for production
pnpm start               # Start production server

# Database
pnpm prisma:migrate      # Run database migrations
pnpm prisma:studio       # Open Prisma Studio
pnpm prisma:seed         # Seed the database

# Code Quality
pnpm lint                # Run ESLint
```

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_URL` | Application URL for NextAuth | Yes |
| `NEXTAUTH_SECRET` | Secret key for NextAuth JWT | Yes |
| `LLM_API_URL` | LLM API endpoint for competency extraction | No |
| `LLM_API_KEY` | API key for LLM service | No |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.