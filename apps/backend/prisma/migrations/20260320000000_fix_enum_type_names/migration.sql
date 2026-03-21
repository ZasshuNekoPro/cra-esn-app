-- Rename PostgreSQL enum types to match Prisma schema (PascalCase)
ALTER TYPE "project_status" RENAME TO "ProjectStatus";
ALTER TYPE "milestone_status" RENAME TO "MilestoneStatus";
ALTER TYPE "weather_state" RENAME TO "WeatherState";
ALTER TYPE "comment_visibility" RENAME TO "CommentVisibility";
