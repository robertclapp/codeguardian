import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { videoTutorials } from "../drizzle/schema.ts";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

const tutorials = [
  {
    title: "Getting Started: Platform Overview",
    description: "Learn the basics of navigating the AI-Powered HR Platform and understanding its key features.",
    category: "getting-started",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: 300,
    order: 1,
  },
  {
    title: "Candidate Onboarding Workflow",
    description: "Step-by-step guide to onboarding new candidates, from application to placement.",
    category: "getting-started",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: 480,
    order: 2,
  },
  {
    title: "Creating and Managing Job Postings",
    description: "Learn how to create effective job postings, set requirements, and manage applications.",
    category: "getting-started",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: 420,
    order: 3,
  },
  {
    title: "Document Upload and Management",
    description: "How to upload, review, and approve candidate documents efficiently.",
    category: "document-upload",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: 360,
    order: 4,
  },
  {
    title: "AI-Powered Document Auto-Review",
    description: "Understanding how the AI document review system works and when to use manual review.",
    category: "document-upload",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: 390,
    order: 5,
  },
  {
    title: "Tracking Candidate Progress",
    description: "Monitor candidate progress through program stages and milestones.",
    category: "progress-tracking",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: 330,
    order: 6,
  },
  {
    title: "Using the Analytics Dashboard",
    description: "Understand key metrics, cohort analysis, and retention tracking for program effectiveness.",
    category: "progress-tracking",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: 450,
    order: 7,
  },
  {
    title: "Program Completion and Reporting",
    description: "Generate reports for grant applications and stakeholder presentations.",
    category: "program-completion",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: 510,
    order: 8,
  },
  {
    title: "Troubleshooting Common Issues",
    description: "Solutions to frequently encountered problems and how to get support.",
    category: "troubleshooting",
    videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: 270,
    order: 9,
  },
];

console.log("Seeding video tutorials...");
for (const tutorial of tutorials) {
  await db.insert(videoTutorials).values(tutorial);
  console.log(`✓ Added: ${tutorial.title}`);
}

console.log("\n✅ Successfully seeded", tutorials.length, "video tutorials!");
await connection.end();
