import { z } from "zod";

export const FrondConfigSchema = z.object({
  organization: z.string().min(1),
  project: z.string().min(1),
  /** Dashboard project UUID — used by `frond docs publish` when --project-id is omitted */
  projectId: z.string().uuid().optional(),
  docs: z.object({
    title: z.string().min(1),
    url: z.string().url().optional(),
  }),
});

export const DocsVersionSchema = z.object({
  id: z.string(),
  "display-name": z.string().optional(),
  path: z.string(),
  deprecated: z.boolean().optional(),
});

export const NavigationItemSchema = z.union([
  z.object({
    section: z.string(),
    contents: z.array(
      z.object({
        page: z.string(),
        path: z.string(),
      }),
    ),
  }),
  z.object({ api: z.literal("API Reference") }),
]);

export const DocsConfigSchema = z.object({
  instances: z
    .array(
      z.object({
        url: z.string(),
        "custom-domain": z.boolean().optional(),
      }),
    )
    .optional(),
  title: z.string(),
  logo: z
    .object({
      light: z.string().optional(),
      dark: z.string().optional(),
    })
    .optional(),
  versions: z.array(DocsVersionSchema).min(1),
  navigation: z.array(NavigationItemSchema),
  theme: z
    .object({
      "primary-color": z.string().optional(),
      font: z.string().optional(),
      "code-theme": z.string().optional(),
    })
    .optional(),
  playground: z
    .object({
      "base-url": z.string().url(),
      environments: z
        .array(
          z.object({
            name: z.string(),
            url: z.string().url(),
          }),
        )
        .optional(),
      auth: z
        .object({
          type: z.enum(["bearer", "api-key", "basic", "none"]).default("none"),
          header: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  search: z.boolean().optional(),
  analytics: z.boolean().optional(),
});

export const GeneratorSchema = z.object({
  name: z.string(),
  version: z.string().default("latest"),
  output: z.object({
    location: z.literal("local-file-system"),
    path: z.string(),
  }),
});

export const GeneratorsConfigSchema = z.object({
  "default-group": z.string().default("local"),
  groups: z.record(
    z.string(),
    z.object({
      generators: z.array(GeneratorSchema),
    }),
  ),
});

export type FrondConfig = z.infer<typeof FrondConfigSchema>;
export type DocsConfig = z.infer<typeof DocsConfigSchema>;
export type GeneratorsConfig = z.infer<typeof GeneratorsConfigSchema>;
