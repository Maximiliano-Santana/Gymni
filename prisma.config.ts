import { defineConfig } from 'prisma/config'
import { existsSync } from 'node:fs'

// prisma.config.ts skips auto .env loading, so we do it manually
if (existsSync('.env')) {
  process.loadEnvFile('.env')
}

export default defineConfig({
  schema: './prisma/schema.prisma',
})
