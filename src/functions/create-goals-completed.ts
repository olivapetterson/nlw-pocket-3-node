import { and, count, eq, gte, lte } from 'drizzle-orm'
import { db } from '../db'
import { goalsCompleted, goals } from '../db/schema'
import dayjs from 'dayjs'
import { sql } from 'drizzle-orm'

interface CreateGoalCompletionRequest {
  goalId: string
}

export async function createGoalCompletion({
  goalId,
}: CreateGoalCompletionRequest) {
  const firstDayOfWeek = dayjs().startOf('week').toDate()
  const lastDayOfWeek = dayjs().endOf('week').toDate()

  const goalCompletionCounts = db.$with('goal_completion_counts').as(
    db
      .select({
        goalId: goalsCompleted.goalId,
        completionCount: count(goalsCompleted.id).as('completionCount'),
      })
      .from(goalsCompleted)
      .where(
        and(
          gte(goalsCompleted.completedAt, firstDayOfWeek),
          lte(goalsCompleted.completedAt, lastDayOfWeek),
          eq(goalsCompleted.goalId, goalId)
        )
      )
      .groupBy(goalsCompleted.goalId)
  )

  const result = await db
    .with(goalCompletionCounts)
    .select({
      desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
      completionCount: sql /*sql*/`
        COALESCE(${goalCompletionCounts.completionCount}, 0)
      `.mapWith(Number),
    })
    .from(goals)
    .leftJoin(goalCompletionCounts, eq(goalCompletionCounts.goalId, goals.id))
    .where(eq(goals.id, goalId))
    .limit(1)

  const { completionCount, desiredWeeklyFrequency } = result[0]

  if (completionCount >= desiredWeeklyFrequency) {
    throw new Error('Goal already completed this week!')
  }

  const insertResult = await db
    .insert(goalsCompleted)
    .values({ goalId })
    .returning()
  const goalCompletion = insertResult[0]

  return {
    goalCompletion,
  }
}
