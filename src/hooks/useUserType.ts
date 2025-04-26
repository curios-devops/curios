import { useSession } from "./useSession.ts";

type UserType = "guest" | "authenticated";

export function useUserType(): UserType {
  const { session } = useSession();

  return session ? "authenticated" : "guest";
}
