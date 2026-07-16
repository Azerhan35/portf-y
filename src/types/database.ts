export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "paused"
  | "canceled";

export type Profile = {
  id: string;
  email: string;
  subscription_status: SubscriptionStatus;
  paddle_customer_id: string | null;
  paddle_subscription_id: string | null;
  trial_ends_at: string | null;
  created_at: string;
};

export type Watchlist = {
  id: string;
  user_id: string;
  ticker: string;
  created_at: string;
};

export type TradeSource = "form4" | "13f" | "congress";
export type TransactionType = "buy" | "sell" | "other";

export type InsiderTrade = {
  id: string;
  ticker: string;
  cik: string | null;
  insider_name: string;
  insider_role: string | null;
  transaction_type: TransactionType;
  shares: number | null;
  price: number | null;
  total_value: number | null;
  filing_date: string;
  transaction_date: string | null;
  source: TradeSource;
  accession_number: string;
  created_at: string;
};

export type Notification = {
  id: string;
  user_id: string;
  trade_id: string;
  channel: "email" | "push";
  sent_at: string;
};

export type TradeSide = "long" | "short";

// Trading journal: kullanıcının kendi işlem geçmişi (insider_trades ile
// karışmasın diye JournalTrade adlandırıldı).
export type JournalTrade = {
  id: string;
  user_id: string;
  symbol: string;
  side: TradeSide;
  quantity: number;
  entry_price: number;
  exit_price: number | null;
  fees: number;
  entered_at: string;
  exited_at: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      watchlists: {
        Row: Watchlist;
        Insert: Partial<Watchlist> & { user_id: string; ticker: string };
        Update: Partial<Watchlist>;
        Relationships: [];
      };
      insider_trades: {
        Row: InsiderTrade;
        Insert: Partial<InsiderTrade> & {
          ticker: string;
          insider_name: string;
          transaction_type: TransactionType;
          filing_date: string;
          source: TradeSource;
          accession_number: string;
        };
        Update: Partial<InsiderTrade>;
        Relationships: [];
      };
      notifications: {
        Row: Notification;
        Insert: Partial<Notification> & { user_id: string; trade_id: string };
        Update: Partial<Notification>;
        Relationships: [];
      };
      trades: {
        Row: JournalTrade;
        Insert: Partial<JournalTrade> & {
          user_id: string;
          symbol: string;
          side: TradeSide;
          quantity: number;
          entry_price: number;
          entered_at: string;
        };
        Update: Partial<JournalTrade>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
