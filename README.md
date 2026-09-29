# 🔗 LinkPulse

A URL shortener REST API with SQLite analytics, built with **Node.js, TypeScript and Express**.

**Day 010 of my 365 Days of Code challenge.**

## 🇬🇧 English

LinkPulse creates short URLs, redirects visitors and records click statistics. It includes a responsive dashboard, custom codes, expiry dates, rate limiting, protected deletion and automated tests.

## 🇰🇿 Қазақша

LinkPulse қысқа URL жасайды, пайдаланушыларды мақсатты бетке бағыттайды және өту статистикасын сақтайды. Жобада адаптивті панель, жеке кодтар, сілтеменің мерзімі, сұраныстарды шектеу және автоматты тесттер бар.

## 🇷🇺 Русский

LinkPulse создаёт короткие URL, перенаправляет посетителей и сохраняет статистику переходов. В проект входят адаптивная панель, собственные коды, срок действия ссылок, ограничение запросов, защищённое удаление и автоматические тесты.

## Features

- REST API
- SQLite database using Node's built-in `node:sqlite`
- Random and custom short codes
- Expiring links
- Click counter and 30-day daily statistics
- Rate limiting for link creation
- Admin-key-protected deletion
- Input validation and prepared SQL statements
- EN / KZ / RU web interface
- Native Node.js tests
- Strict TypeScript checking

## Requirements

- Node.js 22.18 or newer
- npm

## Install and run

```bash
npm install
npm run typecheck
npm test
npm start
```

On Windows PowerShell, create the local configuration before the first start:

```powershell
Copy-Item .env.example .env
npm run typecheck
npm test
npm start
```

Open:

```text
http://localhost:3000
```

The database is created automatically at `data/linkpulse.db`.

## Configuration

PowerShell example:

```powershell
$env:PORT="3000"
$env:BASE_URL="http://localhost:3000"
$env:ADMIN_KEY="replace-with-a-long-secret"
$env:DATABASE_PATH="./data/linkpulse.db"
npm start
```

## API

### Create link

```http
POST /api/links
Content-Type: application/json

{
  "url": "https://example.com/article",
  "customCode": "article-1",
  "expiresInDays": 30
}
```

### List links

```http
GET /api/links?limit=20
```

### Link information

```http
GET /api/links/article-1
```

### Statistics

```http
GET /api/links/article-1/stats
```

### Delete link

```http
DELETE /api/links/article-1
X-Admin-Key: replace-with-a-long-secret
```

### Redirect

```http
GET /article-1
```

## Structure

```text
Day-010-LinkPulse/
├── public/
│   ├── index.html
│   ├── 404.html
│   ├── style.css
│   └── app.js
├── src/
│   ├── app.ts
│   ├── config.ts
│   ├── rateLimit.ts
│   ├── repository.ts
│   ├── server.ts
│   └── validators.ts
├── test/
│   ├── api.test.ts
│   └── validators.test.ts
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## What I practiced

- REST routing and HTTP status codes
- TypeScript types and strict checks
- SQLite schema design and indexes
- Prepared statements and transactions
- Data validation
- Middleware and rate limiting
- Integration and unit tests
- Graceful server shutdown
- Git and project documentation

## Author

Developed by **Miras**.
