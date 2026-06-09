import pool from "@/lib/db";

// Self-provisioning BBQ sign-up list. The table is created on demand and seeded
// from the family sheet, so it works on a fresh or already-deployed database
// without manual SQL. `claimed_by = NULL` means the item is still up for grabs.

export interface BbqItem {
  id: number;
  section: string;
  item: string;
  amount: string;
  unit: string;
  claimed_by: string | null;
  note: string | null;
  sort_order: number;
}

export const BBQ_INFO = {
  title: "Aversa Family BBQ",
  day: "Saturday · July 18, 2026",
  time: "12 Noon – 4 PM",
  guests: 50,
};

// Section render order. "Also Bringing" holds family-added items and always
// comes last.
export const BBQ_SECTIONS = [
  "Paper Goods",
  "Hot Dogs & Grilling",
  'The "Day-of" Items',
  "Also Bringing",
];

type SeedItem = Omit<BbqItem, "id">;

const DEFAULTS: SeedItem[] = [
  { section: "Paper Goods", item: "Plates, Forks, Cups & Napkins", amount: "For", unit: "50 guests", claimed_by: "Mike & Joanne", note: null, sort_order: 1 },

  { section: "Hot Dogs & Grilling", item: "Hot Dogs", amount: "2 pkgs.", unit: "36 each", claimed_by: "Tom & Angela", note: null, sort_order: 2 },
  { section: "Hot Dogs & Grilling", item: "Martin's Hot Dog Rolls", amount: "4 pkgs.", unit: "16 each", claimed_by: "Tom & Angela", note: null, sort_order: 3 },
  { section: "Hot Dogs & Grilling", item: "Mustard, Ketchup & Relish", amount: "1", unit: "Set", claimed_by: "Tom & Angela", note: null, sort_order: 4 },
  { section: "Hot Dogs & Grilling", item: "BBQ Tools & Knife", amount: "1", unit: "Set", claimed_by: "Tom & Angela", note: null, sort_order: 5 },
  { section: "Hot Dogs & Grilling", item: "Aluminum Foil", amount: "1", unit: "Roll", claimed_by: "Tom & Angela", note: null, sort_order: 6 },
  { section: "Hot Dogs & Grilling", item: "Cutting Board", amount: "1", unit: "Each", claimed_by: "Tom & Angela", note: null, sort_order: 7 },

  { section: 'The "Day-of" Items', item: "Hamburger Patties", amount: "For", unit: "50 guests", claimed_by: null, note: null, sort_order: 8 },
  { section: 'The "Day-of" Items', item: "Hamburger Buns", amount: "For", unit: "50 guests", claimed_by: null, note: null, sort_order: 9 },
  { section: 'The "Day-of" Items', item: "American Cheese, Slices", amount: "For", unit: "Burgers", claimed_by: null, note: null, sort_order: 10 },
  { section: 'The "Day-of" Items', item: "Charcoal, Briquettes", amount: "1 small", unit: "Bag", claimed_by: null, note: null, sort_order: 11 },
  { section: 'The "Day-of" Items', item: "Lighter Fluid", amount: "1", unit: "Pint", claimed_by: null, note: null, sort_order: 12 },
  { section: 'The "Day-of" Items', item: "Potato Salad", amount: "3", unit: "lbs.", claimed_by: null, note: null, sort_order: 13 },
  { section: 'The "Day-of" Items', item: "Cole Slaw", amount: "2", unit: "lbs.", claimed_by: null, note: null, sort_order: 14 },
  { section: 'The "Day-of" Items', item: "Marshmallows", amount: "1", unit: "Bag", claimed_by: null, note: null, sort_order: 15 },
  { section: 'The "Day-of" Items', item: "Ice, Cubes", amount: "4", unit: "10 lb. bags", claimed_by: null, note: "? or Hotel", sort_order: 16 },
  { section: 'The "Day-of" Items', item: "Watermelon", amount: "2", unit: "Large", claimed_by: "Justin & Belinda", note: null, sort_order: 17 },
  { section: 'The "Day-of" Items', item: "Beer (Your Choice), Cans", amount: "1", unit: "Case", claimed_by: "Justin & Belinda", note: null, sort_order: 18 },
  { section: 'The "Day-of" Items', item: "Soda Cans (Cola & Sprite)", amount: "2", unit: "Cases", claimed_by: "Justin & Belinda", note: null, sort_order: 19 },
  { section: 'The "Day-of" Items', item: "Snapple Iced Tea", amount: "1", unit: "Case", claimed_by: null, note: null, sort_order: 20 },
  { section: 'The "Day-of" Items', item: "Bottled Water", amount: "1", unit: "Case", claimed_by: null, note: null, sort_order: 21 },
  { section: 'The "Day-of" Items', item: "Mini Cupcakes", amount: "For", unit: "25 guests", claimed_by: null, note: null, sort_order: 22 },
  { section: 'The "Day-of" Items', item: "Cookies", amount: "For", unit: "25 guests", claimed_by: null, note: null, sort_order: 23 },
];

let ensured = false;

export async function ensureBbqSchema(): Promise<void> {
  if (ensured) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bbq_items (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      section     VARCHAR(60)  NOT NULL DEFAULT '',
      item        VARCHAR(200) NOT NULL,
      amount      VARCHAR(60)  NOT NULL DEFAULT '',
      unit        VARCHAR(60)  NOT NULL DEFAULT '',
      claimed_by  VARCHAR(100) DEFAULT NULL,
      note        VARCHAR(120) DEFAULT NULL,
      sort_order  INT          NOT NULL DEFAULT 0,
      is_default  TINYINT(1)   NOT NULL DEFAULT 0,
      created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [rows] = await pool.query("SELECT COUNT(*) AS c FROM bbq_items");
  const count = (rows as { c: number }[])[0]?.c ?? 0;
  if (count === 0) {
    for (const d of DEFAULTS) {
      await pool.query(
        "INSERT INTO bbq_items (section, item, amount, unit, claimed_by, note, sort_order, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
        [d.section, d.item, d.amount, d.unit, d.claimed_by, d.note, d.sort_order]
      );
    }
  }

  ensured = true;
}
