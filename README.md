# Planora – Industry-Grade Event Management API

Planora is a robust, high-performance backend system designed to power complex event management ecosystems. Built with a focus on security, scalability, and developer experience, it handles everything from real-time authentication and moderation to secure global payments.

---

## 🚀 Built With

### Core Platform
- **Runtime**: [Node.js](https://nodejs.org)
- **Framework**: [Express.js v5](https://expressjs.com) (Next-Gen Features)
- **Language**: [TypeScript](https://www.typescriptlang.org)
- **ORM**: [Prisma](https://www.prisma.io) for type-safe database interactions

### Infrastructure & Services
- **Database**: [PostgreSQL](https://www.postgresql.org)
- **Authentication**: [Better Auth](https://better-auth.com) (Secure Session Management)
- **Payments**: [Stripe](https://stripe.com) Integration (Global & Local support)
- **Storage**: [Cloudinary](https://cloudinary.com) for optimized media management
- **Email**: [Nodemailer](https://nodemailer.com) with [EJS](https://ejs.co) templating
- **Document Generation**: [PDFKit](https://pdfkit.org) for dynamic receipts/tickets

### Security & Reliability
- **Validation**: [Zod](https://zod.dev) for strict schema validation
- **Security**: [Helmet.js](https://helmetjs.github.io), [CORS](https://github.com/expressjs/cors), Rate Limiting
- **Utilities**: [Slugify](https://github.com/simov/slugify), [Date-fns](https://date-fns.org), [UUID](https://github.com/uuidjs/uuid)

---

## ✨ Key Features

### 🔐 Advanced Authentication
- **Multi-strategy Auth**: JWT + Refresh Token rotation via HTTP-only cookies.
- **Social Login**: Integrated Google OAuth support.
- **Security First**: Email verification, forgot password workflows, and account lockout protection.

### 👑 Enterprise-Grade Moderation
- **Admin Dashboard**: Real-time analytics, user promotion/demotion, and global event auditing.
- **Content Control**: Flagging system for reviews and events with soft-delete capabilities.
- **Data Export**: Comprehensive CSV reporting for users, events, and revenue.

### 👤 Robust Event Lifecycle
- **Creators**: Rich text descriptions, multi-category tagging, and private/public event toggling.
- **Participants**: Seamless join-request workflows, automated approval notifications.
- **Engagement**: 5-star rating system with verified review windows.

### 💳 Secure Payment Orchestration
- **Stripe Integration**: Handling Public/Private Paid events.
- **Automated Refunds**: Integrated workflow for event cancellations.
- **Audit Logs**: Detailed transaction tracking and PDF receipt generation.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- PostgreSQL Instance
- Cloudinary & Stripe API Keys

### Installation

1. **Clone & Install Dependencies**:
   ```bash
   git clone <repository-url>
   cd planora-backend
   npm install
   ```

2. **Environment Configuration**:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:pass@localhost:5432/planora"
   STRIPE_SECRET_KEY="sk_test_..."
   CLOUDINARY_URL="cloudinary://..."
   BETTER_AUTH_SECRET="..."
   # See .env.example for full list
   ```

3. **Database Migration**:
   ```bash
   npm run migrate
   npm run generate
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

---

## 📝 Available Scripts
- `npm run dev`: Start development server with TSX watch.
- `npm run build`: Build for production (Prisma generate + TSC).
- `npm run start`: Start production server.
- `npm run studio`: Open Prisma Studio.
- `npm run lint`: Run ESLint checks.

---

## 👨‍💻 Author

**Ahsanul Haque**
- Website: [ahsanul.dev](https://ahsanul.dev)
- Portfolio: [GitHub](https://github.com/ahsanul-dev)

---

## ⚖️ License
Distributed under the ISC License.
