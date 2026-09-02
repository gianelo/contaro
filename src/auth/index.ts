import NextAuth from "next-auth";
// Imported for its side effect on the type system: `declare module` below
// only augments a module TypeScript has already resolved.
import "next-auth/jwt";
import Google from "next-auth/providers/google";
import { database } from "@/db/client";
import { memberFromGoogle } from "@/db/members";

/**
 * Google is the only identity provider, and it is the only thing in contaro
 * that comes from outside. Auth.js runs the OAuth handshake and nothing else:
 * who the resulting person is stays a domain decision (ADR-0006).
 *
 * Sessions are JSON Web Tokens, so there is no Auth.js table and no `users`
 * table competing with Member. The token carries the Member's id, which every
 * later ticket uses to ask what that Member may do.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/ingresar" },
  callbacks: {
    signIn({ profile }) {
      // Google can hand back an address it has not verified, and an address
      // nobody has proved they own is not identity. Refusing here is what
      // keeps one out of a Member's record in the first place. A refusal
      // returns to /ingresar as `?error=AccessDenied`, which that screen says
      // out loud rather than silently showing the button again.
      return profile?.email_verified === true;
    },

    async jwt({ token, account, profile }) {
      // `account` is only set on the request that completes the sign-in, so
      // the database is touched once per session rather than once per request.
      if (account && profile) {
        // A claim Google left out becomes a blank on purpose: the domain
        // decides what an unusable identity is, and refuses it there, rather
        // than this file growing its own idea of one.
        const member = await memberFromGoogle(database(), {
          subject: profile.sub ?? "",
          email: profile.email ?? "",
          name: profile.name ?? "",
        });

        token.memberId = member.id;
        token.name = member.name;
        token.email = member.email;
      }

      return token;
    },

    session({ session, token }) {
      session.user.id = token.memberId;
      return session;
    },

    // Decides every request the proxy guards: no session, no entry.
    authorized({ auth: session }) {
      return session?.user !== undefined;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      /** The Member's id, not Google's. */
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    memberId: string;
  }
}
