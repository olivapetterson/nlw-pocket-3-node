import postgres from "postgres";
import { drizzle } from 'drizzle-orm/postgres'
import * as schema from './schema'

export const client = postgres(env.DB_URL)
export const db = drizzle(client, {schema, logger: true})