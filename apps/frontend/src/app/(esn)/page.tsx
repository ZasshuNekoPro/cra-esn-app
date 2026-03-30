import { redirect } from 'next/navigation';

export default function EsnRoot(): never {
  redirect('/esn/admin/dashboard');
}
