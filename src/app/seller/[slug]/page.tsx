import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AgentChat } from "@/components/agent/agent-chat";
import { getProductsBySeller } from "@/data/products";
import { getSeller } from "@/data/sellers";

// Dummy seller panel for the Wizard of Oz "AI Growth Partner Agent" test.
// Access per participant via /seller/<slug>, e.g. /seller/urban-edge.

export default async function SellerPanelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const seller = getSeller(slug);
  if (!seller) notFound();

  const products = getProductsBySeller(slug);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* header */}
        <header className="flex flex-col gap-1 border-b border-border pb-6">
          <p className="text-[11px] font-medium uppercase tracking-[1px] text-warm-gray">
            Panel sprzedawcy · FashionHero
          </p>
          <h1 className="text-2xl font-semibold text-charcoal">{seller.name}</h1>
          <p className="max-w-2xl text-sm text-warm-gray">{seller.description}</p>
        </header>

        <div className="mt-8 grid gap-10 md:grid-cols-[1fr_minmax(0,28rem)]">
          {/* left: seller's products (real data) */}
          <section>
            <h2 className="mb-4 text-[11px] font-medium uppercase tracking-[1px] text-warm-gray">
              Twoje produkty ({products.length})
            </h2>
            {products.length === 0 ? (
              <p className="text-sm text-warm-gray">
                Nie masz jeszcze wystawionych produktów.
              </p>
            ) : (
              <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {products.map((p) => (
                  <li
                    key={p.id}
                    className="overflow-hidden rounded-lg border border-border bg-card"
                  >
                    <div className="relative aspect-square bg-secondary">
                      {p.images[0] && (
                        <Image
                          src={p.images[0]}
                          alt={p.name}
                          fill
                          sizes="(max-width: 640px) 50vw, 160px"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="px-3 py-2">
                      <p className="truncate text-sm text-foreground">{p.name}</p>
                      <p className="text-[13px] text-warm-gray">{p.price} zł</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* right: partner agent */}
          <aside className="flex flex-col gap-4">
            <div>
              <h2 className="mb-1 text-[11px] font-medium uppercase tracking-[1px] text-warm-gray">
                Twój agent partner
              </h2>
              <p className="text-sm text-warm-gray">
                Masz pytanie o sprzedaż? Zapytaj agenta partnera — pomoże Ci
                zwiększyć wyniki.
              </p>
            </div>
            <AgentChat sellerId={seller.id} sellerName={seller.name} />
          </aside>
        </div>

        <footer className="mt-12 border-t border-border pt-4">
          <Link
            href="/"
            className="text-[11px] uppercase tracking-[1px] text-warm-gray hover:text-charcoal"
          >
            ← Wróć do sklepu
          </Link>
        </footer>
      </div>
    </div>
  );
}
