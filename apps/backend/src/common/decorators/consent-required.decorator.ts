import { SetMetadata } from '@nestjs/common';

/**
 * Marks an ESN route as requiring consent from the target employee.
 * Param key: the request param that holds the employeeId.
 * Example: @ConsentRequired('employeeId') means req.params.employeeId is checked.
 */
export const CONSENT_KEY = 'consentEmployeeParam';
export const ConsentRequired = (paramKey: string): ReturnType<typeof SetMetadata> =>
  SetMetadata(CONSENT_KEY, paramKey);
