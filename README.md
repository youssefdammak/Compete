# Competitor Tracking

A Next.js TypeScript project for tracking competitor products and pricing using web scraping.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:
   Create a `.env.local` file and add:

```
TAURINE_CDP_URL=your_cdp_url_here
```

3. Run the scraper:

```bash
npm run scrape
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `app/` - Next.js app directory with TypeScript React components
  - `api/scrape/route.ts` - API route for scraping (POST/GET endpoints)
- `lib/scraper.ts` - Reusable scraping functions (used by both script and API)
- `scripts/scrape.ts` - Standalone TypeScript scraping script
- `types/` - TypeScript type definitions

## Scripts

- `npm run dev` - Start the Next.js development server
- `npm run scrape` - Run the TypeScript product scraping script
- `npm run build` - Build the production version
- `npm start` - Start the production server
- `npm run lint` - Run ESLint

## Usage

### Standalone Script

```bash
npm run scrape
```

### API Route

The scraping functionality is also available as a Next.js API route:

**POST Request:**

```bash
curl -X POST http://localhost:3000/api/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "competitor": "Nike",
    "productName": "Air Jordan 1",
    "productUrl": "https://www.nike.com/air-jordan-1"
  }'
```

**GET Request:**

```bash
curl "http://localhost:3000/api/scrape?competitor=Nike&productName=Air%20Jordan%201&productUrl=https://www.nike.com/air-jordan-1"
```
