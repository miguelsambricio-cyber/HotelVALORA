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
      ai_agent_permissions: {
        Row: {
          actions: Database["public"]["Enums"]["ai_permission_action"][]
          agent_id: Database["public"]["Enums"]["ai_agent_id"]
          created_at: string
          granted_by: string | null
          id: string
          notes: string | null
          resource_name: string
          resource_type: string
          scope: Json | null
        }
        Insert: {
          actions: Database["public"]["Enums"]["ai_permission_action"][]
          agent_id: Database["public"]["Enums"]["ai_agent_id"]
          created_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          resource_name: string
          resource_type: string
          scope?: Json | null
        }
        Update: {
          actions?: Database["public"]["Enums"]["ai_permission_action"][]
          agent_id?: Database["public"]["Enums"]["ai_agent_id"]
          created_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          resource_name?: string
          resource_type?: string
          scope?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_permissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_permissions_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agent_runs: {
        Row: {
          agent_id: Database["public"]["Enums"]["ai_agent_id"]
          cost_usd: number | null
          created_at: string
          error_message: string | null
          id: string
          input: Json | null
          metadata: Json | null
          output: Json | null
          run_completed_at: string | null
          run_started_at: string
          status: Database["public"]["Enums"]["ai_agent_run_status"]
          steps: Json | null
          tokens_in: number | null
          tokens_out: number | null
          trigger_kind: string
          triggered_by: string | null
          triggering_agent_id: Database["public"]["Enums"]["ai_agent_id"] | null
          triggering_event_id: string | null
        }
        Insert: {
          agent_id: Database["public"]["Enums"]["ai_agent_id"]
          cost_usd?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          input?: Json | null
          metadata?: Json | null
          output?: Json | null
          run_completed_at?: string | null
          run_started_at?: string
          status?: Database["public"]["Enums"]["ai_agent_run_status"]
          steps?: Json | null
          tokens_in?: number | null
          tokens_out?: number | null
          trigger_kind: string
          triggered_by?: string | null
          triggering_agent_id?:
            | Database["public"]["Enums"]["ai_agent_id"]
            | null
          triggering_event_id?: string | null
        }
        Update: {
          agent_id?: Database["public"]["Enums"]["ai_agent_id"]
          cost_usd?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          input?: Json | null
          metadata?: Json | null
          output?: Json | null
          run_completed_at?: string | null
          run_started_at?: string
          status?: Database["public"]["Enums"]["ai_agent_run_status"]
          steps?: Json | null
          tokens_in?: number | null
          tokens_out?: number | null
          trigger_kind?: string
          triggered_by?: string | null
          triggering_agent_id?:
            | Database["public"]["Enums"]["ai_agent_id"]
            | null
          triggering_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_agent_runs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_agent_runs_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_agents: {
        Row: {
          config: Json | null
          created_at: string
          description: string | null
          display_name: string
          enabled: boolean
          escalation_rules: Json | null
          id: Database["public"]["Enums"]["ai_agent_id"]
          kpis: Json | null
          responsibilities: Json | null
          status: Database["public"]["Enums"]["ai_agent_status"]
          updated_at: string
          workflows: Json | null
        }
        Insert: {
          config?: Json | null
          created_at?: string
          description?: string | null
          display_name: string
          enabled?: boolean
          escalation_rules?: Json | null
          id: Database["public"]["Enums"]["ai_agent_id"]
          kpis?: Json | null
          responsibilities?: Json | null
          status?: Database["public"]["Enums"]["ai_agent_status"]
          updated_at?: string
          workflows?: Json | null
        }
        Update: {
          config?: Json | null
          created_at?: string
          description?: string | null
          display_name?: string
          enabled?: boolean
          escalation_rules?: Json | null
          id?: Database["public"]["Enums"]["ai_agent_id"]
          kpis?: Json | null
          responsibilities?: Json | null
          status?: Database["public"]["Enums"]["ai_agent_status"]
          updated_at?: string
          workflows?: Json | null
        }
        Relationships: []
      }
      ai_events: {
        Row: {
          consumed_by: string[]
          created_at: string
          expires_at: string | null
          id: string
          kind: Database["public"]["Enums"]["ai_event_kind"]
          occurred_at: string
          payload: Json
          scope_org_id: string | null
          scope_user_id: string | null
          source: string
        }
        Insert: {
          consumed_by?: string[]
          created_at?: string
          expires_at?: string | null
          id?: string
          kind: Database["public"]["Enums"]["ai_event_kind"]
          occurred_at?: string
          payload: Json
          scope_org_id?: string | null
          scope_user_id?: string | null
          source: string
        }
        Update: {
          consumed_by?: string[]
          created_at?: string
          expires_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["ai_event_kind"]
          occurred_at?: string
          payload?: Json
          scope_org_id?: string | null
          scope_user_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_events_scope_org_id_fkey"
            columns: ["scope_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_events_scope_user_id_fkey"
            columns: ["scope_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_human_review: {
        Row: {
          agent_id: Database["public"]["Enums"]["ai_agent_id"]
          created_at: string
          expires_at: string | null
          id: string
          proposed_action: Json
          reason: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_notes: string | null
          run_id: string
          status: string
        }
        Insert: {
          agent_id: Database["public"]["Enums"]["ai_agent_id"]
          created_at?: string
          expires_at?: string | null
          id?: string
          proposed_action: Json
          reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          run_id: string
          status?: string
        }
        Update: {
          agent_id?: Database["public"]["Enums"]["ai_agent_id"]
          created_at?: string
          expires_at?: string | null
          id?: string
          proposed_action?: Json
          reason?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_notes?: string | null
          run_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_human_review_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_human_review_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_human_review_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "ai_agent_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_memory: {
        Row: {
          agent_id: Database["public"]["Enums"]["ai_agent_id"]
          content: string
          created_at: string
          embedding_ready: boolean
          expires_at: string | null
          id: string
          importance_score: number | null
          meta: Json | null
          scope: Database["public"]["Enums"]["ai_memory_scope"]
          scope_org_id: string | null
          scope_session_id: string | null
          scope_user_id: string | null
        }
        Insert: {
          agent_id: Database["public"]["Enums"]["ai_agent_id"]
          content: string
          created_at?: string
          embedding_ready?: boolean
          expires_at?: string | null
          id?: string
          importance_score?: number | null
          meta?: Json | null
          scope: Database["public"]["Enums"]["ai_memory_scope"]
          scope_org_id?: string | null
          scope_session_id?: string | null
          scope_user_id?: string | null
        }
        Update: {
          agent_id?: Database["public"]["Enums"]["ai_agent_id"]
          content?: string
          created_at?: string
          embedding_ready?: boolean
          expires_at?: string | null
          id?: string
          importance_score?: number | null
          meta?: Json | null
          scope?: Database["public"]["Enums"]["ai_memory_scope"]
          scope_org_id?: string | null
          scope_session_id?: string | null
          scope_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_memory_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_memory_scope_org_id_fkey"
            columns: ["scope_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_memory_scope_user_id_fkey"
            columns: ["scope_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_tools: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          display_name: string
          id: string
          integration: string | null
          is_destructive: boolean
          metadata: Json | null
          requires_human_approval: boolean
          schema_in: Json | null
          schema_out: Json | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_name: string
          id: string
          integration?: string | null
          is_destructive?: boolean
          metadata?: Json | null
          requires_human_approval?: boolean
          schema_in?: Json | null
          schema_out?: Json | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          integration?: string | null
          is_destructive?: boolean
          metadata?: Json | null
          requires_human_approval?: boolean
          schema_in?: Json | null
          schema_out?: Json | null
          updated_at?: string
        }
        Relationships: []
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
      campaigns: {
        Row: {
          archived_at: string | null
          channel: string
          conversion_target: number | null
          created_at: string
          created_by_email: string | null
          description: string | null
          id: string
          kind: string
          name: string
          notes: string | null
          owner_email: string | null
          slug: string
          status: string
          subscription_product_id: string | null
          target_audience: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          channel?: string
          conversion_target?: number | null
          created_at?: string
          created_by_email?: string | null
          description?: string | null
          id?: string
          kind: string
          name: string
          notes?: string | null
          owner_email?: string | null
          slug: string
          status?: string
          subscription_product_id?: string | null
          target_audience?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          channel?: string
          conversion_target?: number | null
          created_at?: string
          created_by_email?: string | null
          description?: string | null
          id?: string
          kind?: string
          name?: string
          notes?: string | null
          owner_email?: string | null
          slug?: string
          status?: string
          subscription_product_id?: string | null
          target_audience?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_subscription_product_id_fkey"
            columns: ["subscription_product_id"]
            isOneToOne: false
            referencedRelation: "subscription_products"
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
      contact_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by_user_id: string | null
          campaign_id: string | null
          contact_id: string
          converted_at: string | null
          created_at: string
          default_subscription_tier: string | null
          expires_at: string | null
          id: string
          invited_by_email: string | null
          invited_email: string
          notes: string | null
          promo_code: string | null
          resend_message_id: string | null
          responded_at: string | null
          sent_at: string | null
          status: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          campaign_id?: string | null
          contact_id: string
          converted_at?: string | null
          created_at?: string
          default_subscription_tier?: string | null
          expires_at?: string | null
          id?: string
          invited_by_email?: string | null
          invited_email: string
          notes?: string | null
          promo_code?: string | null
          resend_message_id?: string | null
          responded_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_user_id?: string | null
          campaign_id?: string | null
          contact_id?: string
          converted_at?: string | null
          created_at?: string
          default_subscription_tier?: string | null
          expires_at?: string | null
          id?: string
          invited_by_email?: string | null
          invited_email?: string
          notes?: string | null
          promo_code?: string | null
          resend_message_id?: string | null
          responded_at?: string | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_invitations_accepted_by_user_id_fkey"
            columns: ["accepted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_invitations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_invitations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "relationship_contacts"
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
      hotel_canonical: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          agoda_id: string | null
          amenities: Json
          block_key: string | null
          booking_hotel_id: string | null
          booking_url: string | null
          brand: string | null
          brand_family: string | null
          canonical_name: string
          chain_scale: Database["public"]["Enums"]["hotel_segment"]
          city: string
          city_normalized: string
          costar_property_id: string | null
          country_code: string
          created_at: string
          data_quality_tier: Database["public"]["Enums"]["quality_tier_enum"]
          deleted_at: string | null
          documented_independent: boolean
          email: string | null
          enrichment_version: number
          expedia_id: string | null
          field_provenance_summary: Json
          gallery_paths: string[] | null
          geom: unknown
          google_place_id: string | null
          hero_image_path: string | null
          hotel_type: Database["public"]["Enums"]["hotel_type_enum"] | null
          id: string
          last_enriched_at: string | null
          lat: number | null
          legal_name: string | null
          lng: number | null
          market_id: string | null
          meeting_rooms_count: number | null
          meeting_space_sqm: number | null
          neighborhood: string | null
          operator_id: string | null
          operator_type: Database["public"]["Enums"]["operator_type_enum"]
          osm_id: string | null
          ownership_structure: string | null
          phone: string | null
          postal_code: string | null
          primary_review_source: string | null
          primary_source: string | null
          region: string | null
          restaurants_count: number | null
          review_count: number | null
          review_score: number | null
          room_type_mix: Json | null
          segment: Database["public"]["Enums"]["hotel_segment"]
          slug: string
          source_confidence: Json
          star_rating: number | null
          status: Database["public"]["Enums"]["hotel_lifecycle_enum"]
          str_property_id: string | null
          submarket_id: string | null
          total_keys: number | null
          total_rooms: number | null
          tripadvisor_id: string | null
          updated_at: string
          website_url: string | null
          wikidata_qid: string | null
          year_opened: number | null
          year_renovated_last: number | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          agoda_id?: string | null
          amenities?: Json
          block_key?: string | null
          booking_hotel_id?: string | null
          booking_url?: string | null
          brand?: string | null
          brand_family?: string | null
          canonical_name: string
          chain_scale?: Database["public"]["Enums"]["hotel_segment"]
          city: string
          city_normalized: string
          costar_property_id?: string | null
          country_code: string
          created_at?: string
          data_quality_tier?: Database["public"]["Enums"]["quality_tier_enum"]
          deleted_at?: string | null
          documented_independent?: boolean
          email?: string | null
          enrichment_version?: number
          expedia_id?: string | null
          field_provenance_summary?: Json
          gallery_paths?: string[] | null
          geom?: unknown
          google_place_id?: string | null
          hero_image_path?: string | null
          hotel_type?: Database["public"]["Enums"]["hotel_type_enum"] | null
          id?: string
          last_enriched_at?: string | null
          lat?: number | null
          legal_name?: string | null
          lng?: number | null
          market_id?: string | null
          meeting_rooms_count?: number | null
          meeting_space_sqm?: number | null
          neighborhood?: string | null
          operator_id?: string | null
          operator_type?: Database["public"]["Enums"]["operator_type_enum"]
          osm_id?: string | null
          ownership_structure?: string | null
          phone?: string | null
          postal_code?: string | null
          primary_review_source?: string | null
          primary_source?: string | null
          region?: string | null
          restaurants_count?: number | null
          review_count?: number | null
          review_score?: number | null
          room_type_mix?: Json | null
          segment?: Database["public"]["Enums"]["hotel_segment"]
          slug: string
          source_confidence?: Json
          star_rating?: number | null
          status?: Database["public"]["Enums"]["hotel_lifecycle_enum"]
          str_property_id?: string | null
          submarket_id?: string | null
          total_keys?: number | null
          total_rooms?: number | null
          tripadvisor_id?: string | null
          updated_at?: string
          website_url?: string | null
          wikidata_qid?: string | null
          year_opened?: number | null
          year_renovated_last?: number | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          agoda_id?: string | null
          amenities?: Json
          block_key?: string | null
          booking_hotel_id?: string | null
          booking_url?: string | null
          brand?: string | null
          brand_family?: string | null
          canonical_name?: string
          chain_scale?: Database["public"]["Enums"]["hotel_segment"]
          city?: string
          city_normalized?: string
          costar_property_id?: string | null
          country_code?: string
          created_at?: string
          data_quality_tier?: Database["public"]["Enums"]["quality_tier_enum"]
          deleted_at?: string | null
          documented_independent?: boolean
          email?: string | null
          enrichment_version?: number
          expedia_id?: string | null
          field_provenance_summary?: Json
          gallery_paths?: string[] | null
          geom?: unknown
          google_place_id?: string | null
          hero_image_path?: string | null
          hotel_type?: Database["public"]["Enums"]["hotel_type_enum"] | null
          id?: string
          last_enriched_at?: string | null
          lat?: number | null
          legal_name?: string | null
          lng?: number | null
          market_id?: string | null
          meeting_rooms_count?: number | null
          meeting_space_sqm?: number | null
          neighborhood?: string | null
          operator_id?: string | null
          operator_type?: Database["public"]["Enums"]["operator_type_enum"]
          osm_id?: string | null
          ownership_structure?: string | null
          phone?: string | null
          postal_code?: string | null
          primary_review_source?: string | null
          primary_source?: string | null
          region?: string | null
          restaurants_count?: number | null
          review_count?: number | null
          review_score?: number | null
          room_type_mix?: Json | null
          segment?: Database["public"]["Enums"]["hotel_segment"]
          slug?: string
          source_confidence?: Json
          star_rating?: number | null
          status?: Database["public"]["Enums"]["hotel_lifecycle_enum"]
          str_property_id?: string | null
          submarket_id?: string | null
          total_keys?: number | null
          total_rooms?: number | null
          tripadvisor_id?: string | null
          updated_at?: string
          website_url?: string | null
          wikidata_qid?: string | null
          year_opened?: number | null
          year_renovated_last?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_canonical_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_canonical_history: {
        Row: {
          brand: string | null
          brand_family: string | null
          canonical_id: string
          canonical_name: string
          chain_scale: Database["public"]["Enums"]["hotel_segment"] | null
          created_at: string
          id: string
          rebrand_reason: string | null
          source_record_id: string | null
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          brand?: string | null
          brand_family?: string | null
          canonical_id: string
          canonical_name: string
          chain_scale?: Database["public"]["Enums"]["hotel_segment"] | null
          created_at?: string
          id?: string
          rebrand_reason?: string | null
          source_record_id?: string | null
          valid_from: string
          valid_to?: string | null
        }
        Update: {
          brand?: string | null
          brand_family?: string | null
          canonical_id?: string
          canonical_name?: string
          chain_scale?: Database["public"]["Enums"]["hotel_segment"] | null
          created_at?: string
          id?: string
          rebrand_reason?: string | null
          source_record_id?: string | null
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_canonical_history_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "hotel_canonical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_canonical_history_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "hotel_coverage_scored_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_canonical_history_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "hotel_coverage_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_canonical_history_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "hotel_library_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_canonical_history_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "hotel_premium_report_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_canonical_history_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "hotel_underwriting_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_canonical_history_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "hotel_source_record"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_dedup_mark: {
        Row: {
          canonical_supabase_id: string | null
          canonical_survivor_snapshot_id: string | null
          dedup_status: string
          hidden_from_admin: boolean
          hidden_from_reports: boolean
          id: string
          marked_at: string
          marked_by: string
          match_evidence: Json
          reason: string | null
          resolved_at: string | null
          resolved_by: string | null
          snapshot_hotel_id: string
        }
        Insert: {
          canonical_supabase_id?: string | null
          canonical_survivor_snapshot_id?: string | null
          dedup_status: string
          hidden_from_admin?: boolean
          hidden_from_reports?: boolean
          id?: string
          marked_at?: string
          marked_by?: string
          match_evidence?: Json
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          snapshot_hotel_id: string
        }
        Update: {
          canonical_supabase_id?: string | null
          canonical_survivor_snapshot_id?: string | null
          dedup_status?: string
          hidden_from_admin?: boolean
          hidden_from_reports?: boolean
          id?: string
          marked_at?: string
          marked_by?: string
          match_evidence?: Json
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          snapshot_hotel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_dedup_mark_canonical_supabase_id_fkey"
            columns: ["canonical_supabase_id"]
            isOneToOne: false
            referencedRelation: "hotel_canonical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_dedup_mark_canonical_supabase_id_fkey"
            columns: ["canonical_supabase_id"]
            isOneToOne: false
            referencedRelation: "hotel_coverage_scored_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_dedup_mark_canonical_supabase_id_fkey"
            columns: ["canonical_supabase_id"]
            isOneToOne: false
            referencedRelation: "hotel_coverage_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_dedup_mark_canonical_supabase_id_fkey"
            columns: ["canonical_supabase_id"]
            isOneToOne: false
            referencedRelation: "hotel_library_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_dedup_mark_canonical_supabase_id_fkey"
            columns: ["canonical_supabase_id"]
            isOneToOne: false
            referencedRelation: "hotel_premium_report_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_dedup_mark_canonical_supabase_id_fkey"
            columns: ["canonical_supabase_id"]
            isOneToOne: false
            referencedRelation: "hotel_underwriting_ready_v"
            referencedColumns: ["hotel_id"]
          },
        ]
      }
      hotel_duplicate_candidate: {
        Row: {
          components: Json
          created_at: string
          decided_at: string | null
          decided_by: string | null
          hotel_a_id: string
          hotel_b_id: string
          id: string
          score: number
          status: Database["public"]["Enums"]["dup_status_enum"]
          tier: Database["public"]["Enums"]["dup_tier_enum"]
        }
        Insert: {
          components: Json
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          hotel_a_id: string
          hotel_b_id: string
          id?: string
          score: number
          status?: Database["public"]["Enums"]["dup_status_enum"]
          tier: Database["public"]["Enums"]["dup_tier_enum"]
        }
        Update: {
          components?: Json
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          hotel_a_id?: string
          hotel_b_id?: string
          id?: string
          score?: number
          status?: Database["public"]["Enums"]["dup_status_enum"]
          tier?: Database["public"]["Enums"]["dup_tier_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "hotel_duplicate_candidate_hotel_a_id_fkey"
            columns: ["hotel_a_id"]
            isOneToOne: false
            referencedRelation: "hotel_canonical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_duplicate_candidate_hotel_a_id_fkey"
            columns: ["hotel_a_id"]
            isOneToOne: false
            referencedRelation: "hotel_coverage_scored_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_duplicate_candidate_hotel_a_id_fkey"
            columns: ["hotel_a_id"]
            isOneToOne: false
            referencedRelation: "hotel_coverage_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_duplicate_candidate_hotel_a_id_fkey"
            columns: ["hotel_a_id"]
            isOneToOne: false
            referencedRelation: "hotel_library_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_duplicate_candidate_hotel_a_id_fkey"
            columns: ["hotel_a_id"]
            isOneToOne: false
            referencedRelation: "hotel_premium_report_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_duplicate_candidate_hotel_a_id_fkey"
            columns: ["hotel_a_id"]
            isOneToOne: false
            referencedRelation: "hotel_underwriting_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_duplicate_candidate_hotel_b_id_fkey"
            columns: ["hotel_b_id"]
            isOneToOne: false
            referencedRelation: "hotel_canonical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_duplicate_candidate_hotel_b_id_fkey"
            columns: ["hotel_b_id"]
            isOneToOne: false
            referencedRelation: "hotel_coverage_scored_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_duplicate_candidate_hotel_b_id_fkey"
            columns: ["hotel_b_id"]
            isOneToOne: false
            referencedRelation: "hotel_coverage_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_duplicate_candidate_hotel_b_id_fkey"
            columns: ["hotel_b_id"]
            isOneToOne: false
            referencedRelation: "hotel_library_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_duplicate_candidate_hotel_b_id_fkey"
            columns: ["hotel_b_id"]
            isOneToOne: false
            referencedRelation: "hotel_premium_report_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_duplicate_candidate_hotel_b_id_fkey"
            columns: ["hotel_b_id"]
            isOneToOne: false
            referencedRelation: "hotel_underwriting_ready_v"
            referencedColumns: ["hotel_id"]
          },
        ]
      }
      hotel_enrichment_dlq: {
        Row: {
          attempt_count: number
          created_at: string
          error_class: string
          error_message: string
          id: string
          job_id: string | null
          payload_snapshot: Json | null
          request_meta: Json
          resolved_at: string | null
          resolved_by: string | null
          source: string
          source_id: string | null
        }
        Insert: {
          attempt_count: number
          created_at?: string
          error_class: string
          error_message: string
          id?: string
          job_id?: string | null
          payload_snapshot?: Json | null
          request_meta?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          source: string
          source_id?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          error_class?: string
          error_message?: string
          id?: string
          job_id?: string | null
          payload_snapshot?: Json | null
          request_meta?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          source_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_enrichment_dlq_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "hotel_enrichment_job"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_enrichment_job: {
        Row: {
          attempt_count: number
          created_at: string
          dedup_key: string
          hotel_id: string | null
          id: string
          job_type: Database["public"]["Enums"]["enrichment_job_type_enum"]
          last_error: string | null
          leased_at: string | null
          leased_by: string | null
          params: Json
          priority: number
          scheduled_for: string
          source: string
          status: Database["public"]["Enums"]["enrichment_job_status_enum"]
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          dedup_key: string
          hotel_id?: string | null
          id?: string
          job_type: Database["public"]["Enums"]["enrichment_job_type_enum"]
          last_error?: string | null
          leased_at?: string | null
          leased_by?: string | null
          params?: Json
          priority?: number
          scheduled_for?: string
          source: string
          status?: Database["public"]["Enums"]["enrichment_job_status_enum"]
        }
        Update: {
          attempt_count?: number
          created_at?: string
          dedup_key?: string
          hotel_id?: string | null
          id?: string
          job_type?: Database["public"]["Enums"]["enrichment_job_type_enum"]
          last_error?: string | null
          leased_at?: string | null
          leased_by?: string | null
          params?: Json
          priority?: number
          scheduled_for?: string
          source?: string
          status?: Database["public"]["Enums"]["enrichment_job_status_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "hotel_enrichment_job_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel_canonical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_enrichment_job_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel_coverage_scored_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_enrichment_job_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel_coverage_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_enrichment_job_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel_library_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_enrichment_job_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel_premium_report_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_enrichment_job_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel_underwriting_ready_v"
            referencedColumns: ["hotel_id"]
          },
        ]
      }
      hotel_enrichment_run: {
        Row: {
          budget_max_requests: number | null
          budget_used: number
          completed_at: string | null
          errors_count: number
          fields_updated: number
          hotels_inserted: number
          hotels_seen: number
          hotels_updated: number
          id: string
          notes: string | null
          rate_limit_hits: number
          scope: Json
          source: string
          started_at: string
          status: Database["public"]["Enums"]["enrichment_run_status_enum"]
          triggered_by: string
        }
        Insert: {
          budget_max_requests?: number | null
          budget_used?: number
          completed_at?: string | null
          errors_count?: number
          fields_updated?: number
          hotels_inserted?: number
          hotels_seen?: number
          hotels_updated?: number
          id?: string
          notes?: string | null
          rate_limit_hits?: number
          scope?: Json
          source: string
          started_at?: string
          status?: Database["public"]["Enums"]["enrichment_run_status_enum"]
          triggered_by: string
        }
        Update: {
          budget_max_requests?: number | null
          budget_used?: number
          completed_at?: string | null
          errors_count?: number
          fields_updated?: number
          hotels_inserted?: number
          hotels_seen?: number
          hotels_updated?: number
          id?: string
          notes?: string | null
          rate_limit_hits?: number
          scope?: Json
          source?: string
          started_at?: string
          status?: Database["public"]["Enums"]["enrichment_run_status_enum"]
          triggered_by?: string
        }
        Relationships: []
      }
      hotel_field_provenance: {
        Row: {
          confidence: number
          created_at: string
          fetched_at: string
          field_name: string
          hotel_id: string
          id: string
          override_by: string | null
          source: string
          source_record_id: string | null
          superseded_at: string | null
          value: Json
        }
        Insert: {
          confidence: number
          created_at?: string
          fetched_at: string
          field_name: string
          hotel_id: string
          id?: string
          override_by?: string | null
          source: string
          source_record_id?: string | null
          superseded_at?: string | null
          value: Json
        }
        Update: {
          confidence?: number
          created_at?: string
          fetched_at?: string
          field_name?: string
          hotel_id?: string
          id?: string
          override_by?: string | null
          source?: string
          source_record_id?: string | null
          superseded_at?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "hotel_field_provenance_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel_canonical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_field_provenance_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel_coverage_scored_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_field_provenance_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel_coverage_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_field_provenance_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel_library_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_field_provenance_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel_premium_report_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_field_provenance_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel_underwriting_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_field_provenance_source_record_id_fkey"
            columns: ["source_record_id"]
            isOneToOne: false
            referencedRelation: "hotel_source_record"
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
      hotel_name_alias: {
        Row: {
          alias_name: string
          alias_slug: string | null
          canonical_id: string
          created_at: string
          id: string
          notes: string | null
          source: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          alias_name: string
          alias_slug?: string | null
          canonical_id: string
          created_at?: string
          id?: string
          notes?: string | null
          source: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          alias_name?: string
          alias_slug?: string | null
          canonical_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          source?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_name_alias_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "hotel_canonical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_name_alias_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "hotel_coverage_scored_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_name_alias_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "hotel_coverage_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_name_alias_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "hotel_library_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_name_alias_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "hotel_premium_report_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_name_alias_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "hotel_underwriting_ready_v"
            referencedColumns: ["hotel_id"]
          },
        ]
      }
      hotel_projects: {
        Row: {
          capex_eur: number | null
          category: Database["public"]["Enums"]["news_category"]
          city: string | null
          country: string | null
          created_at: string
          developer_id: string | null
          estimated_opening: string | null
          id: string
          market: string | null
          meta: Json | null
          news_id: string | null
          notes: string | null
          operator_id: string | null
          project_name: string | null
          rooms: number | null
          submarket: string | null
        }
        Insert: {
          capex_eur?: number | null
          category: Database["public"]["Enums"]["news_category"]
          city?: string | null
          country?: string | null
          created_at?: string
          developer_id?: string | null
          estimated_opening?: string | null
          id?: string
          market?: string | null
          meta?: Json | null
          news_id?: string | null
          notes?: string | null
          operator_id?: string | null
          project_name?: string | null
          rooms?: number | null
          submarket?: string | null
        }
        Update: {
          capex_eur?: number | null
          category?: Database["public"]["Enums"]["news_category"]
          city?: string | null
          country?: string | null
          created_at?: string
          developer_id?: string | null
          estimated_opening?: string | null
          id?: string
          market?: string | null
          meta?: Json | null
          news_id?: string | null
          notes?: string | null
          operator_id?: string | null
          project_name?: string | null
          rooms?: number | null
          submarket?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_projects_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_projects_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "market_news"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_projects_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "operators"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_report: {
        Row: {
          canonical_id: string
          created_at: string
          id: string
          input_params: Json
          last_viewed_at: string
          owner_user_id: string | null
          report_date: string
          tier_snapshot: string | null
        }
        Insert: {
          canonical_id: string
          created_at?: string
          id?: string
          input_params?: Json
          last_viewed_at?: string
          owner_user_id?: string | null
          report_date?: string
          tier_snapshot?: string | null
        }
        Update: {
          canonical_id?: string
          created_at?: string
          id?: string
          input_params?: Json
          last_viewed_at?: string
          owner_user_id?: string | null
          report_date?: string
          tier_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_report_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "hotel_canonical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_report_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "hotel_coverage_scored_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_report_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "hotel_coverage_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_report_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "hotel_library_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_report_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "hotel_premium_report_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_report_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: false
            referencedRelation: "hotel_underwriting_ready_v"
            referencedColumns: ["hotel_id"]
          },
        ]
      }
      hotel_report_library: {
        Row: {
          brand_family: string | null
          canonical_id: string
          cap_rate_pct: number | null
          chain_scale: string | null
          city: string | null
          confidence_score: number | null
          contact_info: Json | null
          contact_visible: boolean
          created_at: string
          estimated_value_eur: number | null
          gop_margin_pct: number | null
          hotel_name: string
          id: string
          is_top_promote: boolean
          keys_from_heuristic: boolean
          last_operator_render_at: string | null
          last_rendered_at: string
          lat: number | null
          lng: number | null
          market: string | null
          per_key_eur: number | null
          per_sqm_eur: number | null
          render_count: number
          report_origin: string
          report_status: string
          report_url: string
          scenario_label: string | null
          showcase_priority: number
          star_rating: number | null
          submarket: string | null
          tier_badge: string
          total_rooms: number | null
          updated_at: string
          valuation_range_high_eur: number | null
          valuation_range_low_eur: number | null
        }
        Insert: {
          brand_family?: string | null
          canonical_id: string
          cap_rate_pct?: number | null
          chain_scale?: string | null
          city?: string | null
          confidence_score?: number | null
          contact_info?: Json | null
          contact_visible?: boolean
          created_at?: string
          estimated_value_eur?: number | null
          gop_margin_pct?: number | null
          hotel_name: string
          id?: string
          is_top_promote?: boolean
          keys_from_heuristic?: boolean
          last_operator_render_at?: string | null
          last_rendered_at?: string
          lat?: number | null
          lng?: number | null
          market?: string | null
          per_key_eur?: number | null
          per_sqm_eur?: number | null
          render_count?: number
          report_origin?: string
          report_status?: string
          report_url: string
          scenario_label?: string | null
          showcase_priority?: number
          star_rating?: number | null
          submarket?: string | null
          tier_badge?: string
          total_rooms?: number | null
          updated_at?: string
          valuation_range_high_eur?: number | null
          valuation_range_low_eur?: number | null
        }
        Update: {
          brand_family?: string | null
          canonical_id?: string
          cap_rate_pct?: number | null
          chain_scale?: string | null
          city?: string | null
          confidence_score?: number | null
          contact_info?: Json | null
          contact_visible?: boolean
          created_at?: string
          estimated_value_eur?: number | null
          gop_margin_pct?: number | null
          hotel_name?: string
          id?: string
          is_top_promote?: boolean
          keys_from_heuristic?: boolean
          last_operator_render_at?: string | null
          last_rendered_at?: string
          lat?: number | null
          lng?: number | null
          market?: string | null
          per_key_eur?: number | null
          per_sqm_eur?: number | null
          render_count?: number
          report_origin?: string
          report_status?: string
          report_url?: string
          scenario_label?: string | null
          showcase_priority?: number
          star_rating?: number | null
          submarket?: string | null
          tier_badge?: string
          total_rooms?: number | null
          updated_at?: string
          valuation_range_high_eur?: number | null
          valuation_range_low_eur?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_report_library_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: true
            referencedRelation: "hotel_canonical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_report_library_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: true
            referencedRelation: "hotel_coverage_scored_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_report_library_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: true
            referencedRelation: "hotel_coverage_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_report_library_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: true
            referencedRelation: "hotel_library_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_report_library_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: true
            referencedRelation: "hotel_premium_report_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_report_library_canonical_id_fkey"
            columns: ["canonical_id"]
            isOneToOne: true
            referencedRelation: "hotel_underwriting_ready_v"
            referencedColumns: ["hotel_id"]
          },
        ]
      }
      hotel_source_record: {
        Row: {
          enrichment_run_id: string | null
          fetch_status: Database["public"]["Enums"]["fetch_status_enum"]
          fetched_at: string
          fetched_at_day: string | null
          hotel_id: string | null
          id: string
          payload: Json
          payload_hash: string
          source: string
          source_id: string
          ttl_expires_at: string
        }
        Insert: {
          enrichment_run_id?: string | null
          fetch_status: Database["public"]["Enums"]["fetch_status_enum"]
          fetched_at?: string
          fetched_at_day?: string | null
          hotel_id?: string | null
          id?: string
          payload: Json
          payload_hash: string
          source: string
          source_id: string
          ttl_expires_at: string
        }
        Update: {
          enrichment_run_id?: string | null
          fetch_status?: Database["public"]["Enums"]["fetch_status_enum"]
          fetched_at?: string
          fetched_at_day?: string | null
          hotel_id?: string | null
          id?: string
          payload?: Json
          payload_hash?: string
          source?: string
          source_id?: string
          ttl_expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hotel_source_record_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel_canonical"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_source_record_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel_coverage_scored_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_source_record_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel_coverage_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_source_record_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel_library_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_source_record_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel_premium_report_ready_v"
            referencedColumns: ["hotel_id"]
          },
          {
            foreignKeyName: "hotel_source_record_hotel_id_fkey"
            columns: ["hotel_id"]
            isOneToOne: false
            referencedRelation: "hotel_underwriting_ready_v"
            referencedColumns: ["hotel_id"]
          },
        ]
      }
      hotel_transactions: {
        Row: {
          announced_at: string | null
          asset_name: string | null
          buyer_id: string | null
          cap_rate: number | null
          category: Database["public"]["Enums"]["news_category"]
          city: string | null
          closed_at: string | null
          country: string | null
          created_at: string
          id: string
          market: string | null
          meta: Json | null
          news_id: string | null
          notes: string | null
          price_eur: number | null
          price_per_key_eur: number | null
          rooms: number | null
          seller_id: string | null
          submarket: string | null
        }
        Insert: {
          announced_at?: string | null
          asset_name?: string | null
          buyer_id?: string | null
          cap_rate?: number | null
          category: Database["public"]["Enums"]["news_category"]
          city?: string | null
          closed_at?: string | null
          country?: string | null
          created_at?: string
          id?: string
          market?: string | null
          meta?: Json | null
          news_id?: string | null
          notes?: string | null
          price_eur?: number | null
          price_per_key_eur?: number | null
          rooms?: number | null
          seller_id?: string | null
          submarket?: string | null
        }
        Update: {
          announced_at?: string | null
          asset_name?: string | null
          buyer_id?: string | null
          cap_rate?: number | null
          category?: Database["public"]["Enums"]["news_category"]
          city?: string | null
          closed_at?: string | null
          country?: string | null
          created_at?: string
          id?: string
          market?: string | null
          meta?: Json | null
          news_id?: string | null
          notes?: string | null
          price_eur?: number | null
          price_per_key_eur?: number | null
          rooms?: number | null
          seller_id?: string | null
          submarket?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hotel_transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_transactions_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "market_news"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hotel_transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "investors"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_credentials_audit: {
        Row: {
          actor_user_id: string | null
          created_at: string
          credential_id: string | null
          detail: Json
          error: string | null
          event_kind: Database["public"]["Enums"]["intelligence_credential_event_kind"]
          id: string
          source_id: string | null
          source_slug: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          credential_id?: string | null
          detail?: Json
          error?: string | null
          event_kind: Database["public"]["Enums"]["intelligence_credential_event_kind"]
          id?: string
          source_id?: string | null
          source_slug: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          credential_id?: string | null
          detail?: Json
          error?: string | null
          event_kind?: Database["public"]["Enums"]["intelligence_credential_event_kind"]
          id?: string
          source_id?: string | null
          source_slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_credentials_audit_credential_id_fkey"
            columns: ["credential_id"]
            isOneToOne: false
            referencedRelation: "intelligence_source_credentials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "intelligence_credentials_audit_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_source_credentials: {
        Row: {
          created_at: string
          enc_key_id: string
          id: string
          last_login_at: string | null
          last_login_error: string | null
          last_login_status: string | null
          last_rotated_at: string
          last_rotated_by: string | null
          meta: Json
          password_auth_tag: string
          password_encrypted: string
          password_iv: string
          rotation_count: number
          source_id: string
          source_slug: string
          status: Database["public"]["Enums"]["intelligence_credential_status"]
          username_auth_tag: string
          username_encrypted: string
          username_iv: string
        }
        Insert: {
          created_at?: string
          enc_key_id?: string
          id?: string
          last_login_at?: string | null
          last_login_error?: string | null
          last_login_status?: string | null
          last_rotated_at?: string
          last_rotated_by?: string | null
          meta?: Json
          password_auth_tag: string
          password_encrypted: string
          password_iv: string
          rotation_count?: number
          source_id: string
          source_slug: string
          status?: Database["public"]["Enums"]["intelligence_credential_status"]
          username_auth_tag: string
          username_encrypted: string
          username_iv: string
        }
        Update: {
          created_at?: string
          enc_key_id?: string
          id?: string
          last_login_at?: string | null
          last_login_error?: string | null
          last_login_status?: string | null
          last_rotated_at?: string
          last_rotated_by?: string | null
          meta?: Json
          password_auth_tag?: string
          password_encrypted?: string
          password_iv?: string
          rotation_count?: number
          source_id?: string
          source_slug?: string
          status?: Database["public"]["Enums"]["intelligence_credential_status"]
          username_auth_tag?: string
          username_encrypted?: string
          username_iv?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_source_credentials_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      intelligence_source_sessions: {
        Row: {
          auth_tag: string
          created_at: string
          enc_key_id: string
          expires_at: string
          id: string
          iv: string
          last_refresh_error: string | null
          meta: Json
          refresh_count: number
          refreshed_at: string
          refreshed_by: string | null
          source_id: string
          source_slug: string
          status: Database["public"]["Enums"]["intelligence_session_status"]
          storage_state_encrypted: string
        }
        Insert: {
          auth_tag: string
          created_at?: string
          enc_key_id?: string
          expires_at: string
          id?: string
          iv: string
          last_refresh_error?: string | null
          meta?: Json
          refresh_count?: number
          refreshed_at?: string
          refreshed_by?: string | null
          source_id: string
          source_slug: string
          status?: Database["public"]["Enums"]["intelligence_session_status"]
          storage_state_encrypted: string
        }
        Update: {
          auth_tag?: string
          created_at?: string
          enc_key_id?: string
          expires_at?: string
          id?: string
          iv?: string
          last_refresh_error?: string | null
          meta?: Json
          refresh_count?: number
          refreshed_at?: string
          refreshed_by?: string | null
          source_id?: string
          source_slug?: string
          status?: Database["public"]["Enums"]["intelligence_session_status"]
          storage_state_encrypted?: string
        }
        Relationships: [
          {
            foreignKeyName: "intelligence_source_sessions_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
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
      investors: {
        Row: {
          aum_eur: number | null
          created_at: string
          hq_country: string | null
          id: string
          kind: string | null
          meta: Json | null
          name: string
          notes: string | null
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          aum_eur?: number | null
          created_at?: string
          hq_country?: string | null
          id?: string
          kind?: string | null
          meta?: Json | null
          name: string
          notes?: string | null
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          aum_eur?: number | null
          created_at?: string
          hq_country?: string | null
          id?: string
          kind?: string | null
          meta?: Json | null
          name?: string
          notes?: string | null
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
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
      market: {
        Row: {
          country_code: string
          created_at: string
          description: string | null
          geom: unknown
          id: string
          name: string
          region: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          country_code: string
          created_at?: string
          description?: string | null
          geom?: unknown
          id?: string
          name: string
          region?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          description?: string | null
          geom?: unknown
          id?: string
          name?: string
          region?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_news: {
        Row: {
          body: string | null
          canonical_url: string
          category: Database["public"]["Enums"]["news_category"]
          city: string | null
          content_hash: string | null
          country: string | null
          created_at: string
          enriched_meta: Json | null
          first_seen_at: string
          hotel_segment: Database["public"]["Enums"]["hotel_segment"] | null
          id: string
          language: string
          last_seen_at: string
          market: string | null
          occurrences: number
          published_at: string | null
          raw_meta: Json | null
          region: string | null
          source_id: string
          submarket: string | null
          summary: string | null
          title: string
          updated_at: string
          url: string
          url_hash: string
        }
        Insert: {
          body?: string | null
          canonical_url: string
          category?: Database["public"]["Enums"]["news_category"]
          city?: string | null
          content_hash?: string | null
          country?: string | null
          created_at?: string
          enriched_meta?: Json | null
          first_seen_at?: string
          hotel_segment?: Database["public"]["Enums"]["hotel_segment"] | null
          id?: string
          language?: string
          last_seen_at?: string
          market?: string | null
          occurrences?: number
          published_at?: string | null
          raw_meta?: Json | null
          region?: string | null
          source_id: string
          submarket?: string | null
          summary?: string | null
          title: string
          updated_at?: string
          url: string
          url_hash: string
        }
        Update: {
          body?: string | null
          canonical_url?: string
          category?: Database["public"]["Enums"]["news_category"]
          city?: string | null
          content_hash?: string | null
          country?: string | null
          created_at?: string
          enriched_meta?: Json | null
          first_seen_at?: string
          hotel_segment?: Database["public"]["Enums"]["hotel_segment"] | null
          id?: string
          language?: string
          last_seen_at?: string
          market?: string | null
          occurrences?: number
          published_at?: string | null
          raw_meta?: Json | null
          region?: string | null
          source_id?: string
          submarket?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          url?: string
          url_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_news_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
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
      news_entities: {
        Row: {
          confidence: number | null
          created_at: string
          entity_id: string | null
          entity_kind: string
          id: string
          news_id: string
          raw_mention: string | null
          role: Database["public"]["Enums"]["entity_role"]
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          entity_id?: string | null
          entity_kind: string
          id?: string
          news_id: string
          raw_mention?: string | null
          role: Database["public"]["Enums"]["entity_role"]
        }
        Update: {
          confidence?: number | null
          created_at?: string
          entity_id?: string | null
          entity_kind?: string
          id?: string
          news_id?: string
          raw_mention?: string | null
          role?: Database["public"]["Enums"]["entity_role"]
        }
        Relationships: [
          {
            foreignKeyName: "news_entities_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "market_news"
            referencedColumns: ["id"]
          },
        ]
      }
      news_ingestion_runs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          items_inserted: number | null
          items_seen: number | null
          items_skipped: number | null
          items_updated: number | null
          metadata: Json | null
          run_completed_at: string | null
          run_started_at: string
          source_id: string | null
          status: Database["public"]["Enums"]["ingestion_status"]
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          items_inserted?: number | null
          items_seen?: number | null
          items_skipped?: number | null
          items_updated?: number | null
          metadata?: Json | null
          run_completed_at?: string | null
          run_started_at?: string
          source_id?: string | null
          status?: Database["public"]["Enums"]["ingestion_status"]
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          items_inserted?: number | null
          items_seen?: number | null
          items_skipped?: number | null
          items_updated?: number | null
          metadata?: Json | null
          run_completed_at?: string | null
          run_started_at?: string
          source_id?: string | null
          status?: Database["public"]["Enums"]["ingestion_status"]
        }
        Relationships: [
          {
            foreignKeyName: "news_ingestion_runs_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      news_tags: {
        Row: {
          news_id: string
          tag: string
        }
        Insert: {
          news_id: string
          tag: string
        }
        Update: {
          news_id?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_tags_news_id_fkey"
            columns: ["news_id"]
            isOneToOne: false
            referencedRelation: "market_news"
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
      operators: {
        Row: {
          created_at: string
          hq_country: string | null
          id: string
          kind: string | null
          meta: Json | null
          name: string
          notes: string | null
          parent_id: string | null
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          hq_country?: string | null
          id?: string
          kind?: string | null
          meta?: Json | null
          name: string
          notes?: string | null
          parent_id?: string | null
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          hq_country?: string | null
          id?: string
          kind?: string | null
          meta?: Json | null
          name?: string
          notes?: string | null
          parent_id?: string | null
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operators_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "operators"
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
      pnl_template: {
        Row: {
          admin_general_pct: number | null
          class: string | null
          country: string
          created_at: string
          data_source: Database["public"]["Enums"]["pnl_data_source"]
          ebitda_pct: number | null
          expenses_fb_pct: number | null
          expenses_rooms_pct: number | null
          fb_beverage_pct: number | null
          fb_food_pct: number | null
          gop_pct: number | null
          id: string
          imported_from: string | null
          insurance_pct: number | null
          it_telecom_pct: number | null
          last_imported_at: string
          management_fees_pct: number | null
          market: string | null
          meeting_events_pct: number | null
          notes: string | null
          operations_maintenance_pct: number | null
          other_departments_pct: number | null
          parking_other_pct: number | null
          property_taxes_pct: number | null
          rent_pct: number | null
          rooms_revenue_pct: number | null
          sales_marketing_pct: number | null
          segmentation_type:
            | Database["public"]["Enums"]["pnl_segmentation_type"]
            | null
          spa_wellness_pct: number | null
          staff_cost_memo_pct: number | null
          submarket: string | null
          updated_at: string
          utilities_pct: number | null
        }
        Insert: {
          admin_general_pct?: number | null
          class?: string | null
          country: string
          created_at?: string
          data_source: Database["public"]["Enums"]["pnl_data_source"]
          ebitda_pct?: number | null
          expenses_fb_pct?: number | null
          expenses_rooms_pct?: number | null
          fb_beverage_pct?: number | null
          fb_food_pct?: number | null
          gop_pct?: number | null
          id?: string
          imported_from?: string | null
          insurance_pct?: number | null
          it_telecom_pct?: number | null
          last_imported_at?: string
          management_fees_pct?: number | null
          market?: string | null
          meeting_events_pct?: number | null
          notes?: string | null
          operations_maintenance_pct?: number | null
          other_departments_pct?: number | null
          parking_other_pct?: number | null
          property_taxes_pct?: number | null
          rent_pct?: number | null
          rooms_revenue_pct?: number | null
          sales_marketing_pct?: number | null
          segmentation_type?:
            | Database["public"]["Enums"]["pnl_segmentation_type"]
            | null
          spa_wellness_pct?: number | null
          staff_cost_memo_pct?: number | null
          submarket?: string | null
          updated_at?: string
          utilities_pct?: number | null
        }
        Update: {
          admin_general_pct?: number | null
          class?: string | null
          country?: string
          created_at?: string
          data_source?: Database["public"]["Enums"]["pnl_data_source"]
          ebitda_pct?: number | null
          expenses_fb_pct?: number | null
          expenses_rooms_pct?: number | null
          fb_beverage_pct?: number | null
          fb_food_pct?: number | null
          gop_pct?: number | null
          id?: string
          imported_from?: string | null
          insurance_pct?: number | null
          it_telecom_pct?: number | null
          last_imported_at?: string
          management_fees_pct?: number | null
          market?: string | null
          meeting_events_pct?: number | null
          notes?: string | null
          operations_maintenance_pct?: number | null
          other_departments_pct?: number | null
          parking_other_pct?: number | null
          property_taxes_pct?: number | null
          rent_pct?: number | null
          rooms_revenue_pct?: number | null
          sales_marketing_pct?: number | null
          segmentation_type?:
            | Database["public"]["Enums"]["pnl_segmentation_type"]
            | null
          spa_wellness_pct?: number | null
          staff_cost_memo_pct?: number | null
          submarket?: string | null
          updated_at?: string
          utilities_pct?: number | null
        }
        Relationships: []
      }
      pnl_template_override: {
        Row: {
          created_at: string
          id: string
          line_item: string
          operator_email: string
          operator_reason: string | null
          override_value: number
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          line_item: string
          operator_email: string
          operator_reason?: string | null
          override_value: number
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          line_item?: string
          operator_email?: string
          operator_reason?: string | null
          override_value?: number
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pnl_template_override_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pnl_template"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pnl_template_override_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "pnl_template_effective"
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
      rate_limit_state: {
        Row: {
          budget: number
          created_at: string
          id: string
          meta: Json
          provider: string
          reset_at: string
          status: string
          updated_at: string
          used: number
          window_label: string
        }
        Insert: {
          budget: number
          created_at?: string
          id?: string
          meta?: Json
          provider: string
          reset_at: string
          status?: string
          updated_at?: string
          used?: number
          window_label: string
        }
        Update: {
          budget?: number
          created_at?: string
          id?: string
          meta?: Json
          provider?: string
          reset_at?: string
          status?: string
          updated_at?: string
          used?: number
          window_label?: string
        }
        Relationships: []
      }
      relationship_companies: {
        Row: {
          association: string | null
          calling_lead: string | null
          client_company_id: string | null
          company_key: string
          company_notes: string | null
          company_type: string | null
          continent: string | null
          coverage_officer: string | null
          created_at: string
          datasite_company_number: string | null
          description: string | null
          external_notes: string | null
          fund_size: string | null
          hotel_focus: string | null
          id: string
          industry: string | null
          internal_notes: string | null
          investment_max: string | null
          investment_min: string | null
          investment_preference: string | null
          investor_subtype: string | null
          investor_type_canonical: string | null
          investor_type_raw: string | null
          keyword: string | null
          location: string | null
          name: string
          tier: string | null
          updated_at: string
        }
        Insert: {
          association?: string | null
          calling_lead?: string | null
          client_company_id?: string | null
          company_key: string
          company_notes?: string | null
          company_type?: string | null
          continent?: string | null
          coverage_officer?: string | null
          created_at?: string
          datasite_company_number?: string | null
          description?: string | null
          external_notes?: string | null
          fund_size?: string | null
          hotel_focus?: string | null
          id?: string
          industry?: string | null
          internal_notes?: string | null
          investment_max?: string | null
          investment_min?: string | null
          investment_preference?: string | null
          investor_subtype?: string | null
          investor_type_canonical?: string | null
          investor_type_raw?: string | null
          keyword?: string | null
          location?: string | null
          name: string
          tier?: string | null
          updated_at?: string
        }
        Update: {
          association?: string | null
          calling_lead?: string | null
          client_company_id?: string | null
          company_key?: string
          company_notes?: string | null
          company_type?: string | null
          continent?: string | null
          coverage_officer?: string | null
          created_at?: string
          datasite_company_number?: string | null
          description?: string | null
          external_notes?: string | null
          fund_size?: string | null
          hotel_focus?: string | null
          id?: string
          industry?: string | null
          internal_notes?: string | null
          investment_max?: string | null
          investment_min?: string | null
          investment_preference?: string | null
          investor_subtype?: string | null
          investor_type_canonical?: string | null
          investor_type_raw?: string | null
          keyword?: string | null
          location?: string | null
          name?: string
          tier?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      relationship_contacts: {
        Row: {
          active_threads: number
          archived_at: string | null
          association: string | null
          bounce_count: number
          bucket: string
          buyer_added_date: string | null
          calling_lead: string | null
          city: string | null
          client_contact_id: string | null
          collaboration_potential_score: number
          company_id: string | null
          company_name: string | null
          contact_category_v2: string | null
          contact_invitation_status: string
          continent: string | null
          country: string | null
          coverage_officer: string | null
          created_at: string
          datasite_company_number: string | null
          datasite_contact_number: string | null
          deleted_at: string | null
          email: string | null
          email_directionality: string | null
          email_lower: string | null
          email_validity: string | null
          first_seen_batch_id: string | null
          flagged_for_correction: boolean
          full_name: string | null
          fund_size: string | null
          geography: string | null
          gmail_signal_source: string | null
          hotel_focus: string | null
          id: string
          imported_at: string
          industry: string | null
          inferred_relationship_stage: string | null
          investment_max: string | null
          investment_min: string | null
          investment_preference: string | null
          investor_subtype: string | null
          investor_type: string | null
          ioi_bid_high: string | null
          ioi_bid_low: string | null
          is_primary_contact: boolean
          last_activity_date: string | null
          last_activity_type: string | null
          last_bounce_date: string | null
          last_contacted_at: string | null
          last_email_date: string | null
          last_seen_batch_id: string | null
          latest_deal_stage: string | null
          linked_user_id: string | null
          linkedin: string | null
          loi_bid_high: string | null
          loi_bid_low: string | null
          master_id: string
          notes_consolidated: string | null
          original_category_raw: string | null
          original_category_source: string | null
          phone: string | null
          pipeline_state: string | null
          relationship_band: string | null
          relationship_manager: string | null
          relationship_owner_email: string | null
          relationship_status: string | null
          relationship_strength: number
          relationship_type: string | null
          revised_bid_high: string | null
          revised_bid_low: string | null
          role: string | null
          source_file: string | null
          state: string | null
          suppressed_outreach: boolean
          tags: string[]
          tier: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          active_threads?: number
          archived_at?: string | null
          association?: string | null
          bounce_count?: number
          bucket?: string
          buyer_added_date?: string | null
          calling_lead?: string | null
          city?: string | null
          client_contact_id?: string | null
          collaboration_potential_score?: number
          company_id?: string | null
          company_name?: string | null
          contact_category_v2?: string | null
          contact_invitation_status?: string
          continent?: string | null
          country?: string | null
          coverage_officer?: string | null
          created_at?: string
          datasite_company_number?: string | null
          datasite_contact_number?: string | null
          deleted_at?: string | null
          email?: string | null
          email_directionality?: string | null
          email_lower?: string | null
          email_validity?: string | null
          first_seen_batch_id?: string | null
          flagged_for_correction?: boolean
          full_name?: string | null
          fund_size?: string | null
          geography?: string | null
          gmail_signal_source?: string | null
          hotel_focus?: string | null
          id?: string
          imported_at?: string
          industry?: string | null
          inferred_relationship_stage?: string | null
          investment_max?: string | null
          investment_min?: string | null
          investment_preference?: string | null
          investor_subtype?: string | null
          investor_type?: string | null
          ioi_bid_high?: string | null
          ioi_bid_low?: string | null
          is_primary_contact?: boolean
          last_activity_date?: string | null
          last_activity_type?: string | null
          last_bounce_date?: string | null
          last_contacted_at?: string | null
          last_email_date?: string | null
          last_seen_batch_id?: string | null
          latest_deal_stage?: string | null
          linked_user_id?: string | null
          linkedin?: string | null
          loi_bid_high?: string | null
          loi_bid_low?: string | null
          master_id: string
          notes_consolidated?: string | null
          original_category_raw?: string | null
          original_category_source?: string | null
          phone?: string | null
          pipeline_state?: string | null
          relationship_band?: string | null
          relationship_manager?: string | null
          relationship_owner_email?: string | null
          relationship_status?: string | null
          relationship_strength?: number
          relationship_type?: string | null
          revised_bid_high?: string | null
          revised_bid_low?: string | null
          role?: string | null
          source_file?: string | null
          state?: string | null
          suppressed_outreach?: boolean
          tags?: string[]
          tier?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          active_threads?: number
          archived_at?: string | null
          association?: string | null
          bounce_count?: number
          bucket?: string
          buyer_added_date?: string | null
          calling_lead?: string | null
          city?: string | null
          client_contact_id?: string | null
          collaboration_potential_score?: number
          company_id?: string | null
          company_name?: string | null
          contact_category_v2?: string | null
          contact_invitation_status?: string
          continent?: string | null
          country?: string | null
          coverage_officer?: string | null
          created_at?: string
          datasite_company_number?: string | null
          datasite_contact_number?: string | null
          deleted_at?: string | null
          email?: string | null
          email_directionality?: string | null
          email_lower?: string | null
          email_validity?: string | null
          first_seen_batch_id?: string | null
          flagged_for_correction?: boolean
          full_name?: string | null
          fund_size?: string | null
          geography?: string | null
          gmail_signal_source?: string | null
          hotel_focus?: string | null
          id?: string
          imported_at?: string
          industry?: string | null
          inferred_relationship_stage?: string | null
          investment_max?: string | null
          investment_min?: string | null
          investment_preference?: string | null
          investor_subtype?: string | null
          investor_type?: string | null
          ioi_bid_high?: string | null
          ioi_bid_low?: string | null
          is_primary_contact?: boolean
          last_activity_date?: string | null
          last_activity_type?: string | null
          last_bounce_date?: string | null
          last_contacted_at?: string | null
          last_email_date?: string | null
          last_seen_batch_id?: string | null
          latest_deal_stage?: string | null
          linked_user_id?: string | null
          linkedin?: string | null
          loi_bid_high?: string | null
          loi_bid_low?: string | null
          master_id?: string
          notes_consolidated?: string | null
          original_category_raw?: string | null
          original_category_source?: string | null
          phone?: string | null
          pipeline_state?: string | null
          relationship_band?: string | null
          relationship_manager?: string | null
          relationship_owner_email?: string | null
          relationship_status?: string | null
          relationship_strength?: number
          relationship_type?: string | null
          revised_bid_high?: string | null
          revised_bid_low?: string | null
          role?: string | null
          source_file?: string | null
          state?: string | null
          suppressed_outreach?: boolean
          tags?: string[]
          tier?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_contacts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "relationship_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationship_contacts_linked_user_id_fkey"
            columns: ["linked_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_health: {
        Row: {
          bounce_count: number
          bounce_reasons: Json | null
          contact_id: string
          email_validity: string
          flagged_for_correction: boolean
          id: string
          inferred_correct_company: string | null
          last_bounce_date: string | null
          last_health_check_at: string
          suggested_replacement_email: string | null
        }
        Insert: {
          bounce_count?: number
          bounce_reasons?: Json | null
          contact_id: string
          email_validity?: string
          flagged_for_correction?: boolean
          id?: string
          inferred_correct_company?: string | null
          last_bounce_date?: string | null
          last_health_check_at?: string
          suggested_replacement_email?: string | null
        }
        Update: {
          bounce_count?: number
          bounce_reasons?: Json | null
          contact_id?: string
          email_validity?: string
          flagged_for_correction?: boolean
          id?: string
          inferred_correct_company?: string | null
          last_bounce_date?: string | null
          last_health_check_at?: string
          suggested_replacement_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "relationship_health_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: true
            referencedRelation: "relationship_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_interactions: {
        Row: {
          buyer_added_date: string | null
          cim_sent_date: string | null
          client_buyer_id: string | null
          company_id: string | null
          company_name: string
          created_at: string
          datasite_activity_number: string | null
          declined_comments: string | null
          declined_date: string | null
          declined_reason: string | null
          id: string
          initial_contact_date: string | null
          ioi_bid_high: string | null
          ioi_bid_low: string | null
          ioi_bid_received_date: string | null
          ioi_process_letter_date: string | null
          last_activity_comments: string | null
          last_activity_date: string | null
          last_activity_type: string | null
          latest_deal_stage: string | null
          loi_bid_high: string | null
          loi_bid_low: string | null
          loi_bid_received_date: string | null
          loi_process_letter_date: string | null
          management_presentation_date: string | null
          nda_executed_date: string | null
          nda_initial_sent_date: string | null
          nda_signed_date: string | null
          on_hold_flag: string | null
          pipeline_state: string | null
          removed_flag: string | null
          revised_bid_high: string | null
          revised_bid_low: string | null
          revised_bid_received_date: string | null
          teaser_sent_date: string | null
          updated_at: string
        }
        Insert: {
          buyer_added_date?: string | null
          cim_sent_date?: string | null
          client_buyer_id?: string | null
          company_id?: string | null
          company_name: string
          created_at?: string
          datasite_activity_number?: string | null
          declined_comments?: string | null
          declined_date?: string | null
          declined_reason?: string | null
          id?: string
          initial_contact_date?: string | null
          ioi_bid_high?: string | null
          ioi_bid_low?: string | null
          ioi_bid_received_date?: string | null
          ioi_process_letter_date?: string | null
          last_activity_comments?: string | null
          last_activity_date?: string | null
          last_activity_type?: string | null
          latest_deal_stage?: string | null
          loi_bid_high?: string | null
          loi_bid_low?: string | null
          loi_bid_received_date?: string | null
          loi_process_letter_date?: string | null
          management_presentation_date?: string | null
          nda_executed_date?: string | null
          nda_initial_sent_date?: string | null
          nda_signed_date?: string | null
          on_hold_flag?: string | null
          pipeline_state?: string | null
          removed_flag?: string | null
          revised_bid_high?: string | null
          revised_bid_low?: string | null
          revised_bid_received_date?: string | null
          teaser_sent_date?: string | null
          updated_at?: string
        }
        Update: {
          buyer_added_date?: string | null
          cim_sent_date?: string | null
          client_buyer_id?: string | null
          company_id?: string | null
          company_name?: string
          created_at?: string
          datasite_activity_number?: string | null
          declined_comments?: string | null
          declined_date?: string | null
          declined_reason?: string | null
          id?: string
          initial_contact_date?: string | null
          ioi_bid_high?: string | null
          ioi_bid_low?: string | null
          ioi_bid_received_date?: string | null
          ioi_process_letter_date?: string | null
          last_activity_comments?: string | null
          last_activity_date?: string | null
          last_activity_type?: string | null
          latest_deal_stage?: string | null
          loi_bid_high?: string | null
          loi_bid_low?: string | null
          loi_bid_received_date?: string | null
          loi_process_letter_date?: string | null
          management_presentation_date?: string | null
          nda_executed_date?: string | null
          nda_initial_sent_date?: string | null
          nda_signed_date?: string | null
          on_hold_flag?: string | null
          pipeline_state?: string | null
          removed_flag?: string | null
          revised_bid_high?: string | null
          revised_bid_low?: string | null
          revised_bid_received_date?: string | null
          teaser_sent_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_interactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "relationship_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      relationship_labels: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          inferred_stage: string | null
          label: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          inferred_stage?: string | null
          label: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          inferred_stage?: string | null
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_labels_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "relationship_contacts"
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
      sources: {
        Row: {
          api_endpoint: string | null
          auth_notes: string | null
          auth_strategy: Database["public"]["Enums"]["intelligence_auth_strategy"]
          base_url: string
          created_at: string
          enabled: boolean
          id: string
          ingestion_kind: Database["public"]["Enums"]["ingestion_source_kind"]
          language: string
          last_ingested_at: string | null
          meta: Json | null
          name: string
          notes: string | null
          region: string
          reliability_score: number | null
          requires_auth: boolean
          rss_url: string | null
          schedule_hint: string | null
          scrape_selector: Json | null
          slug: string
          updated_at: string
        }
        Insert: {
          api_endpoint?: string | null
          auth_notes?: string | null
          auth_strategy?: Database["public"]["Enums"]["intelligence_auth_strategy"]
          base_url: string
          created_at?: string
          enabled?: boolean
          id?: string
          ingestion_kind: Database["public"]["Enums"]["ingestion_source_kind"]
          language?: string
          last_ingested_at?: string | null
          meta?: Json | null
          name: string
          notes?: string | null
          region: string
          reliability_score?: number | null
          requires_auth?: boolean
          rss_url?: string | null
          schedule_hint?: string | null
          scrape_selector?: Json | null
          slug: string
          updated_at?: string
        }
        Update: {
          api_endpoint?: string | null
          auth_notes?: string | null
          auth_strategy?: Database["public"]["Enums"]["intelligence_auth_strategy"]
          base_url?: string
          created_at?: string
          enabled?: boolean
          id?: string
          ingestion_kind?: Database["public"]["Enums"]["ingestion_source_kind"]
          language?: string
          last_ingested_at?: string | null
          meta?: Json | null
          name?: string
          notes?: string | null
          region?: string
          reliability_score?: number | null
          requires_auth?: boolean
          rss_url?: string | null
          schedule_hint?: string | null
          scrape_selector?: Json | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      submarket: {
        Row: {
          created_at: string
          geom: unknown
          id: string
          institutional_tier: number | null
          kind: string
          market_id: string
          name: string
          neighborhood_aliases: string[] | null
          postal_prefixes: string[] | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          geom?: unknown
          id?: string
          institutional_tier?: number | null
          kind?: string
          market_id: string
          name: string
          neighborhood_aliases?: string[] | null
          postal_prefixes?: string[] | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          geom?: unknown
          id?: string
          institutional_tier?: number | null
          kind?: string
          market_id?: string
          name?: string
          neighborhood_aliases?: string[] | null
          postal_prefixes?: string[] | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "submarket_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "market"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_products: {
        Row: {
          badge: string | null
          color_theme: string
          created_at: string
          created_by_email: string | null
          cta_label: string
          currency: string
          description: string | null
          display_order: number
          features: Json
          id: string
          monthly_price: number | null
          name: string
          slug: string
          subtitle: string | null
          tier_enum: string | null
          updated_at: string
          vat_display: string
          visibility: string
          yearly_price: number | null
        }
        Insert: {
          badge?: string | null
          color_theme?: string
          created_at?: string
          created_by_email?: string | null
          cta_label?: string
          currency?: string
          description?: string | null
          display_order?: number
          features?: Json
          id?: string
          monthly_price?: number | null
          name: string
          slug: string
          subtitle?: string | null
          tier_enum?: string | null
          updated_at?: string
          vat_display?: string
          visibility?: string
          yearly_price?: number | null
        }
        Update: {
          badge?: string | null
          color_theme?: string
          created_at?: string
          created_by_email?: string | null
          cta_label?: string
          currency?: string
          description?: string | null
          display_order?: number
          features?: Json
          id?: string
          monthly_price?: number | null
          name?: string
          slug?: string
          subtitle?: string | null
          tier_enum?: string | null
          updated_at?: string
          vat_display?: string
          visibility?: string
          yearly_price?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          assigned_by_email: string | null
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          expires_at: string | null
          id: string
          notes: string | null
          organization_id: string | null
          product_id: string | null
          source_campaign_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["user_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by_email?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          product_id?: string | null
          source_campaign_id?: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier: Database["public"]["Enums"]["user_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by_email?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          product_id?: string | null
          source_campaign_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
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
            foreignKeyName: "subscriptions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "subscription_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_source_campaign_id_fkey"
            columns: ["source_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
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
          full_name: string | null
          id: string
          invitation_status: string
          last_seen_at: string | null
          linked_contact_id: string | null
          promo_code: string | null
          relationship_owner_email: string | null
          role: Database["public"]["Enums"]["user_role"]
          stripe_customer_id: string | null
          tier: Database["public"]["Enums"]["user_tier"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_organization_id?: string | null
          email: string
          full_name?: string | null
          id: string
          invitation_status?: string
          last_seen_at?: string | null
          linked_contact_id?: string | null
          promo_code?: string | null
          relationship_owner_email?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          tier?: Database["public"]["Enums"]["user_tier"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_organization_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          invitation_status?: string
          last_seen_at?: string | null
          linked_contact_id?: string | null
          promo_code?: string | null
          relationship_owner_email?: string | null
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
          {
            foreignKeyName: "users_linked_contact_id_fkey"
            columns: ["linked_contact_id"]
            isOneToOne: false
            referencedRelation: "relationship_contacts"
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
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      hotel_coverage_madrid_v: {
        Row: {
          avg_t1_pct: number | null
          avg_t2_pct: number | null
          city_normalized: string | null
          country_code: string | null
          goal_reached: boolean | null
          hotels_bronze: number | null
          hotels_gold: number | null
          hotels_institutional_passing: number | null
          hotels_non_quarantined: number | null
          hotels_quarantined: number | null
          hotels_silver: number | null
          hotels_t1_passing: number | null
          hotels_t2_passing: number | null
          hotels_total: number | null
          institutional_passing_rate: number | null
        }
        Relationships: []
      }
      hotel_coverage_market_v: {
        Row: {
          avg_t1_pct: number | null
          avg_t2_pct: number | null
          city_normalized: string | null
          country_code: string | null
          hotels_bronze: number | null
          hotels_gold: number | null
          hotels_institutional_passing: number | null
          hotels_non_quarantined: number | null
          hotels_quarantined: number | null
          hotels_silver: number | null
          hotels_t1_passing: number | null
          hotels_t2_passing: number | null
          hotels_total: number | null
          institutional_passing_rate: number | null
        }
        Relationships: []
      }
      hotel_coverage_scored_v: {
        Row: {
          canonical_name: string | null
          city_normalized: string | null
          country_code: string | null
          data_quality_tier:
            | Database["public"]["Enums"]["quality_tier_enum"]
            | null
          hotel_id: string | null
          institutional_passing: boolean | null
          last_enriched_at: string | null
          t0_complete: boolean | null
          t0_filled: number | null
          t1_filled: number | null
          t1_passing: boolean | null
          t1_pct: number | null
          t2_filled: number | null
          t2_passing: boolean | null
          t2_pct: number | null
        }
        Insert: {
          canonical_name?: string | null
          city_normalized?: string | null
          country_code?: string | null
          data_quality_tier?:
            | Database["public"]["Enums"]["quality_tier_enum"]
            | null
          hotel_id?: string | null
          institutional_passing?: never
          last_enriched_at?: string | null
          t0_complete?: never
          t0_filled?: never
          t1_filled?: never
          t1_passing?: never
          t1_pct?: never
          t2_filled?: never
          t2_passing?: never
          t2_pct?: never
        }
        Update: {
          canonical_name?: string | null
          city_normalized?: string | null
          country_code?: string | null
          data_quality_tier?:
            | Database["public"]["Enums"]["quality_tier_enum"]
            | null
          hotel_id?: string | null
          institutional_passing?: never
          last_enriched_at?: string | null
          t0_complete?: never
          t0_filled?: never
          t1_filled?: never
          t1_passing?: never
          t1_pct?: never
          t2_filled?: never
          t2_passing?: never
          t2_pct?: never
        }
        Relationships: []
      }
      hotel_coverage_v: {
        Row: {
          canonical_name: string | null
          city_normalized: string | null
          country_code: string | null
          data_quality_tier:
            | Database["public"]["Enums"]["quality_tier_enum"]
            | null
          hotel_id: string | null
          last_enriched_at: string | null
          t0_filled: number | null
          t1_filled: number | null
          t2_filled: number | null
        }
        Insert: {
          canonical_name?: string | null
          city_normalized?: string | null
          country_code?: string | null
          data_quality_tier?:
            | Database["public"]["Enums"]["quality_tier_enum"]
            | null
          hotel_id?: string | null
          last_enriched_at?: string | null
          t0_filled?: never
          t1_filled?: never
          t2_filled?: never
        }
        Update: {
          canonical_name?: string | null
          city_normalized?: string | null
          country_code?: string | null
          data_quality_tier?:
            | Database["public"]["Enums"]["quality_tier_enum"]
            | null
          hotel_id?: string | null
          last_enriched_at?: string | null
          t0_filled?: never
          t1_filled?: never
          t2_filled?: never
        }
        Relationships: []
      }
      hotel_library_ready_v: {
        Row: {
          canonical_name: string | null
          city_normalized: string | null
          core_fields_filled: number | null
          country_code: string | null
          documented_independent: boolean | null
          has_amenities_5plus: boolean | null
          has_chain_scale: number | null
          has_hero_image: boolean | null
          has_keys: number | null
          has_market: number | null
          has_operator_type: number | null
          has_postal_code: number | null
          has_review_score: boolean | null
          has_segment: number | null
          has_submarket: number | null
          has_year: number | null
          hotel_id: string | null
          is_branded: boolean | null
          is_library_partial: boolean | null
          is_library_ready: boolean | null
          is_underwriting_partial: boolean | null
          is_underwriting_ready: boolean | null
        }
        Relationships: []
      }
      hotel_premium_report_ready_v: {
        Row: {
          canonical_name: string | null
          city_normalized: string | null
          core_fields_filled: number | null
          country_code: string | null
          documented_independent: boolean | null
          has_amenities_5plus: boolean | null
          has_brand_family: boolean | null
          has_chain_scale: number | null
          has_hero_image: boolean | null
          has_keys: number | null
          has_market: number | null
          has_operator_type: number | null
          has_postal_code: number | null
          has_review_score: boolean | null
          has_room_type_mix: boolean | null
          has_segment: number | null
          has_submarket: number | null
          has_year: number | null
          hotel_id: string | null
          is_branded: boolean | null
          is_library_partial: boolean | null
          is_library_ready: boolean | null
          is_premium_report_ready: boolean | null
          is_underwriting_partial: boolean | null
          is_underwriting_ready: boolean | null
          mice_satisfied: boolean | null
        }
        Relationships: []
      }
      hotel_readiness_market_v: {
        Row: {
          avg_core_fields_filled: number | null
          branded_n: number | null
          branded_underwriting_partial_n: number | null
          city_normalized: string | null
          country_code: string | null
          documented_indie_n: number | null
          hotels_total: number | null
          indie_n: number | null
          indie_underwriting_partial_n: number | null
          library_partial_n: number | null
          library_partial_rate: number | null
          library_ready_n: number | null
          premium_report_ready_n: number | null
          premium_report_ready_rate: number | null
          underwriting_partial_n: number | null
          underwriting_partial_rate: number | null
          underwriting_ready_n: number | null
          underwriting_ready_rate: number | null
        }
        Relationships: []
      }
      hotel_underwriting_ready_v: {
        Row: {
          canonical_name: string | null
          city_normalized: string | null
          core_fields_filled: number | null
          country_code: string | null
          documented_independent: boolean | null
          has_chain_scale: number | null
          has_keys: number | null
          has_market: number | null
          has_operator_type: number | null
          has_postal_code: number | null
          has_segment: number | null
          has_submarket: number | null
          has_year: number | null
          hotel_id: string | null
          is_branded: boolean | null
          is_underwriting_partial: boolean | null
          is_underwriting_ready: boolean | null
        }
        Insert: {
          canonical_name?: string | null
          city_normalized?: string | null
          core_fields_filled?: never
          country_code?: string | null
          documented_independent?: boolean | null
          has_chain_scale?: never
          has_keys?: never
          has_market?: never
          has_operator_type?: never
          has_postal_code?: never
          has_segment?: never
          has_submarket?: never
          has_year?: never
          hotel_id?: string | null
          is_branded?: never
          is_underwriting_partial?: never
          is_underwriting_ready?: never
        }
        Update: {
          canonical_name?: string | null
          city_normalized?: string | null
          core_fields_filled?: never
          country_code?: string | null
          documented_independent?: boolean | null
          has_chain_scale?: never
          has_keys?: never
          has_market?: never
          has_operator_type?: never
          has_postal_code?: never
          has_segment?: never
          has_submarket?: never
          has_year?: never
          hotel_id?: string | null
          is_branded?: never
          is_underwriting_partial?: never
          is_underwriting_ready?: never
        }
        Relationships: []
      }
      pnl_template_effective: {
        Row: {
          admin_general_pct: number | null
          class: string | null
          country: string | null
          created_at: string | null
          data_source: Database["public"]["Enums"]["pnl_data_source"] | null
          ebitda_pct: number | null
          expenses_fb_pct: number | null
          expenses_rooms_pct: number | null
          fb_beverage_pct: number | null
          fb_food_pct: number | null
          gop_pct: number | null
          id: string | null
          imported_from: string | null
          insurance_pct: number | null
          it_telecom_pct: number | null
          last_imported_at: string | null
          management_fees_pct: number | null
          market: string | null
          meeting_events_pct: number | null
          notes: string | null
          operations_maintenance_pct: number | null
          other_departments_pct: number | null
          overridden_lines: string[] | null
          parking_other_pct: number | null
          property_taxes_pct: number | null
          rent_pct: number | null
          rooms_revenue_pct: number | null
          sales_marketing_pct: number | null
          segmentation_type:
            | Database["public"]["Enums"]["pnl_segmentation_type"]
            | null
          spa_wellness_pct: number | null
          staff_cost_memo_pct: number | null
          submarket: string | null
          updated_at: string | null
          utilities_pct: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      ai_agent_id:
        | "cfo"
        | "cmo"
        | "customer_success"
        | "underwriting"
        | "market_intelligence"
        | "data_ingestion"
        | "report_generation"
        | "crm_dealflow"
        | "qa_monitoring"
        | "ceo"
        | "costar_market_data"
        | "compset_underwriting"
      ai_agent_run_status:
        | "queued"
        | "running"
        | "success"
        | "partial"
        | "failed"
        | "awaiting_approval"
        | "cancelled"
      ai_agent_status: "planned" | "beta" | "active" | "disabled"
      ai_event_kind:
        | "news_ingested"
        | "valuation_created"
        | "valuation_updated"
        | "tour_requested"
        | "user_signed_up"
        | "payment_received"
        | "deploy_completed"
        | "health_check_failed"
        | "system_alert"
        | "human_approval_needed"
        | "human_approved"
        | "human_rejected"
        | "cron_fired"
        | "custom"
        | "strategic_review_completed"
        | "agent_anomaly_detected"
        | "cost_cap_warning"
      ai_memory_scope:
        | "agent_global"
        | "agent_org"
        | "agent_user"
        | "agent_session"
        | "shared"
      ai_permission_action:
        | "select"
        | "insert"
        | "update"
        | "delete"
        | "execute"
      dup_status_enum:
        | "pending_review"
        | "merged"
        | "dismissed"
        | "sibling_listing"
      dup_tier_enum:
        | "auto_merge"
        | "needs_review"
        | "likely_duplicate"
        | "same_building_rebrand"
      enrichment_job_status_enum:
        | "pending"
        | "leased"
        | "done"
        | "failed"
        | "dlq"
      enrichment_job_type_enum:
        | "discover"
        | "enrich"
        | "refresh"
        | "conflict_recheck"
        | "fallback_dispatch"
      enrichment_run_status_enum:
        | "running"
        | "completed"
        | "failed"
        | "partial"
        | "budget_exceeded"
      entity_role:
        | "buyer"
        | "seller"
        | "investor"
        | "operator"
        | "broker"
        | "lender"
        | "developer"
        | "previous_operator"
        | "new_operator"
        | "partner"
        | "mentioned"
      excel_status: "queued" | "parsing" | "staged" | "applied" | "failed"
      fetch_status_enum:
        | "ok"
        | "parsed_with_warnings"
        | "parse_failed"
        | "rate_limited"
        | "not_found"
        | "auth_blocked"
      hotel_lifecycle_enum:
        | "active"
        | "closed"
        | "under_construction"
        | "planned"
        | "unverified"
      hotel_segment:
        | "luxury"
        | "upper_upscale"
        | "upscale"
        | "upper_midscale"
        | "midscale"
        | "economy"
        | "lifestyle"
        | "resort"
        | "boutique"
        | "mixed_use"
        | "serviced_apartments"
        | "unknown"
      hotel_type_enum:
        | "urban"
        | "resort"
        | "airport"
        | "extended_stay"
        | "flex_living"
        | "aparthotel"
        | "boutique"
      ingestion_source_kind: "rss" | "scrape" | "api" | "manual"
      ingestion_status: "queued" | "running" | "success" | "partial" | "failed"
      intelligence_auth_strategy:
        | "none"
        | "cookie_session"
        | "bearer_token"
        | "oauth2"
      intelligence_credential_event_kind:
        | "provisioned"
        | "rotated"
        | "invalidated"
        | "auth_success"
        | "auth_failure"
        | "decryption_error"
      intelligence_credential_status:
        | "active"
        | "invalidated"
        | "auth_failure"
        | "rotated"
      intelligence_session_status:
        | "active"
        | "expired"
        | "invalidated"
        | "refresh_failed"
      lead_status:
        | "new"
        | "qualified"
        | "contacted"
        | "proposal"
        | "closed_won"
        | "closed_lost"
      news_category:
        | "acquisition"
        | "sale"
        | "joint_venture"
        | "development"
        | "refinancing"
        | "rebranding"
        | "operator_change"
        | "branded_residences"
        | "flex_living"
        | "pipeline_announcement"
        | "distress"
        | "investment"
        | "other"
      notification_kind:
        | "tour_request"
        | "promotion_expiring"
        | "comment"
        | "share"
        | "system"
      oauth_provider: "google" | "linkedin" | "apple" | "microsoft"
      operator_type_enum:
        | "franchise"
        | "managed"
        | "owned"
        | "lease"
        | "unknown"
      org_role: "owner" | "admin" | "member" | "viewer"
      pdf_status: "queued" | "generating" | "ready" | "failed"
      pnl_data_source:
        | "costar_real"
        | "costar_submarket_aggregate"
        | "costar_national"
        | "hardcoded_default"
        | "derived_mvp_rule"
        | "pending_costar"
      pnl_segmentation_type: "hotel" | "apartahotel" | "hostel"
      quality_tier_enum: "gold" | "silver" | "bronze" | "quarantined"
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
        | "expired"
      user_role: "user" | "admin" | "owner"
      user_tier:
        | "free"
        | "pro"
        | "premium"
        | "team"
        | "enterprise"
        | "top_promote"
        | "comped"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      ai_agent_id: [
        "cfo",
        "cmo",
        "customer_success",
        "underwriting",
        "market_intelligence",
        "data_ingestion",
        "report_generation",
        "crm_dealflow",
        "qa_monitoring",
        "ceo",
        "costar_market_data",
        "compset_underwriting",
      ],
      ai_agent_run_status: [
        "queued",
        "running",
        "success",
        "partial",
        "failed",
        "awaiting_approval",
        "cancelled",
      ],
      ai_agent_status: ["planned", "beta", "active", "disabled"],
      ai_event_kind: [
        "news_ingested",
        "valuation_created",
        "valuation_updated",
        "tour_requested",
        "user_signed_up",
        "payment_received",
        "deploy_completed",
        "health_check_failed",
        "system_alert",
        "human_approval_needed",
        "human_approved",
        "human_rejected",
        "cron_fired",
        "custom",
        "strategic_review_completed",
        "agent_anomaly_detected",
        "cost_cap_warning",
      ],
      ai_memory_scope: [
        "agent_global",
        "agent_org",
        "agent_user",
        "agent_session",
        "shared",
      ],
      ai_permission_action: ["select", "insert", "update", "delete", "execute"],
      dup_status_enum: [
        "pending_review",
        "merged",
        "dismissed",
        "sibling_listing",
      ],
      dup_tier_enum: [
        "auto_merge",
        "needs_review",
        "likely_duplicate",
        "same_building_rebrand",
      ],
      enrichment_job_status_enum: [
        "pending",
        "leased",
        "done",
        "failed",
        "dlq",
      ],
      enrichment_job_type_enum: [
        "discover",
        "enrich",
        "refresh",
        "conflict_recheck",
        "fallback_dispatch",
      ],
      enrichment_run_status_enum: [
        "running",
        "completed",
        "failed",
        "partial",
        "budget_exceeded",
      ],
      entity_role: [
        "buyer",
        "seller",
        "investor",
        "operator",
        "broker",
        "lender",
        "developer",
        "previous_operator",
        "new_operator",
        "partner",
        "mentioned",
      ],
      excel_status: ["queued", "parsing", "staged", "applied", "failed"],
      fetch_status_enum: [
        "ok",
        "parsed_with_warnings",
        "parse_failed",
        "rate_limited",
        "not_found",
        "auth_blocked",
      ],
      hotel_lifecycle_enum: [
        "active",
        "closed",
        "under_construction",
        "planned",
        "unverified",
      ],
      hotel_segment: [
        "luxury",
        "upper_upscale",
        "upscale",
        "upper_midscale",
        "midscale",
        "economy",
        "lifestyle",
        "resort",
        "boutique",
        "mixed_use",
        "serviced_apartments",
        "unknown",
      ],
      hotel_type_enum: [
        "urban",
        "resort",
        "airport",
        "extended_stay",
        "flex_living",
        "aparthotel",
        "boutique",
      ],
      ingestion_source_kind: ["rss", "scrape", "api", "manual"],
      ingestion_status: ["queued", "running", "success", "partial", "failed"],
      intelligence_auth_strategy: [
        "none",
        "cookie_session",
        "bearer_token",
        "oauth2",
      ],
      intelligence_credential_event_kind: [
        "provisioned",
        "rotated",
        "invalidated",
        "auth_success",
        "auth_failure",
        "decryption_error",
      ],
      intelligence_credential_status: [
        "active",
        "invalidated",
        "auth_failure",
        "rotated",
      ],
      intelligence_session_status: [
        "active",
        "expired",
        "invalidated",
        "refresh_failed",
      ],
      lead_status: [
        "new",
        "qualified",
        "contacted",
        "proposal",
        "closed_won",
        "closed_lost",
      ],
      news_category: [
        "acquisition",
        "sale",
        "joint_venture",
        "development",
        "refinancing",
        "rebranding",
        "operator_change",
        "branded_residences",
        "flex_living",
        "pipeline_announcement",
        "distress",
        "investment",
        "other",
      ],
      notification_kind: [
        "tour_request",
        "promotion_expiring",
        "comment",
        "share",
        "system",
      ],
      oauth_provider: ["google", "linkedin", "apple", "microsoft"],
      operator_type_enum: ["franchise", "managed", "owned", "lease", "unknown"],
      org_role: ["owner", "admin", "member", "viewer"],
      pdf_status: ["queued", "generating", "ready", "failed"],
      pnl_data_source: [
        "costar_real",
        "costar_submarket_aggregate",
        "costar_national",
        "hardcoded_default",
        "derived_mvp_rule",
        "pending_costar",
      ],
      pnl_segmentation_type: ["hotel", "apartahotel", "hostel"],
      quality_tier_enum: ["gold", "silver", "bronze", "quarantined"],
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
        "expired",
      ],
      user_role: ["user", "admin", "owner"],
      user_tier: [
        "free",
        "pro",
        "premium",
        "team",
        "enterprise",
        "top_promote",
        "comped",
      ],
    },
  },
} as const
