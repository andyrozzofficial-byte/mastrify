import { MasterSessionProvider } from "./MasterSessionProvider"

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  return <MasterSessionProvider>{children}</MasterSessionProvider>
}
