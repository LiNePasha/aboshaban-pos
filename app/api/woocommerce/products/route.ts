import { NextResponse } from "next/server"
import { getProducts } from "@/lib/woocommerce"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get("page") || 1)
  const perPage = Number(searchParams.get("perPage") || 20)
  const search = searchParams.get("search") || ""

  const products = await getProducts(page, perPage, search)
  return NextResponse.json(products)
}
