import { describe, expect, it } from 'vitest';
import {
  LINKEDIN_PAGE_SCOPES,
  LINKEDIN_PERSONAL_SCOPES,
  linkedinAuthUrl,
  linkedinDisplayName,
  linkedinPageCredentials,
  linkedinPersonalCredentials,
} from './linkedin.innexus';

const ORG_SCOPES = [
  'r_basicprofile',
  'rw_organization_admin',
  'w_organization_social',
  'r_organization_social',
];

describe('scopes', () => {
  it('personal channel never asks for organization scopes', () => {
    for (const s of ORG_SCOPES) {
      expect(LINKEDIN_PERSONAL_SCOPES).not.toContain(s);
    }
    expect(LINKEDIN_PERSONAL_SCOPES).toEqual([
      'openid',
      'profile',
      'w_member_social',
    ]);
  });

  it('page channel asks for every organization scope and not profile', () => {
    for (const s of ORG_SCOPES) {
      expect(LINKEDIN_PAGE_SCOPES).toContain(s);
    }
    expect(LINKEDIN_PAGE_SCOPES).not.toContain('profile');
    expect(LINKEDIN_PAGE_SCOPES).toContain('openid');
  });
});

describe('credentials', () => {
  const shared = {
    LINKEDIN_CLIENT_ID: 'personal-id',
    LINKEDIN_CLIENT_SECRET: 'personal-secret',
  };

  it('personal channel always uses the shared pair', () => {
    expect(
      linkedinPersonalCredentials({
        ...shared,
        LINKEDIN_PAGE_CLIENT_ID: 'page-id',
        LINKEDIN_PAGE_CLIENT_SECRET: 'page-secret',
      })
    ).toEqual({ clientId: 'personal-id', clientSecret: 'personal-secret' });
  });

  it('page channel uses its own pair when both are set', () => {
    expect(
      linkedinPageCredentials({
        ...shared,
        LINKEDIN_PAGE_CLIENT_ID: 'page-id',
        LINKEDIN_PAGE_CLIENT_SECRET: 'page-secret',
      })
    ).toEqual({ clientId: 'page-id', clientSecret: 'page-secret' });
  });

  it('page channel falls back to the shared pair when its own is unset', () => {
    expect(linkedinPageCredentials(shared)).toEqual({
      clientId: 'personal-id',
      clientSecret: 'personal-secret',
    });
  });

  it('page channel refuses a half-set pair', () => {
    expect(() =>
      linkedinPageCredentials({ ...shared, LINKEDIN_PAGE_CLIENT_ID: 'page-id' })
    ).toThrow(/must be set together/);
    expect(() =>
      linkedinPageCredentials({
        ...shared,
        LINKEDIN_PAGE_CLIENT_SECRET: 'page-secret',
      })
    ).toThrow(/must be set together/);
  });

  it('empty env yields empty strings, not undefined', () => {
    expect(linkedinPersonalCredentials({})).toEqual({
      clientId: '',
      clientSecret: '',
    });
  });
});

describe('display name', () => {
  it('prefers userinfo name', () => {
    expect(
      linkedinDisplayName(
        { name: 'Jay Jordan' },
        { localizedFirstName: 'X', localizedLastName: 'Y' }
      )
    ).toBe('Jay Jordan');
  });

  it('falls back to /v2/me names when profile scope is absent', () => {
    expect(
      linkedinDisplayName(
        {},
        { localizedFirstName: 'Jay', localizedLastName: 'Jordan' }
      )
    ).toBe('Jay Jordan');
  });

  it('handles both missing', () => {
    expect(linkedinDisplayName(undefined, undefined)).toBe('');
  });
});

describe('auth url', () => {
  const url = linkedinAuthUrl({
    clientId: 'page-id',
    redirectUri:
      'https://social.innovationnexus.com/integrations/social/linkedin-page',
    state: 'abc123',
    scopes: LINKEDIN_PAGE_SCOPES,
  });
  const q = new URL(url).searchParams;

  it('always asks for consent, never prompt=none', () => {
    expect(q.get('prompt')).toBe('consent');
    expect(url).not.toContain('prompt=none');
  });

  it('carries the given client id, redirect, state and scopes', () => {
    expect(q.get('client_id')).toBe('page-id');
    expect(q.get('redirect_uri')).toBe(
      'https://social.innovationnexus.com/integrations/social/linkedin-page'
    );
    expect(q.get('state')).toBe('abc123');
    expect(q.get('scope')).toBe(LINKEDIN_PAGE_SCOPES.join(' '));
    expect(q.get('response_type')).toBe('code');
  });
});
