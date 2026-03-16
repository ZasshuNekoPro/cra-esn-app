import { SetMetadata } from '@nestjs/common';

/**
 * Specifies which request param key holds the owner's user ID.
 * Example: @ResourceOwner('userId') means req.params.userId must equal req.user.id
 */
export const RESOURCE_OWNER_KEY = 'resourceOwnerParam';
export const ResourceOwner = (paramKey: string): ReturnType<typeof SetMetadata> =>
  SetMetadata(RESOURCE_OWNER_KEY, paramKey);
