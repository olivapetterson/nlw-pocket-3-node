import db from '.'
import { goalsCompleted } from "./schema"

async function seed() {
    await db.delete (goalsCompleted)
}

seed ()