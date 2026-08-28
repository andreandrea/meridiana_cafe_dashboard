import { BookingWizard } from "@/components/booking/BookingWizard";

export default function PrenotaPage() {
  return (
    <div className="brand-gradient-bg flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center text-white">
          <p className="text-sm font-bold uppercase tracking-[3px] opacity-90">
            Meridiana Cafè
          </p>
          <h1 className="mt-2 text-2xl font-bold">Prenota un tavolo</h1>
        </div>
        <BookingWizard />
      </div>
    </div>
  );
}
