'use server';

import { revalidatePath } from 'next/cache';
import { projectsApi } from '../../../lib/api/projects';
import type { WeatherEntry, CreateWeatherEntryRequest } from '@esn/shared-types';

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
