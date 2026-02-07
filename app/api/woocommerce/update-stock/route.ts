import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { wp_id, newStock } = await req.json();

  if (!wp_id || newStock === undefined) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }

  const res = await fetch(
    `${process.env.WC_URL}/wp-json/wc/v3/products/${wp_id}`,
    {
      method: 'PUT',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(
            `${process.env.WC_KEY}:${process.env.WC_SECRET}`
          ).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        stock_quantity: newStock,
        manage_stock: true
      })
    }
  );

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
