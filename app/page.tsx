import Logo from '@/app/ui/logo'
import { lusitana } from '@/app/ui/fonts'
import { Button } from '@/app/ui/button';
import Link from 'next/link';

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col p-6">
      <div className="flex shrink-0 items-center justify-center rounded-lg bg-blue-500 md:h-52">
        <Logo />
      </div>
      <div className="mt-4 flex grow flex-col gap-4 md:flex-row">
        <div className="flex flex-col justify-center gap-6 rounded-lg bg-gray-50 px-6 py-10 md:w-full md:px-20">
          <p className={`text-xl text-gray-800 md:text-3xl md:leading-normal text-center ${lusitana.className}`}>
            <strong>Hello 1024</strong>
          </p>

          <div className='flex justify-center'>
            <Button>
              <Link href='/dashboard'>Go</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
