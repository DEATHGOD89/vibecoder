/* ==========================================================================
   PromptFlow AI - Prompt Enhancer & Compiler Module (enhancer.js)
   ========================================================================== */

import { CodingShield } from './templates.js';

export const PromptEnhancer = {
    
    // --- Assemble Prompt from Guided Architect Fields ---
    assembleArchitectPrompt(fields) {
        const { role, goal, tasks, constraints, format } = fields;
        
        let prompt = '';
        
        if (role) {
            prompt += `# Role\n${role.trim()}\n\n`;
        }
        
        if (goal) {
            prompt += `# Context & Goal\n${goal.trim()}\n\n`;
        }
        
        if (tasks) {
            prompt += `# Specific Checklist Deliverables\n${tasks.trim()}\n\n`;
        }
        
        if (constraints) {
            prompt += `# Strict Rules & Constraints\n${constraints.trim()}\n\n`;
        }
        
        if (format) {
            let formatText = '';
            switch (format) {
                case 'code-only':
                    formatText = 'Please deliver fully operational code blocks, ready to copy-paste. Include necessary dependency lists and import statements.';
                    break;
                case 'code-diff':
                    formatText = 'Please output in standard Git diff format showing clearly what lines of code should be removed and what lines should be added.';
                    break;
                case 'step-by-step':
                    formatText = 'Provide a structured educational tutorial. Explain the logical steps first, then show the code block, and list how to test it.';
                    break;
                case 'spec-md':
                    formatText = 'Output a comprehensive systems design specification document in clean, tabular Markdown format.';
                    break;
                default:
                    formatText = format.trim();
            }
            prompt += `# Desired Output Format\n${formatText}\n`;
        }
        
        return prompt.trim();
    },

    // --- Dynamic AI Prompt Enhancer ---
    async enhanceWithAi(rawThought, config, activeShields, targetLang = 'en', promptMode = 'auto', promptOutputType = 'everything') {
        const { provider, key, model } = config;
        
        // Assemble chosen shield guardrails to append to the prompt
        let guardrailsBlock = '';
        if (activeShields.antiTruncation) guardrailsBlock += `${CodingShield.antiTruncation}\n`;
        if (activeShields.preserveComments) guardrailsBlock += `${CodingShield.preserveComments}\n`;
        if (activeShields.planFirst) guardrailsBlock += `${CodingShield.planFirst}\n`;
        if (activeShields.tailwindLock) guardrailsBlock += `${CodingShield.tailwindLock}\n`;
        
        if (!guardrailsBlock) {
            guardrailsBlock = 'Ensure clean coding standards and do not leave incomplete statements.';
        }

        let translationInstruction = '';
        if (targetLang && targetLang !== 'en') {
            const langNames = {
                'es': 'Spanish (Español)',
                'fr': 'French (Français)',
                'ja': 'Japanese (日本語)',
                'de': 'German (Deutsch)',
                'hi': 'Hindi (हिन्दी)'
            };
            const targetLangName = langNames[targetLang] || targetLang;
            translationInstruction = `\n\n7. [CRITICAL LANGUAGE TRANSLATION] Translate the entire enhanced prompt (including structural markdown headers like # Role, # Context & Goal, # Specific Checklist Deliverables, # Strict Rules & Constraints, # Desired Output Format) into ${targetLangName}. The user has explicitly requested to work in their native language layouts.`;
        }
        
        const modeInstruction = this.getPromptModeInstruction(promptMode);
        const outputTypeInstruction = this.getPromptOutputTypeInstruction(promptOutputType);
        
        // Construct the Meta-Prompt for rewriting
        const metaPrompt = `You are an Elite Prompt Engineer, Senior Systems Architect, and World-Class AI Interaction Designer. Your absolute objective is to take a user's raw, messy, conversational draft thought and compile it into an extremely robust, production-grade, and structured Markdown prompt template.
 
Here is the raw conversational thought:
---
${rawThought}
---
${modeInstruction}
${outputTypeInstruction}
 
You must re-engineer this request into a highly optimized, high-fidelity prompt template following this exact, rigorous structure:

1. **# Role**: Establish an expert persona, domain, and specific mindset tailored to the task (e.g., "Senior React Architect & Web Accessibility Specialist").
2. **# Context & Core Goal**: Provide a clear background, objective, and specific scope of what needs to be achieved.
3. **# Specific Checklist Deliverables**: Break the tasks into a detailed, logically ordered, and numbered checklist.
4. **# Strict Rules & Constraints**: Outline absolute rules, boundaries, and restrictions (e.g., anti-hallucination, edge case handling, performance expectations). You MUST explicitly incorporate these custom shield guardrails:
${guardrailsBlock}
5. **# Desired Output Format**: Define the exact structure, code markers, and presentation formatting requested.
${translationInstruction}

### System Guidelines:
- Double-check for technical accuracy and eliminate all hand-waving or generic placeholder markers.
- Maintain high information density and professional, objective terminology.
- Output ONLY the compiled Markdown prompt block itself. Do NOT include any surrounding conversational text, introduction (e.g. "Here is your enhanced prompt:"), or HTML frames. Deliver raw Markdown directly.`;
 
        // 1. Google Gemini API Call
        if (provider === 'gemini') {
            if (!key) throw new Error('Gemini API key is missing. Go to Settings to configure it.');
            
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                { text: metaPrompt }
                            ]
                        }
                    ],
                    generationConfig: {
                        temperature: 0.2
                    }
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errMsg = errorData.error?.message || response.statusText || 'Unknown API error';
                throw new Error(`Gemini API Error: ${errMsg}`);
            }
            
            const result = await response.json();
            const enhancedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!enhancedText) throw new Error('Gemini API returned an empty response. Try again.');
            return enhancedText.trim();
        }
        
        // 2. OpenAI API Call
        if (provider === 'openai') {
            if (!key) throw new Error('OpenAI API key is missing. Go to Settings to configure it.');
            
            const endpoint = 'https://api.openai.com/v1/chat/completions';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an Elite Systems Architect and Prompt Engineer. Output raw markdown prompts without conversational preamble.'
                        },
                        {
                            role: 'user',
                            content: metaPrompt
                        }
                    ],
                    temperature: 0.2
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errMsg = errorData.error?.message || response.statusText || 'Unknown API error';
                throw new Error(`OpenAI API Error: ${errMsg}`);
            }
            
            const result = await response.json();
            const enhancedText = result.choices?.[0]?.message?.content;
            if (!enhancedText) throw new Error('OpenAI API returned an empty response. Try again.');
            return enhancedText.trim();
        }
        
        // 3. Fallback: Zero-Key Smart Local Compiler
        return this.localSmartCompile(rawThought, activeShields, targetLang, promptMode, promptOutputType);
    },
    
    // --- Zero-Key Strategic Local Compiler ---
    getPromptModeInstruction(promptMode = 'auto') {
        if (!promptMode || promptMode === 'auto') return '';
        
        const modeDetails = {
            // Development
            'scratch': {
                category: 'Development',
                label: 'Website/App From Scratch',
                desc: 'Focus on bootstrapping a complete greenfield project. Emphasize modular architecture, file structure, key pages/routes, reusable UI component tree, responsive layouts, data model, state management, basic auth, hosting prep, and step-by-step milestone delivery.'
            },
            'saas': {
                category: 'Development',
                label: 'SaaS Product Builder',
                desc: 'Focus on multi-tenant SaaS architectures, subscription billing models (e.g. Stripe integration), workspace/organization onboarding, team permissions, secure API routes, email verification flows, dashboard layout, database schema, and usage-based scaling.'
            },
            'mvp': {
                category: 'Development',
                label: 'MVP Builder',
                desc: 'Focus on speed-to-market, core feature optimization, minimal dependencies, simple state flow, landing page, and immediate user feedback collection. Avoid over-engineering, use serverless or zero-config backend where possible.'
            },
            'fullstack': {
                category: 'Development',
                label: 'Full Stack Development',
                desc: 'Focus on both frontend UI and backend services. Cover REST or GraphQL API contract designs, database schema models, client-side routing, state management, server-side data fetching, session/token auth, and unified deployment guidelines.'
            },
            'frontend': {
                category: 'Development',
                label: 'Frontend Development',
                desc: 'Focus exclusively on the user interface and client side. Emphasize visual aesthetics, responsive grid/flexbox layouts, stateful UI components, clean styles (Tailwind/CSS), mock API integration, client-side routing, accessibility, animations, and local state management.'
            },
            'backend': {
                category: 'Development',
                label: 'Backend Development',
                desc: 'Focus on server-side logic, controllers, routing, business logic layers, ORM database integrations, authentication, middleware, logging, rate limiting, and robust error handling. Do not include UI or HTML code.'
            },
            'mobile': {
                category: 'Development',
                label: 'Mobile App Development',
                desc: 'Focus on native or cross-platform mobile frameworks (e.g. Flutter, React Native). Address touch interactions, viewport scaling, platform-specific integrations (iOS/Android), offline data syncing, local push notifications, and app store bundling requirements.'
            },
            'desktop': {
                category: 'Development',
                label: 'Desktop App Development',
                desc: 'Focus on desktop runtimes (e.g. Electron, Tauri). Emphasize operating system integrations, local file storage access, system tray options, multi-window management, and packaging/installers for Windows, macOS, and Linux.'
            },
            'chrome': {
                category: 'Development',
                label: 'Chrome Extension Dev',
                desc: 'Focus on modern Web Extensions API (Manifest V3). Emphasize background service workers, content scripts, popup UI pages, communication channels (message passing), local storage, permissions scope, and secure script execution.'
            },
            'automation': {
                category: 'Development',
                label: 'Browser Automation',
                desc: 'Focus on browser automation scripting (e.g. Puppeteer, Playwright, Selenium). Emphasize headless browser setup, page navigations, selectors, wait strategies for dynamic DOM, input entry, cookie management, screenshots/PDF generation, and error retry logic.'
            },
            'api_dev': {
                category: 'Development',
                label: 'API Development',
                desc: 'Focus on building clean API endpoints. Cover RESTful path conventions, status codes, query filtering, pagination, JSON response payloads, Swagger/OpenAPI specifications, JWT header verification, CORS configs, and rate limiting.'
            },
            'microservices': {
                category: 'Development',
                label: 'Microservices Development',
                desc: 'Focus on distributed service-oriented systems. Emphasize light microservices, API Gateway routing, service discovery, inter-service communications (REST, gRPC, or message brokers like RabbitMQ), stateless session handling, and isolated database patterns.'
            },
            'serverless': {
                category: 'Development',
                label: 'Serverless Development',
                desc: 'Focus on cloud functions (AWS Lambda, Vercel Serverless, Firebase Functions). Emphasize cold start optimizations, stateless computing constraints, environment variables, API Gateway integrations, and database connection pooling handling.'
            },

            // Debugging & Fixing
            'bug_fix': {
                category: 'Debugging',
                label: 'Bug Fix & Debug',
                desc: 'Focus on systematic problem identification and minimal-risk repair. Detail the expected vs actual behaviors, isolate the buggy module, propose a clean corrective patch, and supply test assertions to prevent regressions.'
            },
            'root_cause': {
                category: 'Debugging',
                label: 'Root Cause Analysis',
                desc: 'Perform a deep diagnostic audit. Drill down into the underlying system reason behind the issue (the "Why"), mapping dependencies, data flow failures, race conditions, or unhandled exceptions, rather than merely treating the symptom.'
            },
            'error_log': {
                category: 'Debugging',
                label: 'Error Log Analysis',
                desc: 'Analyze crash reports, trace logs, or server output dumps. Decode error codes, parse call stacks, locate exact line numbers of failure, identify memory states or missing variables, and map the stack trace to the source code.'
            },
            'crash_invest': {
                category: 'Debugging',
                label: 'Crash Investigation',
                desc: 'Investigate complete application crashes, fatal exits, out-of-memory errors, or unhandled process rejections. Emphasize isolation of OS boundaries, native bindings, loop cycles, or heap exhaustion issues.'
            },
            'incident_response': {
                category: 'Debugging',
                label: 'Incident Response',
                desc: 'Formulate an urgent response for active production outages. Focus on quick symptom identification, immediate workarounds or fallback state activation, surgical hotfixes, minimal logging flags addition, and post-mortem notes.'
            },
            'regression': {
                category: 'Debugging',
                label: 'Regression Analysis',
                desc: 'Diagnose why a previously working feature broke after recent changes. Focus on code differences (diffs), unexpected side-effects in global variables/states, changed dependencies, or missing backward compatibility layers.'
            },
            'memory_leak': {
                category: 'Debugging',
                label: 'Memory Leak Detection',
                desc: 'Audit heap allocations, long-running callbacks, event listener cleanups, closure retention scopes, or cache size growth. Provide exact cleanup steps (e.g. `removeEventListener`, `clearTimeout`, dereferencing variables).'
            },
            'bottleneck': {
                category: 'Debugging',
                label: 'Performance Bottleneck',
                desc: 'Locate CPU-intensive blocks, blocking synchronous tasks, infinite loops, database query N+1 patterns, excessive re-renders, or heavy layout recalculations. Propose immediate performance relief.'
            },
            'build_failure': {
                category: 'Debugging',
                label: 'Build Failure Investigation',
                desc: 'Diagnose compiler errors, bundler misconfigurations (Webpack, Vite, TS), dependency version mismatches, lockfile corruptions, missing environment variables, or CI pipeline deployment crashes.'
            },

            // Feature Development
            'add_feature': {
                category: 'Feature Development',
                label: 'Add New Feature',
                desc: 'Develop a new function or module. Focus on integration into existing structures, clean interfaces/props, non-breaking schema additions, route configuration, responsive UI hooks, and unit verification.'
            },
            'enhance_feature': {
                category: 'Feature Development',
                label: 'Feature Enhancement',
                desc: 'Improve an existing feature. Address user experience improvements, speed improvements, cleaner parameters handling, additional edge-case supports, or better visual indicators (e.g. loaders, empty states) without breaking the existing API contract.'
            },
            'migration': {
                category: 'Feature Development',
                label: 'Feature Migration',
                desc: 'Port a feature from one framework, database, or API version to another. Focus on data mapping tables, route redirection mappings, API adapters/shims, backward compatibility layers, and gradual feature-flag rollouts.'
            },
            'modernization': {
                category: 'Feature Development',
                label: 'Legacy Modernization',
                desc: 'Upgrade legacy code to modern standards (e.g. ES5 to ES6+, React Class to Hooks, Callback to Async/Await). Focus on clean code, typescriptification, standard file structures, and maintaining identical functional behaviors.'
            },
            'planning': {
                category: 'Feature Development',
                label: 'Feature Planning',
                desc: 'Formulate a detail-oriented feature specification document. Outline functional requirements, technical dependencies, data models, API schemas, UI design guidelines, edge cases, and test strategy prior to writing code.'
            },

            // Refactoring
            'refactor': {
                category: 'Refactoring',
                label: 'Code Refactoring',
                desc: 'Clean up code structures without changing external behaviors. Emphasize reducing cyclomatic complexity, dry-ing up repetitive logic, choosing descriptive variable names, splitting oversized files, and adding clear typings.'
            },
            'arch_refactor': {
                category: 'Refactoring',
                label: 'Architecture Refactoring',
                desc: 'Restructure the application design pattern. Address migrations (e.g. Monolith to layered, MVC to clean architecture, prop-drilling to context or global store), modular separation of concerns, and clean boundary definitions.'
            },
            'debt_cleanup': {
                category: 'Refactoring',
                label: 'Technical Debt Cleanup',
                desc: 'Address code smells, deprecated package dependencies, hacky workarounds (TODOs), missing error handlers, inconsistent configurations, compiler warnings, and outdated testing scripts.'
            },
            'comp_refactor': {
                category: 'Refactoring',
                label: 'Component Refactoring',
                desc: 'Deconstruct massive, bloated UI components into atomic, pure, and highly reusable sub-components. Emphasize clean prop interfaces, performance optimization (memoization), and separation of visual presentation from business logic.'
            },
            'db_refactor': {
                category: 'Refactoring',
                label: 'Database Refactoring',
                desc: 'Improve database schema normalization, introduce index optimizations, split bloated tables (vertical/horizontal partitioning), restructure relations, rewrite legacy migrations, and clean up orphan foreign keys.'
            },
            'api_refactor': {
                category: 'Refactoring',
                label: 'API Refactoring',
                desc: 'Standardize API route path conventions, refactor handlers to use unified middleware pipelines, serialize outputs uniformly, structure error response envelopes, and unify version controls.'
            },

            // Design & UI/UX
            'ui_design': {
                category: 'Design & UI/UX',
                label: 'UI Design',
                desc: 'Build highly aesthetic and premium user interfaces. Focus on curated color palettes, elegant typography, spacing rules, custom shadows/gradients, micro-interactions, responsive grids, and visually stunning layouts.'
            },
            'ux_design': {
                category: 'Design & UI/UX',
                label: 'UX Design',
                desc: 'Optimize the user journey. Emphasize intuitive navigation hierarchies, obvious call-to-actions, clear feedback states (loading, success, empty, error), form validations, and keyboard navigation flows.'
            },
            'dashboard_design': {
                category: 'Design & UI/UX',
                label: 'Dashboard Design',
                desc: 'Design beautiful analytics workspaces. Focus on dense data layouts, sleek widgets, grid alignments, visual chart placements, clean stats highlights, sidebars, and filters.'
            },
            'saas_design': {
                category: 'Design & UI/UX',
                label: 'SaaS Design',
                desc: 'Build layouts for SaaS web apps. Focus on clean workspace interfaces, smooth modal overlays, settings tabs, profile grids, tables with quick filters, and interactive billing controls.'
            },
            'landing_design': {
                category: 'Design & UI/UX',
                label: 'Landing Page Design',
                desc: 'Create high-converting landing pages. Emphasize striking hero sections, customer pain-point matrices, feature grids, social proofs (testimonials), pricing tiers, and strong sign-up forms.'
            },
            'mobile_ui': {
                category: 'Design & UI/UX',
                label: 'Mobile UI Design',
                desc: 'Design layouts specialized for mobile viewports. Address bottom tab navigation bars, card layouts, comfortable touch targets, responsive font scales, modal bottom sheets, and swipe interactions.'
            },
            'design_system': {
                category: 'Design & UI/UX',
                label: 'Design System Creation',
                desc: 'Draft consistent styling guidelines. Outline design tokens (colors, font hierarchy, spacing scales, border-radius, shadows), buttons, inputs, badge components, and styling conventions.'
            },
            'accessibility': {
                category: 'Design & UI/UX',
                label: 'Accessibility Improvements',
                desc: 'Align code with WCAG 2.1 AA or AAA standards. Focus on semantic HTML, aria-attributes, keyboard accessibility (tabindex), focus rings, color contrast ratios, and screen reader labels.'
            },
            'dark_mode': {
                category: 'Design & UI/UX',
                label: 'Dark Mode Implementation',
                desc: 'Build standard dark mode functionality. Emphasize systematic theme class toggling, custom properties/variables mapping, visual balance of background contrasts, and image/icon swaps.'
            },
            'design_review': {
                category: 'Design & UI/UX',
                label: 'Design Review',
                desc: 'Perform a comprehensive visual audit. Check layout spacing consistency (padding/margin), font sizes hierarchy, colors harmony, borders, and general pixel perfection.'
            },

            // Architecture
            'system_arch': {
                category: 'Architecture',
                label: 'System Architecture',
                desc: 'Design macro systems architecture. Outline service layouts, data storage patterns, caching layers, load balancers, queue systems, external integrations, and scalability bounds.'
            },
            'saas_arch': {
                category: 'Architecture',
                label: 'SaaS Architecture',
                desc: 'Design multi-tenant application foundations. Address isolated database or schema approaches, tenant routing (subdomains), universal permissions, billing states hook, and shared utilities.'
            },
            'db_arch': {
                category: 'Architecture',
                label: 'Database Architecture',
                desc: 'Structure database infrastructure models. Cover relational vs non-relational trade-offs, replication strategies, partitioning, data retention/archiving, and connection pooling models.'
            },
            'cloud_arch': {
                category: 'Architecture',
                label: 'Cloud Architecture',
                desc: 'Design cloud network systems (e.g. AWS, GCP, Azure). Cover VPC subnets, secure gateway boundaries, autoscaling pools, serverless compute networks, managed DB clusters, and CDNs.'
            },
            'scale_arch': {
                category: 'Architecture',
                label: 'Scalable Architecture',
                desc: 'Structure software models to sustain heavy traffic. Focus on read/write separation, caching strategies, queue pipelines, load balancing, asset distribution, and database connection handling.'
            },
            'multitenant': {
                category: 'Architecture',
                label: 'Multi-Tenant Architecture',
                desc: 'Design systems to safely serve multiple clients/companies. Focus on data isolation, tenant-specific config mappings, unified schema shared tables (with tenant_id index), and subdomains routing.'
            },
            'event_driven': {
                category: 'Architecture',
                label: 'Event-Driven Architecture',
                desc: 'Structure event-driven asynchronous architectures. Cover event buses, publisher-subscriber systems, message payload schemas, consumer error queues (dead letter queue), and message guarantee delivery.'
            },
            'enterprise_arch': {
                category: 'Architecture',
                label: 'Enterprise Architecture',
                desc: 'Structure large-scale corporate software systems. Emphasize strict separation of business domains, data standard governance, single sign-on (SSO), and extensive integration adapters.'
            },

            // Database
            'db_design': {
                category: 'Database',
                label: 'Database Design',
                desc: 'Map structural data relations. Cover entity relationship layouts, field data types, foreign key locks, indexing strategies, audit columns, and normalization choices.'
            },
            'sql_schema': {
                category: 'Database',
                label: 'SQL Schema Design',
                desc: 'Create highly optimized SQL schemas. Supply DDL scripts with exact types, primary/foreign keys, unique constraints, default values, indices, and delete-cascade rules.'
            },
            'postgres': {
                category: 'Database',
                label: 'PostgreSQL Optimization',
                desc: 'Optimize Postgres setups. Address index options (B-Tree, GIN, GiST), custom types, JSONB storage optimization, partition layouts, vacuum plans, and configuration tuning.'
            },
            'mongodb': {
                category: 'Database',
                label: 'MongoDB Design',
                desc: 'Design document databases. Cover embedding vs referencing choices, compound indexing, aggregation query designs, transaction scopes, and schema validation structures.'
            },
            'supabase': {
                category: 'Database',
                label: 'Supabase Setup',
                desc: 'Configure Supabase projects. Address Row-Level Security (RLS) policies, auth webhook syncs, storage bucket scopes, edge functions integration, and db relation bindings.'
            },
            'prisma': {
                category: 'Database',
                label: 'Prisma Modeling',
                desc: 'Create Prisma schema blueprints. Draft relations (1-1, 1-N, N-N), index attributes, model constraints, enum setups, and database integration bindings.'
            },
            'db_migration': {
                category: 'Database',
                label: 'Data Migration Planning',
                desc: 'Plan zero-downtime database migrations. Address schema migrations with dual-writing states, backfilling tasks, validation scripts, and fallback rollback routes.'
            },
            'query_opt': {
                category: 'Database',
                label: 'Query Optimization',
                desc: 'Optimize slow queries. Analyze EXPLAIN plans, refactor complex subqueries into joins or CTEs, add missing indexes, and avoid unnecessary column fetches.'
            },

            // Security
            'security_audit': {
                category: 'Security',
                label: 'Security Audit',
                desc: 'Perform a security audit. Check for common security risks, input validation gaps, insecure authentication, missing headers, or sensitive data leaks.'
            },
            'vulnerability': {
                category: 'Security',
                label: 'Vulnerability Assessment',
                desc: 'Identify security vulnerabilities. Focus on identifying SQL injection, cross-site scripting (XSS), cross-site request forgery (CSRF), prototype pollution, and open-redirect vectors.'
            },
            'auth_setup': {
                category: 'Security',
                label: 'Authentication Setup',
                desc: 'Implement secure login, signup, password hashing (bcrypt/argon2), JWT token generation, session cookies, refresh token rotations, and multi-factor authentication (MFA).'
            },
            'auth_design': {
                category: 'Security',
                label: 'Authorization Design',
                desc: 'Design access control hierarchies. Support Role-Based Access Control (RBAC) or Attribute-Based Access Control (ABAC), middleware path checkers, and field-level permissions.'
            },
            'owasp': {
                category: 'Security',
                label: 'OWASP Review',
                desc: 'Review systems against the OWASP Top 10 vulnerabilities. Focus on broken access control, cryptographic failures, injection flaws, and security misconfigurations.'
            },
            'api_security': {
                category: 'Security',
                label: 'API Security',
                desc: 'Secure API communication boundaries. Focus on API keys rotation, HMAC request signatures, rate-limiting, TLS scopes, header protection, and input sanitization.'
            },
            'secure_coding': {
                category: 'Security',
                label: 'Secure Coding Review',
                desc: 'Review code files for insecure practices. Audit hardcoded secrets, dangerous eval functions, regex denial-of-service triggers, path traversal gaps, and unhandled file systems access.'
            },
            'data_protection': {
                category: 'Security',
                label: 'Data Protection Review',
                desc: 'Secure data storage and transit. Address encryption-at-rest/in-transit keys, database column-level encryption (for PII), secure hashing, and GDPR compliance rules.'
            },

            // Performance
            'perf_opt': {
                category: 'Performance',
                label: 'Performance Optimization',
                desc: 'Boost overall system speed. Emphasize cache layering, resource bundling, database indices, micro-services, and payload size reduction.'
            },
            'frontend_opt': {
                category: 'Performance',
                label: 'Frontend Optimization',
                desc: 'Boost browser rendering speeds. Emphasize asset lazy loading, image optimizations, layout thrashing avoidance, code-splitting, bundle reductions, and virtualized lists.'
            },
            'backend_opt': {
                category: 'Performance',
                label: 'Backend Optimization',
                desc: 'Boost server response times. Emphasize async process handling, database query pooling, output caching layers, optimized loops, and cluster scaling.'
            },
            'db_opt': {
                category: 'Performance',
                label: 'Database Optimization',
                desc: 'Optimize database throughput. Focus on index coverage, query rewriting, read-replicas configuration, cache warming, and vacuum scheduling.'
            },
            'seo_opt': {
                category: 'Performance',
                label: 'SEO Optimization',
                desc: 'Optimize visibility for search engines. Focus on semantic HTML layout, title/meta tag configurations, JSON-LD structured schemas, open-graph tags, and sitemaps.'
            },
            'web_vitals': {
                category: 'Performance',
                label: 'Core Web Vitals Opt',
                desc: 'Boost key rendering scores (LCP, FID/INP, CLS). Focus on font swap displays, layout aspect-ratio allocations, resource preloads, and main-thread offloading.'
            },
            'caching': {
                category: 'Performance',
                label: 'Caching Strategy',
                desc: 'Design caching architectures. Focus on CDN caching, Cache-Control headers, browser caching, Redis key-value storage layouts, cache invalidation events, and cache-aside patterns.'
            },
            'bundle_size': {
                category: 'Performance',
                label: 'Bundle Size Reduction',
                desc: 'Reduce JS/CSS bundle sizes. Focus on tree-shaking dead dependencies, dynamic component imports (lazy loading), lightweight package swaps, and bundler compression config.'
            },

            // AI & Automation
            'ai_feature': {
                category: 'AI & Automation',
                label: 'AI Feature Development',
                desc: 'Integrate LLMs into application features. Address streaming response handling, error/fallback options, system instruction configurations, and JSON-mode structured parsing.'
            },
            'openai_int': {
                category: 'AI & Automation',
                label: 'OpenAI Integration',
                desc: 'Integrate OpenAI APIs. Address SDK setups, model configuration parameters, stream responses processing, chat history structures, and token limit controls.'
            },
            'claude_int': {
                category: 'AI & Automation',
                label: 'Claude Integration',
                desc: 'Integrate Anthropic Claude APIs. Focus on prompt construction, system boundaries configuration, token count budgets, and tools/functions invocation.'
            },
            'gemini_int': {
                category: 'AI & Automation',
                label: 'Gemini Integration',
                desc: 'Integrate Google Gemini APIs. Focus on structured schemas, streaming text/media inputs, context caches, and safety threshold parameter settings.'
            },
            'rag_design': {
                category: 'AI & Automation',
                label: 'RAG System Design',
                desc: 'Design Retrieval-Augmented Generation flows. Focus on document text chunking strategies, vector embeddings (e.g. OpenAI/Cohere), vector store storage indexes (Pinecone/pgvector), and prompt context injection.'
            },
            'ai_agent': {
                category: 'AI & Automation',
                label: 'AI Agent Development',
                desc: 'Design stateful agent structures. Focus on planning loops, action toolsets, state tracking, conversation memory caches, and agent fallback recoveries.'
            },
            'automation_int': {
                category: 'AI & Automation',
                label: 'Workflow Automation',
                desc: 'Automate business or system processes. Cover Zapier webhooks, automated cron scheduler tasks, email dispatch pipelines, and external integrations.'
            },
            'prompt_eng': {
                category: 'AI & Automation',
                label: 'Prompt Engineering',
                desc: 'Design elite meta-prompts. Cover few-shot examples layout, chain-of-thought instructions, XML-tags structural inputs, guardrails, and deterministic parser scopes.'
            },
            'ai_arch': {
                category: 'AI & Automation',
                label: 'AI Product Architecture',
                desc: 'Structure comprehensive AI applications. Address rate limit queue pipelines, content caching layers, safety gatekeeper checks, and multi-model failover routes.'
            },

            // Testing
            'unit_test': {
                category: 'Testing',
                label: 'Unit Test Generation',
                desc: 'Generate complete unit testing suites (e.g. Jest, PyTest). Mock external dependencies, isolate target functions, test boundary conditions, and test error throwing.'
            },
            'integration_test': {
                category: 'Testing',
                label: 'Integration Test Gen',
                desc: 'Generate integration tests checking boundaries. Cover mock API endpoints, database transaction rollbacks during testing, multi-module coordination, and state persistence.'
            },
            'e2e_test': {
                category: 'Testing',
                label: 'E2E Test Generation',
                desc: 'Generate End-to-End browser tests (Playwright, Cypress). Address user login mockings, page navigations, visual assertions, and dynamic component loading handling.'
            },
            'test_strategy': {
                category: 'Testing',
                label: 'Test Strategy Design',
                desc: 'Formulate a comprehensive testing strategy. Outline unit, integration, and E2E targets, code coverage thresholds, testing tooling choices, and CI execution pipelines.'
            },
            'qa_review': {
                category: 'Testing',
                label: 'QA Review',
                desc: 'Review systems from a Quality Assurance standpoint. Outline manual test steps, check error states, examine boundary conditions, and list expected outcomes.'
            },
            'coverage': {
                category: 'Testing',
                label: 'Coverage Improvement',
                desc: 'Audit current test coverage gaps. Focus on writing tests to cover untested conditional branches, error handlers, and edge cases.'
            },
            'load_test': {
                category: 'Testing',
                label: 'Load Testing',
                desc: 'Draft scripts to stress-test system capacities (e.g. k6, Artillery). Define target user load milestones, request scenarios, and success latency rates.'
            },
            'stress_test': {
                category: 'Testing',
                label: 'Stress Testing',
                desc: 'Outline systems limits tests. Cover database connection limit constraints, memory leak bounds, hardware threshold triggers, and graceful degradation.'
            },

            // Review & Analysis
            'code_review': {
                category: 'Review & Analysis',
                label: 'Code Review',
                desc: 'Perform a comprehensive code review. Audit files for functional correctness, style consistency, security risks, performance traps, and testing coverage.'
            },
            'arch_review': {
                category: 'Review & Analysis',
                label: 'Architecture Review',
                desc: 'Perform a systems architecture review. Assess coupling levels, component bounds, scalability bottlenecks, deployment designs, and tech stack choices.'
            },
            'pr_review': {
                category: 'Review & Analysis',
                label: 'Pull Request Review',
                desc: 'Simulate a senior engineer reviewing a PR. Highlight risks, styling mismatches, architectural gaps, and suggest refactoring edits.'
            },
            'security_review': {
                category: 'Review & Analysis',
                label: 'Security Review',
                desc: 'Perform a comprehensive security review. Search for secret leaks, injection risks, broken auth mechanisms, or dependency vulnerabilities.'
            },
            'perf_review': {
                category: 'Review & Analysis',
                label: 'Performance Review',
                desc: 'Audit system performance parameters. Locate heavy synchronous blocks, database queries without index mappings, or unnecessary asset sizes.'
            },
            'dep_review': {
                category: 'Review & Analysis',
                label: 'Dependency Review',
                desc: 'Audit third-party packages. Search for outdated modules, licensing conflicts, duplicate packages, and bloating bundle sizes.'
            },
            'audit_review': {
                category: 'Review & Analysis',
                label: 'Best Practices Audit',
                desc: 'Review codebase structures against industry best standards. Check design patterns, typings, folder layouts, and documentations.'
            },

            // Documentation
            'tech_doc': {
                category: 'Documentation',
                label: 'Technical Documentation',
                desc: 'Generate clear developer documentation. Outline architecture blocks, component flows, environment variable configs, and local setup scripts.'
            },
            'api_doc': {
                category: 'Documentation',
                label: 'API Documentation',
                desc: 'Generate interactive API documentations. Cover endpoint specifications, path variables, request schemas, status codes, and mock payloads.'
            },
            'readme': {
                category: 'Documentation',
                label: 'README Generation',
                desc: 'Draft a polished project README.md. Cover startup commands, feature outlines, folder layouts, and deployment configurations.'
            },
            'user_guide': {
                category: 'Documentation',
                label: 'User Guide Creation',
                desc: 'Write user documentation. Detail UI actions step-by-step, outline configurations, explain error states, and answer FAQs.'
            },
            'dev_guide': {
                category: 'Documentation',
                label: 'Developer Guide',
                desc: 'Write new developer onboarding guides. Cover workspace configuration, branch patterns, commit rules, and linting guidelines.'
            },
            'sys_doc': {
                category: 'Documentation',
                label: 'System Documentation',
                desc: 'Write systems operation documentation. Detail database cluster maps, cron scripts, backups scheduling, and error mitigations.'
            },
            'deploy_doc': {
                category: 'Documentation',
                label: 'Deployment Doc',
                desc: 'Draft production deployment guides. Cover VPS provisioning, managed platform hookings, DNS mappings, SSL keys configurations, and env assets configs.'
            },

            // DevOps & Deployment
            'cicd': {
                category: 'DevOps & Deployment',
                label: 'CI/CD Setup',
                desc: 'Design continuous deployment pipelines (GitHub Actions, GitLab CI). Cover lint checks, testing runs, docker bundling, and target server notifications.'
            },
            'docker': {
                category: 'DevOps & Deployment',
                label: 'Docker Configuration',
                desc: 'Write highly optimized Dockerfiles and Docker-Compose manifests. Address multi-stage builds, root-less executions, cache layer patterns, and volume/network layouts.'
            },
            'k8s': {
                category: 'DevOps & Deployment',
                label: 'Kubernetes Setup',
                desc: 'Draft Kubernetes configurations. Address deployment manifests, cluster services, ingress configs, configmaps, and secure secrets.'
            },
            'vercel': {
                category: 'DevOps & Deployment',
                label: 'Vercel Deployment',
                desc: 'Configure Vercel deployments. Cover routing rules, serverless API setups, edge caching rules, and project hooks.'
            },
            'aws': {
                category: 'DevOps & Deployment',
                label: 'AWS Deployment',
                desc: 'Design AWS deployments. Address EC2 scaling pools, ECS Docker tasks, S3 CDN hookings, RDS DB setups, and IAM secure limits.'
            },
            'azure': {
                category: 'DevOps & Deployment',
                label: 'Azure Deployment',
                desc: 'Design Azure deployments. Address App Services, CosmosDB mappings, Azure Functions, and KeyVault configurations.'
            },
            'gcp': {
                category: 'DevOps & Deployment',
                label: 'GCP Deployment',
                desc: 'Design GCP deployments. Address Cloud Run serverless dockers, Cloud SQL managed clusters, Cloud Storage CDNs, and IAM setups.'
            },
            'monitoring': {
                category: 'DevOps & Deployment',
                label: 'Monitoring & Logging',
                desc: 'Design tracing configurations (e.g. Sentry, Datadog). Cover warning levels setups, logs format definitions, error reports hookings, and dashboards.'
            },

            // Product & Business
            'prd': {
                category: 'Product & Business',
                label: 'Requirements Doc (PRD)',
                desc: 'Draft a comprehensive Product Requirements Document. Outline core problems, target user personas, features matrices, user stories, success metrics, and release phases.'
            },
            'spec': {
                category: 'Product & Business',
                label: 'Feature Specification',
                desc: 'Formulate precise technical feature briefs. Detail user-flows, data models updates, API integrations, edge-cases, and testing requirements.'
            },
            'saas_planning': {
                category: 'Product & Business',
                label: 'SaaS Planning',
                desc: 'Draft SaaS business plans. Detail multi-tenancy bounds, pricing plans tiers, onboarding pipelines, and support routes.'
            },
            'mvp_planning': {
                category: 'Product & Business',
                label: 'Startup MVP Planning',
                desc: 'Draft startup MVP rollout plans. Focus on maximum speed-to-value, quick feedback cycles, core metrics, and minimal integrations.'
            },
            'roadmap': {
                category: 'Product & Business',
                label: 'Product Roadmap',
                desc: 'Design structural product release roadmaps. Outline milestones by quarters (Q1-Q4), target features, resource budgets, and dependency timelines.'
            },
            'user_story': {
                category: 'Product & Business',
                label: 'User Story Generation',
                desc: 'Generate complete agile User Stories. Format: "As a [User], I want [Action], so that [Value]". Define exact Acceptance Criteria (Gherkin syntax).'
            },
            'validation': {
                category: 'Product & Business',
                label: 'Market Validation',
                desc: 'Draft market validation strategies. Focus on target landing tests, feedback loops, surveys design, and validation milestones.'
            },

            // Platform Specific
            'nextjs': {
                category: 'Platform Specific',
                label: 'Next.js',
                desc: 'Optimize for Next.js (App Router/Pages Router). Cover Server Components, Client Components, SSR/SSG/ISR rendering modes, API route boundaries, middleware, image optimizations, and fast caching.'
            },
            'react': {
                category: 'Platform Specific',
                label: 'React',
                desc: 'Optimize for React.js. Cover functional components hooks (useState, useEffect, useMemo, useCallback), context structures, state-management frameworks (Zustand/Redux), performance renders, and custom hooks.'
            },
            'vue': {
                category: 'Platform Specific',
                label: 'Vue',
                desc: 'Optimize for Vue.js (Composition API/Options API). Cover ref/reactive states, computed hooks, Pinia state stores, Vue-Router structures, and custom directives.'
            },
            'angular': {
                category: 'Platform Specific',
                label: 'Angular',
                desc: 'Optimize for Angular. Cover TypeScript decorators, services, dependency injections, RxJS observable pipes, standalone components, NgModules, routing, and signal state management.'
            },
            'svelte': {
                category: 'Platform Specific',
                label: 'Svelte',
                desc: 'Optimize for Svelte/SvelteKit. Cover reactive declarations ($:), store states ($store), layout structures, page routing, and server-side loads.'
            },
            'nodejs': {
                category: 'Platform Specific',
                label: 'Node.js',
                desc: 'Optimize for Node.js backend runtime. Cover module structures (ESM/CJS), event loops, streams processing, child processes, buffer operations, and native module setups.'
            },
            'express': {
                category: 'Platform Specific',
                label: 'Express',
                desc: 'Optimize for Express.js. Cover middleware pipeline sequences, routing splits, CORS setups, error boundary middlewares, and controller layouts.'
            },
            'nestjs': {
                category: 'Platform Specific',
                label: 'NestJS',
                desc: 'Optimize for NestJS framework. Cover typescript decorators, modules architecture, controller scopes, injectables, pipes, interceptors, guards, and Swagger bindings.'
            },
            'laravel': {
                category: 'Platform Specific',
                label: 'Laravel',
                desc: 'Optimize for Laravel (PHP). Cover Eloquent models relations, Blade template engines or Inertia.js setups, controllers, migrations, middlewares, and service providers.'
            },
            'django': {
                category: 'Platform Specific',
                label: 'Django',
                desc: 'Optimize for Django (Python). Cover models ORM, views mapping, serializers (DRF), templates configuration, signals, admin overrides, and middleware pipelines.'
            },
            'fastapi': {
                category: 'Platform Specific',
                label: 'FastAPI',
                desc: 'Optimize for FastAPI (Python). Cover Pydantic schemas validation, dependency injection (Depends), async database connections, routing layouts, and OpenAPI autogenerated documentations.'
            },
            'flutter': {
                category: 'Platform Specific',
                label: 'Flutter',
                desc: 'Optimize for Flutter (Dart). Cover widget lifecycles (Stateless/Stateful), state management models (Bloc/Provider/Riverpod), responsive layouts (MediaQuery/LayoutBuilder), and native integrations.'
            },
            'reactnative': {
                category: 'Platform Specific',
                label: 'React Native',
                desc: 'Optimize for React Native. Cover styling engines (StyleSheet), bridge and native modules integrations, Metro bundlers, expo setups, scroll optimizations, and gesture animations.'
            },
            'electron': {
                category: 'Platform Specific',
                label: 'Electron',
                desc: 'Optimize for Electron. Cover IPC main/renderer processes communication, browser window parameters setups, context isolation settings, and local resources configurations.'
            }
        };

        const config = modeDetails[promptMode];
        if (!config) return '';

        return `\n\n[CRITICAL SPECIFICATION - WORK MODE: ${config.label} (Category: ${config.category})]
${config.desc}`;
    },

    getPromptOutputTypeInstruction(promptOutputType = 'everything') {
        if (!promptOutputType || promptOutputType === 'everything') return '';

        const typeInstructions = {
            'full_project': 'The desired output is a **Full Project** blueprint. Provide complete and comprehensive files, modular file organization, setup scripts, environment configurations, and integration guidelines. Do not skip setup steps.',
            'mvp_only': 'The desired output is an **MVP Only** architecture. Provide the bare-minimum functional code structure, single-file or lightweight setups, and core features only. Avoid all secondary details.',
            'plan': 'The desired output is a highly detailed **Implementation Plan**. Focus entirely on system designs, work breakdown phases, database schema visual maps, architectural decisions, and step-by-step verification lists. Do not generate code yet.',
            'structure': 'The desired output is a complete **Folder Structure** tree. Generate a clean Markdown directory tree showing all files and subdirectories, along with a brief description of the purpose of each file. Do not generate code files.',
            'schema': 'The desired output is a comprehensive **Database Schema**. Provide optimized SQL DDL scripts or ORM models (Prisma, Mongoose, etc.), primary and foreign keys mapping, unique indexes, constraints, and audit fields.',
            'api_design': 'The desired output is an **API Design** specification. Provide a clean REST/GraphQL endpoint map with path variables, request/response headers, expected query arguments, status codes, and exact JSON payloads. Do not write server-side handlers.',
            'ui_components': 'The desired output is **UI Components** code. Provide modular, reusable, and pure frontend component codes (React, Vue, etc.) with clean prop typings, local states handling, and styled-components or Tailwind wrappers.',
            'frontend_code': 'The desired output is complete **Frontend Code**. Provide clean HTML, CSS/Tailwind, and Javascript frontend codes, routers, local state integrations, UI view rendering, responsive layouts, and dummy API clients.',
            'backend_code': 'The desired output is complete **Backend Code**. Provide server routers, controllers, business-logic middlewares, API endpoint handlers, database ORM integrations, security headers, and rate-limiting routines. Do not include UI or styles.',
            'fullstack_code': 'The desired output is a complete **Full Stack Code** blueprint. Provide client components, server route API handlers, database schema files, connection pools, environment properties, and unified deployment guidelines.',
            'deploy_guide': 'The desired output is a step-by-step **Deployment Guide**. Outline production server configurations (AWS, Vercel, Docker, etc.), DNS records setup, SSL keys encryption, environment variable provisioning, build commands, and health checks.',
            'docs': 'The desired output is comprehensive **Documentation**. Provide a polished README.md, API specs documentation, developer onboarding guide, and system operations procedures in clean Markdown formats.',
            'tests': 'The desired output is a complete **Testing Suite**. Generate Jest, Cypress, or PyTest test files covering unit, integration, and E2E scenarios, mock assets, edge cases, error triggers, and test assertions.',
            'code_review': 'The desired output is a professional **Code Review Report**. Highlight code smells, security risks, performance traps, accessibility issues, refactoring proposals, and severity-ranked checklists.',
            'opt_report': 'The desired output is an **Optimization Report**. Audit application rendering speeds, bundle sizes, query response times, memory leaks, and supply exact code fixes to optimize performance.',
            'security_report': 'The desired output is a comprehensive **Security Report**. Audit authentication routines, CORS settings, database RLS policies, input sanitization rules, and supply steps to mitigate vulnerabilities.'
        };

        const instr = typeInstructions[promptOutputType];
        if (!instr) return '';

        return `\n\n[CRITICAL SPECIFICATION - OUTPUT TYPE TARGET: ${promptOutputType.toUpperCase().replace('_', ' ')}]
${instr}`;
    },

    modeToIntent(promptMode = 'auto') {
        if (!promptMode || promptMode === 'auto') return null;

        const modeMap = {
            // Development
            'scratch': 'website-build',
            'saas': 'website-build',
            'mvp': 'website-build',
            'fullstack': 'website-build',
            'frontend': 'website-build',
            'backend': 'website-build',
            'mobile': 'website-build',
            'desktop': 'website-build',
            'chrome': 'website-build',
            'automation': 'website-build',
            'api_dev': 'website-build',
            'microservices': 'website-build',
            'serverless': 'website-build',
            
            // Debugging
            'bug_fix': 'debugging',
            'root_cause': 'debugging',
            'error_log': 'debugging',
            'crash_invest': 'debugging',
            'incident_response': 'debugging',
            'regression': 'debugging',
            'memory_leak': 'debugging',
            'bottleneck': 'debugging',
            'build_failure': 'debugging',
            
            // Feature Development
            'add_feature': 'feature-change',
            'enhance_feature': 'feature-change',
            'migration': 'feature-change',
            'modernization': 'feature-change',
            'planning': 'strategy',
            
            // Refactoring
            'refactor': 'refactoring',
            'arch_refactor': 'refactoring',
            'debt_cleanup': 'refactoring',
            'comp_refactor': 'refactoring',
            'db_refactor': 'refactoring',
            'api_refactor': 'refactoring',
            
            // Design & UI/UX
            'ui_design': 'ui-review',
            'ux_design': 'ui-review',
            'dashboard_design': 'ui-review',
            'saas_design': 'ui-review',
            'landing_design': 'ui-review',
            'mobile_ui': 'ui-review',
            'design_system': 'ui-review',
            'accessibility': 'ui-review',
            'dark_mode': 'ui-review',
            'design_review': 'ui-review',
            
            // Architecture
            'system_arch': 'website-build',
            'saas_arch': 'website-build',
            'db_arch': 'website-build',
            'cloud_arch': 'website-build',
            'scale_arch': 'website-build',
            'multitenant': 'website-build',
            'event_driven': 'website-build',
            'enterprise_arch': 'website-build',
            
            // Database
            'db_design': 'analysis',
            'sql_schema': 'analysis',
            'postgres': 'analysis',
            'mongodb': 'analysis',
            'supabase': 'analysis',
            'prisma': 'analysis',
            'db_migration': 'analysis',
            'query_opt': 'analysis',
            
            // Security
            'security_audit': 'code-review',
            'vulnerability': 'code-review',
            'auth_setup': 'website-build',
            'auth_design': 'website-build',
            'owasp': 'code-review',
            'api_security': 'code-review',
            'secure_coding': 'code-review',
            'data_protection': 'code-review',
            
            // Performance
            'perf_opt': 'refactoring',
            'frontend_opt': 'refactoring',
            'backend_opt': 'refactoring',
            'db_opt': 'refactoring',
            'seo_opt': 'refactoring',
            'web_vitals': 'refactoring',
            'caching': 'refactoring',
            'bundle_size': 'refactoring',
            
            // AI & Automation
            'ai_feature': 'website-build',
            'openai_int': 'website-build',
            'claude_int': 'website-build',
            'gemini_int': 'website-build',
            'rag_design': 'website-build',
            'ai_agent': 'website-build',
            'automation_int': 'website-build',
            'prompt_eng': 'website-build',
            'ai_arch': 'website-build',
            
            // Testing
            'unit_test': 'testing',
            'integration_test': 'testing',
            'e2e_test': 'testing',
            'test_strategy': 'testing',
            'qa_review': 'testing',
            'coverage': 'testing',
            'load_test': 'testing',
            'stress_test': 'testing',
            
            // Review & Analysis
            'code_review': 'code-review',
            'arch_review': 'code-review',
            'pr_review': 'code-review',
            'security_review': 'code-review',
            'perf_review': 'code-review',
            'dep_review': 'code-review',
            'audit_review': 'code-review',
            
            // Documentation
            'tech_doc': 'documentation',
            'api_doc': 'documentation',
            'readme': 'documentation',
            'user_guide': 'documentation',
            'dev_guide': 'documentation',
            'sys_doc': 'documentation',
            'deploy_doc': 'documentation',
            
            // DevOps
            'cicd': 'devops',
            'docker': 'devops',
            'k8s': 'devops',
            'vercel': 'devops',
            'aws': 'devops',
            'azure': 'devops',
            'gcp': 'devops',
            'monitoring': 'devops',
            
            // Product & Business
            'prd': 'strategy',
            'spec': 'strategy',
            'saas_planning': 'strategy',
            'mvp_planning': 'strategy',
            'roadmap': 'strategy',
            'user_story': 'strategy',
            'validation': 'strategy',
            
            // Platform Specific
            'nextjs': 'website-build',
            'react': 'website-build',
            'vue': 'website-build',
            'angular': 'website-build',
            'svelte': 'website-build',
            'nodejs': 'website-build',
            'express': 'website-build',
            'nestjs': 'website-build',
            'laravel': 'website-build',
            'django': 'website-build',
            'fastapi': 'website-build',
            'flutter': 'website-build',
            'reactnative': 'website-build',
            'electron': 'website-build'
        };
        return modeMap[promptMode] || null;
    },

    detectLocalIntent(thought) {
        const lower = thought.toLowerCase();
        const match = (pattern) => pattern.test(lower);
        const buildSignals = match(/\b(build|create|generate|make|develop|design|implement|complete|website|app|platform|dashboard|frontend|backend|full[- ]stack|saas)\b/);
        const bugSignals = match(/\b(error|bug|fix|crash|stack\s*trace|exception|not working|broken|debug|issue|fails?|failure|root cause)\b/);
        const onlyQualitySignals = match(/\b(error handling|loading states?|notifications?|validation|fallbacks?)\b/);
        
        if (bugSignals && !(buildSignals && onlyQualitySignals)) {
            return 'debugging';
        }
        if (match(/\b(python|javascript|typescript|js|ts|html|css|react|vue|angular|node|api|database|sql|class|function|npm|github|server|backend|frontend|component|script|app|website)\b/)) {
            return 'coding';
        }
        if (match(/\b(learn|study|teach|explain|understand|exam|math|physics|science|concept|tutorial)\b/)) {
            return 'learning';
        }
        if (match(/\b(copy|blog|social|seo|marketing|sales|landing page|email|ad|brand|caption|story|script|creative)\b/)) {
            return 'creative';
        }
        if (match(/\b(analyze|csv|excel|spreadsheet|data|chart|report|insight|dashboard|metrics)\b/)) {
            return 'analysis';
        }
        if (match(/\b(plan|strategy|business|startup|roadmap|proposal|workflow|process)\b/)) {
            return 'strategy';
        }
        return 'general';
    },

    extractLocalSignals(thought) {
        const words = thought.split(/\s+/).filter(Boolean);
        const sentences = thought
            .split(/[.!?\n]+/)
            .map(s => s.trim())
            .filter(s => s.length > 6);
        const technologies = [
            'React', 'Next.js', 'Vue', 'Angular', 'Node.js', 'Express', 'Python', 'Django',
            'Flask', 'FastAPI', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'SQL', 'MongoDB',
            'PostgreSQL', 'MySQL', 'Firebase', 'Supabase', 'Tailwind', 'Bootstrap', 'API',
            'GitHub', 'Docker', 'AWS', 'S3'
        ].filter(t => new RegExp(`\\b${t.replace('.', '\\.')}\\b`, 'i').test(thought));
        const explicitConstraints = sentences.filter(s => /\b(no|not|don't|do not|never|avoid|must|should|without|only|keep|preserve|don't use|do n't use)\b/i.test(s));
        
        return {
            words,
            sentences,
            technologies,
            explicitConstraints
        };
    },

    buildLocalClarifyingQuestions(intent, signals) {
        const base = [];
        if (!signals.technologies.length && ['coding', 'debugging'].includes(intent)) {
            base.push('Which framework, language, runtime, and project structure should be assumed if they are not visible from the context?');
        }
        if (signals.words.length < 24) {
            base.push('What is the exact success outcome, and what should be considered out of scope?');
        }
        if (!signals.explicitConstraints.length) {
            base.push('Are there any constraints, existing behavior, style rules, dependencies, budget, platform, or deadline limits to preserve?');
        }
        
        const byIntent = {
            coding: 'Should the answer include full copy-paste code, a patch/diff, or a guided explanation before code?',
            'website-build': 'Should the result be a full implementation, a scoped MVP, or an implementation plan first?',
            'feature-change': 'Which existing files, routes, components, or behavior must be preserved while changing the feature?',
            debugging: 'Can the response ask for missing error logs, file paths, reproduction steps, or environment details before proposing a fix?',
            'ui-review': 'Which screen sizes, browsers, and specific pages should be checked for alignment and responsiveness?',
            'code-review': 'Should the review prioritize bugs, security, performance, maintainability, or test coverage?',
            learning: 'What is the learner level, and should the explanation be brief, exam-focused, or project-based?',
            creative: 'Who is the target audience, what tone should be used, and what action should the reader take?',
            analysis: 'What dataset columns, filters, metrics, and output format should be used?',
            strategy: 'What audience, constraints, timeline, and decision criteria matter most?'
        };
        if (byIntent[intent]) base.push(byIntent[intent]);
        
        return base.slice(0, 4);
    },

    localStrategicCompile(rawThought, activeShields, promptMode = 'auto', promptOutputType = 'everything') {
        const thought = rawThought.trim();
        const intent = this.modeToIntent(promptMode) || this.detectLocalIntent(thought);
        const signals = this.extractLocalSignals(thought);
        const questionList = this.buildLocalClarifyingQuestions(intent, signals);
        const technologies = signals.technologies.length ? signals.technologies.join(', ') : 'Infer from user context; ask before assuming if the choice changes the solution.';
        const originalLines = signals.sentences.length ? signals.sentences.slice(0, 6) : [thought];
        
        const personaByIntent = {
            'website-build': 'Principal Full-Stack SaaS Architect, Senior UI/UX Designer, and Product Engineer',
            'feature-change': 'Senior Product Engineer specializing in safe feature changes and regression-free delivery',
            coding: 'Senior Software Engineer, Product-Minded Architect, and Code Quality Reviewer',
            debugging: 'Principal Debugging Engineer and Root-Cause Analysis Specialist',
            'ui-review': 'Senior UI/UX Quality Auditor, Responsive Design Specialist, and Frontend Engineer',
            'code-review': 'Principal Code Reviewer focused on correctness, maintainability, security, and test quality',
            learning: 'Patient Expert Tutor using first-principles explanations and Socratic checks',
            creative: 'Senior Brand Strategist, Conversion Copywriter, and Editorial Director',
            analysis: 'Senior Data Analyst and Decision Intelligence Consultant',
            strategy: 'Senior Strategy Consultant and Systems Thinker',
            refactoring: 'Principal Refactoring Specialist and Legacy Code Modernizer',
            testing: 'Lead QA Automation Engineer and Software Test Architect',
            documentation: 'Senior Technical Writer and Developer Experience (DX) Specialist',
            devops: 'Principal DevOps & Cloud Infrastructure Engineer',
            general: 'Expert Problem Solver, Research Synthesizer, and Practical Execution Coach'
        };
        
        const deliverablesByIntent = {
            'website-build': [
                'Turn the rough idea into a clear product brief with target users and main value proposition.',
                'Define pages, routes, layout structure, navigation, and responsive behavior.',
                'Specify reusable components, state/data flow, backend/API needs, database schema, and authentication if relevant.',
                'Provide an implementation plan before code and split work into safe milestones.',
                'Include deployment, SEO, accessibility, performance, loading, empty, and error-state requirements.'
            ],
            'feature-change': [
                'Restate exactly what should be added, removed, or changed.',
                'Identify affected files, components, routes, APIs, data models, and user flows.',
                'Preserve unrelated behavior and explain any required migration or cleanup.',
                'Provide a safe implementation plan with exact edits or code.',
                'Include regression checks and acceptance criteria.'
            ],
            coding: [
                'Restate the target feature or fix in precise engineering language.',
                'Identify likely files, modules, state flows, APIs, data models, and UI states involved.',
                'Provide an implementation plan before code.',
                'Deliver complete code, patch-style instructions, or exact commands as appropriate.',
                'Include validation steps, edge cases, and rollback notes.'
            ],
            debugging: [
                'Reproduce the failure mentally from the supplied symptoms and logs.',
                'List the top likely root causes and rank them by probability.',
                'Explain the exact fix strategy and why it prevents recurrence.',
                'Provide corrected code or precise edits with minimal unrelated change.',
                'Add tests, logging, or verification steps that prove the issue is resolved.'
            ],
            learning: [
                'Assess the learner level from the prompt and avoid unexplained jargon.',
                'Explain the concept from first principles.',
                'Use one concrete example and one analogy.',
                'Ask a short check-for-understanding question.',
                'Provide practice steps or a mini exercise.'
            ],
            creative: [
                'Clarify audience, promise, pain point, tone, and conversion goal.',
                'Produce multiple strong options rather than one generic draft.',
                'Use concrete language, emotional stakes, and specific benefits.',
                'Remove filler, cliches, and vague claims.',
                'End with a polished final version ready to use.'
            ],
            analysis: [
                'Define the core question and decision the analysis should support.',
                'Identify required inputs, assumptions, and data quality checks.',
                'Choose suitable metrics, comparisons, and visualizations.',
                'Present insights with caveats and confidence levels.',
                'Recommend next actions based on the evidence.'
            ],
            strategy: [
                'Clarify objective, audience, constraints, resources, and timeline.',
                'Break the problem into options with tradeoffs.',
                'Recommend a practical path with milestones.',
                'Identify risks, dependencies, and decision points.',
                'Provide a concise execution checklist.'
            ],
            refactoring: [
                'Deconstruct current code structure to identify technical debt and complexity.',
                'Ensure no functional changes or side-effects are introduced.',
                'Apply clean coding principles (DRY, SOLID, clear naming, separation of concerns).',
                'Optimize imports, dependencies, and type safety if typescript/modern ESM is used.',
                'Provide a step-by-step refactoring plan followed by the clean refactored code.'
            ],
            testing: [
                'Analyze target features or code blocks for test boundaries.',
                'Identify critical paths, edge cases, negative scenarios, and error throwing.',
                'Generate isolated tests using standard suites (Jest, Mocha, PyTest, Playwright).',
                'Mock external databases, networks, and API dependencies.',
                'Provide instructions on how to run tests and analyze coverage reports.'
            ],
            documentation: [
                'Extract core functionalities, API schemas, configurations, and prerequisites.',
                'Draft beautiful, structured, and search-optimized guides.',
                'Add code usage examples, flow diagrams, or tables.',
                'Define clear prerequisites, installation instructions, and deployment guides.'
            ],
            devops: [
                'Design continuous integration pipelines, docker environments, or hosting specs.',
                'Ensure security principles, secret storage, and non-root executions are locked in.',
                'Optimize build performance, cache layers, and network routing boundaries.',
                'Establish health monitoring, logging setups, and alerts rules.'
            ],
            general: [
                'Translate the request into a clear objective.',
                'State assumptions only when necessary and label them clearly.',
                'Break the work into ordered steps.',
                'Provide the final answer in a useful format.',
                'Include checks for quality, accuracy, and completeness.'
            ],
            'ui-review': [
                'Audit visual hierarchy, spacing, alignment, typography, contrast, and component consistency.',
                'Check responsiveness across mobile, tablet, laptop, and desktop widths.',
                'Identify layout overflow, text clipping, overlapping elements, broken states, and accessibility issues.',
                'Recommend exact CSS/component fixes with minimal visual churn.',
                'Provide before/after verification steps for each affected viewport.'
            ],
            'code-review': [
                'Review for correctness bugs, edge cases, regressions, security risks, and missing tests.',
                'Prioritize findings by severity with file/line references if code is provided.',
                'Suggest minimal fixes and explain the behavioral risk.',
                'Call out unnecessary complexity, duplication, or fragile assumptions.',
                'Provide a concise verification checklist.'
            ]
        };
        
        const constraints = [
            'Do not invent facts, APIs, file names, laws, prices, citations, or project details. If something is missing, ask a clarifying question or state a labeled assumption.',
            'Prioritize practical, usable output over generic explanation.',
            'Keep the response tightly aligned to the user request and avoid unrelated expansion.',
            'Use clear Markdown headings, bullets, tables, or code blocks only where they improve usability.',
            'Separate assumptions, plan, execution, and verification so the result is easy to act on.'
        ];
        
        if (['coding', 'debugging', 'website-build', 'feature-change', 'ui-review', 'code-review', 'refactoring', 'testing', 'devops'].includes(intent)) {
            constraints.push('Preserve existing behavior unless the user explicitly asks to change it.');
            constraints.push('Do not introduce new dependencies, frameworks, architecture, or styling systems without a clear reason and explicit user approval.');
            constraints.push('Mention security, accessibility, performance, and error handling when they are relevant to the requested change.');
            if (activeShields.antiTruncation) constraints.push('Never truncate code or use placeholders such as "...rest of code"; provide complete relevant blocks or exact diffs.');
            if (activeShields.preserveComments) constraints.push('Preserve existing comments and documentation unless a comment is directly wrong after the change.');
            if (activeShields.planFirst) constraints.push('Start with a concise implementation plan before writing code.');
            if (activeShields.tailwindLock) constraints.push('Keep the existing styling approach; do not switch to Tailwind, Bootstrap, or another framework unless requested.');
        }
        
        const acceptanceCriteria = {
            'website-build': [
                'The website/app has a clear page map, component architecture, and data flow.',
                'The design covers desktop and mobile layouts.',
                'Authentication, database, API, AI, and deployment requirements are explicit when relevant.',
                'The answer includes implementation phases and verification steps.'
            ],
            'feature-change': [
                'The requested feature change is implemented without unrelated behavior changes.',
                'Affected files and user flows are identified.',
                'Regression checks are included.',
                'Edge cases, loading states, errors, and accessibility are considered where relevant.'
            ],
            coding: [
                'The requested behavior works in the stated environment.',
                'No unrelated behavior, styling, or public API is changed.',
                'Important edge cases and error states are handled.',
                'The answer includes verification steps or tests.'
            ],
            debugging: [
                'The root cause is explained, not only patched.',
                'The fix is minimal and targeted.',
                'The issue can be verified with clear reproduction or test steps.',
                'Regression risk is called out.'
            ],
            learning: [
                'The learner can explain the idea back in simple words.',
                'The explanation includes one example and one practice step.',
                'The answer adapts if the learner asks follow-up questions.'
            ],
            creative: [
                'The final copy has a clear audience, promise, tone, and call to action.',
                'Claims are specific and believable.',
                'The output is ready to publish or easy to revise.'
            ],
            analysis: [
                'The analysis answers the decision question directly.',
                'Assumptions and data limitations are visible.',
                'Insights lead to concrete next actions.'
            ],
            strategy: [
                'The recommendation is actionable within the stated constraints.',
                'Tradeoffs and risks are explicit.',
                'The plan has clear milestones or next steps.'
            ],
            refactoring: [
                'Code functionality and behavior are preserved 100%.',
                'Cyclomatic complexity is reduced and readability is significantly improved.',
                'No new dependencies are introduced unless requested.'
            ],
            testing: [
                'Tests are complete, runnable, and cover 100% of crucial logical paths.',
                'Mock scopes are clearly defined and do not leak.',
                'Assert conditions are explicit and self-describing.'
            ],
            documentation: [
                'Documentation is completely free of developer jargon or ambiguous steps.',
                'Codes/configs in docs are technically accurate and match current structures.',
                'Headings and sections are intuitive and easy to scan.'
            ],
            devops: [
                'Dockerfiles use multi-stage builds, pinning versions securely.',
                'Deployment YAMLs/configs are syntax-valid and ready to deploy.',
                'Secret tokens are never hardcoded.'
            ],
            general: [
                'The final answer directly solves the user request.',
                'Missing information is handled transparently.',
                'The output is organized and easy to use.'
            ],
            'ui-review': [
                'Alignment, spacing, responsiveness, and accessibility issues are explicitly checked.',
                'Fixes are concrete and tied to selectors/components or files when available.',
                'Mobile and desktop verification steps are included.',
                'The final UI preserves the intended brand/style.'
            ],
            'code-review': [
                'Findings focus on real bugs, risks, maintainability, and tests.',
                'Severity and impact are clear.',
                'Fixes are minimal and verifiable.',
                'No unrelated refactor is suggested as required.'
            ]
        };
        
        const formatByIntent = {
            'website-build': 'Use: Product Brief, Assumptions, Site Map, Feature Scope, Architecture, Database/API Plan, UI/UX Requirements, Implementation Plan, Verification, Deployment.',
            'feature-change': 'Use: Requested Change, Current Behavior to Preserve, Affected Areas, Implementation Plan, Code/Edits, Regression Tests, Acceptance Criteria.',
            coding: 'Use: Summary, Assumptions, Plan, Implementation, Tests/Verification, Edge Cases.',
            debugging: 'Use: Symptoms, Root-Cause Hypotheses, Most Likely Cause, Fix, Verification, Prevention.',
            'ui-review': 'Use: UI Audit Summary, Findings by Viewport, Exact Fixes, Accessibility Checks, Responsive Verification.',
            'code-review': 'Use: Findings First, Severity, Evidence, Suggested Fix, Test Gaps, Summary.',
            learning: 'Use: Simple Explanation, Example, Common Mistakes, Practice, Check Question.',
            creative: 'Use: Audience Insight, Message Strategy, Draft Options, Final Polished Version.',
            analysis: 'Use: Objective, Data Needed, Method, Findings Format, Caveats, Recommendations.',
            strategy: 'Use: Objective, Constraints, Options, Recommendation, Roadmap, Risks.',
            refactoring: 'Use: Refactoring Strategy, Current Smell Analysis, Refactored Code, Safety Tests/Verifications.',
            testing: 'Use: Test Coverage Plan, Mock Configurations, Test Suite Code, Verification Commands.',
            documentation: 'Use: Document Overview, Getting Started, Deep-Dive Specifications, FAQ & Troubleshooting.',
            devops: 'Use: Infrastructure Architecture, Environment Configurations, Pipeline/Container Scripts, Operational Checks.',
            general: 'Use clear Markdown with short sections and a final actionable answer.'
        };
        
        const list = (items) => items.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
        const bullet = (items) => items.map(item => `- ${item}`).join('\n');
        
        const outputTypeInstruction = this.getPromptOutputTypeInstruction(promptOutputType);
        
        return `# Role
${personaByIntent[intent]}

# Context & Core Goal
Transform the user's rough request into a precise, high-quality AI task that can produce a reliable result without paid prompt-enhancement APIs.

Original user request:
> ${thought}

Selected work mode: **${promptMode === 'auto' ? 'Auto Detect' : promptMode}**
Selected output type: **${promptOutputType === 'everything' ? 'Everything Mode' : promptOutputType}**
Detected request type: **${intent}**
Detected technologies or domain signals: **${technologies}**

# Intent Extraction
${list(originalLines.map(line => `Address this user intent clearly: "${line}"`))}

# Specific Checklist Deliverables
${list(deliverablesByIntent[intent])}

# Clarifying Questions Policy
If any missing detail would materially change the answer, ask only the most important questions first:
${questionList.length ? bullet(questionList) : '- Proceed with clearly labeled assumptions if the request is already specific enough.'}

# Strict Rules & Constraints
${bullet(constraints)}

# Acceptance Criteria
${bullet(acceptanceCriteria[intent])}

# Desired Output Format
${formatByIntent[intent]}
${outputTypeInstruction ? `\n[CRITICAL FORMATTING TARGET] ${outputTypeInstruction}` : ''}

Before finalizing, self-check the answer for specificity, missing assumptions, hallucination risk, and whether a normal user can act on it immediately.`;
    },

    // --- Zero-Key Smart Local Compiler ---
    localSmartCompile(rawThought, activeShields, targetLang = 'en', promptMode = 'auto', promptOutputType = 'everything') {
        const thought = rawThought.trim();
        if (targetLang === 'en') {
            return this.localStrategicCompile(thought, activeShields, promptMode, promptOutputType);
        }
        
        // Basic classification
        const isCoding = /\b(python|javascript|js|html|css|react|node|api|database|sql|class|function|npm|vsc|code|script|github|server)\b/i.test(thought);
        const isCreative = /\b(copy|blog|social|seo|marketing|story|email|write|book|creative)\b/i.test(thought);
        
        // Multi-language Translation Dictionaries for Headers and Local Prompt Assembly
        const headers = {
            'en': {
                role: '# Role',
                context: '# Context & Goal',
                deliverables: '# Specific Checklist Deliverables',
                rules: '# Strict Rules & Constraints',
                format: '# Desired Output Format',
                personaLabel: 'Expert General Intelligence & Problem Solver',
                personaReact: 'Senior React Architect & UI/UX Specialist',
                personaPython: 'Senior Python Engineer & Automation Specialist',
                personaDb: 'Principal Database Architect',
                personaFullStack: 'Senior Full-Stack Software Engineer & Solutions Architect',
                personaCopywriter: 'Elite Direct-Response Copywriter & CRO Architect',
                personaAcademic: 'Distinguished Academic Professor & Feynman Method Mentor',
                goalText: 'You have been tasked to deliver a perfect, premium solution for the following request:',
                deliverableOne: 'Resolve request:',
                deliverableDefault: 'Complete the core task requested:',
                deliverableInstructions: 'Provide solid test parameters or usage instructions.',
                ruleDeprecated: 'Do NOT use deprecated libraries or outdated syntaxes.',
                rulePayloads: 'Implement comprehensive validation handlers for parameters and API network payloads.',
                ruleTruncation: '[STRICT CONSTRAINT] Do NOT truncate code. You must write every line of code without omitting segments using //... rest of code.',
                ruleComments: '[STRICT CONSTRAINT] Keep existing comments and document newly added systems clearly.',
                rulePlan: '[STRICT CONSTRAINT] Lay out a technical structure plan before providing the refactored code.',
                ruleTailwind: '[STRICT CONSTRAINT] Keep the existing stylesheet structures. Do not force styling framework changes.',
                ruleFiller: 'Avoid superficial filler text; maintain maximum factual density and clear readability.',
                ruleFirstPrinciples: 'Focus on first-principles reasoning and structured explanations.',
                outputMarkdown: 'Output clean, structured Markdown.',
                outputAccuracy: 'Double-check for accuracy and ensure zero placeholders or generic template markers.',
                outputWrap: 'If code is written, wrap blocks in appropriate language markers (e.g., ```python).',
                formatDefault: 'Provide a complete, comprehensive, and ready-to-use solution, concluding with a brief explanation of how it satisfies the core constraints.'
            },
            'es': {
                role: '# Rol',
                context: '# Contexto y Objetivo',
                deliverables: '# Entregables Específicos',
                rules: '# Reglas y Restricciones Estrictas',
                format: '# Formato de Salida Deseado',
                personaLabel: 'Experto en Inteligencia General y Resolución de Problemas',
                personaReact: 'Arquitecto Senior de React y Especialista en UI/UX',
                personaPython: 'Ingeniero Senior de Python y Especialista en Automatización',
                personaDb: 'Arquitecto Principal de Bases de Datos',
                personaFullStack: 'Ingeniero de Software Senior Full-Stack y Arquitecto de Soluciones',
                personaCopywriter: 'Redactor Publicitario de Élite y Arquitecto de CRO',
                personaAcademic: 'Profesor Académico Distinguido y Mentor del Método Feynman',
                goalText: 'Se le ha encomendado ofrecer una solución perfecta y premium para la siguiente solicitud:',
                deliverableOne: 'Resolver solicitud:',
                deliverableDefault: 'Completar la tarea principal solicitada:',
                deliverableInstructions: 'Proporcionar parámetros de prueba sólidos o instrucciones de uso.',
                ruleDeprecated: 'NO utilice bibliotecas obsoletas o sintaxis desactualizadas.',
                rulePayloads: 'Implementar controladores de validación integrales para parámetros y cargas de red de API.',
                ruleTruncation: '[RESTRICCIÓN ESTRICTA] NO trunque el código. Debe escribir cada línea de código sin omitir segmentos usando //... resto del código.',
                ruleComments: '[RESTRICCIÓN ESTRICTA] Conserve los comentarios existentes y documente los sistemas recién agregados con claridad.',
                rulePlan: '[RESTRICCIÓN ESTRICTA] Presente un plan de estructura técnica antes de proporcionar el código refactorizado.',
                ruleTailwind: '[RESTRICCIÓN ESTRICTA] Mantenga las estructuras de hojas de estilo existentes. No fuerce cambios en el framework de estilos.',
                ruleFiller: 'Evite el texto de relleno superficial; mantenga la máxima densidad de hechos y una legibilidad clara.',
                ruleFirstPrinciples: 'Centrarse en el razonamiento de primeros principios y explicaciones estructuradas.',
                outputMarkdown: 'Producir Markdown limpio y estructurado.',
                outputAccuracy: 'Verifique la precisión y asegúrese de que no haya marcadores de posición ni marcadores de plantilla genéricos.',
                outputWrap: 'Si escribe código, envuelva los bloques en marcadores de idioma adecuados (por ejemplo, ```python).',
                formatDefault: 'Proporcione una solución completa, exhaustiva y lista para usar, que concluya con una breve explicación de cómo cumple con las restricciones principales.'
            },
            'fr': {
                role: '# Rôle',
                context: '# Contexte et Objectif',
                deliverables: '# Livrables Spécifiques',
                rules: '# Règles et Contraintes Strictes',
                format: '# Format de Sortie Souhaité',
                personaLabel: 'Expert en Intelligence Générale et Résolution de Problèmes',
                personaReact: 'Architecte React Senior & Spécialiste UI/UX',
                personaPython: 'Ingénieur Python Senior & Spécialiste de l\'Automatisation',
                personaDb: 'Architecte de Base de Données Principal',
                personaFullStack: 'Ingénieur Logiciel Senior Full-Stack & Architecte de Solutions',
                personaCopywriter: 'Concepteur-Rédacteur d\'Élite & Architecte CRO',
                personaAcademic: 'Professeur Académique Distingué & Mentor de la Méthode Feynman',
                goalText: 'Vous avez été chargé de fournir une solution parfaite et premium pour la demande suivante :',
                deliverableOne: 'Résoudre la demande :',
                deliverableDefault: 'Accomplir la tâche principale demandée :',
                deliverableInstructions: 'Fournir des paramètres de test solides ou des instructions d\'utilisation.',
                ruleDeprecated: 'N\'utilisez PAS de bibliothèques obsolètes ou de syntaxes dépassées.',
                rulePayloads: 'Implémenter des gestionnaires de validation complets pour les paramètres et les charges utiles du réseau API.',
                ruleTruncation: '[CONTRAINTE STRICTE] Ne tronquez PAS le code. Vous devez écrire chaque ligne de code sans omettre de segments avec //... le reste du code.',
                ruleComments: '[CONTRAINTE STRICTE] Conserver les commentaires existants et documenter clairement les nouveaux systèmes ajoutés.',
                rulePlan: '[CONTRAINTE STRICTE] Présenter un plan de structure technique avant de fournir le code réfactoré.',
                ruleTailwind: '[CONTRAINTE STRICTE] Conserver les structures de feuilles de style existantes. Ne pas forcer de changement de framework de style.',
                ruleFiller: 'Éviter les textes de remplissage superficiels ; maintenir une densité factuelle maximale et une lisibilité claire.',
                ruleFirstPrinciples: 'Se concentrer sur le raisonnement à partir de principes fondamentaux et sur des explications structurées.',
                outputMarkdown: 'Générer du Markdown propre et structuré.',
                outputAccuracy: 'Double-vérifier l\'exactitude et s\'assurer de l\'absence de placeholders ou de marqueurs de modèles génériques.',
                outputWrap: 'Si du code est écrit, envelopper les blocs dans les marqueurs de langage appropriés (par exemple, ```python).',
                formatDefault: 'Fournir une solution complète, exhaustive et prête à l\'emploi, se terminant par une brève explication de la manière dont elle satisfait aux contraintes principales.'
            },
            'ja': {
                role: '# 役割',
                context: '# 文脈と主要目標',
                deliverables: '# 具体的な成果物チェックリスト',
                rules: '# 厳格なルールと制約事項',
                format: '# 希望する出力形式',
                personaLabel: '汎用人工知能および問題解決のエキスパート',
                personaReact: 'シニアReactアーキテクト＆UI/UXスペシャリスト',
                personaPython: 'シニアPythonエンジニア＆自動化スペシャリスト',
                personaDb: 'プリンシパル データベース アーキテクト',
                personaFullStack: 'シニアフルスタック ソフトウェアエンジニア＆ソリューション アーキテクト',
                personaCopywriter: 'エリート ダイレクトレスポンス コピーライター＆CROアーキテクト',
                personaAcademic: '著名な大学教授＆ファインマン・テクニック メンター',
                goalText: '以下のリクエストに対して、完璧でプレミアムなソリューションを提供する任務が課されました：',
                deliverableOne: 'リクエストを解決する：',
                deliverableDefault: '要求されたコアタスクを完了する：',
                deliverableInstructions: '確実なテストパラメータまたは使用手順を提供すること。',
                ruleDeprecated: '非推奨のライブラリや古い構文は使用しないでください。',
                rulePayloads: 'パラメータおよびAPIネットワークのペイロードに対して、包括的な検証ハンドラを実装すること。',
                ruleTruncation: '【厳格な制約】コードを途中で省略しないでください。//... 残りのコード のように省略せず、すべての行を記述する必要があります。',
                ruleComments: '【厳格な制約】既存のコメントを保持し、新しく追加されたシステムを明確にドキュメント化すること。',
                rulePlan: '【厳格な制約】リファクタリングされたコードを提供する前に、技術的な構造計画を提示すること。',
                ruleTailwind: '【厳格な制約】既存のスタイルシート構造を維持すること。要求されていないスタイリングフレームワークへの変更を強制しないこと。',
                ruleFiller: '表面的なフィラーテキスト（無駄な記述）を避け、情報の密度を最大化し、明確な可読性を維持すること。',
                ruleFirstPrinciples: '第一原理思考に基づく推論と構造化された説明に集中すること。',
                outputMarkdown: 'クリーンで構造化されたMarkdownを出力すること。',
                outputAccuracy: '正確性をダブルチェックし、プレースホルダーや汎用テンプレートマーカーが一切ないことを確認すること。',
                outputWrap: 'コードを記述する場合は、適切な言語マーカー（例：```python）でブロックを囲むこと。',
                formatDefault: '完全で包括的、かつすぐに使用できるソリューションを提供し、それが主要な制約をどのように満たしているかの短い説明で締めくくること。'
            },
            'de': {
                role: '# Rolle',
                context: '# Kontext & Hauptziel',
                deliverables: '# Spezifische Ergebnisse',
                rules: '# Strikte Regeln & Einschränkungen',
                format: '# Gewünschtes Ausgabeformat',
                personaLabel: 'Experte für Allgemeine Intelligenz & Problemlösung',
                personaReact: 'Senior React Architect & UI/UX-Spezialist',
                personaPython: 'Senior Python Engineer & Automatisierungsspezialist',
                personaDb: 'Principal Database Architect',
                personaFullStack: 'Senior Full-Stack Software Engineer & Solutions Architect',
                personaCopywriter: 'Elite Direct-Response Copywriter & CRO-Architect',
                personaAcademic: 'Herausragender Universitätsprofessor & Feynman-Methode-Mentor',
                goalText: 'Sie wurden beauftragt, eine perfekte, erstklassige Lösung für die folgende Anfrage zu liefern:',
                deliverableOne: 'Anfrage lösen:',
                deliverableDefault: 'Erledigen Sie die geforderte Kernaufgabe:',
                deliverableInstructions: 'Stellen Sie solide Testparameter oder Gebrauchsanweisungen bereit.',
                ruleDeprecated: 'Verwenden Sie KEINE veralteten Bibliotheken oder überholten Syntaxen.',
                rulePayloads: 'Implementieren Sie umfassende Validierungshandler für Parameter und API-Netzwerk-Payloads.',
                ruleTruncation: '[STRIKTE EINSCHRÄNKUNG] Code NICHT kürzen. Sie müssen jede Zeile Code schreiben, ohne Abschnitte mit //... restlicher Code auszulassen.',
                ruleComments: '[STRIKTE EINSCHRÄNKUNG] Behalten Sie vorhandene Kommentare bei und dokumentieren Sie neu hinzugefügte Systeme klar.',
                rulePlan: '[STRIKTE EINSCHRÄNKUNG] Legen Sie einen technischen Strukturplan vor, bevor Sie den refaktorierten Code bereitstellen.',
                ruleTailwind: '[STRIKTE EINSCHRÄNKUNG] Behalten Sie die bestehenden Stylesheet-Strukturen bei. Erzwingen Sie keine Änderungen am Styling-Framework.',
                ruleFiller: 'Vermeiden Sie oberflächlichen Fülltext; behalten Sie die maximale Faktendichte und klare Lesbarkeit bei.',
                ruleFirstPrinciples: 'Konzentrieren Sie sich auf Argumentation nach grundlegenden Prinzipien und strukturierte Erklärungen.',
                outputMarkdown: 'Geben Sie sauberes, strukturiertes Markdown aus.',
                outputAccuracy: 'Überprüfen Sie die Richtigkeit und stellen Sie sicher, dass keine Platzhalter oder generischen Vorlagenmarkierungen vorhanden sind.',
                outputWrap: 'Wenn Code geschrieben wird, schließen Sie Blöcke in entsprechende Sprachmarkierungen ein (z. B. ```python).',
                formatDefault: 'Stellen Sie eine vollständige, umfassende und gebrauchsfertige Lösung bereit und schließen Sie mit einer kurzen Erklärung ab, wie sie die wichtigsten Einschränkungen erfüllt.'
            },
            'hi': {
                role: '# भूमिका',
                context: '# संदर्भ और मुख्य लक्ष्य',
                deliverables: '# विशिष्ट डिलिवरेबल्स',
                rules: '# सख्त नियम और सीमाएं',
                format: '# वांछित आउटपुट प्रारूप',
                personaLabel: 'विशेषज्ञ सामान्य बुद्धिमत्ता और समस्या समाधानकर्ता',
                personaReact: 'वरिष्ठ रिएक्ट आर्किटेक्ट और UI/UX विशेषज्ञ',
                personaPython: 'वरिष्ठ पायथन इंजीनियर और स्वचालन विशेषज्ञ',
                personaDb: 'प्रधान डेटाबेस आर्किटेक्ट',
                personaFullStack: 'वरिष्ठ फुल-स्टैक सॉफ्टवेयर इंजीनियर और समाधान आर्किटेक्ट',
                personaCopywriter: 'कुलीन प्रत्यक्ष-प्रतिक्रिया कॉपीराइटर और CRO आर्किटेक्ट',
                personaAcademic: 'प्रतिष्ठित शैक्षणिक प्रोफेसर और फेनमैन पद्धति संरक्षक',
                goalText: 'आपको निम्नलिखित अनुरोध के लिए एक आदर्श, प्रीमियम समाधान प्रदान करने का कार्य सौंपा गया है:',
                deliverableOne: 'अनुरोध का समाधान करें:',
                deliverableDefault: 'अनुरोधित मुख्य कार्य को पूरा करें:',
                deliverableInstructions: 'ठोस परीक्षण पैरामीटर या उपयोग निर्देश प्रदान करें।',
                ruleDeprecated: 'अप्रचलित पुस्तकालयों या पुराने सिंटैक्स का उपयोग न करें।',
                rulePayloads: 'पैरामीटर और API नेटवर्क पेलोड के लिए व्यापक सत्यापन हैंडलर लागू करें।',
                ruleTruncation: '[सख्त प्रतिबंध] कोड को छोटा न करें। आपको //... शेष कोड का उपयोग करके अंशों को छोड़े बिना कोड की प्रत्येक पंक्ति लिखनी होगी।',
                ruleComments: '[सख्त प्रतिबंध] मौजूदा टिप्पणियों को सुरक्षित रखें और नए जोड़े गए सिस्टम को स्पष्ट रूप से प्रलेखित करें।',
                rulePlan: '[सख्त प्रतिबंध] पुनर्गठित कोड प्रदान करने से पहले एक तकनीकी संरचना योजना तैयार करें।',
                ruleTailwind: '[सख्त प्रतिबंध] मौजूदा स्टाइलशीट संरचनाओं को बनाए रखें। अवांछित स्टाइलिंग फ्रेमवर्क परिवर्तनों को लागू न करें।',
                ruleFiller: 'सतही भराव पाठ से बचें; अधिकतम तथ्यात्मक घनत्व और स्पष्ट पठनीयता बनाए रखें।',
                ruleFirstPrinciples: 'प्रथम-सिद्धांतों के तर्क और संरचित स्पष्टीकरण पर ध्यान केंद्रित करें।',
                outputMarkdown: 'साफ, संरचित मार्कडाउन आउटपुट करें।',
                outputAccuracy: 'सटीकता के लिए दोबारा जांचें और सुनिश्चित करें कि शून्य प्लेसहोल्डर या सामान्य टेम्पलेट मार्कर हैं।',
                outputWrap: 'यदि कोड लिखा गया है, तो ब्लॉक को उपयुक्त भाषा मार्करों (जैसे, ```python) में लपेटें।',
                formatDefault: 'एक संपूर्ण, व्यापक और उपयोग के लिए तैयार समाधान प्रदान करें, और एक संक्षिप्त विवरण के साथ समाप्त करें कि यह मुख्य सीमाओं को कैसे पूरा करता है।'
            }
        };
        
        const dict = headers[targetLang] || headers['en'];
        
        // Define Persona
        let persona = dict.personaLabel;
        if (isCoding) {
            // Check specific languages
            if (/\breact\b/i.test(thought)) persona = dict.personaReact;
            else if (/\bpython\b/i.test(thought)) persona = dict.personaPython;
            else if (/\b(sql|database|db)\b/i.test(thought)) persona = dict.personaDb;
            else persona = dict.personaFullStack;
        } else if (isCreative) {
            persona = dict.personaCopywriter;
        } else if (/\b(learn|study|explain|understand|exam|math|physics|science)\b/i.test(thought)) {
            persona = dict.personaAcademic;
        }
        
        // Extract Sentences to formulate tasks
        const sentences = thought.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5);
        let deliverables = '';
        if (sentences.length > 1) {
            deliverables = sentences.slice(0, 4).map((s, idx) => `${idx + 1}. ${dict.deliverableOne} "${s}."`).join('\n');
        } else {
            deliverables = `1. ${dict.deliverableDefault} "${thought}."\n2. ${dict.deliverableInstructions}`;
        }
        
        // Compile Guardrails
        let constraints = '';
        if (isCoding) {
            constraints += `- ${dict.ruleDeprecated}\n`;
            constraints += `- ${dict.rulePayloads}\n`;
            
            if (activeShields.antiTruncation) constraints += `- ${dict.ruleTruncation}\n`;
            if (activeShields.preserveComments) constraints += `- ${dict.ruleComments}\n`;
            if (activeShields.planFirst) constraints += `- ${dict.rulePlan}\n`;
            if (activeShields.tailwindLock) constraints += `- ${dict.ruleTailwind}\n`;
        } else {
            constraints += `- ${dict.ruleFiller}\n`;
            constraints += `- ${dict.ruleFirstPrinciples}\n`;
        }
        
        // Build Output Prompt Block
        let result = `${dict.role}
${persona}

${dict.context}
${dict.goalText}
> ${thought}

${dict.deliverables}
${deliverables}

${dict.rules}
${constraints}- ${dict.outputMarkdown}
- ${dict.outputAccuracy}
- ${dict.outputWrap}

${dict.format}
${dict.formatDefault}`;

        const modeInstruction = this.getPromptModeInstruction(promptMode);
        const outputTypeInstruction = this.getPromptOutputTypeInstruction(promptOutputType);
        if (modeInstruction) {
            result += `\n\n${modeInstruction}`;
        }
        if (outputTypeInstruction) {
            result += `\n\n${outputTypeInstruction}`;
        }

        return result;
    }
};
