import { apiClient } from './client';
import type {
  ProjectSummary,
  ProjectDetail,
  CreateProjectRequest,
  UpdateProjectRequest,
  WeatherEntry,
  WeatherMonthlySummary,
  CreateWeatherEntryRequest,
  ProjectComment,
  CreateCommentRequest,
  UpdateCommentRequest,
  Milestone,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
  CompleteMilestoneRequest,
  ProjectValidationRequest,
  CreateProjectValidationRequest,
  DecideValidationRequest,
} from '@esn/shared-types';

export const projectsApi = {
  // ── Projects ────────────────────────────────────────────────────────────

  list: (): Promise<ProjectSummary[]> =>
    apiClient.get('/projects'),

  listForClient: (): Promise<ProjectSummary[]> =>
    apiClient.get('/projects/for-client'),

  get: (id: string): Promise<ProjectDetail> =>
    apiClient.get(`/projects/${id}`),

  create: (body: CreateProjectRequest): Promise<ProjectSummary> =>
    apiClient.post('/projects', body),

  update: (id: string, body: UpdateProjectRequest): Promise<ProjectSummary> =>
    apiClient.patch(`/projects/${id}`, body),

  pause: (id: string): Promise<ProjectSummary> =>
    apiClient.post(`/projects/${id}/pause`),

  reopen: (id: string): Promise<ProjectSummary> =>
    apiClient.post(`/projects/${id}/reopen`),

  close: (id: string): Promise<void> =>
    apiClient.post(`/projects/${id}/close`),

  // ── Weather ─────────────────────────────────────────────────────────────

  getWeatherHistory: (id: string, yearMonth?: string): Promise<WeatherEntry[]> =>
    apiClient.get(`/projects/${id}/weather${yearMonth ? `?yearMonth=${yearMonth}` : ''}`),

  createWeatherEntry: (id: string, body: CreateWeatherEntryRequest): Promise<WeatherEntry> =>
    apiClient.post(`/projects/${id}/weather`, body),

  getWeatherSummary: (id: string, year: number, month: number): Promise<WeatherMonthlySummary> =>
    apiClient.get(`/projects/${id}/weather/summary?year=${year}&month=${month}`),

  // ── Comments ─────────────────────────────────────────────────────────────

  getComments: (id: string): Promise<ProjectComment[]> =>
    apiClient.get(`/projects/${id}/comments`),

  createComment: (id: string, body: CreateCommentRequest): Promise<ProjectComment> =>
    apiClient.post(`/projects/${id}/comments`, body),

  updateComment: (id: string, commentId: string, body: UpdateCommentRequest): Promise<ProjectComment> =>
    apiClient.patch(`/projects/${id}/comments/${commentId}`, body),

  resolveBlocker: (id: string, commentId: string): Promise<ProjectComment> =>
    apiClient.post(`/projects/${id}/comments/${commentId}/resolve`),

  // ── Milestones ───────────────────────────────────────────────────────────

  getMilestones: (id: string): Promise<Milestone[]> =>
    apiClient.get(`/projects/${id}/milestones`),

  createMilestone: (id: string, body: CreateMilestoneRequest): Promise<Milestone> =>
    apiClient.post(`/projects/${id}/milestones`, body),

  updateMilestone: (id: string, milestoneId: string, body: UpdateMilestoneRequest): Promise<Milestone> =>
    apiClient.patch(`/projects/${id}/milestones/${milestoneId}`, body),

  completeMilestone: (id: string, milestoneId: string, body: CompleteMilestoneRequest): Promise<Milestone> =>
    apiClient.post(`/projects/${id}/milestones/${milestoneId}/complete`, body),

  // ── Validations ──────────────────────────────────────────────────────────

  getValidations: (id: string): Promise<ProjectValidationRequest[]> =>
    apiClient.get(`/projects/${id}/validations`),

  createValidation: (id: string, body: CreateProjectValidationRequest): Promise<ProjectValidationRequest> =>
    apiClient.post(`/projects/${id}/validations`, body),

  approveValidation: (id: string, validationId: string, body: DecideValidationRequest): Promise<ProjectValidationRequest> =>
    apiClient.post(`/projects/${id}/validations/${validationId}/approve`, body),

  rejectValidation: (id: string, validationId: string, body: DecideValidationRequest): Promise<ProjectValidationRequest> =>
    apiClient.post(`/projects/${id}/validations/${validationId}/reject`, body),
};
