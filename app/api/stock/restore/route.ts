import { supabase } from "@/lib/supabase/client";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { sku, qty } = await req.json();

  await supabase.rpc('restore_product_stock', {
    p_sku: sku,
    p_qty: qty
  });

  return Response.json({ restored: true });
}
