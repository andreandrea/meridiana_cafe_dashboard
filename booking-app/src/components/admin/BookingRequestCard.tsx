"use client";

import { useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  acceptBookingAction,
  rejectBookingAction,
} from "@/app/admin/(dashboard)/richieste/actions";

export type BookingRequest = {
  id: string;
  customer_name: string;
  customer_phone: string;
  party_size: number;
  start_at: string;
  status: "pending" | "confirmed" | "rejected" | "cancelled";
  table_label: string;
};

const STATUS_LABEL: Record<BookingRequest["status"], string> = {
  pending: "In attesa",
  confirmed: "Confermata",
  rejected: "Rifiutata",
  cancelled: "Annullata",
};

const STATUS_VARIANT: Record<
  BookingRequest["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "outline",
  confirmed: "default",
  rejected: "destructive",
  cancelled: "secondary",
};

export function BookingRequestCard({ booking }: { booking: BookingRequest }) {
  const [isPending, startTransition] = useTransition();

  const formattedDate = new Date(booking.start_at).toLocaleString("it-IT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  function handleAccept() {
    startTransition(async () => {
      const result = await acceptBookingAction(booking.id);
      if (result.alreadyDecided) {
        alert("Questa richiesta era già stata gestita (probabilmente da Telegram).");
      }
    });
  }

  function handleReject() {
    startTransition(async () => {
      const result = await rejectBookingAction(booking.id);
      if (result.alreadyDecided) {
        alert("Questa richiesta era già stata gestita (probabilmente da Telegram).");
      }
    });
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{booking.customer_name}</span>
            <Badge variant={STATUS_VARIANT[booking.status]}>
              {STATUS_LABEL[booking.status]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {formattedDate} · {booking.party_size} persone · {booking.table_label}
          </p>
          <p className="text-sm text-muted-foreground">{booking.customer_phone}</p>
        </div>
        {booking.status === "pending" && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={handleReject}
            >
              Rifiuta
            </Button>
            <Button size="sm" disabled={isPending} onClick={handleAccept}>
              Accetta
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
