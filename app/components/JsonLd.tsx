type JsonLdProps = {
  data: Record<string, unknown> | Array<Record<string, unknown>>
}

export default function JsonLd({ data }: JsonLdProps) {
  const payload = Array.isArray(data) ? data : [data]

  return (
    <>
      {payload.map((entry) => (
        <script
          key={JSON.stringify(entry)}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
        />
      ))}
    </>
  )
}
