import NextAuth from 'next-auth';
import Auth0 from 'next-auth/providers/auth0';

const nextAuth = NextAuth({
  providers: [
    Auth0({
      issuer: process.env.AUTH0_ISSUER_BASE_URL,
      clientId: process.env.AUTH0_CLIENT_ID!,
      clientSecret: process.env.AUTH0_CLIENT_SECRET!,
      authorization: {
        params: {
          audience: process.env.AUTH0_AUDIENCE,
          scope: process.env.AUTH0_SCOPE ?? 'openid profile email offline_access',
        },
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = (account as any).access_token;
        token.idToken = (account as any).id_token;
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).accessToken = token.accessToken as string | undefined;
      (session as any).idToken = token.idToken as string | undefined;
      return session;
    },
  },
});

export const { handlers, auth, signIn, signOut } = nextAuth;

// IMPORTANT: export GET/POST here so the route can re-export them
export const { GET, POST } = handlers as { GET: any; POST: any };