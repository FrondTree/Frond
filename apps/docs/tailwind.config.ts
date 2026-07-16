import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        docs: {
          bg: "hsl(var(--docs-bg))",
          fg: "hsl(var(--docs-fg))",
          muted: "hsl(var(--docs-muted))",
          border: "hsl(var(--docs-border))",
          card: "hsl(var(--docs-card))",
          sidebar: "hsl(var(--docs-sidebar))",
          accent: "hsl(var(--docs-accent))",
          "accent-soft": "hsl(var(--docs-accent-soft))",
          "accent-fg": "hsl(var(--docs-accent-fg))",
          code: "hsl(var(--docs-code))",
          ring: "hsl(var(--docs-ring))",
          surface: "hsl(var(--docs-surface))",
        },
      },
      boxShadow: {
        "docs-sm": "0 1px 2px hsl(222 32% 12% / 0.04), 0 1px 3px hsl(222 32% 12% / 0.06)",
        "docs-md": "0 4px 16px hsl(222 32% 12% / 0.08), 0 1px 3px hsl(222 32% 12% / 0.04)",
        "docs-glow": "0 0 0 1px hsl(var(--docs-border)), 0 8px 32px hsl(var(--docs-accent) / 0.12)",
      },
      typography: {
        docs: {
          css: {
            "--tw-prose-body": "hsl(var(--docs-fg) / 0.88)",
            "--tw-prose-headings": "hsl(var(--docs-fg))",
            "--tw-prose-links": "hsl(var(--docs-accent))",
            "--tw-prose-bold": "hsl(var(--docs-fg))",
            "--tw-prose-code": "hsl(var(--docs-accent-fg))",
            "--tw-prose-pre-bg": "hsl(var(--docs-code))",
            "--tw-prose-pre-code": "hsl(var(--docs-fg))",
            "--tw-prose-quotes": "hsl(var(--docs-muted))",
            "--tw-prose-quote-borders": "hsl(var(--docs-accent) / 0.4)",
            "--tw-prose-hr": "hsl(var(--docs-border))",
            maxWidth: "44rem",
            a: {
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              fontWeight: "500",
            },
            "code::before": { content: '""' },
            "code::after": { content: '""' },
            code: {
              backgroundColor: "hsl(var(--docs-code))",
              padding: "0.15rem 0.4rem",
              borderRadius: "0.35rem",
              fontWeight: "500",
            },
            pre: {
              border: "1px solid hsl(var(--docs-border))",
              borderRadius: "0.75rem",
            },
            h2: {
              scrollMarginTop: "6rem",
            },
            h3: {
              scrollMarginTop: "6rem",
            },
          },
        },
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
