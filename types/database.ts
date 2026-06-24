export type RestaurantStatus = "trial" | "active" | "suspended";
export type PlanTier = "menu" | "starter" | "pro" | "cart" | "table";
export type MemberRole = "owner" | "manager" | "staff";
export type ExtractionSource = "photo" | "pdf" | "url";
export type ExtractionJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";
export type DietaryType = "veg" | "non_veg" | "egg" | "vegan" | "unknown";
export type OrderStatus = "pending_payment" | "pending" | "confirmed" | "served" | "cancelled";
export type ServiceRequestType = "waiter" | "water" | "bill";
export type ServiceRequestStatus = "open" | "acknowledged" | "resolved";
export type BillPaymentStatus = "unpaid" | "paid";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      restaurants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          logo_url: string | null;
          cover_image_url: string | null;
          primary_color: string;
          currency: string;
          timezone: string;
          upi_qr_url: string | null;
          upi_id: string | null;
          settings: Record<string, unknown>;
          status: RestaurantStatus;
          plan: PlanTier;
          onboarding_completed: boolean;
          // per-feature toggles
          smart_suggestions_enabled: boolean;
          ordering_enabled: boolean;
          rewards_enabled: boolean;
          token_display_enabled: boolean;
          bills_enabled: boolean;
          service_requests_enabled: boolean;
          sections_enabled: boolean;
          full_analytics_enabled: boolean;
          ai_insights_enabled: boolean;
          plan_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          primary_color?: string;
          currency?: string;
          timezone?: string;
          upi_qr_url?: string | null;
          upi_id?: string | null;
          settings?: Record<string, unknown>;
          status?: RestaurantStatus;
          plan?: PlanTier;
          onboarding_completed?: boolean;
          smart_suggestions_enabled?: boolean;
          ordering_enabled?: boolean;
          rewards_enabled?: boolean;
          token_display_enabled?: boolean;
          bills_enabled?: boolean;
          service_requests_enabled?: boolean;
          sections_enabled?: boolean;
          full_analytics_enabled?: boolean;
          ai_insights_enabled?: boolean;
          plan_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string | null;
          logo_url?: string | null;
          cover_image_url?: string | null;
          primary_color?: string;
          currency?: string;
          timezone?: string;
          upi_qr_url?: string | null;
          upi_id?: string | null;
          settings?: Record<string, unknown>;
          status?: RestaurantStatus;
          plan?: PlanTier;
          onboarding_completed?: boolean;
          smart_suggestions_enabled?: boolean;
          ordering_enabled?: boolean;
          rewards_enabled?: boolean;
          token_display_enabled?: boolean;
          bills_enabled?: boolean;
          service_requests_enabled?: boolean;
          sections_enabled?: boolean;
          full_analytics_enabled?: boolean;
          ai_insights_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      restaurant_members: {
        Row: {
          id: string;
          restaurant_id: string;
          user_id: string;
          role: MemberRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          user_id: string;
          role?: MemberRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          user_id?: string;
          role?: MemberRole;
          created_at?: string;
        };
        Relationships: [];
      };
      platform_admins: {
        Row: {
          user_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      menu_extraction_jobs: {
        Row: {
          id: string;
          restaurant_id: string;
          source: ExtractionSource;
          source_urls: string[];
          source_url: string | null;
          status: ExtractionJobStatus;
          error_message: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          source: ExtractionSource;
          source_urls?: string[];
          source_url?: string | null;
          status?: ExtractionJobStatus;
          error_message?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          source?: ExtractionSource;
          source_urls?: string[];
          source_url?: string | null;
          status?: ExtractionJobStatus;
          error_message?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      menu_drafts: {
        Row: {
          id: string;
          restaurant_id: string;
          job_id: string;
          payload: Record<string, unknown>;
          summary: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          job_id: string;
          payload?: Record<string, unknown>;
          summary?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          job_id?: string;
          payload?: Record<string, unknown>;
          summary?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          name?: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      menu_items: {
        Row: {
          id: string;
          restaurant_id: string;
          category_id: string;
          name: string;
          description: string | null;
          price_cents: number;
          image_url: string | null;
          dietary_type: DietaryType;
          allergens: string[];
          is_available: boolean;
          is_popular: boolean;
          is_special: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          category_id: string;
          name: string;
          description?: string | null;
          price_cents?: number;
          image_url?: string | null;
          dietary_type?: DietaryType;
          allergens?: string[];
          is_available?: boolean;
          is_popular?: boolean;
          is_special?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          category_id?: string;
          name?: string;
          description?: string | null;
          price_cents?: number;
          image_url?: string | null;
          dietary_type?: DietaryType;
          allergens?: string[];
          is_available?: boolean;
          is_popular?: boolean;
          is_special?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      restaurant_tables: {
        Row: {
          id: string;
          restaurant_id: string;
          label: string;
          zone: string | null;
          qr_token: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          label: string;
          zone?: string | null;
          qr_token?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          label?: string;
          zone?: string | null;
          qr_token?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      table_sessions: {
        Row: {
          id: string;
          restaurant_id: string;
          table_id: string | null;
          session_token: string;
          expires_at: string;
          created_at: string;
          customer_id: string | null;
          bill_payment_status: BillPaymentStatus | null;
          bill_paid_at: string | null;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_id?: string | null;
          session_token?: string;
          expires_at?: string;
          created_at?: string;
          customer_id?: string | null;
          bill_payment_status?: BillPaymentStatus | null;
          bill_paid_at?: string | null;
          closed_at?: string | null;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          table_id?: string | null;
          session_token?: string;
          expires_at?: string;
          created_at?: string;
          customer_id?: string | null;
          bill_payment_status?: BillPaymentStatus | null;
          bill_paid_at?: string | null;
          closed_at?: string | null;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          restaurant_id: string;
          table_session_id: string | null;
          table_label: string | null;
          status: OrderStatus;
          notes: string | null;
          subtotal_cents: number;
          item_count: number;
          token_number: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_session_id?: string | null;
          table_label?: string | null;
          status?: OrderStatus;
          notes?: string | null;
          subtotal_cents?: number;
          item_count?: number;
          token_number?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          table_session_id?: string | null;
          table_label?: string | null;
          status?: OrderStatus;
          notes?: string | null;
          subtotal_cents?: number;
          item_count?: number;
          token_number?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          menu_item_id: string | null;
          name: string;
          price_cents: number;
          quantity: number;
          dietary_type: DietaryType | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          menu_item_id?: string | null;
          name: string;
          price_cents: number;
          quantity?: number;
          dietary_type?: DietaryType | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          menu_item_id?: string | null;
          name?: string;
          price_cents?: number;
          quantity?: number;
          dietary_type?: DietaryType | null;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      service_requests: {
        Row: {
          id: string;
          restaurant_id: string;
          table_session_id: string;
          request_type: ServiceRequestType;
          status: ServiceRequestStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_session_id: string;
          request_type: ServiceRequestType;
          status?: ServiceRequestStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          restaurant_id?: string;
          table_session_id?: string;
          request_type?: ServiceRequestType;
          status?: ServiceRequestStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      claim_restaurant_ownership: {
        Args: { p_restaurant_id: string };
        Returns: boolean;
      };
      create_restaurant: {
        Args: { p_name: string; p_slug: string };
        Returns: string;
      };
      is_restaurant_member: {
        Args: { target_restaurant_id: string };
        Returns: boolean;
      };
      is_platform_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      get_next_token: {
        Args: { p_restaurant_id: string; p_date?: string };
        Returns: number;
      };
    };
    Enums: {
      restaurant_status: RestaurantStatus;
      plan_tier: PlanTier;
      member_role: MemberRole;
      extraction_source: ExtractionSource;
      extraction_job_status: ExtractionJobStatus;
      dietary_type: DietaryType;
      order_status: "pending_payment" | "pending" | "confirmed" | "served" | "cancelled";
      service_request_type: ServiceRequestType;
      service_request_status: ServiceRequestStatus;
      bill_payment_status: BillPaymentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Restaurant = Database["public"]["Tables"]["restaurants"]["Row"];
export type RestaurantMember =
  Database["public"]["Tables"]["restaurant_members"]["Row"];
