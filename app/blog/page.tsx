import {
  CenteredContent,
  ContentPageLayout,
  PageHero,
} from "../components/content/ContentPageLayout"

/** Static blog shell — posts can be wired later */
export default function BlogPage() {
  return (
    <ContentPageLayout>
      <CenteredContent>
        <PageHero
          label="Mastrify"
          title="Blog"
          lead="Articles and product updates are on the way."
          align="center"
        />
      </CenteredContent>
    </ContentPageLayout>
  )
}
