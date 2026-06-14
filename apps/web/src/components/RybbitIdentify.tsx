import { useEffect } from 'react';
import { authClient } from '../lib/auth-client';
import { identifyUser } from '../lib/rybbit';

interface InitialUser {
  id: string;
  name: string;
  email: string;
}

export default function RybbitIdentify({ initialUser }: { initialUser: InitialUser | null }) {
  const { data: session } = authClient.useSession();
  const user = session?.user ?? initialUser;

  useEffect(() => {
    if (!user) return;
    identifyUser({ id: user.id, name: user.name, email: user.email });
  }, [user?.id, user?.name, user?.email]);

  return null;
}
