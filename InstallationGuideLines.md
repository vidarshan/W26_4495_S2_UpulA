# Installation Guidelines

## Tech Stack

- Next.js  
- Prisma ORM  
- PostgreSQL  
- NextAuth (Auth)  
- Mantine UI  

---

## Dev

In order to install, the following prerequisites are required.  
(Run Locally)

### Prerequisites

- **Node.js** (LTS recommended)  
- **Git**  
- **PostgreSQL** - Please install PostgreSQL locally.  
- **GitHub Desktop**  

---

## 1) Clone and Install

Clone the repository from GitHub.

```bash
git clone https://github.com/UpulAtapattu/W26_4495_S2_UpulA.git
```

(GitHub Desktop may be easier)

The folder for the web-application resides in `"Implmentation/eco-clean-web"`, therefore, proceed it using:

```bash
cd Implementation/eco-clean-web
npm install
```

---

## 2) Create the DB ecoclean

When you are installing PostgreSQL, install pgAdmin, it will be the easiest.

---

## 3) Setup the ENV file to match the DB connection string and variables.

Create a `.env` file in the root of the `eco-clean-web` directory.

```env
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL="your-database-url"
```

---

**PostgreSQL connection string (Replace using your postgresql db)**

Example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/eco_clean?schema=public"
```

---

```env
NEXTAUTH_SECRET="your-generated-secret"
```

---

### TO GENERATE

**In Bash**

```bash
openssl rand -base64 32
```

---

## 4) Prisma Client Generation (In the bash)

```bash
npx prisma generate
npx prisma migrate dev
```

---

## 5) Install the npm modules and run Development

```bash
npm install
npm run dev
```

---

Open:

```
http://localhost:3000
```
