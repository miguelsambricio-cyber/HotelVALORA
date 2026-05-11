// AUTO-GENERATED from Supabase project twebgqutuqgonabvhzjk via pnpm dlx supabase gen types typescript --schema public.
// Regenerate by running the Supabase MCP generate_typescript_types tool or the CLI command above.
// Do NOT edit by hand. Hand-rolled augmentations live in apps/web/src/lib/supabase/*.ts wrappers.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          entity_id: string
          entity_type: string
          id: string
          metadata: Json | null
          occurred_at: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json | null
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          actor_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: string
          id: string
          metadata: Json | null
          reversible: boolean
          reverted_at: string | null
          reverted_by: string | null
        }
        Insert: {
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          reversible?: boolean
          reverted_at?: string | null
          reverted_by?: string | null
        }
        Update: {
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          reversible?: boolean
          reverted_at?: string | null
          reverted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_reverted_by_fkey"
            columns: ["reverted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      avatars: {
        Row: {
          bucket: string
          created_at: string
          id: string
          is_current: boolean
          storage_path: string
          user_id: string
        }
        Insert: {
          bucket?: string
          created_at?: string
          id?: string
          is_current?: boolean
          storage_path: string
          user_id: string
        }
        Update: {
          bucket?: string
          created_at?: string
          id?: string
          is_current?: boolean
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avatars_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          name: string
          notes: string | null
          owner_id: string
          size: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          name: string
          notes?: string | null
          owner_id: string
          size?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          name?: string
          notes?: string | null
          owner_id?: string
          size?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          owner_id: string
          phone: string | null
          position: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          owner_id: string
          phone?: string | null
          position?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          owner_id?: string
          phone?: string | null
          position?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      favorite_reports: {
        Row: {
          created_at: string
          user_id: string
          valuation_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          valuation_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          valuation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorite_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorite_reports_valuation_id_fkey"
            columns: ["valuation_id"]
            isOneToOne: false
            referencedRelation: "valuations"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          enabled: boolean
          flag: string
          id: string
          organization_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          flag: string
          id?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          enabled?: boolean
          flag?: string
          id?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_flags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_pdfs: {
        Row: {
          bucket: string
          completed_at: string | null
          error_message: string | null
          id: string
          requested_at: string
          requested_by: string
          saved_report_id: string | null
          status: Database["public"]["Enums"]["pdf_status"]
          storage_path: string | null
        }
        Insert: {
          bucket?: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          requested_at?: string
          requested_by: string
          saved_report_id?: string | null
          status?: Database["public"]["Enums"]["pdf_status"]
          storage_path?: string | null
        }
        Update: {
          bucket?: string
          completed_at?: string | null
          error_message?: string | null
          id?: string
          requested_at?: string
          requested_by?: string
          saved_report_id?: string | null
          status?: Database["public"]["Enums"]["pdf_status"]
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_pdfs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_pdfs_saved_report_id_fkey"
            columns: ["saved_report_id"]
            isOneToOne: false
            referencedRelation: "saved_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_filters: {
        Row: {
          created_at: string
          criteria: Json
          id: string
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          criteria: Json
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          criteria?: Json
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_filters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_requirements: {
        Row: {
          asset: Json
          coverage: Json
          created_at: string
          enabled: boolean
          facilities: Json
          growth: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          asset?: Json
          coverage?: Json
          created_at?: string
          enabled?: boolean
          facilities?: Json
          growth?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          asset?: Json
          coverage?: Json
          created_at?: string
          enabled?: boolean
          facilities?: Json
          growth?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_requirements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          contact_id: string
          created_at: string
          estimated_value_eur: number | null
          expected_close_date: string | null
          id: string
          notes: string | null
          owner_id: string
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          estimated_value_eur?: number | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          estimated_value_eur?: number | null
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      market_preferences: {
        Row: {
          city: string | null
          country_code: string | null
          created_at: string
          id: string
          revpar_scenario: string | null
          sub_market: string | null
          target: Json | null
          user_id: string
        }
        Insert: {
          city?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          revpar_scenario?: string | null
          sub_market?: string | null
          target?: Json | null
          user_id: string
        }
        Update: {
          city?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          revpar_scenario?: string | null
          sub_market?: string | null
          target?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          body: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          payload: Json | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["notification_kind"]
          payload?: Json | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          payload?: Json | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_accounts: {
        Row: {
          id: string
          linked_at: string
          linked_email: string | null
          provider: Database["public"]["Enums"]["oauth_provider"]
          provider_account_id: string
          user_id: string
        }
        Insert: {
          id?: string
          linked_at?: string
          linked_email?: string | null
          provider: Database["public"]["Enums"]["oauth_provider"]
          provider_account_id: string
          user_id: string
        }
        Update: {
          id?: string
          linked_at?: string
          linked_email?: string | null
          provider?: Database["public"]["Enums"]["oauth_provider"]
          provider_account_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          plan: Database["public"]["Enums"]["user_tier"]
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          plan?: Database["public"]["Enums"]["user_tier"]
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          plan?: Database["public"]["Enums"]["user_tier"]
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          event_type: string
          id: string
          payload: Json
          processed: boolean
          received_at: string
          related_subscription: string | null
          related_user: string | null
          stripe_event_id: string
        }
        Insert: {
          event_type: string
          id?: string
          payload: Json
          processed?: boolean
          received_at?: string
          related_subscription?: string | null
          related_user?: string | null
          stripe_event_id: string
        }
        Update: {
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean
          received_at?: string
          related_subscription?: string | null
          related_user?: string | null
          stripe_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_related_subscription_fkey"
            columns: ["related_subscription"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_related_user_fkey"
            columns: ["related_user"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          full_name: string | null
          locale: string
          phone: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          locale?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          full_name?: string | null
          locale?: string
          phone?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      renders: {
        Row: {
          bucket: string
          cost_usd: number | null
          created_at: string
          id: string
          model: string | null
          prompt: string | null
          provider: string | null
          requested_by: string
          storage_path: string | null
          valuation_id: string | null
        }
        Insert: {
          bucket?: string
          cost_usd?: number | null
          created_at?: string
          id?: string
          model?: string | null
          prompt?: string | null
          provider?: string | null
          requested_by: string
          storage_path?: string | null
          valuation_id?: string | null
        }
        Update: {
          bucket?: string
          cost_usd?: number | null
          created_at?: string
          id?: string
          model?: string | null
          prompt?: string | null
          provider?: string | null
          requested_by?: string
          storage_path?: string | null
          valuation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "renders_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "renders_valuation_id_fkey"
            columns: ["valuation_id"]
            isOneToOne: false
            referencedRelation: "valuations"
            referencedColumns: ["id"]
          },
        ]
      }
      report_files: {
        Row: {
          bucket: string
          created_at: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string
          valuation_id: string
        }
        Insert: {
          bucket?: string
          created_at?: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by: string
          valuation_id: string
        }
        Update: {
          bucket?: string
          created_at?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string
          valuation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_files_valuation_id_fkey"
            columns: ["valuation_id"]
            isOneToOne: false
            referencedRelation: "valuations"
            referencedColumns: ["id"]
          },
        ]
      }
      report_shares: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          permission: Database["public"]["Enums"]["share_permission"]
          shared_by: string
          shared_with: string | null
          token: string | null
          valuation_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["share_permission"]
          shared_by: string
          shared_with?: string | null
          token?: string | null
          valuation_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          permission?: Database["public"]["Enums"]["share_permission"]
          shared_by?: string
          shared_with?: string | null
          token?: string | null
          valuation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_shares_shared_with_fkey"
            columns: ["shared_with"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_shares_valuation_id_fkey"
            columns: ["valuation_id"]
            isOneToOne: false
            referencedRelation: "valuations"
            referencedColumns: ["id"]
          },
        ]
      }
      report_visibility: {
        Row: {
          changed_at: string
          changed_by: string
          id: string
          new_visibility: Database["public"]["Enums"]["report_visibility_t"]
          previous_visibility:
            | Database["public"]["Enums"]["report_visibility_t"]
            | null
          reason: string | null
          valuation_id: string
        }
        Insert: {
          changed_at?: string
          changed_by: string
          id?: string
          new_visibility: Database["public"]["Enums"]["report_visibility_t"]
          previous_visibility?:
            | Database["public"]["Enums"]["report_visibility_t"]
            | null
          reason?: string | null
          valuation_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string
          id?: string
          new_visibility?: Database["public"]["Enums"]["report_visibility_t"]
          previous_visibility?:
            | Database["public"]["Enums"]["report_visibility_t"]
            | null
          reason?: string | null
          valuation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_visibility_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_visibility_valuation_id_fkey"
            columns: ["valuation_id"]
            isOneToOne: false
            referencedRelation: "valuations"
            referencedColumns: ["id"]
          },
        ]
      }
      revpar_scenarios: {
        Row: {
          adr_eur: number | null
          created_at: string
          id: string
          name: string
          occupancy: number | null
          revpar_eur: number | null
          scenario: string | null
          user_id: string
        }
        Insert: {
          adr_eur?: number | null
          created_at?: string
          id?: string
          name: string
          occupancy?: number | null
          revpar_eur?: number | null
          scenario?: string | null
          user_id: string
        }
        Update: {
          adr_eur?: number | null
          created_at?: string
          id?: string
          name?: string
          occupancy?: number | null
          revpar_eur?: number | null
          scenario?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revpar_scenarios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          created_at: string
          created_by: string
          id: string
          pdf_path: string | null
          snapshot: Json
          valuation_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          pdf_path?: string | null
          snapshot: Json
          valuation_id: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          pdf_path?: string | null
          snapshot?: Json
          valuation_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_reports_valuation_id_fkey"
            columns: ["valuation_id"]
            isOneToOne: false
            referencedRelation: "valuations"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          id: string
          ip: string | null
          last_seen_at: string
          signed_in_at: string
          signed_out_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          id?: string
          ip?: string | null
          last_seen_at?: string
          signed_in_at?: string
          signed_out_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          id?: string
          ip?: string | null
          last_seen_at?: string
          signed_in_at?: string
          signed_out_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          organization_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["user_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string
          stripe_subscription_id?: string | null
          tier: Database["public"]["Enums"]["user_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          organization_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["user_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      top_promote_reports: {
        Row: {
          boost_score: number | null
          clicks: number
          featured_region: string | null
          impressions: number
          promoted_at: string
          promoted_by: string
          promoted_until: string
          sponsor_priority: number
          valuation_id: string
        }
        Insert: {
          boost_score?: number | null
          clicks?: number
          featured_region?: string | null
          impressions?: number
          promoted_at?: string
          promoted_by: string
          promoted_until: string
          sponsor_priority?: number
          valuation_id: string
        }
        Update: {
          boost_score?: number | null
          clicks?: number
          featured_region?: string | null
          impressions?: number
          promoted_at?: string
          promoted_by?: string
          promoted_until?: string
          sponsor_priority?: number
          valuation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "top_promote_reports_promoted_by_fkey"
            columns: ["promoted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "top_promote_reports_valuation_id_fkey"
            columns: ["valuation_id"]
            isOneToOne: true
            referencedRelation: "valuations"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_excels: {
        Row: {
          bucket: string
          error_message: string | null
          file_name: string
          id: string
          parsed_summary: Json | null
          processed_at: string | null
          size_bytes: number | null
          status: Database["public"]["Enums"]["excel_status"]
          storage_path: string
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          bucket?: string
          error_message?: string | null
          file_name: string
          id?: string
          parsed_summary?: Json | null
          processed_at?: string | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["excel_status"]
          storage_path: string
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          bucket?: string
          error_message?: string | null
          file_name?: string
          id?: string
          parsed_summary?: Json | null
          processed_at?: string | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["excel_status"]
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_excels_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          invited_by: string | null
          joined_at: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          invited_by?: string | null
          joined_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          invited_by?: string | null
          joined_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          current_organization_id: string | null
          email: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          stripe_customer_id: string | null
          tier: Database["public"]["Enums"]["user_tier"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_organization_id?: string | null
          email: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          tier?: Database["public"]["Enums"]["user_tier"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_organization_id?: string | null
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          tier?: Database["public"]["Enums"]["user_tier"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_current_organization_fk"
            columns: ["current_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      valuation_preferences: {
        Row: {
          exit: Json
          finance: Json
          pl_forecast: Json
          rent: Json
          site: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          exit?: Json
          finance?: Json
          pl_forecast?: Json
          rent?: Json
          site?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          exit?: Json
          finance?: Json
          pl_forecast?: Json
          rent?: Json
          site?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "valuation_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      valuations: {
        Row: {
          address: string | null
          amenities: Json
          city: string
          class_label: string | null
          classification: string | null
          contact_info: Json | null
          country: string
          created_at: string
          financials: Json
          hotel_name: string
          id: string
          indicators: Json
          lat: number | null
          lng: number | null
          location_score: number | null
          objective: Database["public"]["Enums"]["report_objective"] | null
          open_year: number | null
          organization_id: string | null
          owner_id: string
          owner_label: string | null
          reference_code: string | null
          report_type: Database["public"]["Enums"]["report_type_badge"]
          role: Database["public"]["Enums"]["report_role"] | null
          rooms: number | null
          star_rating: number | null
          status: Database["public"]["Enums"]["report_status"]
          sub_market: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["report_visibility_t"]
          zip: string | null
        }
        Insert: {
          address?: string | null
          amenities?: Json
          city: string
          class_label?: string | null
          classification?: string | null
          contact_info?: Json | null
          country: string
          created_at?: string
          financials?: Json
          hotel_name: string
          id?: string
          indicators?: Json
          lat?: number | null
          lng?: number | null
          location_score?: number | null
          objective?: Database["public"]["Enums"]["report_objective"] | null
          open_year?: number | null
          organization_id?: string | null
          owner_id: string
          owner_label?: string | null
          reference_code?: string | null
          report_type?: Database["public"]["Enums"]["report_type_badge"]
          role?: Database["public"]["Enums"]["report_role"] | null
          rooms?: number | null
          star_rating?: number | null
          status?: Database["public"]["Enums"]["report_status"]
          sub_market?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["report_visibility_t"]
          zip?: string | null
        }
        Update: {
          address?: string | null
          amenities?: Json
          city?: string
          class_label?: string | null
          classification?: string | null
          contact_info?: Json | null
          country?: string
          created_at?: string
          financials?: Json
          hotel_name?: string
          id?: string
          indicators?: Json
          lat?: number | null
          lng?: number | null
          location_score?: number | null
          objective?: Database["public"]["Enums"]["report_objective"] | null
          open_year?: number | null
          organization_id?: string | null
          owner_id?: string
          owner_label?: string | null
          reference_code?: string | null
          report_type?: Database["public"]["Enums"]["report_type_badge"]
          role?: Database["public"]["Enums"]["report_role"] | null
          rooms?: number | null
          star_rating?: number | null
          status?: Database["public"]["Enums"]["report_status"]
          sub_market?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["report_visibility_t"]
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "valuations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "valuations_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      excel_status: "queued" | "parsing" | "staged" | "applied" | "failed"
      lead_status:
        | "new"
        | "qualified"
        | "contacted"
        | "proposal"
        | "closed_won"
        | "closed_lost"
      notification_kind:
        | "tour_request"
        | "promotion_expiring"
        | "comment"
        | "share"
        | "system"
      oauth_provider: "google" | "linkedin" | "apple" | "microsoft"
      org_role: "owner" | "admin" | "member" | "viewer"
      pdf_status: "queued" | "generating" | "ready" | "failed"
      report_objective:
        | "For Sale"
        | "Rent HMA"
        | "Lending"
        | "Develop"
        | "CoInvest"
      report_role: "Principal" | "Broker" | "Lender" | "Developer"
      report_status: "draft" | "published" | "archived"
      report_type_badge: "Premium" | "PRO" | "Public" | "Private"
      report_visibility_t: "private" | "team" | "public" | "top-promote"
      share_permission: "view" | "comment" | "edit"
      subscription_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "incomplete"
      user_role: "user" | "admin" | "owner"
      user_tier: "free" | "pro" | "premium" | "team" | "enterprise"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      excel_status: ["queued", "parsing", "staged", "applied", "failed"],
      lead_status: [
        "new",
        "qualified",
        "contacted",
        "proposal",
        "closed_won",
        "closed_lost",
      ],
      notification_kind: [
        "tour_request",
        "promotion_expiring",
        "comment",
        "share",
        "system",
      ],
      oauth_provider: ["google", "linkedin", "apple", "microsoft"],
      org_role: ["owner", "admin", "member", "viewer"],
      pdf_status: ["queued", "generating", "ready", "failed"],
      report_objective: [
        "For Sale",
        "Rent HMA",
        "Lending",
        "Develop",
        "CoInvest",
      ],
      report_role: ["Principal", "Broker", "Lender", "Developer"],
      report_status: ["draft", "published", "archived"],
      report_type_badge: ["Premium", "PRO", "Public", "Private"],
      report_visibility_t: ["private", "team", "public", "top-promote"],
      share_permission: ["view", "comment", "edit"],
      subscription_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "incomplete",
      ],
      user_role: ["user", "admin", "owner"],
      user_tier: ["free", "pro", "premium", "team", "enterprise"],
    },
  },
} as const
