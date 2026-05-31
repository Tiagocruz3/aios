'use client'

// Lightweight client-side GitHub REST API helper.
// The user's Personal Access Token (PAT) is supplied per call and stored only
// in the browser (localStorage) — it is never sent to our own server.

const API = 'https://api.github.com'

export interface GhUser {
  login: string
  name: string | null
  avatar_url: string
}

export interface GhRepo {
  id: number
  name: string
  full_name: string
  private: boolean
  description: string | null
  default_branch: string
  owner: { login: string }
  html_url: string
  updated_at: string
}

export interface GhContentEntry {
  name: string
  path: string
  sha: string
  type: 'file' | 'dir'
  size: number
}

export interface GhFile {
  content: string
  sha: string
  encoding: string
}

async function ghFetch(
  token: string,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    let detail = ''
    try {
      const json = await res.json()
      detail = json.message ?? ''
    } catch {
      /* ignore */
    }
    throw new Error(detail || `GitHub API error (${res.status})`)
  }
  return res
}

function b64EncodeUnicode(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

function b64DecodeUnicode(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export async function getUser(token: string): Promise<GhUser> {
  const res = await ghFetch(token, '/user')
  return res.json()
}

export async function listRepos(token: string): Promise<GhRepo[]> {
  const repos: GhRepo[] = []
  // Paginate up to 5 pages (500 repos) sorted by most recently updated.
  for (let page = 1; page <= 5; page++) {
    const res = await ghFetch(
      token,
      `/user/repos?per_page=100&page=${page}&sort=updated&affiliation=owner`
    )
    const batch: GhRepo[] = await res.json()
    repos.push(...batch)
    if (batch.length < 100) break
  }
  return repos
}

export async function createRepo(
  token: string,
  name: string,
  isPrivate: boolean,
  description?: string
): Promise<GhRepo> {
  const res = await ghFetch(token, '/user/repos', {
    method: 'POST',
    body: JSON.stringify({
      name,
      private: isPrivate,
      description: description || undefined,
      auto_init: true,
    }),
  })
  return res.json()
}

export async function deleteRepo(
  token: string,
  owner: string,
  repo: string
): Promise<void> {
  await ghFetch(token, `/repos/${owner}/${repo}`, { method: 'DELETE' })
}

export async function getContents(
  token: string,
  owner: string,
  repo: string,
  path = ''
): Promise<GhContentEntry[]> {
  const res = await ghFetch(
    token,
    `/repos/${owner}/${repo}/contents/${path}`
  )
  const data = await res.json()
  const arr: GhContentEntry[] = Array.isArray(data) ? data : [data]
  // Folders first, then alphabetical.
  return arr.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export async function getFile(
  token: string,
  owner: string,
  repo: string,
  path: string
): Promise<{ content: string; sha: string }> {
  const res = await ghFetch(
    token,
    `/repos/${owner}/${repo}/contents/${path}`
  )
  const data: GhFile = await res.json()
  return {
    content: data.encoding === 'base64' ? b64DecodeUnicode(data.content) : data.content,
    sha: data.sha,
  }
}

export async function putFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<void> {
  await ghFetch(token, `/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: b64EncodeUnicode(content),
      ...(sha ? { sha } : {}),
    }),
  })
}

export async function deleteFile(
  token: string,
  owner: string,
  repo: string,
  path: string,
  message: string,
  sha: string
): Promise<void> {
  await ghFetch(token, `/repos/${owner}/${repo}/contents/${path}`, {
    method: 'DELETE',
    body: JSON.stringify({ message, sha }),
  })
}
