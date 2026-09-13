"use client";

import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import StatusBadge from "./StatusBadge";
import { Card } from "@/components/ui/Card";
import { Spotlight } from "@/components/ui/Spotlight";

export type ShipmentCardData = {
  id: string;
  product: string;
  manufacturer: string;
  distributor: string;
  origin: string;
  destination: string;
  status: string;
  verification: string;
  escrow: string;
  value?: string;
};

export default function ShipmentCard({
  shipment,
}: {
  shipment: ShipmentCardData;
}) {
  return (
    <Link
      href={`/shipments/${shipment.id}`}
      className="group block"
    >
      <Card className="p-5"><Spotlight>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
            {shipment.id}
          </p>

          <h3 className="mt-2 text-sm font-semibold">{shipment.product}</h3>
        </div>

        <ArrowUpRight
          size={16}
          className="text-gray-300 transition group-hover:text-black"
        />
      </div>

      <div className="mt-6 flex items-center gap-3 text-xs">
        <div>
          <p className="font-medium">{shipment.manufacturer}</p>
          <p className="mt-1 text-gray-400">{shipment.origin}</p>
        </div>

        <div className="h-px flex-1 bg-gray-200" />

        <div className="text-right">
          <p className="font-medium">{shipment.distributor}</p>
          <p className="mt-1 text-gray-400">{shipment.destination}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2 text-[10px] text-gray-400">
        <MapPin size={12} />
        Shipment tracking active
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
        <StatusBadge status={shipment.status} />
        <StatusBadge status={shipment.verification} />
        <StatusBadge status={shipment.escrow} />
      </div>
      </Spotlight></Card>
    </Link>
  );
}