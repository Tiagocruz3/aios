'use client'

// Client-side Supabase Management API helper. The Personal Access Token is
// supplied per call and stored only in the browser (localStorage); it talks
// directly to api.supabase.com.

const API = 'https://api.supabase.com'

export interface SbOrganization {
  id: string
  name: string
}

export interface SbProject {
  id: string // project ref used in URLs
  organization_id: string
  name: string
  region: string
  created_at: string
  status: string
}

export interface SbApiKey {
  name: string
  api_key: string
}

async function sbFetch(
  token: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    let detail = ''
    try {
      const json = await res.json()
      detail = json.message ?? json.error ?? ''
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Supabase API error (${res.status})`)
  }
  return res
}

export async function getOrganizations(
  token: string
): Promise<SbOrganization[]> {
  const res = await sbFetch(token, '/v1/organizations')
  return res.json()
}

export async function listProjects(token: string): Promise<SbProject[]> {
  const res = await sbFetch(token, '/v1/projects')
  const projects: SbProject[] = await res.json()
  return projects.sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function createProject(
  token: string,
  params: {
    name: string
    organization_id: string
    db_pass: string
    region: string
    plan?: string
  }
): Promise<SbProject> {
  const res = await sbFetch(token, '/v1/projects', {
    method: 'POST',
    body: JSON.stringify({ plan: 'free', ...params }),
  })
  return res.json()
}

export async function deleteProject(
  token: string,
  ref: string
): Promise<void> {
  await sbFetch(token, `/v1/projects/${ref}`, { method: 'DELETE' })
}

export async function getApiKeys(
  token: string,
  ref: string
): Promise<SbApiKey[]> {
  const res = await sbFetch(token, `/v1/projects/${ref}/api-keys`)
  return res.json()
}

// Runs arbitrary SQL against the project's Postgres database. Returns the rows
// (an array) on success — this is how the backend schema is created and coded.
export async function runQuery(
  token: string,
  ref: string,
  query: string
): Promise<unknown> {
  const res = await sbFetch(token, `/v1/projects/${ref}/database/query`, {
    method: 'POST',
    body: JSON.stringify({ query }),
  })
  return res.json()
}

export const SUPABASE_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ca-central-1',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'eu-central-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-south-1',
  'sa-east-1',
]
