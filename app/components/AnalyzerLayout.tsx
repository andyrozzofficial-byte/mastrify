export default function AnalyzerLayout({ data }: any) {
  return (
    <div className="text-white p-10">
      Mastrify Analyzer 🔥 <br />
      Score: {data?.score}
    </div>
  )
}