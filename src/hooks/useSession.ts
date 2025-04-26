import { useEffect, useState } from "react";

interface User {
  email: string | null;
  id: string;
}

interface Session {
  user: User;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, you would fetch the session from your auth provider
    const fetchSession = async () => {
      try {
        // Simulate session check
        const storedSession = localStorage.getItem("session");
        if (storedSession) {
          setSession(JSON.parse(storedSession));
        }
      } catch (error) {
        console.error("Error fetching session:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  return { session, loading };
}
