/**
 * ─────────────────────────────────────────────────────────────
 *  ALL SITE CONTENT LIVES HERE.
 *  Edit this file to change text, projects, links and stats.
 *  You never need to touch the components to update content.
 *
 *  Anything wrapped in [[ ... ]] is a placeholder that still
 *  needs a real value. Search the repo for "[[" to find them all.
 * ─────────────────────────────────────────────────────────────
 */

export const site = {
  url: "https://khushvindar.vercel.app", // [[ replace with the real deployed URL ]]
  title: "Khushvindar Singh Choudhary — Developer",
  description:
    "First-year B.Tech CSE (AI) student at Newton School of Technology, Pune. I build fast, useful things for the web and contribute to open source.",
};

export const person = {
  name: "Khushvindar Singh Choudhary",
  firstName: "Khushvindar",
  lastName: "Singh Choudhary",
  role: "Developer · CSE (AI) @ NST Pune",
  tagline: "I build fast, useful things for the web.",
  location: "Pune, India",
  email: "khushvindarjat@gmail.com",
  resumeUrl: "", // [[ optional: link to a PDF résumé, e.g. "/resume.pdf" — leave empty to hide the button ]]
  socials: [
    { label: "GitHub", href: "https://github.com/khushvindarjat" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/khushvindar-singh-87015a2b1" },
    { label: "Email", href: "mailto:khushvindarjat@gmail.com" },
  ],
};

export const about = {
  heading: "Student by day, builder by night.",
  // Keep paragraphs short. Plain, honest English reads best.
  paragraphs: [
    "I'm Khushvindar, a first-year B.Tech CSE (AI) student at Newton School of Technology in Pune.",
    "I like building tools that make everyday work a little easier — small web apps, CLI scripts, and fixes that make an interface feel right. Most of what I've learned so far came from reading other people's code and sending pull requests.",
    "Right now I'm getting better at React and TypeScript, contributing to student open-source projects, and learning the AI side of my degree one step at a time.",
  ],
  // Numbers come from his public GitHub (checked Oct 2026). Update them when they grow.
  stats: [
    { value: 16, suffix: "", label: "Public repos" },
    { value: 33, suffix: "+", label: "Commits in public repos" },
    { value: 10, suffix: "", label: "Merged pull requests" },
  ],
};

export type Project = {
  id: string;
  title: string;
  /** One line shown on the carousel. */
  summary: string;
  /** Longer, honest description for the detail view. */
  description: string;
  /** What he personally did. Bullet points. */
  contributions: string[];
  role: string;
  year: string;
  stack: string[];
  github: string;
  live?: string;
  /** Path inside /public. Screenshots are captured by scripts/shoot-projects.mjs. */
  image: string;
  featured?: boolean;
};

export const projects: Project[] = [
  {
    id: "coderoller",
    featured: true,
    title: "Coderoller",
    summary: "Website and dashboard UI for a local-first developer time tracker.",
    description:
      "Coderoller is a privacy-first time tracker for developers: the idea is that your coding time is logged on your own machine in a SQLite file instead of a cloud service. This repo is the product's web front end — a 20-page multi-page Vite site with a landing page, docs, blog, pricing, login and register screens, plus dashboard, analytics, settings and profile views styled with Tailwind CSS v4.",
    contributions: [
      // [[ Write 2–3 bullets about what YOU did on Coderoller. The commits in this repo are authored by teammates,
      //    so describe your real role (design, planning, review, deployment, etc.). Example below — edit it. ]]
      "[[ Your role on Coderoller — e.g. planned the page structure and deployed it on Vercel ]]",
      "Hosted on my GitHub and deployed live on Vercel.",
    ],
    role: "Team project · [[ your role ]]",
    year: "2026",
    stack: ["Vite", "Tailwind CSS v4", "JavaScript", "HTML", "Vercel"],
    github: "https://github.com/khushvindarjat/code-roller-website",
    live: "https://code-roller-website.vercel.app",
    image: "/projects/coderoller.webp",
  },
  {
    id: "flowpilot",
    title: "FlowPilot",
    summary: "Project-management workspace — 6 of my pull requests merged.",
    description:
      "FlowPilot is an open-source project-management app for small teams, built with React 19, TypeScript and Vite. It runs fully in the browser and keeps data in localStorage. I contributed a series of fixes across auth, tasks and the calendar.",
    contributions: [
      "Replaced plain-text passwords in localStorage with SHA-256 hashes using the Web Crypto API (login, change-password and reset flows).",
      "Fixed the tasks page: status + priority filters now combine with AND, sorting no longer gets stuck, and empty states show correctly.",
      "Rebuilt task search with a debounced search bar and fixed an off-by-one bug in the pagination hook.",
      "Calendar polish (trailing dates, centred day numbers) and a footer fix.",
    ],
    role: "Open-source contributor",
    year: "2026",
    stack: ["React", "TypeScript", "Vite", "Tailwind CSS"],
    github: "https://github.com/tushaar-05/flowpilot/pulls?q=is%3Apr+author%3Akhushvindarjat",
    live: "https://flowpilot-omega-woad.vercel.app",
    image: "/projects/flowpilot.webp",
  },
  {
    id: "archon",
    title: "Archon",
    summary: "Trading-platform UI in pure HTML & CSS — fixed sign-up and nav.",
    description:
      "Archon is a multi-page trading-platform interface built with semantic HTML and CSS: markets, dashboard, pricing and an academy section, with CSS-only charts and a ticker tape. I worked on the account flow and navigation.",
    contributions: [
      "Fixed the register form and made users log in automatically after signing up.",
      "Fixed the navigation bar on the pricing page.",
    ],
    role: "Open-source contributor",
    year: "2026",
    stack: ["HTML", "CSS", "JavaScript"],
    github: "https://github.com/Antidoteprashant/Project-_Archon/pulls?q=is%3Apr+author%3Akhushvindarjat",
    live: "https://project-archon-jet.vercel.app",
    image: "/projects/archon.webp",
  },
  {
    id: "novastudios",
    title: "Nova Studios",
    summary: "Multi-page studio site — added accessibility features.",
    description:
      "Nova Studios is a static multi-page entertainment-company website (HTML + CSS) maintained as a practice ground for open-source contributors. My work focused on accessibility and navigation.",
    contributions: [
      "Added a floating “Back to top” button across the site (merged).",
      "Worked on the “Skip to main content” link so it becomes visible and correctly positioned on keyboard focus.",
    ],
    role: "Open-source contributor",
    year: "2026",
    stack: ["HTML", "CSS", "JavaScript"],
    github: "https://github.com/kartikktripathi/NovaStudios/pulls?q=is%3Apr+author%3Akhushvindarjat",
    live: "https://archonbugs1.vercel.app",
    image: "/projects/novastudios.webp",
  },
  {
    id: "file-manager",
    title: "File Manager CLI",
    summary: "A small Python command-line tool to create, read, update and delete files.",
    description:
      "A menu-driven Python script for working with files from the terminal. It lists everything in the current folder with pathlib, then lets you create a file with content, read it back, rename / overwrite / append to it, or delete it — with error handling around every step.",
    contributions: [
      "Wrote the whole tool: folder listing with pathlib.rglob, create / read / update / delete flows, and try/except error handling.",
    ],
    role: "Solo project",
    year: "2026",
    stack: ["Python", "pathlib"],
    github: "https://github.com/khushvindarjat/File_handling",
    image: "/projects/file-manager.webp",
  },
];

export type Contribution = {
  date: string; // YYYY-MM-DD
  repo: string;
  title: string;
  href: string;
  status: "merged" | "contributed" | "open";
};

export const openSource = {
  heading: "Open source",
  intro:
    "Most of my learning happens in other people's repos — reading the code, finding a bug, and sending a pull request.",
  achievement: {
    name: "Pull Shark",
    detail: "GitHub achievement for getting pull requests merged.",
    href: "https://github.com/khushvindarjat?tab=achievements",
  },
  // Newest first. Every entry below links to a real PR.
  timeline: [
    {
      date: "2026-07-14",
      repo: "avomaly/drake-site",
      title: "Add missing images and hover transparency",
      href: "https://github.com/avomaly/drake-site/pull/1",
      status: "merged",
    },
    {
      date: "2026-07-10",
      repo: "kartikktripathi/NovaStudios",
      title: "Add floating Back to Top button",
      href: "https://github.com/kartikktripathi/NovaStudios/pull/117",
      status: "merged",
    },
    {
      date: "2026-07-09",
      repo: "tushaar-05/flowpilot",
      title: "Resolve pagination trap and empty-state handling in tasks",
      href: "https://github.com/tushaar-05/flowpilot/pull/60",
      status: "merged",
    },
    {
      date: "2026-07-08",
      repo: "tushaar-05/flowpilot",
      title: "Fix tasks search bar",
      href: "https://github.com/tushaar-05/flowpilot/pull/68",
      status: "merged",
    },
    {
      date: "2026-07-08",
      repo: "tushaar-05/flowpilot",
      title: "Hash passwords in localStorage",
      href: "https://github.com/tushaar-05/flowpilot/pull/65",
      status: "merged",
    },
    {
      date: "2026-07-08",
      repo: "Antidoteprashant/Project-_Archon",
      title: "Fix pricing page nav bar",
      href: "https://github.com/Antidoteprashant/Project-_Archon/pull/86",
      status: "merged",
    },
    {
      date: "2026-07-08",
      repo: "tushaar-05/flowpilot",
      title: "Center calendar date numbers",
      href: "https://github.com/tushaar-05/flowpilot/pull/57",
      status: "merged",
    },
    {
      date: "2026-07-08",
      repo: "tushaar-05/flowpilot",
      title: "Add trailing dates to the calendar",
      href: "https://github.com/tushaar-05/flowpilot/pull/48",
      status: "merged",
    },
    {
      date: "2026-07-07",
      repo: "Antidoteprashant/Project-_Archon",
      title: "Register fix + auto-login after sign-up",
      href: "https://github.com/Antidoteprashant/Project-_Archon/pull/72",
      status: "merged",
    },
    {
      date: "2026-07-07",
      repo: "tushaar-05/flowpilot",
      title: "Footer fix",
      href: "https://github.com/tushaar-05/flowpilot/pull/29",
      status: "merged",
    },
    {
      date: "2025-10-23", // [[ date of your XplnHub contribution ]]
      repo: "CodeMaverick-143/xplnhub",
      // [[ Describe what you contributed to XplnHub and link the PR/commit below.
      //    No PR authored by khushvindarjat was found publicly, so this needs your input. ]]
      title: "[[ Your XplnHub contribution ]]",
      href: "https://github.com/khushvindarjat/xplnhub", // [[ replace with the PR link ]]
      status: "contributed",
    },
  ] satisfies Contribution[],
};

/**
 * Skills shown as nodes on the particle network.
 * `icon` is a Simple Icons slug (https://simpleicons.org) — see src/content/icons.ts.
 * `projects` lists project ids (above) that used the skill.
 */
export const skills = [
  { id: "html", label: "HTML", icon: "html5", projects: ["coderoller", "archon", "novastudios"] },
  { id: "css", label: "CSS", icon: "css", projects: ["archon", "novastudios"] },
  { id: "javascript", label: "JavaScript", icon: "javascript", projects: ["coderoller", "archon", "novastudios"] },
  { id: "typescript", label: "TypeScript", icon: "typescript", projects: ["flowpilot"] },
  { id: "react", label: "React", icon: "react", projects: ["flowpilot"] },
  { id: "vite", label: "Vite", icon: "vite", projects: ["coderoller", "flowpilot"] },
  { id: "tailwind", label: "Tailwind CSS", icon: "tailwindcss", projects: ["coderoller", "flowpilot"] },
  { id: "python", label: "Python", icon: "python", projects: ["file-manager"] },
  { id: "git", label: "Git & GitHub", icon: "github", projects: ["coderoller", "flowpilot", "archon", "novastudios", "file-manager"] },
  { id: "vercel", label: "Vercel", icon: "vercel", projects: ["coderoller", "flowpilot", "archon", "novastudios"] },
] as const;

export const contact = {
  heading: "Let's build something.",
  body: "Internships, open-source collabs, hackathon teams, or just a hello — my inbox is open.",
};

export const nav = [
  { id: "hero", label: "Index" },
  { id: "about", label: "About" },
  { id: "projects", label: "Work" },
  { id: "opensource", label: "Open source" },
  { id: "skills", label: "Stack" },
  { id: "contact", label: "Contact" },
];
