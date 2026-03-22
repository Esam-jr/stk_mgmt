"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Search, ShoppingCart, CreditCard, Banknote } from "lucide-react";
import toast from "react-hot-toast";

type StockItem = {
  id: string; barcode: string; brand: string; category: string; size: string;
  quantity: number; sellingPrice: number;
};
type CartItem = StockItem & { cartQty: number };

export default function PosPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER">("CASH");
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const res = await fetch(`/api/stock/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        setSearchResults(await res.json());
      } else {
        toast.error("Failed to search stock");
      }
    } catch (err) {
      toast.error("Error occurred while searching");
    } finally {
      setIsSearching(false);
    }
  };

  const addToCart = (item: StockItem) => {
    if (item.quantity <= 0) {
      toast.error("Item is out of stock!");
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        if (existing.cartQty >= item.quantity) {
          toast.error("Cannot add more than available stock");
          return prev;
        }
        return prev.map(i => i.id === item.id ? { ...i, cartQty: i.cartQty + 1 } : i);
      }
      return [...prev, { ...item, cartQty: 1 }];
    });
    toast.success("Added to cart");
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return toast.error("Cart is empty");
    setIsProcessing(true);
    
    try {
      const items = cart.map(item => ({ stockId: item.id, quantity: item.cartQty }));
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, paymentMethod }),
      });
      
      if (!res.ok) throw new Error(await res.text());
      toast.success("Sale completed successfully!");
      setCart([]);
      setSearchResults([]);
      setSearchQuery("");
    } catch (error) {
      toast.error("Failed to process sale. Check available stock.");
    } finally {
      setIsProcessing(false);
    }
  };

  const totalAmount = cart.reduce((acc, item) => acc + (item.sellingPrice * item.cartQty), 0);

  return (
    <div className="grid grid-cols-3 gap-8 h-[calc(100vh-8rem)]">
      {/* Search & Results Section */}
      <div className="col-span-2 flex flex-col space-y-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <form onSubmit={handleSearch} className="flex gap-3 relative">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-zinc-500" />
              <Input
                autoFocus
                type="text"
                placeholder="Search by Barcode, Category, Brand..."
                className="pl-10 h-12 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" size="lg" isLoading={isSearching}>Find Product</Button>
          </form>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex-1 overflow-y-auto">
          <h2 className="text-lg font-semibold text-white mb-4">Search Results</h2>
          {searchResults.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <PackageIcon className="mx-auto h-12 w-12 opacity-20 mb-3" />
              <p>Search for a product to begin</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {searchResults.map((item) => (
                <div key={item.id} className="border border-zinc-800 bg-zinc-950 p-4 rounded-lg flex flex-col justify-between">
                  <div>
                    <h3 className="font-medium text-white">{item.brand} - {item.category}</h3>
                    <p className="text-sm text-zinc-400">Size: {item.size} | Barcode: {item.barcode}</p>
                    <div className="mt-2 text-lg font-bold text-indigo-400">${item.sellingPrice.toFixed(2)}</div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm text-zinc-500">{item.quantity} in stock</span>
                    <Button 
                      size="sm" 
                      onClick={() => addToCart(item)}
                      disabled={item.quantity === 0}
                      variant="secondary"
                    >
                      Add to Cart
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart & Checkout Section */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-indigo-400" /> Current Sale
        </h2>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {cart.length === 0 ? (
            <p className="text-zinc-500 text-center mt-10">Cart is empty</p>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="flex justify-between items-center bg-zinc-950 p-3 rounded-md border border-zinc-800">
                <div>
                  <div className="font-medium text-zinc-200">{item.brand} {item.category}</div>
                  <div className="text-xs text-zinc-500">${item.sellingPrice.toFixed(2)} × {item.cartQty}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-zinc-100">${(item.sellingPrice * item.cartQty).toFixed(2)}</span>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-300 text-xl leading-none">&times;</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-zinc-800 space-y-4">
          <div className="flex justify-between text-lg">
            <span className="text-zinc-400">Total</span>
            <span className="font-bold text-2xl text-white">${totalAmount.toFixed(2)}</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Payment Method</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={`flex items-center justify-center gap-2 py-3 rounded-md border transition-colors ${
                  paymentMethod === "CASH" ? "bg-indigo-600/20 border-indigo-500 text-indigo-400 font-medium" : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                }`}
                onClick={() => setPaymentMethod("CASH")}
              >
                <Banknote className="h-4 w-4" /> Cash
              </button>
              <button
                type="button"
                className={`flex items-center justify-center gap-2 py-3 rounded-md border transition-colors ${
                  paymentMethod === "TRANSFER" ? "bg-indigo-600/20 border-indigo-500 text-indigo-400 font-medium" : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                }`}
                onClick={() => setPaymentMethod("TRANSFER")}
              >
                <CreditCard className="h-4 w-4" /> Transfer
              </button>
            </div>
          </div>

          <Button 
            className="w-full h-14 text-lg" 
            onClick={handleCheckout} 
            disabled={cart.length === 0 || isProcessing}
            isLoading={isProcessing}
          >
            Complete Sale
          </Button>
        </div>
      </div>
    </div>
  );
}

function PackageIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/>
    </svg>
  );
}
