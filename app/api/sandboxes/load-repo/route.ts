import { NextResponse } from 'next/server'
import { Sandbox } from '@vercel/sandbox'

/* Load a GitHub repository into a fresh Vercel Sandbox so the Helix coder
   agent can work on it. Creates the sandbox, clones the repo (shallow) into
   the working directory, and returns the sandbox id plus the tracked file
   list so the IDE file explorer can render the tree.

   The PAT is only used to build the clone URL for private repos; it is sent
   from the browser (where it already lives as NEXT_PUBLIC_GITHUB_TOKEN) and
   never persisted server-side. */

interface BodyData {
  owner: string
  repo: string
  branch?: string
  token?: string
  timeout?: number
}

export async function POST(req: Request) {
  let body: BodyData
  try {
    body = (await req.json()) as BodyData
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { owner, repo, branch, token, timeout } = body
  if (!owner || !repo) {
    return NextResponse.json(
      { error: 'owner and repo are required' },
      { status: 400 }
    )
  }

  const cloneUrl = token
    ? `https://${token}@github.com/${owner}/${repo}.git`
    : `https://github.com/${owner}/${repo}.git`

  let sandbox: Sandbox
  try {
    sandbox = await Sandbox.create({
      timeout: timeout ?? 600000,
      ports: [3000],
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: `Failed to create sandbox: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 }
    )
  }

  // Clone into the sandbox working directory.
  try {
    const args = ['clone', '--depth', '1']
    if (branch) args.push('-b', branch)
    args.push(cloneUrl, '.')

    const clone = await sandbox.runCommand({ detached: true, cmd: 'git', args })
    const done = await clone.wait()

    if (done.exitCode !== 0) {
      const stderr = await done.stderr().catch(() => '')
      // Scrub any token that may appear in error output.
      const safe = token ? stderr.split(token).join('***') : stderr
      return NextResponse.json(
        {
          error: `git clone failed (exit ${done.exitCode}). ${safe.slice(0, 500)}`,
          sandboxId: sandbox.sandboxId,
        },
        { status: 502 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: `Clone error: ${
          error instanceof Error ? error.message : String(error)
        }`,
        sandboxId: sandbox.sandboxId,
      },
      { status: 502 }
    )
  }

  // List tracked files for the IDE tree.
  let paths: string[] = []
  try {
    const ls = await sandbox.runCommand({
      detached: true,
      cmd: 'git',
      args: ['ls-files'],
    })
    const done = await ls.wait()
    const stdout = await done.stdout()
    paths = stdout
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean)
  } catch {
    /* non-fatal — repo is cloned, tree will populate as the agent works */
  }

  return NextResponse.json({
    sandboxId: sandbox.sandboxId,
    paths,
    repo: `${owner}/${repo}`,
    branch: branch ?? null,
  })
}
