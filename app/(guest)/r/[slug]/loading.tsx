import { GuestMenuSkeleton } from "@/components/guest/guest-menu-view";

export default function GuestMenuLoading() {
  return (
    <div className="min-h-[100dvh] bg-background pb-24">
      <GuestMenuSkeleton />
    </div>
  );
}
