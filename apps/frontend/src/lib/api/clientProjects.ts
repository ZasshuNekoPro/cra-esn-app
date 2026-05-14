'use client';

import { clientApiClient } from './clientFetch';
import type {
  Milestone,
  CreateMilestoneRequest,
  UpdateMilestoneRequest,
  CompleteMilestoneRequest,
  ProjectValidationRequest,
  CreateProjectValidationRequest,
  DecideValidationRequest,
} from '@esn/shared-types';

export const clientProjectsApi = {
  createMilestone: (id: string, body: CreateMilestoneRequest): Promise<Milestone> =>
    clientApiClient.post<Milestone>(`/projects/${id}/milestones`, body),

  updateMilestone: (id: string, milestoneId: string, body: UpdateMilestoneRequest): Promise<Milestone> =>
    clientApiClient.patch<Milestone>(`/projects/${id}/milestones/${milestoneId}`, body),

  completeMilestone: (id: string, milestoneId: string, body: CompleteMilestoneRequest): Promise<Milestone> =>
    clientApiClient.post<Milestone>(`/projects/${id}/milestones/${milestoneId}/complete`, body),

  createValidation: (id: string, body: CreateProjectValidationRequest): Promise<ProjectValidationRequest> =>
    clientApiClient.post<ProjectValidationRequest>(`/projects/${id}/validations`, body),

  approveValidation: (id: string, validationId: string, body: DecideValidationRequest): Promise<ProjectValidationRequest> =>
    clientApiClient.post<ProjectValidationRequest>(`/projects/${id}/validations/${validationId}/approve`, body),

  rejectValidation: (id: string, validationId: string, body: DecideValidationRequest): Promise<ProjectValidationRequest> =>
    clientApiClient.post<ProjectValidationRequest>(`/projects/${id}/validations/${validationId}/reject`, body),
};
