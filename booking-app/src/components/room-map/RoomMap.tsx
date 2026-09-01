"use client";

export type RoomMapTable = {
  id: string;
  label: string;
  seats_min: number;
  seats_max: number;
  pos_x: number; // percentuale 0-100
  pos_y: number; // percentuale 0-100
  is_occupied?: boolean;
  is_compatible?: boolean;
};

type RoomMapProps = {
  tables: RoomMapTable[];
  selectedTableId?: string | null;
  onSelectTable?: (tableId: string) => void;
};

function tableDiameter(seatsMax: number): number {
  if (seatsMax <= 2) return 64;
  if (seatsMax <= 4) return 84;
  if (seatsMax <= 6) return 104;
  return 124;
}

function tableState(table: RoomMapTable, isSelected: boolean) {
  if (isSelected) return "selected" as const;
  if (table.is_occupied) return "occupied" as const;
  if (table.is_compatible === false) return "incompatible" as const;
  return "free" as const;
}

const STATE_STYLES: Record<
  ReturnType<typeof tableState>,
  { bg: string; border: string; text: string; seat: string; clickable: boolean }
> = {
  selected: {
    bg: "var(--brand-gold)",
    border: "#b8960a",
    text: "#333",
    seat: "#b8960a",
    clickable: true,
  },
  occupied: {
    bg: "rgb(120 120 120 / 0.5)",
    border: "rgb(90 90 90)",
    text: "#fff",
    seat: "rgb(90 90 90)",
    clickable: false,
  },
  incompatible: {
    bg: "rgb(255 255 255 / 0.15)",
    border: "rgb(255 255 255 / 0.25)",
    text: "rgb(255 255 255 / 0.5)",
    seat: "rgb(255 255 255 / 0.2)",
    clickable: false,
  },
  free: {
    bg: "rgb(255 255 255 / 0.85)",
    border: "rgb(255 255 255)",
    text: "#333",
    seat: "rgb(255 255 255 / 0.9)",
    clickable: true,
  },
};

export function RoomMap({ tables, selectedTableId, onSelectTable }: RoomMapProps) {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-white/20 bg-black/10">
      {tables.map((table) => {
        const isSelected = table.id === selectedTableId;
        const state = tableState(table, isSelected);
        const style = STATE_STYLES[state];
        const diameter = tableDiameter(table.seats_max);
        const radius = diameter / 2;
        const seatRadius = radius + 14;

        return (
          <div
            key={table.id}
            className="absolute"
            style={{
              left: `${table.pos_x}%`,
              top: `${table.pos_y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Seggiole intorno al tavolo */}
            {Array.from({ length: table.seats_max }).map((_, i) => {
              const angle = (i / table.seats_max) * 2 * Math.PI - Math.PI / 2;
              const seatX = Math.cos(angle) * seatRadius;
              const seatY = Math.sin(angle) * seatRadius;
              return (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: 10,
                    height: 10,
                    left: `calc(50% + ${seatX}px)`,
                    top: `calc(50% + ${seatY}px)`,
                    transform: "translate(-50%, -50%)",
                    background: style.seat,
                  }}
                />
              );
            })}

            {/* Tavolo */}
            <button
              type="button"
              disabled={!style.clickable}
              onClick={() => onSelectTable?.(table.id)}
              className="relative flex flex-col items-center justify-center rounded-full text-center transition-transform"
              style={{
                width: diameter,
                height: diameter,
                background: style.bg,
                border: `2px solid ${style.border}`,
                color: style.text,
                cursor: style.clickable ? "pointer" : "not-allowed",
              }}
              title={`${table.label} · ${table.seats_min}-${table.seats_max} persone`}
            >
              <span className="text-[11px] font-bold leading-tight">
                {table.label}
              </span>
              <span className="text-[9px] leading-tight opacity-80">
                {table.seats_max}p
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
