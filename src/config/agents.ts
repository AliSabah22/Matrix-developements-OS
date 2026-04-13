// src/config/agents.ts
// Agent registry — maps each agent to their wiki pages, skills, and MCP connections

export type AgentId =
  | "ceo-strategy"
  | "cto-architect"
  | "developer"
  | "designer"
  | "marketing"
  | "sales-outreach"
  | "product-manager"
  | "qa-testing"
  | "finance"
  | "devops"
  | "customer-success"
  | "hr-operations";

export interface AgentConfig {
  id: AgentId;
  name: string;
  title: string;
  department: string;
  avatar: string; // emoji or icon identifier
  color: string; // tailwind color class for UI
  description: string;

  // Wiki pages to load (relative to vault wiki/ directory)
  wikiPages: {
    self: string; // agent's own page
    alwaysLoad: string[]; // loaded every conversation
    projectDependent: boolean; // if true, load selected project page(s)
  };

  // Exact skill paths from claude-skills repo (relative to raw/claude-skills/)
  skills: {
    path: string;
    name: string;
    purpose: string;
  }[];

  // MCP servers this agent needs
  mcpServers: {
    name: string;
    url?: string; // remote MCP server URL
    command?: string; // local MCP server command
    args?: string[];
    env?: Record<string, string>; // env var names (values come from .env)
    purpose: string;
  }[];
}

export const AGENT_CONFIGS: Record<AgentId, AgentConfig> = {
  "ceo-strategy": {
    id: "ceo-strategy",
    name: "Atlas",
    title: "CEO / Strategy Agent",
    department: "Leadership",
    avatar: "🏛️",
    color: "amber",
    description:
      "Strategic advisory and business direction. Evaluates market opportunities, allocates resources across projects, and prepares strategic recommendations for founders.",

    wikiPages: {
      self: "agents/ceo-strategy.md",
      alwaysLoad: [
        "index.md",
        "company/mission.md",
        "company/clients.md",
        "company/org-structure.md",
      ],
      projectDependent: true,
    },

    skills: [
      {
        path: "c-level-advisor/ceo-advisor/SKILL.md",
        name: "CEO Advisor",
        purpose: "Executive decision frameworks, strategic planning, board management",
      },
      {
        path: "c-level-advisor/strategic-alignment/SKILL.md",
        name: "Strategic Alignment",
        purpose: "Strategic analysis, market positioning, competitive strategy",
      },
      {
        path: "product-team/product-manager-toolkit/SKILL.md",
        name: "Product Manager Toolkit",
        purpose: "Market research, opportunity sizing (shared with PM)",
      },
      {
        path: "business-growth/revenue-operations/SKILL.md",
        name: "Revenue Operations",
        purpose: "Growth levers, scaling playbooks",
      },
    ],

    mcpServers: [
      {
        name: "google-calendar",
        url: "https://gcal.mcp.claude.com/mcp",
        purpose: "Schedule strategy meetings, review calendar for planning",
      },
      {
        name: "gmail",
        url: "https://gmail.mcp.claude.com/mcp",
        purpose: "Draft investor/partner emails, review important communications",
      },
    ],
  },

  "cto-architect": {
    id: "cto-architect",
    name: "Forge",
    title: "CTO / Architect Agent",
    department: "Engineering",
    avatar: "🔧",
    color: "blue",
    description:
      "Technical leadership and system architecture. Makes tech stack decisions, designs data models and APIs, sets engineering patterns that the Developer agent follows.",

    wikiPages: {
      self: "agents/cto-architect.md",
      alwaysLoad: [
        "index.md",
        "company/tech-standards.md",
      ],
      projectDependent: true,
    },

    skills: [
      {
        path: "engineering-team/senior-architect/SKILL.md",
        name: "Senior Architect",
        purpose: "System design, architecture patterns, scalability planning",
      },
      {
        path: "engineering-team/senior-fullstack/SKILL.md",
        name: "Senior Fullstack",
        purpose: "Full-stack technical knowledge across React/Node/Postgres",
      },
      {
        path: "c-level-advisor/cto-advisor/SKILL.md",
        name: "CTO Advisor",
        purpose: "Technical leadership, tech debt assessment, build-vs-buy",
      },
      {
        path: "engineering-team/senior-security/SKILL.md",
        name: "Senior Security",
        purpose: "Security architecture, threat modeling, auth patterns",
      },
    ],

    mcpServers: [
      {
        name: "github",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
        env: { GITHUB_PERSONAL_ACCESS_TOKEN: "GITHUB_TOKEN" },
        purpose: "Review repos, PRs, issues across all project repos",
      },
      {
        name: "postgres",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-postgres"],
        env: { POSTGRES_URL: "POSTGRES_URL" },
        purpose: "Inspect database schemas, query data models",
      },
    ],
  },

  developer: {
    id: "developer",
    name: "Coda",
    title: "Developer / Code Agent",
    department: "Engineering",
    avatar: "💻",
    color: "green",
    description:
      "Feature implementation and code production. Writes React/Next.js code, builds API endpoints, implements components from Designer specs, and writes tests.",

    wikiPages: {
      self: "agents/developer.md",
      alwaysLoad: [
        "index.md",
        "company/tech-standards.md",
      ],
      projectDependent: true,
    },

    skills: [
      {
        path: "engineering-team/senior-fullstack/SKILL.md",
        name: "Senior Fullstack",
        purpose: "Full-stack implementation patterns",
      },
      {
        path: "engineering-team/senior-frontend/SKILL.md",
        name: "Senior Frontend",
        purpose: "React/Next.js component patterns, hooks, state management",
      },
      {
        path: "engineering-team/senior-backend/SKILL.md",
        name: "Senior Backend",
        purpose: "API routes, middleware, database queries, Prisma",
      },
      {
        path: "engineering-team/code-reviewer/SKILL.md",
        name: "Code Reviewer",
        purpose: "Self-review before handoff to QA",
      },
    ],

    mcpServers: [
      {
        name: "github",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
        env: { GITHUB_PERSONAL_ACCESS_TOKEN: "GITHUB_TOKEN" },
        purpose: "Create PRs, push code, manage branches",
      },
      {
        name: "filesystem",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/projects"],
        purpose: "Read and write project files directly",
      },
    ],
  },

  designer: {
    id: "designer",
    name: "Pixel",
    title: "Designer / UI Agent",
    department: "Design",
    avatar: "🎨",
    color: "pink",
    description:
      "UI/UX design and visual identity. Creates component specs, design systems, user flows, and responsive layouts. Specs must be implementable in React/Tailwind.",

    wikiPages: {
      self: "agents/designer.md",
      alwaysLoad: [
        "index.md",
        "company/tech-standards.md",
      ],
      projectDependent: true,
    },

    skills: [
      {
        path: "engineering-team/senior-frontend/SKILL.md",
        name: "Senior Frontend",
        purpose: "Understands implementation constraints to spec realistically",
      },
      {
        path: "marketing-skill/launch-strategy/SKILL.md",
        name: "Launch Strategy",
        purpose: "Landing page design principles and conversion optimization",
      },
      {
        path: "marketing-skill/site-architecture/SKILL.md",
        name: "Site Architecture",
        purpose: "Information architecture and navigation patterns",
      },
    ],

    mcpServers: [],
  },

  marketing: {
    id: "marketing",
    name: "Echo",
    title: "Marketing / Growth Agent",
    department: "Marketing",
    avatar: "📢",
    color: "orange",
    description:
      "Growth strategy, content production, SEO, social media, and brand positioning. Creates content calendars, writes copy, manages email campaigns, and tracks marketing performance.",

    wikiPages: {
      self: "agents/marketing.md",
      alwaysLoad: [
        "index.md",
        "company/mission.md",
        "company/clients.md",
      ],
      projectDependent: true,
    },

    skills: [
      {
        path: "marketing-skill/content-creator/SKILL.md",
        name: "Content Creator",
        purpose: "Content production with brand voice analysis, 15+ templates",
      },
      {
        path: "marketing-skill/marketing-demand-acquisition/SKILL.md",
        name: "Demand Generation",
        purpose: "Lead generation campaigns, acquisition funnels",
      },
      {
        path: "marketing-skill/marketing-strategy-pmm/SKILL.md",
        name: "Product Marketing Strategy",
        purpose: "Product positioning, messaging frameworks, launch plans",
      },
      {
        path: "marketing-skill/social-media-analyzer/SKILL.md",
        name: "Social Media Analyzer",
        purpose: "Platform analytics, content performance, audience insights",
      },
      {
        path: "marketing-skill/cold-email/SKILL.md",
        name: "Cold Email",
        purpose: "Outreach email frameworks (shared with Sales)",
      },
      {
        path: "marketing-skill/campaign-analytics/SKILL.md",
        name: "Campaign Analytics",
        purpose: "Marketing performance measurement and attribution",
      },
    ],

    mcpServers: [
      {
        name: "twitter",
        command: "npx",
        args: ["-y", "mcp-twitter"],
        env: {
          TWITTER_API_KEY: "TWITTER_API_KEY",
          TWITTER_API_SECRET: "TWITTER_API_SECRET",
          TWITTER_BEARER_TOKEN: "TWITTER_BEARER_TOKEN",
        },
        purpose: "Post updates, announcements, engage with audience on X/Twitter",
      },
      {
        name: "gmail",
        url: "https://gmail.mcp.claude.com/mcp",
        purpose: "Send marketing emails, newsletters, outreach sequences",
      },
    ],
  },

  "sales-outreach": {
    id: "sales-outreach",
    name: "Closer",
    title: "Sales / Outreach Agent",
    department: "Sales",
    avatar: "🤝",
    color: "emerald",
    description:
      "Client acquisition and revenue generation. Prospects, creates proposals, manages pipeline, handles outreach sequences, and prepares contracts for founder review.",

    wikiPages: {
      self: "agents/sales-outreach.md",
      alwaysLoad: [
        "index.md",
        "company/mission.md",
        "company/clients.md",
      ],
      projectDependent: true,
    },

    skills: [
      {
        path: "marketing-skill/cold-email/SKILL.md",
        name: "Cold Email",
        purpose: "Cold outreach frameworks, subject line optimization",
      },
      {
        path: "marketing-skill/content-creator/SKILL.md",
        name: "Content Creator",
        purpose: "Proposal and pitch deck writing",
      },
      {
        path: "c-level-advisor/cro-advisor/SKILL.md",
        name: "CRO Advisor",
        purpose: "Revenue operations, pipeline management, sales strategy",
      },
      {
        path: "business-growth/revenue-operations/SKILL.md",
        name: "Revenue Operations",
        purpose: "Client acquisition channels, partnership strategy",
      },
    ],

    mcpServers: [
      {
        name: "gmail",
        url: "https://gmail.mcp.claude.com/mcp",
        purpose: "Send outreach emails, follow-up sequences, proposals",
      },
      {
        name: "google-calendar",
        url: "https://gcal.mcp.claude.com/mcp",
        purpose: "Schedule discovery calls, demos, follow-ups",
      },
    ],
  },

  "product-manager": {
    id: "product-manager",
    name: "Compass",
    title: "Product Manager Agent",
    department: "Product",
    avatar: "🗺️",
    color: "violet",
    description:
      "Product strategy, roadmap, and specifications. Writes PRDs, manages sprint planning, prioritizes backlogs, and coordinates cross-agent feature development.",

    wikiPages: {
      self: "agents/product-manager.md",
      alwaysLoad: [
        "index.md",
        "workflows/feature-development.md",
      ],
      projectDependent: true, // loads ALL project pages in multi-project mode
    },

    skills: [
      {
        path: "product-team/product-manager-toolkit/SKILL.md",
        name: "Product Manager Toolkit",
        purpose: "PRD templates, user stories, acceptance criteria, RICE scoring",
      },
      {
        path: "product-team/landing-page-generator/SKILL.md",
        name: "Landing Page Generator",
        purpose: "Product launch landing pages (TSX + Tailwind scaffolding)",
      },
      {
        path: "project-management/senior-pm/SKILL.md",
        name: "Senior PM",
        purpose: "Sprint planning, delivery, stakeholder management, 30+ frameworks",
      },
      {
        path: "project-management/scrum-master/SKILL.md",
        name: "Scrum Master",
        purpose: "Agile ceremonies, sprint retrospectives, velocity tracking",
      },
    ],

    mcpServers: [
      {
        name: "github",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
        env: { GITHUB_PERSONAL_ACCESS_TOKEN: "GITHUB_TOKEN" },
        purpose: "Create issues, manage project boards, track milestones",
      },
    ],
  },

  "qa-testing": {
    id: "qa-testing",
    name: "Shield",
    title: "QA / Testing Agent",
    department: "Engineering",
    avatar: "🛡️",
    color: "red",
    description:
      "Quality assurance, code review, security audit, and testing. Reviews code line-by-line, writes test suites, performs security assessments, and validates acceptance criteria.",

    wikiPages: {
      self: "agents/qa-testing.md",
      alwaysLoad: [
        "index.md",
        "company/tech-standards.md",
      ],
      projectDependent: true,
    },

    skills: [
      {
        path: "engineering-team/senior-qa/SKILL.md",
        name: "Senior QA",
        purpose: "Test strategy, test plans, regression testing, E2E patterns",
      },
      {
        path: "engineering-team/code-reviewer/SKILL.md",
        name: "Code Reviewer",
        purpose: "Line-by-line code review, quality standards, best practices",
      },
      {
        path: "engineering-team/senior-security/SKILL.md",
        name: "Senior Security",
        purpose: "Security audit, vulnerability assessment, OWASP",
      },
      {
        path: "engineering/skill-security-auditor/SKILL.md",
        name: "Security Auditor",
        purpose: "Automated security scanning scripts",
      },
    ],

    mcpServers: [
      {
        name: "github",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
        env: { GITHUB_PERSONAL_ACCESS_TOKEN: "GITHUB_TOKEN" },
        purpose: "Review PRs, comment on code, approve/request changes",
      },
    ],
  },

  finance: {
    id: "finance",
    name: "Ledger",
    title: "Finance / Analytics Agent",
    department: "Finance",
    avatar: "📊",
    color: "yellow",
    description:
      "Financial planning, P&L tracking, pricing strategy, and unit economics. Builds financial models, forecasts revenue, analyzes project profitability, and tracks SaaS metrics.",

    wikiPages: {
      self: "agents/finance.md",
      alwaysLoad: [
        "index.md",
        "company/clients.md",
      ],
      projectDependent: true,
    },

    skills: [
      {
        path: "finance/financial-analyst/SKILL.md",
        name: "Financial Analyst",
        purpose: "Ratio analysis, DCF valuation, budget variance, forecasting",
      },
      {
        path: "finance/saas-metrics-coach/SKILL.md",
        name: "SaaS Metrics Coach",
        purpose: "MRR, churn, CAC, LTV, SaaS health scoring",
      },
      {
        path: "c-level-advisor/cfo-advisor/SKILL.md",
        name: "CFO Advisor",
        purpose: "Financial strategy, runway planning, capital allocation",
      },
    ],

    mcpServers: [],
  },

  devops: {
    id: "devops",
    name: "Launch",
    title: "DevOps / Infrastructure Agent",
    department: "Engineering",
    avatar: "🚀",
    color: "cyan",
    description:
      "Deployment, CI/CD, cloud infrastructure, and monitoring. Manages production environments, builds deployment pipelines, monitors uptime, and handles incident response.",

    wikiPages: {
      self: "agents/devops.md",
      alwaysLoad: [
        "index.md",
        "company/tech-standards.md",
      ],
      projectDependent: true,
    },

    skills: [
      {
        path: "engineering-team/senior-devops/SKILL.md",
        name: "Senior DevOps",
        purpose: "CI/CD pipelines, deployment strategies, infrastructure as code",
      },
      {
        path: "engineering-team/aws-solution-architect/SKILL.md",
        name: "AWS Solution Architect",
        purpose: "Cloud architecture, AWS services, cost optimization",
      },
      {
        path: "engineering-team/senior-secops/SKILL.md",
        name: "Senior SecOps",
        purpose: "Infrastructure security, secrets management, compliance",
      },
    ],

    mcpServers: [
      {
        name: "github",
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-github"],
        env: { GITHUB_PERSONAL_ACCESS_TOKEN: "GITHUB_TOKEN" },
        purpose: "Manage CI/CD workflows, review deployment configs",
      },
    ],
  },

  "customer-success": {
    id: "customer-success",
    name: "Bridge",
    title: "Customer Success Agent",
    department: "Customer Success",
    avatar: "🌉",
    color: "teal",
    description:
      "Post-sale client relationships. Handles onboarding, support tickets, feature request routing, client health monitoring, and renewal conversations.",

    wikiPages: {
      self: "agents/customer-success.md",
      alwaysLoad: [
        "index.md",
        "company/clients.md",
      ],
      projectDependent: true,
    },

    skills: [
      {
        path: "business-growth/customer-success-manager/SKILL.md",
        name: "Customer Success Manager",
        purpose: "Client health scoring, onboarding playbooks, retention",
      },
      {
        path: "marketing-skill/content-creator/SKILL.md",
        name: "Content Creator",
        purpose: "Client-facing documentation, training materials",
      },
    ],

    mcpServers: [
      {
        name: "gmail",
        url: "https://gmail.mcp.claude.com/mcp",
        purpose: "Client communication, support responses, onboarding emails",
      },
    ],
  },

  "hr-operations": {
    id: "hr-operations",
    name: "Ops",
    title: "HR / Operations Agent",
    department: "Operations",
    avatar: "⚙️",
    color: "gray",
    description:
      "Internal processes, hiring pipeline, SOPs, and organizational health. Maintains the wiki, tracks agent effectiveness, and coordinates cross-agent workflows.",

    wikiPages: {
      self: "agents/hr-operations.md",
      alwaysLoad: [
        "index.md",
        "company/org-structure.md",
        "company/processes.md",
      ],
      projectDependent: false, // works across all projects by default
    },

    skills: [
      {
        path: "c-level-advisor/coo-advisor/SKILL.md",
        name: "COO Advisor",
        purpose: "Operations leadership, process design, organizational scaling",
      },
      {
        path: "project-management/senior-pm/SKILL.md",
        name: "Senior PM",
        purpose: "Process management, cross-team coordination",
      },
      {
        path: "ra-qm-team/quality-documentation-manager/SKILL.md",
        name: "Quality Documentation Manager",
        purpose: "Process documentation, SOP creation, efficiency analysis",
      },
    ],

    mcpServers: [
      {
        name: "google-calendar",
        url: "https://gcal.mcp.claude.com/mcp",
        purpose: "Schedule internal meetings, manage team calendar",
      },
    ],
  },
};

// Helper to get all agent IDs
export const ALL_AGENT_IDS = Object.keys(AGENT_CONFIGS) as AgentId[];

// Helper to get agents by department
export function getAgentsByDepartment(department: string): AgentConfig[] {
  return Object.values(AGENT_CONFIGS).filter(
    (agent) => agent.department === department
  );
}

// GitHub repo info per project (keyed by the project slug used in selectedProjects)
export interface ProjectRepo {
  owner: string;
  repo: string;
  defaultBranch: string;
  description: string;
}

export const PROJECT_REPOS: Record<string, ProjectRepo> = {
  "wraptors-saas": {
    owner: "matrix-developments",
    repo: "wraptors-saas",
    defaultBranch: "dev",
    description: "Wraptors SaaS — automotive shop OS",
  },
  archstudio: {
    owner: "matrix-developments",
    repo: "archstudio",
    defaultBranch: "dev",
    description: "ArchStudio — custom software for architecture firm",
  },
  "multi-tenant-platform": {
    owner: "matrix-developments",
    repo: "multi-tenant-platform",
    defaultBranch: "main",
    description: "Multi-Tenant Platform — shared vertical SaaS infrastructure",
  },
};

// Agents that have direct read/write access to codebases via GitHub MCP
export const CODE_CAPABLE_AGENTS = new Set<AgentId>([
  "cto-architect",
  "developer",
  "qa-testing",
  "devops",
]);
