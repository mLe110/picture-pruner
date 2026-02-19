import { z } from "zod";

const ConfigSchema = z.object({
  DATABASE_URL: z.string().url(),
});

export type Config = z.infer<typeof ConfigSchema>;

function loadConfig(): Config {
  const result = ConfigSchema.safeParse(process.env);
  if (!result.success) {
    const formatted = result.error.format();
    console.error("Invalid configuration:", formatted);
    process.exit(1);
  }
  return result.data;
}

export const config = loadConfig();
