import Image from "next/image";
import Link from "next/link";
import { BookingWizard } from "@/components/booking/BookingWizard";

export default function PrenotaPage() {
  return (
    <div className="brand-gradient-bg flex flex-1 flex-col items-center px-6 py-10">
      <Link href="/" className="mb-6">
        <Image src="/logo.svg" alt="Meridiana Cafè" width={140} height={40} className="h-9 w-auto" priority />
      </Link>
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center text-white">
          <h1 className="text-2xl font-bold">Prenota un tavolo</h1>
        </div>
        <BookingWizard />
      </div>
    </div>
  );
}
