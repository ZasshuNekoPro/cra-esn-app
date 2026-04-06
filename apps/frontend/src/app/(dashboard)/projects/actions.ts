'use server';

import { projectsApi } from '../../../lib/api/projects';
import type { WeatherEntry, CreateWeatherEntryRequest } from '@esn/shared-types';

export async function createWeatherEntryAction(
  projectId: string,
  data: CreateWeatherEntryRequest,
): Promise<WeatherEntry> {
  return projectsApi.createWeatherEntry(projectId, data);
}

export async function loadWeatherHistoryAction(
  projectId: string,
  yearMonth: string,
): Promise<WeatherEntry[]> {
  return projectsApi.getWeatherHistory(projectId, yearMonth);
}
