# Work Life History - AI-Powered CV Generator

An intelligent CV generator that reads your work history from Notion databases and creates tailored CVs using OpenAI, optimized for specific job descriptions.

## Features

- **Smart Selection**: Automatically selects the most relevant experiences based on job requirements
- **AI-Powered Writing**: Uses OpenAI to rewrite and optimize your CV content
- **Notion Integration**: Reads from and writes to your Notion workspace
- **Web Scraping**: Can automatically fetch job descriptions from URLs
- **Multi-language Support**: Generate CVs in English or Spanish
- **ATS-Friendly**: Optimized for Applicant Tracking Systems

## Architecture

The system consists of several key components:

1. **Scraper** (`src/lib/scrape.ts`): Fetches and cleans job descriptions from URLs
2. **Matcher** (`src/lib/match.ts`): Scores and selects the most relevant experiences, skills, and education
3. **Prompts** (`src/lib/prompts.ts`): Specialized prompts for each CV section (profile, experiences, skills, education, why me)
4. **OpenAI Integration** (`src/lib/openai.ts`): Communicates with OpenAI API with flexible response parsing
5. **Notion Integration** (`src/lib/notion.ts`): Reads your data and creates beautifully formatted CV pages
6. **API Route** (`src/app/api/cv/route.ts`): Orchestrates the entire process with parallel section generation

## Prerequisites

1. **Node.js 20+**
2. **OpenAI API Key**
3. **Notion Integration Token**
4. **Notion Databases** set up with the following structure:

### Notion Database Structure

#### Profile Page
Create a Notion page with these properties:
- `FullName` (Title)
- `Title` (Text)
- `Location` (Text)
- `Email` (Email)
- `LinkedIn` (URL)
- `GitHub` (URL)
- `Portfolio` (URL)
- `Summary` (Text)

#### Experiences Database
- `Name` (Title): Experience title
- `Company` (Text or Select): Company name
- `Role` (Select): Your role
- `Start` (Date): Start date
- `End` (Date): End date
- `Summary` (Text): Brief summary
- `Responsibilities` (Text): Your responsibilities
- `Achievements` (Text): Key achievements
- `Tech` (Multi-select): Technologies used
- `Industry` (Select): Industry type
- `Seniority` (Select): Seniority level

#### Skills Database (Optional)
**Note:** This database is optional. If not provided, skills will be automatically derived from the `Tech` field in your Experiences database.

- `Name` (Title): Skill name
- `Category` (Select): Category (e.g., "Mobile", "Backend", "DevOps")
- `Synonyms` (Text): Comma-separated synonyms

#### Education Database
**Note:** This single database should contain both Education entries and Certifications. Use the `Type` field to distinguish between them.
- `Name` (Title): Degree or certification name
- `Type` (Select): "Education" or "Certification"
- `Org` (Text): Institution name
- `Year` (Number): Year completed
- `Details` (Text): Additional details

## Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

3. **Create a page in Notion for storing generated CVs:**
   - In Notion, create a new page called "CVs Generated" (or any name you prefer)
   - This page will be the parent folder for all your generated CVs
   - Get its page ID from the URL

4. **Fill in your `.env` file:**
   ```env
   OPENAI_API_KEY=sk-...
   NOTION_TOKEN=secret_...
   NOTION_PROFILE_PAGE_ID=...
   NOTION_DB_EXPERIENCES=...
   NOTION_DB_EDU=...
   NOTION_CV_PARENT_PAGE_ID=...  # ID of the "CVs Generated" page you just created
   # NOTION_DB_SKILLS=...  # Optional - will derive from experiences if not provided
   ```

### Getting Notion Credentials

1. **Create a Notion Integration:**
   - Go to https://www.notion.so/my-integrations
   - Click "New integration"
   - Give it a name and select your workspace
   - Copy the "Internal Integration Token"

2. **Share your databases and pages with the integration:**
   - Open each database/page in Notion (Profile, Experiences, Education, and CVs Generated page)
   - Click "..." → "Add connections"
   - Select your integration
   - **Important:** Make sure ALL of these are shared with your integration

3. **Get Database IDs:**
   - Open the database in Notion
   - The ID is in the URL: `notion.so/workspace/<DATABASE_ID>?v=...`

## Usage

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   Navigate to `http://localhost:3000`

3. **Generate a CV:**
   - Paste a job link OR job description
   - Select language (English/Spanish)
   - Add optional notes (e.g., "emphasize React Native experience")
   - Click "Generate CV"

4. **View your CV:**
   The system will create a new page in Notion with your tailored CV!

## How It Works

1. **Ingest**: Job description is scraped (if URL provided) or taken directly
2. **Extract**: Key requirements are extracted (tech stack, seniority, industry)
3. **Score**: Each experience is scored based on relevance to the job
4. **Select**: Top 4 experiences and relevant skills are selected
5. **Generate**: OpenAI creates optimized CV content **using separate calls per section** for better context:
   - 1 call for profile summary
   - 1 call **per experience** (in parallel for speed)
   - 1 call for skills organization
   - 1 call for education & certifications
   - 1 call for "why me" section
6. **Assemble**: All sections are assembled into a cohesive CV
7. **Publish**: A new Notion page is created with your tailored CV

## Scoring Algorithm

Experiences are scored based on:
- 45% Tech stack overlap
- 25% Responsibilities/keywords match
- 10% Industry match
- 10% Seniority match
- 10% Recency
- Bonus points for experiences mentioned in notes

## API Usage

You can also use the API directly:

```bash
curl -X POST http://localhost:3000/api/cv \
  -H "Content-Type: application/json" \
  -d '{
    "jobLink": "https://company.com/jobs/123",
    "language": "en",
    "notes": "emphasize mobile development"
  }'
```

## Recent Improvements

### Multi-Section Generation (v2.0)
The system now uses **separate AI calls per CV section** for improved quality:
- **Better context**: Each section gets focused prompts with relevant information
- **Parallel processing**: Experiences are generated simultaneously for faster results
- **Flexible parsing**: Handles both JSON and plain text responses from AI
- **Robust education filtering**: Improved detection of education vs certifications with case-insensitive matching

### Smart Selection
- **Enhanced education/certification filtering**: Accepts variations like "education", "educación", "cert", "certificate"
- **Increased limits**: Now selects up to 2 education entries and 4 certifications
- **Better logging**: Detailed console output for debugging selection process

### AI Response Handling
- **Dual-format support**: Prompts explicitly request plain text, with fallback JSON parsing
- **Smart extraction**: Automatically extracts text from JSON if AI returns structured data
- **Format validation**: Clear examples in prompts showing correct vs incorrect formats

## Customization

### Adjust Scoring Weights
Edit `src/lib/match.ts` to change how experiences are scored.

### Modify Prompts
Edit `src/lib/prompts.ts` to customize how the AI rewrites your CV. There are now specialized prompts:
- `buildProfilePrompt`: For the professional summary
- `buildExperiencePrompt`: For individual experience blocks
- `buildSkillsPrompt`: For organizing skills by category
- `buildEducationPrompt`: For education and certifications
- `buildWhyMePrompt`: For the job fit explanation

### Change CV Layout
Edit `src/lib/notion.ts` (the `createCVPage` function) to customize the Notion page layout.

## Future Enhancements

As outlined in the plan, you can extend this with:

- **RAG with pgvector**: Store embeddings for better semantic matching
- **Multi-agent rewriting**: Different writing styles for different audiences
- **Cover letter generation**: Automatically generate cover letters
- **ATS optimization**: Plain text export optimized for ATS parsers
- **Evaluation tests**: Unit tests for prompt quality

## Troubleshooting

**Error: Missing environment variables**
- Make sure all required variables are set in `.env`

**Error: Cannot read Notion database**
- Ensure the integration has access to your databases
- Check that database IDs are correct

**Error: OpenAI API**
- Verify your API key is valid
- Check you have sufficient credits

## License

ISC
