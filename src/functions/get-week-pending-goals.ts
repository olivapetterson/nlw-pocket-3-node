import dayjs from 'dayjs'
import { db } from '../db'
import { goalsCompleted, goals } from '../db/schema'
import { and, count, eq, gte, lte, sql } from 'drizzle-orm'

export async function getWeekPendingGoals() {
  const firstDayOfWeek = dayjs().startOf('week').toDate()
  const lastDayOfWeek = dayjs().endOf('week').toDate()

  // db.$with - method of drizzle-orm to use sql queries inside of the code (CTE - Common Table Expressions)
  const goalsCreatedUpToWeek = db.$with('goals_created_up_to_week').as(
    db
      .select({
        id: goals.id,
        title: goals.title,
        desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
        createdAt: goals.createdAt,
      })
      .from(goals)
      .where(lte(goals.createdAt, lastDayOfWeek)) //lte = lower then equal
  )

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
          lte(goalsCompleted.completedAt, lastDayOfWeek)
        )
      )
      .groupBy(goalsCompleted.goalId)
  )

  //COALESCE its a function sql who return the first not null value from an list of expressions (CTE)
  const pendingGoals = await db
    .with(goalsCreatedUpToWeek, goalCompletionCounts)
    .select({
      id: goalsCreatedUpToWeek.id,
      title: goalsCreatedUpToWeek.title,
      desiredWeeklyFrequency: goalsCreatedUpToWeek.desiredWeeklyFrequency,
      completionCount: sql /*sql*/`
        COALESCE(${goalCompletionCounts.completionCount}, 0)
      `.mapWith(Number),
    })
    .from(goalsCreatedUpToWeek)
    .leftJoin(
      goalCompletionCounts,
      eq(goalCompletionCounts.goalId, goalsCreatedUpToWeek.id)
    )

  return { pendingGoals }
}
