// InnovationNexus fork patch (not upstream). Self-contained on purpose: no
// imports, so the unit test runs without the Nest/Prisma toolchain.
//
// Why this exists: LinkedIn only grants the organization scopes through the
// Community Management API product, and that product must be the ONLY product
// on its developer app. The personal channel needs "Sign In with LinkedIn" +
// "Share on LinkedIn" on a different app. Upstream reads one shared
// LINKEDIN_CLIENT_ID/SECRET for both providers, so one of the two channels can
// never connect. These helpers give the page provider its own app.

export type Env = Record<string, string | undefined>;

// Personal channel: what Sign In + Share on LinkedIn can grant. Upstream also
// asks for the four organization scopes here, which that app can never hold,
// so LinkedIn rejects the whole request (gitroomhq/postiz-app#1582).
export const LINKEDIN_PERSONAL_SCOPES = [
  'openid',
  'profile',
  'w_member_social',
];

// Page channel: what the Community Management app can grant. 'profile' is
// dropped because it is not grantable on a Community Management app (probe
// 2026-10-28: unauthorized_scope_error); 'openid' is a baseline scope that is
// granted anyway and keeps /v2/userinfo returning the member `sub`.
export const LINKEDIN_PAGE_SCOPES = [
  'openid',
  'w_member_social',
  'r_basicprofile',
  'rw_organization_admin',
  'w_organization_social',
  'r_organization_social',
];

// prompt=none is silent authorization: on a first connect there is no prior
// consent, so LinkedIn errors or returns too few scopes
// (gitroomhq/postiz-app#1580). Always show the consent screen.
export const LINKEDIN_PROMPT = 'consent';

export interface LinkedinCredentials {
  clientId: string;
  clientSecret: string;
}

export function linkedinPersonalCredentials(env: Env): LinkedinCredentials {
  return {
    clientId: env.LINKEDIN_CLIENT_ID || '',
    clientSecret: env.LINKEDIN_CLIENT_SECRET || '',
  };
}

// The page provider prefers its own pair and falls back to the shared pair
// only when the page pair is wholly unset, so an instance without the new
// variables behaves exactly like upstream. A half-set pair is a config error:
// mixing the id of one app with the secret of another fails at the token
// exchange with an opaque 401, so fail loudly instead.
export function linkedinPageCredentials(env: Env): LinkedinCredentials {
  const id = env.LINKEDIN_PAGE_CLIENT_ID || '';
  const secret = env.LINKEDIN_PAGE_CLIENT_SECRET || '';
  if (id && secret) {
    return { clientId: id, clientSecret: secret };
  }
  if (id || secret) {
    throw new Error(
      'LINKEDIN_PAGE_CLIENT_ID and LINKEDIN_PAGE_CLIENT_SECRET must be set together'
    );
  }
  return linkedinPersonalCredentials(env);
}

// Without 'profile', /v2/userinfo returns `sub` but no name. /v2/me
// (r_basicprofile) carries localizedFirstName / localizedLastName instead.
export function linkedinDisplayName(
  userinfo: { name?: string } | undefined,
  me: { localizedFirstName?: string; localizedLastName?: string } | undefined
): string {
  if (userinfo?.name) {
    return userinfo.name;
  }
  return [me?.localizedFirstName, me?.localizedLastName]
    .filter(Boolean)
    .join(' ');
}

export function linkedinAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes: string[];
}): string {
  return (
    'https://www.linkedin.com/oauth/v2/authorization?response_type=code' +
    `&prompt=${LINKEDIN_PROMPT}` +
    `&client_id=${encodeURIComponent(params.clientId)}` +
    `&redirect_uri=${encodeURIComponent(params.redirectUri)}` +
    `&state=${params.state}` +
    `&scope=${encodeURIComponent(params.scopes.join(' '))}`
  );
}
