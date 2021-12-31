import Page from '@components/page'
import RSS from '@components/rss'

const RSSPage = () => {
  return (
    <Page
      title="My personal RSS feed"
      description="Where I get most of my news."
    >
      <RSS />
    </Page>
  )
}

export default RSSPage
