'use server';

import { revalidatePath } from 'next/cache';
import { projectsApi } from '../../../lib/api/projects';
import type { WeatherEntry, CreateWeatherEntryRequest, ProjectComment, CommentVisibility } from '@esn/shared-types';

export async function createWeatherEntryAction(
  projectId: string,
  data: CreateWeatherEntryRequest,
): Promise<WeatherEntry> {
  const entry = await projectsApi.createWeatherEntry(projectId, data);
  revalidatePath(`/projects/${projectId}`);
  return entry;
}

export async function loadWeatherHistoryAction(
  projectId: string,
  yearMonth: string,
): Promise<WeatherEntry[]> {
  return projectsApi.getWeatherHistory(projectId, yearMonth);
}

export async function createCommentAction(
  projectId: string,
  data: { content: string; visibility: CommentVisibility; isBlocker: boolean },
): Promise<ProjectComment> {
  const comment = await projectsApi.createComment(projectId, data);
  revalidatePath(`/projects/${projectId}`);
  return comment;
}

export async function resolveBlockerAction(
  projectId: string,
  commentId: string,
): Promise<ProjectComment> {
  const comment = await projectsApi.resolveBlocker(projectId, commentId);
  revalidatePath(`/projects/${projectId}`);
  return comment;
}
