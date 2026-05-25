import {
  ContentPageLayout,
  contentPageProseClass,
  contentPageSectionsClass,
  PageContainer,
  PageHero,
  ReadingColumn,
} from "../components/content/ContentPageLayout"

export default function AboutPage() {
  return (
    <ContentPageLayout>
      <PageContainer>
        <ReadingColumn>
          <PageHero title="About Mastrify" align="center" />
          <div className={`${contentPageSectionsClass} ${contentPageProseClass}`}>
            <section>
              <p>
                Mastrify is an AI-powered mastering tool built for modern artists. We believe every creator should
                be able to get professional sound without expensive engineers or complicated workflows.
              </p>
            </section>
            <section>
              <p>Upload your track. Get a master that sounds release-ready for streaming and download.</p>
            </section>
          </div>
        </ReadingColumn>
      </PageContainer>
    </ContentPageLayout>
  )
}
