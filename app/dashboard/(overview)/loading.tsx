import {InvoicesTableSkeleton, InvoiceSkeleton} from "@/app/ui/skeletons"

export default function Loading() {
  return (
    <>
      <InvoiceSkeleton />
      <InvoicesTableSkeleton />
    </>
  )
}
