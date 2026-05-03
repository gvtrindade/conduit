import { jwtClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

const getBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_PROJECT_URL;
};

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [jwtClient()],
});
