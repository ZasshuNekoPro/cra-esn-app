import { redirect } from 'next/navigation';

export default function PlatformRoot(): never {
  redirect('/platform/admin/dashboard');
}
