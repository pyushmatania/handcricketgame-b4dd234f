import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import BottomNav from "@/components/BottomNav";
import TopStatusBar from "@/components/TopStatusBar";
import { toast } from "sonner";

interface ShopItem {
  id: string;
  name: string;
  category: string;
  price: number;
  rarity: string;
  preview_emoji: string;
  description: string;
  metadata: any;
  sort_order: number;
}

interface Purchase {
  item_id: string;
  equipped: boolean;
}

const RARITY_STYLES: Record<string, { border: string; bg: string; glow: string; label: string; labelColor: string }> = {
  common: { border: "border-muted/30", bg: "from-muted/10 to-transparent", glow: "", label: "COMMON", labelColor: "text-muted-foreground" },
  rare: { border: "border-primary/30", bg: "from-primary/10 to-transparent", glow: "shadow-[0_0_12px_hsl(217_91%_60%/0.15)]", label: "RARE", labelColor: "text-primary" },
  epic: { border: "border-accent/30", bg: "from-accent/10 to-transparent", glow: "shadow-[0_0_16px_hsl(168_80%_50%/0.2)]", label: "EPIC", labelColor: "text-accent" },
  legendary: { border: "border-score-gold/40", bg: "from-score-gold/15 to-transparent", glow: "shadow-[0_0_20px_hsl(45_93%_58%/0.25)]", label: "LEGENDARY", labelColor: "text-score-gold" },
};

const CATEGORIES = [
  { key: "all", label: "ALL", icon: "🛒" },
  { key: "bat_skin", label: "BATS", icon: "🏏" },
  { key: "vs_effect", label: "VS FX", icon: "⚔️" },
  { key: "avatar_frame", label: "FRAMES", icon: "🖼️" },
];

export default function ShopPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [coins, setCoins] = useState(0);
  const [category, setCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (!user) return;

    supabase.from("shop_items").select("*").order("sort_order")
      .then(({ data }) => { if (data) setItems(data as unknown as ShopItem[]); });

    supabase.from("user_purchases").select("item_id, equipped").eq("user_id", user.id)
      .then(({ data }) => { if (data) setPurchases(data as unknown as Purchase[]); });

    supabase.from("profiles").select("coins").eq("user_id", user.id).single()
      .then(({ data }) => { if (data) setCoins((data as any).coins || 0); });
  }, [user]);

  const isOwned = (itemId: string) => purchases.some(p => p.item_id === itemId);
  const isEquipped = (itemId: string) => purchases.some(p => p.item_id === itemId && p.equipped);

  const handlePurchase = async (item: ShopItem) => {
    if (!user || purchasing) return;
    if (coins < item.price) {
      toast.error("Not enough coins! Play more matches to earn.");
      return;
    }
    setPurchasing(true);

    // Deduct coins
    const newCoins = coins - item.price;
    await supabase.from("profiles").update({ coins: newCoins } as any).eq("user_id", user.id);

    // Insert purchase
    await supabase.from("user_purchases").insert({
      user_id: user.id,
      item_id: item.id,
    } as any);

    setCoins(newCoins);
    setPurchases(prev => [...prev, { item_id: item.id, equipped: false }]);
    toast.success(`Purchased ${item.name}! 🎉`);
    setPurchasing(false);
  };

  const handleEquip = async (item: ShopItem) => {
    if (!user) return;

    // Unequip all in same category, equip this one
    const categoryItems = items.filter(i => i.category === item.category);
    const ownedInCategory = categoryItems.filter(i => isOwned(i.id));

    for (const owned of ownedInCategory) {
      await supabase.from("user_purchases").update({ equipped: false } as any)
        .eq("user_id", user.id).eq("item_id", owned.id);
    }

    await supabase.from("user_purchases").update({ equipped: true } as any)
      .eq("user_id", user.id).eq("item_id", item.id);

    // Update profile equipped field
    const fieldMap: Record<string, string> = {
      bat_skin: "equipped_bat_skin",
      vs_effect: "equipped_vs_effect",
      avatar_frame: "equipped_avatar_frame",
    };
    const field = fieldMap[item.category];
    if (field) {
      await supabase.from("profiles").update({ [field]: item.name } as any).eq("user_id", user.id);
    }

    setPurchases(prev => prev.map(p => ({
      ...p,
      equipped: p.item_id === item.id ? true :
        categoryItems.some(ci => ci.id === p.item_id) ? false : p.equipped,
    })));

    toast.success(`Equipped ${item.name}! ✨`);
    setSelectedItem(null);
  };

  const filtered = category === "all" ? items : items.filter(i => i.category === category);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden pb-24">
      <div className="absolute inset-0 stadium-gradient pointer-events-none" />
      <div className="absolute inset-0 vignette pointer-events-none" />
      <TopStatusBar />

      <div className="relative z-10 max-w-lg mx-auto px-4 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-xl glass-premium flex items-center justify-center text-sm">←</motion.button>
            <div>
              <h1 className="font-display text-base font-black text-foreground tracking-wider">COSMETIC SHOP</h1>
              <span className="text-[8px] text-muted-foreground font-display tracking-wider">Customize your style</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-premium border border-secondary/20">
            <span className="text-sm">🪙</span>
            <span className="font-display text-sm font-black text-secondary">{coins}</span>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 mb-4 glass-card rounded-xl p-1">
          {CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setCategory(c.key)}
              className={`flex-1 py-2 rounded-lg font-display text-[8px] font-bold tracking-widest transition-all flex items-center justify-center gap-1 ${
                category === c.key ? "bg-primary/15 text-primary border border-primary/20" : "text-muted-foreground"
              }`}>
              <span className="text-xs">{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>

        {/* Items grid */}
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((item, i) => {
            const owned = isOwned(item.id);
            const equipped = isEquipped(item.id);
            const style = RARITY_STYLES[item.rarity] || RARITY_STYLES.common;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedItem(item)}
                className={`glass-premium rounded-xl p-3 relative overflow-hidden cursor-pointer border transition-all active:scale-[0.97] ${style.border} ${equipped ? style.glow : ""}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${style.bg}`} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[6px] font-display font-bold tracking-widest ${style.labelColor}`}>{style.label}</span>
                    {equipped && (
                      <span className="text-[6px] font-display font-bold text-neon-green tracking-wider bg-neon-green/10 px-1.5 py-0.5 rounded">EQUIPPED</span>
                    )}
                    {owned && !equipped && (
                      <span className="text-[6px] font-display font-bold text-primary tracking-wider bg-primary/10 px-1.5 py-0.5 rounded">OWNED</span>
                    )}
                  </div>
                  <div className="text-center py-3">
                    <span className="text-4xl">{item.preview_emoji}</span>
                  </div>
                  <span className="font-display text-[10px] font-bold text-foreground block truncate">{item.name}</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[8px] text-muted-foreground line-clamp-1">{item.description.slice(0, 25)}</span>
                    {!owned && (
                      <span className="font-display text-[9px] font-bold text-secondary flex items-center gap-0.5">
                        🪙 {item.price}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center p-4"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm glass-premium rounded-3xl p-5 space-y-4 border border-primary/20"
            >
              {(() => {
                const item = selectedItem;
                const owned = isOwned(item.id);
                const equipped = isEquipped(item.id);
                const style = RARITY_STYLES[item.rarity] || RARITY_STYLES.common;
                const canAfford = coins >= item.price;

                return (
                  <>
                    <div className="text-center">
                      <span className={`text-[8px] font-display font-bold tracking-widest ${style.labelColor}`}>{style.label}</span>
                      <div className="py-6">
                        <motion.span
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="text-7xl block"
                        >
                          {item.preview_emoji}
                        </motion.span>
                      </div>
                      <h3 className="font-display text-lg font-black text-foreground tracking-wider">{item.name}</h3>
                      <p className="text-[10px] text-muted-foreground mt-1">{item.description}</p>
                      <span className="text-[8px] text-muted-foreground/50 font-display tracking-wider mt-1 block">
                        {item.category === "bat_skin" ? "🏏 Bat Skin" : item.category === "vs_effect" ? "⚔️ VS Effect" : "🖼️ Avatar Frame"}
                      </span>
                    </div>

                    {!owned && (
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-lg">🪙</span>
                        <span className={`font-display text-2xl font-black ${canAfford ? "text-secondary" : "text-out-red"}`}>
                          {item.price}
                        </span>
                        {!canAfford && (
                          <span className="text-[8px] text-out-red font-display">({item.price - coins} more needed)</span>
                        )}
                      </div>
                    )}

                    <div className="flex gap-3">
                      {!owned ? (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handlePurchase(item)}
                          disabled={!canAfford || purchasing}
                          className={`flex-1 py-3.5 font-display font-bold rounded-2xl tracking-wider text-sm ${
                            canAfford
                              ? "bg-gradient-to-r from-secondary to-secondary/80 text-secondary-foreground shadow-[0_0_20px_hsl(45_93%_58%/0.2)]"
                              : "bg-muted/30 text-muted-foreground cursor-not-allowed"
                          }`}
                        >
                          {purchasing ? "..." : canAfford ? "🪙 BUY NOW" : "NOT ENOUGH COINS"}
                        </motion.button>
                      ) : equipped ? (
                        <div className="flex-1 py-3.5 rounded-2xl glass-premium text-center font-display font-bold text-neon-green tracking-wider text-sm border border-neon-green/20">
                          ✅ EQUIPPED
                        </div>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleEquip(item)}
                          className="flex-1 py-3.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-display font-bold rounded-2xl tracking-wider text-sm shadow-[0_0_20px_hsl(217_91%_60%/0.2)]"
                        >
                          ⚡ EQUIP
                        </motion.button>
                      )}
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedItem(null)}
                        className="px-6 py-3.5 glass-premium text-foreground font-display font-bold rounded-2xl tracking-wider text-sm"
                      >
                        ✕
                      </motion.button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
}
