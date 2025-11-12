export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const packagePath = path.join('/')
  const url = `https://packages.knightos.org/${packagePath}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      return new Response('Package not found', { status: 404 })
    }

    const data = await response.arrayBuffer()

    return new Response(data, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Error fetching package:', error)
    return new Response('Error fetching package', { status: 500 })
  }
}
