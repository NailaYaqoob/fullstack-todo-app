# Feature: Task CRUD Operations

**Phase**: II (Full-Stack Web Application)
**Branch**: `001-task-crud`
**Status**: In Progress

## User Stories

- As a user, I can create a new task with a title and optional description
- As a user, I can view all my tasks (only my own tasks, not other users')
- As a user, I can update a task's title and description
- As a user, I can delete a task by ID
- As a user, I can mark a task as complete/incomplete (toggle)

## Acceptance Criteria

### Create Task
- Title is required (1–200 characters)
- Description is optional (max 1000 characters)
- Task is associated with the logged-in user's ID
- Returns created task with assigned ID and `created_at` timestamp
- Returns 422 if title is missing or exceeds length limit

### View Tasks
- Only returns tasks belonging to the authenticated user
- Displays title, status (`pending`/`completed`), and `created_at` date
- Supports filtering by `status` query param: `"all"` | `"pending"` | `"completed"`
- Returns empty array (not 404) when user has no tasks

### Update Task
- Can update title and/or description
- Returns 404 if task not found or belongs to another user
- Partial updates allowed (PATCH semantics)

### Delete Task
- Removes task permanently
- Returns 404 if task not found or belongs to another user
- Returns 204 No Content on success

### Toggle Completion
- Flips `completed` boolean on the task
- Returns updated task object
- Returns 404 if task not found or belongs to another user

## Data Model
See `@specs/database/schema.md` for the `tasks` table definition.

## API Endpoints
See `@specs/api/rest-endpoints.md` for full endpoint contracts.

## UI
See `@specs/ui/pages.md` for the task dashboard page.
See `@specs/ui/components.md` for `TaskList`, `TaskForm`, and `TaskItem` components.
