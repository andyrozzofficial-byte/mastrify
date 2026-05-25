import {
  ContentPageLayout,
  PageContainer,
  PageHero,
  ReadingColumn,
} from "../components/content/ContentPageLayout"

/** Static blog shell — posts can be wired later */
export default function BlogPage() {
  return (
    <ContentPageLayout>
      <PageContainer>
        <ReadingColumn>
          <PageHero
            label="Mastrify"
            title="Blog"
            lead="Articles and product updates are on the way."
            align="center"
          />
        </ReadingColumn>
      </PageContainer>
    </ContentPageLayout>
  )
}
