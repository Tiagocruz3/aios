'use client'

// Client-side Vercel REST API helper. The token is supplied per call and stored
// only in the browser (localStorage); it talks directly to api.vercel.com.

const API = 'https://api.vercel.com'

export interface VercelUser {
  username: string
  name: string | null
  email: string
}

export interface VercelDeployment {
  uid?: string
  url: string
  readyState?: string
  state?: string
  createdAt?: number
  target?: string | null
}

export interface VercelProject {
  id: string
  name: string
  framework: string | null
  updatedAt?: number
  latestDeployments?: VercelDeployment[]
  targets?: { production?: VercelDeployment }
}

async function vFetch(
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
      detail = json.error?.message ?? json.message ?? ''
    } catch {
      /* ignore */
    }
    throw new Error(detail || `Vercel API error (${res.status})`)
  }
  return res
}

export async function getVercelUser(token: string): Promise<VercelUser> {
  const res = await vFetch(token, '/v2/user')
  const json = await res.json()
  return json.user ?? json
}

export async function listProjects(token: string): Promise<VercelProject[]> {
  const projects: VercelProject[] = []
  let until: number | undefined
  for (let i = 0; i < 5; i++) {
    const q = `/v9/projects?limit=100${until ? `&until=${until}` : ''}`
    const res = await vFetch(token, q)
    const json = await res.json()
    projects.push(...(json.projects ?? []))
    const next = json.pagination?.next
    if (!next) break
    until = next
  }
  return projects
}

export async function createProject(
  token: string,
  name: string,
  framework?: string
): Promise<VercelProject> {
  const res = await vFetch(token, '/v9/projects', {
    method: 'POST',
    body: JSON.stringify({ name, framework: framework || null }),
  })
  return res.json()
}

export async function deleteProject(
  token: string,
  idOrName: string
): Promise<void> {
  await vFetch(token, `/v9/projects/${idOrName}`, { method: 'DELETE' })
}

export async function listDeployments(
  token: string,
  projectId: string
): Promise<VercelDeployment[]> {
  const res = await vFetch(
    token,
    `/v6/deployments?projectId=${projectId}&limit=10`
  )
  const json = await res.json()
  return json.deployments ?? []
}

// Resolve the best "live" URL for a project from its latest deployments.
export function liveUrl(project: VercelProject): string | null {
  const prod = project.targets?.production?.url
  if (prod) return `https://${prod}`
  const latest =
    project.latestDeployments?.find((d) => d.target === 'production') ??
    project.latestDeployments?.[0]
  return latest?.url ? `https://${latest.url}` : null
}

// Live website thumbnail via the free Microlink screenshot service.
export function thumbnailUrl(siteUrl: string): string {
  const params = new URLSearchParams({
    url: siteUrl,
    screenshot: 'true',
    meta: 'false',
    embed: 'screenshot.url',
    'viewport.width': '1280',
    'viewport.height': '800',
    waitUntil: 'networkidle2',
  })
  return `https://api.microlink.io/?${params.toString()}`
}
