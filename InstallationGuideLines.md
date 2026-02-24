**Installation Guidelines**
## Tech Stack
- Next.js
- Prisma ORM
- PostgreSQL
- NextAuth (Auth)
- Mantine UI

## Dev 
In order to install, the following prerequisites are required.
(Run Locally)

### Prerequisites

- **Node.js** (LTS recommended)
- **Git**
- **PostgreSQL** - Please install PostgreSQL locally.
- **GitHub Desktop**

## 1) Clone and Install
# Clone the repository from GitHub.
The folder for the web-application resides in "Implmentation/eco-clean-web", therefore, proceed it using (cd eco-clean-web)
npm install

## 2) Create the DB ecoclean

## 3) Setup the ENV file to match the DB connection string
# PostgreSQL connection string (Prisma)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/eco_clean?schema=public"

## 4) Prisma Client Generation (In the bash)
npx prisma generate



