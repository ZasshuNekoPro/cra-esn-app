import { auth } from '../../../auth';
import { redirect } from 'next/navigation';
import { Role } from '@esn/shared-types';
import { ChatContainer } from '../../../components/rag/ChatContainer';

export default async function AssistantPage(): Promise<JSX.Element> {
  const session = await auth();

  if (!session || session.user.role !== Role.EMPLOYEE) {
    redirect('/dashboard');
  }

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto">
      <ChatContainer accessToken={session.accessToken} />
    </div>
  );
}
