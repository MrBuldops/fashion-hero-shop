"use client";

import { usePathname } from "next/navigation";

import { AnnouncementBar } from "./announcement-bar";
import { Header } from "./header";
import { Footer } from "./footer";
import { CartProvider, useCart } from "./cart-provider";
import { WishlistProvider, useWishlist } from "./wishlist-provider";
import { QuickViewProvider } from "./quick-view-provider";
import { AuthProvider } from "./auth-provider";

// Standalone tools (seller panel, analyst inbox) render their own full-screen
// layout, so skip the storefront chrome (announcement bar / header / footer).
const BARE_PREFIXES = ["/seller", "/inbox"];

function ShellInner({ children }: { children: React.ReactNode }) {
  const { openCart, itemCount } = useCart();
  const { wishlistItems } = useWishlist();
  const pathname = usePathname();

  if (BARE_PREFIXES.some((prefix) => pathname?.startsWith(prefix))) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <AnnouncementBar />
      <Header onCartOpen={openCart} cartCount={itemCount} wishlistCount={wishlistItems.length} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <QuickViewProvider>
            <ShellInner>{children}</ShellInner>
          </QuickViewProvider>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}
