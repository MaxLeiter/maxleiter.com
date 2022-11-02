export default function Head() {
  const title = 'About - Max Leiter'
  const description = 'About this website.'
  return (
    <>
      <title>{title}</title>
      <meta name="og:title" content={title} />
      <meta name="description" content={description} />
      <meta name="og:description" content={description} />
      <meta name="og:url" content={'https://maxleiter.com/about'} />
    </>
  )
}
