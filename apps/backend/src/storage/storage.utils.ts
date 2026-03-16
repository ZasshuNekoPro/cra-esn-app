import { extname } from 'path';
import { randomUUID } from 'crypto';

/**
 * Slugify a filename for safe use in S3 keys.
 * Keeps extension, replaces special chars with hyphens.
 */
function slugify(filename: string): string {
  const ext = extname(filename);
  const base = filename.slice(0, filename.length - ext.length);
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || 'file'}${ext.toLowerCase()}`;
}

/**
 * Build a deterministic S3 key for a document upload.
 *
 * Pattern: {ownerId}/{missionId}/{projectId|'mission'}/{uuid}-{slug(filename)}
 */
export function buildS3Key(
  ownerId: string,
  missionId: string,
  projectId: string | null | undefined,
  filename: string,
): string {
  const scope = projectId ?? 'mission';
  const uuid = randomUUID();
  const slug = slugify(filename);
  return `${ownerId}/${missionId}/${scope}/${uuid}-${slug}`;
}
