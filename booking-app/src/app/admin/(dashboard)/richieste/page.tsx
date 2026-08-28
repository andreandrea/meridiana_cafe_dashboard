import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  BookingRequestCard,
  type BookingRequest,
} from "@/components/admin/BookingRequestCard";

export const dynamic = "force-dynamic";

async function getBookings(): Promise<BookingRequest[]> {
  const db = createSupabaseServiceRoleClient();
  const { data, error } = await db
    .from("bookings")
    .select("id, customer_name, customer_phone, party_size, start_at, status, tables(label)")
    .order("start_at", { ascending: true });

  if (error) {
    console.error("Errore nel recupero prenotazioni:", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    party_size: row.party_size,
    start_at: row.start_at,
    status: row.status,
    table_label: (row.tables as unknown as { label: string } | null)?.label ?? "—",
  }));
}

export default async function RichiestePage() {
  const bookings = await getBookings();

  const pending = bookings.filter((b) => b.status === "pending");
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const rejected = bookings.filter((b) => b.status === "rejected");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold">Richieste di prenotazione</h1>
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">In attesa ({pending.length})</TabsTrigger>
          <TabsTrigger value="confirmed">Confermate ({confirmed.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rifiutate ({rejected.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="pending" className="mt-4 flex flex-col gap-3">
          {pending.length === 0 && (
            <p className="text-sm text-muted-foreground">Nessuna richiesta in attesa.</p>
          )}
          {pending.map((b) => (
            <BookingRequestCard key={b.id} booking={b} />
          ))}
        </TabsContent>
        <TabsContent value="confirmed" className="mt-4 flex flex-col gap-3">
          {confirmed.length === 0 && (
            <p className="text-sm text-muted-foreground">Nessuna prenotazione confermata.</p>
          )}
          {confirmed.map((b) => (
            <BookingRequestCard key={b.id} booking={b} />
          ))}
        </TabsContent>
        <TabsContent value="rejected" className="mt-4 flex flex-col gap-3">
          {rejected.length === 0 && (
            <p className="text-sm text-muted-foreground">Nessuna richiesta rifiutata.</p>
          )}
          {rejected.map((b) => (
            <BookingRequestCard key={b.id} booking={b} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
