import {Metadata} from 'next'
import '@/app/ui/global.css'
import {inter} from '@/app/ui/fonts'

export const metadata: Metadata = {
  title: {
    template: '',
    default: 'LogLens',
  },
  description: '1024 Go!',
  metadataBase: new URL('https://www.polyv.net'),
  keywords: ['Polyv', 'Next.js', 'Dashboard', 'React', 'React Hooks', 'Vercel'],
  authors: [{name: 'Polyv', url: 'https://www.polyv.net'}]
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  )
}
