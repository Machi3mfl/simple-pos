import { CircleDollarSign, History, House, Percent, UtensilsCrossed } from "lucide-react";

import { LeftNavRail, type PosNavItem } from "./LeftNavRail";
import {
  ProductCatalogPanel,
  type CatalogCategory,
  type CatalogProduct,
} from "./ProductCatalogPanel";
import { CheckoutPanel, type CheckoutOrderItem } from "./CheckoutPanel";

const navItems: readonly PosNavItem[] = [
  { id: "home", label: "Home", icon: House },
  { id: "menu", label: "Menu", icon: UtensilsCrossed },
  { id: "history", label: "History", icon: History },
  { id: "promos", label: "Promos", icon: Percent },
  { id: "wallet", label: "Wallet", icon: CircleDollarSign },
];

const categories: readonly CatalogCategory[] = [
  { id: "all", label: "All", emoji: "🍱" },
  { id: "main", label: "Main", emoji: "🍜" },
  { id: "drink", label: "Drink", emoji: "🥤" },
  { id: "snack", label: "Snack", emoji: "🍔" },
  { id: "dessert", label: "Dessert", emoji: "🧁" },
];

const products: readonly CatalogProduct[] = [
  {
    id: "prod-1",
    name: "Regular Noodles",
    subtitle: "Instant noodles with egg and vegetables",
    price: 10,
    isAvailable: true,
    emoji: "🍜",
  },
  {
    id: "prod-2",
    name: "Ebi Spaghetti",
    subtitle: "Spicy spaghetti with fresh shrimps",
    price: 35,
    isAvailable: true,
    emoji: "🍝",
  },
  {
    id: "prod-3",
    name: "Javanese Noodles",
    subtitle: "Noodles with meat and vegetables",
    price: 20,
    isAvailable: false,
    emoji: "🥘",
  },
  {
    id: "prod-4",
    name: "Iced Tea",
    subtitle: "Cold lemon tea",
    price: 6,
    isAvailable: true,
    emoji: "🧋",
  },
];

const orderItems: readonly CheckoutOrderItem[] = [
  { id: "line-1", name: "Regular Noodles", price: 20, quantity: 2, emoji: "🍜" },
  { id: "line-2", name: "Chicken Noodles", price: 15, quantity: 1, emoji: "🍲" },
  { id: "line-3", name: "Chicken Curry", price: 25, quantity: 1, emoji: "🍛" },
];

export function PosLayout(): JSX.Element {
  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = 5;
  const tax = 8;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#cbd5e1_0%,_#94a3b8_45%,_#64748b_100%)] p-3 sm:p-4 lg:p-6">
      <div className="mx-auto max-w-[1500px] rounded-[2.4rem] border border-slate-300/40 bg-white/35 p-2 shadow-2xl shadow-slate-900/15 backdrop-blur-sm lg:p-3">
        <div className="grid min-h-[calc(100vh-3rem)] grid-cols-1 gap-3 lg:grid-cols-[110px_1fr_360px] lg:gap-4">
          <LeftNavRail items={navItems} activeItemId="menu" />
          <ProductCatalogPanel
            categories={categories}
            activeCategoryId="main"
            products={products}
          />
          <CheckoutPanel
            items={orderItems}
            subtotal={subtotal}
            discount={discount}
            tax={tax}
          />
        </div>
      </div>
    </main>
  );
}
