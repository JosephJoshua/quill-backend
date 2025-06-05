import { z } from 'zod';

export const validationSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.string().regex(/^\d+$/).default('3000').transform(Number),
  DATABASE_HOST: z.string(),
  DATABASE_PORT: z.string().default('5432'),
  DATABASE_USERNAME: z.string(),
  DATABASE_PASSWORD: z.string(),
  DATABASE_NAME: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRATION_TIME: z.string().default('3600s'),
  AZURE_STORAGE_CONNECTION_STRING: z.string(),
  AZURE_STORAGE_CONTAINER_NAME: z.string(),
  AZURE_SEARCH_ENDPOINT: z.string().url(),
  AZURE_SEARCH_KEY: z.string(),
  AZURE_SEARCH_INDEX_NAME: z.string().default('quill-content-index'),
  OPENROUTER_API_KEY: z.string(),
  OPENROUTER_REFERRER: z.string().url().optional(),
  OPENROUTER_SITE_NAME: z.string().optional(),
});

export const validateConfig = (config: Record<string, unknown>) => {
  try {
    return validationSchema.parse(config);
  } catch (error) {
    throw new Error(`Configuration validation failed: ${error}`);
  }
};

export default () => {
  const env = validationSchema.parse(process.env);

  return {
    environment: env.NODE_ENV,
    port: env.PORT,
    database: {
      host: env.DATABASE_HOST,
      port: parseInt(env.DATABASE_PORT, 10) || 5432,
      username: env.DATABASE_USERNAME,
      password: env.DATABASE_PASSWORD,
      name: env.DATABASE_NAME,
    },
    jwt: {
      secret: env.JWT_SECRET,
      expiresIn: env.JWT_EXPIRATION_TIME,
    },
    azure: {
      storage: {
        connectionString: env.AZURE_STORAGE_CONNECTION_STRING,
        containerName: env.AZURE_STORAGE_CONTAINER_NAME,
      },
      search: {
        endpoint: env.AZURE_SEARCH_ENDPOINT,
        key: env.AZURE_SEARCH_KEY,
        indexName: env.AZURE_SEARCH_INDEX_NAME,
      },
    },
    openRouter: {
      apiKey: env.OPENROUTER_API_KEY,
      referrer: env.OPENROUTER_REFERRER,
      siteName: env.OPENROUTER_SITE_NAME,
    },
  };
};
