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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_execution_logs: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          instruction_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          instruction_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          instruction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_execution_logs_instruction_id_fkey"
            columns: ["instruction_id"]
            isOneToOne: false
            referencedRelation: "ai_instructions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_instructions: {
        Row: {
          affected_count: number | null
          created_at: string
          created_by: string
          error_message: string | null
          executed_at: string | null
          id: string
          instruction: string
          instruction_type: string
          result: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          affected_count?: number | null
          created_at?: string
          created_by: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          instruction: string
          instruction_type?: string
          result?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          affected_count?: number | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          instruction?: string
          instruction_type?: string
          result?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      caller_achievements: {
        Row: {
          achievement_name: string
          achievement_type: string
          description: string | null
          earned_at: string
          id: string
          points_awarded: number | null
          user_id: string
        }
        Insert: {
          achievement_name: string
          achievement_type: string
          description?: string | null
          earned_at?: string
          id?: string
          points_awarded?: number | null
          user_id: string
        }
        Update: {
          achievement_name?: string
          achievement_type?: string
          description?: string | null
          earned_at?: string
          id?: string
          points_awarded?: number | null
          user_id?: string
        }
        Relationships: []
      }
      caller_scores: {
        Row: {
          best_streak: number | null
          confirmed_orders: number | null
          conversion_rate: number | null
          created_at: string
          id: string
          last_activity_date: string | null
          level: number | null
          streak_days: number | null
          total_points: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          best_streak?: number | null
          confirmed_orders?: number | null
          conversion_rate?: number | null
          created_at?: string
          id?: string
          last_activity_date?: string | null
          level?: number | null
          streak_days?: number | null
          total_points?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          best_streak?: number | null
          confirmed_orders?: number | null
          conversion_rate?: number | null
          created_at?: string
          id?: string
          last_activity_date?: string | null
          level?: number | null
          streak_days?: number | null
          total_points?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      campaign_logs: {
        Row: {
          campaign_id: string | null
          client_id: string | null
          created_at: string
          error_message: string | null
          id: string
          phone: string
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          phone: string
          sent_at?: string | null
          status: string
        }
        Update: {
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          phone?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          failed_count: number | null
          id: string
          message: string
          name: string
          scheduled_at: string | null
          segment: string | null
          sent_at: string | null
          sent_count: number | null
          status: string
          total_recipients: number | null
          type: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          failed_count?: number | null
          id?: string
          message: string
          name: string
          scheduled_at?: string | null
          segment?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          total_recipients?: number | null
          type: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          failed_count?: number | null
          id?: string
          message?: string
          name?: string
          scheduled_at?: string | null
          segment?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          total_recipients?: number | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          created_by: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string
          phone_secondary: string | null
          segment: Database["public"]["Enums"]["client_segment"]
          total_orders: number
          total_spent: number
          updated_at: string
          zone: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone: string
          phone_secondary?: string | null
          segment?: Database["public"]["Enums"]["client_segment"]
          total_orders?: number
          total_spent?: number
          updated_at?: string
          zone?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string
          phone_secondary?: string | null
          segment?: Database["public"]["Enums"]["client_segment"]
          total_orders?: number
          total_spent?: number
          updated_at?: string
          zone?: string | null
        }
        Relationships: []
      }
      collected_revenues: {
        Row: {
          amount: number
          collected_at: string
          collected_by: string
          created_at: string
          deposit_id: string | null
          id: string
          order_id: string
          payment_id: string
          status: Database["public"]["Enums"]["revenue_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          collected_at?: string
          collected_by: string
          created_at?: string
          deposit_id?: string | null
          id?: string
          order_id: string
          payment_id: string
          status?: Database["public"]["Enums"]["revenue_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          collected_at?: string
          collected_by?: string
          created_at?: string
          deposit_id?: string | null
          id?: string
          order_id?: string
          payment_id?: string
          status?: Database["public"]["Enums"]["revenue_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collected_revenues_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collected_revenues_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_a_distribuer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collected_revenues_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_a_distribuer_par_zone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collected_revenues_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_recentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collected_revenues_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_collected_revenues_deposit"
            columns: ["deposit_id"]
            isOneToOne: false
            referencedRelation: "revenue_deposits"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_person_stock: {
        Row: {
          created_at: string
          delivery_person_id: string
          id: string
          last_restocked_at: string | null
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_person_id: string
          id?: string
          last_restocked_at?: string | null
          product_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_person_id?: string
          id?: string
          last_restocked_at?: string | null
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_person_stock_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_person_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_persons: {
        Row: {
          created_at: string
          daily_amount: number
          daily_deliveries: number
          id: string
          is_active: boolean
          status: Database["public"]["Enums"]["delivery_status"]
          updated_at: string
          user_id: string
          vehicle_type: string | null
          zone: string | null
        }
        Insert: {
          created_at?: string
          daily_amount?: number
          daily_deliveries?: number
          id?: string
          is_active?: boolean
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
          user_id: string
          vehicle_type?: string | null
          zone?: string | null
        }
        Update: {
          created_at?: string
          daily_amount?: number
          daily_deliveries?: number
          id?: string
          is_active?: boolean
          status?: Database["public"]["Enums"]["delivery_status"]
          updated_at?: string
          user_id?: string
          vehicle_type?: string | null
          zone?: string | null
        }
        Relationships: []
      }
      follow_ups: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_id: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["followup_status"]
          type: Database["public"]["Enums"]["followup_type"]
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["followup_status"]
          type: Database["public"]["Enums"]["followup_type"]
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["followup_status"]
          type?: Database["public"]["Enums"]["followup_type"]
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_a_distribuer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_a_distribuer_par_zone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_recentes"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel: string
          content: string
          created_at: string
          id: string
          is_read: boolean | null
          message_type: string | null
          order_id: string | null
          receiver_id: string | null
          room_id: string | null
          sender_id: string
        }
        Insert: {
          channel?: string
          content: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          order_id?: string | null
          receiver_id?: string | null
          room_id?: string | null
          sender_id: string
        }
        Update: {
          channel?: string
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          order_id?: string | null
          receiver_id?: string | null
          room_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_a_distribuer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_a_distribuer_par_zone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_recentes"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_due: number | null
          amount_paid: number
          assigned_to: string | null
          cancellation_reason: string | null
          client_id: string
          client_phone: string | null
          client_phone_secondary: string | null
          created_at: string
          created_by: string | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_notes: string | null
          delivery_person_id: string | null
          id: string
          order_number: string | null
          product_id: string | null
          quantity: number
          report_reason: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          amount_due?: number | null
          amount_paid?: number
          assigned_to?: string | null
          cancellation_reason?: string | null
          client_id: string
          client_phone?: string | null
          client_phone_secondary?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_notes?: string | null
          delivery_person_id?: string | null
          id?: string
          order_number?: string | null
          product_id?: string | null
          quantity?: number
          report_reason?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          amount_due?: number | null
          amount_paid?: number
          assigned_to?: string | null
          cancellation_reason?: string | null
          client_id?: string
          client_phone?: string | null
          client_phone_secondary?: string | null
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_notes?: string | null
          delivery_person_id?: string | null
          id?: string
          order_number?: string | null
          product_id?: string | null
          quantity?: number
          report_reason?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_approvals: {
        Row: {
          approved_by: string | null
          comment: string | null
          created_at: string
          decided_at: string | null
          id: string
          payment_id: string
          requested_by: string
          status: string
        }
        Insert: {
          approved_by?: string | null
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          payment_id: string
          requested_by: string
          status?: string
        }
        Update: {
          approved_by?: string | null
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          id?: string
          payment_id?: string
          requested_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_approvals_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          order_id: string
          received_by: string | null
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          order_id: string
          received_by?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          order_id?: string
          received_by?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_a_distribuer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_a_distribuer_par_zone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_recentes"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          price: number
          stock: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          price: number
          stock?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          stock?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      revenue_deposits: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          deposited_at: string
          deposited_by: string
          id: string
          notes: string | null
          revenues_count: number
          status: string
          total_amount: number
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          deposited_at?: string
          deposited_by: string
          id?: string
          notes?: string | null
          revenues_count?: number
          status?: string
          total_amount: number
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          deposited_at?: string
          deposited_by?: string
          id?: string
          notes?: string | null
          revenues_count?: number
          status?: string
          total_amount?: number
        }
        Relationships: []
      }
      role_requests: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          requested_role: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      room_members: {
        Row: {
          role: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          role?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          role?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      scheduled_followups: {
        Row: {
          attempts: number | null
          client_id: string
          created_at: string
          created_by: string | null
          followup_type: string | null
          id: string
          last_attempt_at: string | null
          order_id: string
          scheduled_at: string
          sms_content: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number | null
          client_id: string
          created_at?: string
          created_by?: string | null
          followup_type?: string | null
          id?: string
          last_attempt_at?: string | null
          order_id: string
          scheduled_at: string
          sms_content?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          followup_type?: string | null
          id?: string
          last_attempt_at?: string | null
          order_id?: string
          scheduled_at?: string
          sms_content?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_followups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_followups_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_followups_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_a_distribuer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_followups_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_a_distribuer_par_zone"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_followups_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "v_orders_recentes"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          created_at: string
          date: string
          end_time: string
          id: string
          notes: string | null
          start_time: string
          status: string
          type: string
          updated_at: string
          user_id: string
          zone: string | null
        }
        Insert: {
          created_at?: string
          date: string
          end_time: string
          id?: string
          notes?: string | null
          start_time: string
          status?: string
          type: string
          updated_at?: string
          user_id: string
          zone?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          notes?: string | null
          start_time?: string
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
          zone?: string | null
        }
        Relationships: []
      }
      sms_templates: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          message: string
          name: string
          updated_at: string
          variables: string[] | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_active?: boolean
          message: string
          name: string
          updated_at?: string
          variables?: string[] | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          name?: string
          updated_at?: string
          variables?: string[] | null
        }
        Relationships: []
      }
      stock_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string
          current_quantity: number
          delivery_person_id: string | null
          id: string
          is_acknowledged: boolean | null
          product_id: string
          severity: string
          threshold: number
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string
          current_quantity?: number
          delivery_person_id?: string | null
          id?: string
          is_acknowledged?: boolean | null
          product_id: string
          severity?: string
          threshold?: number
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string
          current_quantity?: number
          delivery_person_id?: string | null
          id?: string
          is_acknowledged?: boolean | null
          product_id?: string
          severity?: string
          threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_alerts_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_alerts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          delivery_person_id: string | null
          id: string
          movement_type: string
          notes: string | null
          performed_by: string | null
          product_id: string
          quantity: number
          reference_id: string | null
        }
        Insert: {
          created_at?: string
          delivery_person_id?: string | null
          id?: string
          movement_type: string
          notes?: string | null
          performed_by?: string | null
          product_id: string
          quantity: number
          reference_id?: string | null
        }
        Update: {
          created_at?: string
          delivery_person_id?: string | null
          id?: string
          movement_type?: string
          notes?: string | null
          performed_by?: string | null
          product_id?: string
          quantity?: number
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_thresholds: {
        Row: {
          created_at: string
          critical_threshold: number
          id: string
          location_type: string
          product_id: string
          updated_at: string
          warning_threshold: number
        }
        Insert: {
          created_at?: string
          critical_threshold?: number
          id?: string
          location_type: string
          product_id: string
          updated_at?: string
          warning_threshold?: number
        }
        Update: {
          created_at?: string
          critical_threshold?: number
          id?: string
          location_type?: string
          product_id?: string
          updated_at?: string
          warning_threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_thresholds_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      supply_requests: {
        Row: {
          created_at: string
          delivery_person_id: string | null
          fulfilled_at: string | null
          id: string
          notes: string | null
          product_id: string
          quantity_approved: number | null
          quantity_requested: number
          reason: string | null
          requested_by: string
          requester_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_person_id?: string | null
          fulfilled_at?: string | null
          id?: string
          notes?: string | null
          product_id: string
          quantity_approved?: number | null
          quantity_requested: number
          reason?: string | null
          requested_by: string
          requester_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_person_id?: string | null
          fulfilled_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string
          quantity_approved?: number | null
          quantity_requested?: number
          reason?: string | null
          requested_by?: string
          requester_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supply_requests_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      training_resources: {
        Row: {
          category: string
          created_at: string
          description: string | null
          duration: string | null
          id: string
          is_active: boolean | null
          order_index: number | null
          title: string
          type: string
          updated_at: string
          url: string | null
          youtube_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          title: string
          type: string
          updated_at?: string
          url?: string | null
          youtube_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          is_active?: boolean | null
          order_index?: number | null
          title?: string
          type?: string
          updated_at?: string
          url?: string | null
          youtube_id?: string | null
        }
        Relationships: []
      }
      user_presence: {
        Row: {
          last_seen_at: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          last_seen_at?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          last_seen_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          confirmed: boolean
          confirmed_at: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          confirmed?: boolean
          confirmed_at?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_training_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          created_at: string
          id: string
          progress_percent: number | null
          resource_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          progress_percent?: number | null
          resource_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          id?: string
          progress_percent?: number | null
          resource_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_training_progress_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "training_resources"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_role_requests_view: {
        Row: {
          created_at: string | null
          id: string | null
          reason: string | null
          requested_role: Database["public"]["Enums"]["app_role"] | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          reason?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          reason?: string | null
          requested_role?: Database["public"]["Enums"]["app_role"] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      role_requests_view: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          phone: string | null
          reason: string | null
          request_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_email: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          status: string | null
          user_id: string | null
        }
        Relationships: []
      }
      v_orders_a_distribuer: {
        Row: {
          amount_due: number | null
          amount_paid: number | null
          assigned_to: string | null
          cancellation_reason: string | null
          client_id: string | null
          client_phone: string | null
          client_phone_secondary: string | null
          created_at: string | null
          created_by: string | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_notes: string | null
          delivery_person_id: string | null
          id: string | null
          order_number: string | null
          product_id: string | null
          quantity: number | null
          report_reason: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          amount_due?: number | null
          amount_paid?: number | null
          assigned_to?: string | null
          cancellation_reason?: string | null
          client_id?: string | null
          client_phone?: string | null
          client_phone_secondary?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_notes?: string | null
          delivery_person_id?: string | null
          id?: string | null
          order_number?: string | null
          product_id?: string | null
          quantity?: number | null
          report_reason?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          amount_due?: number | null
          amount_paid?: number | null
          assigned_to?: string | null
          cancellation_reason?: string | null
          client_id?: string | null
          client_phone?: string | null
          client_phone_secondary?: string | null
          created_at?: string | null
          created_by?: string | null
          delivered_at?: string | null
          delivery_address?: string | null
          delivery_notes?: string | null
          delivery_person_id?: string | null
          id?: string | null
          order_number?: string | null
          product_id?: string | null
          quantity?: number | null
          report_reason?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          total_amount?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      v_orders_a_distribuer_par_zone: {
        Row: {
          amount_due: number | null
          city: string | null
          client_id: string | null
          created_at: string | null
          delivery_address: string | null
          id: string | null
          order_number: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number | null
          zone: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      v_orders_recentes: {
        Row: {
          amount_due: number | null
          amount_paid: number | null
          assigned_to: string | null
          cancellation_reason: string | null
          client_id: string | null
          client_phone: string | null
          client_phone_secondary: string | null
          created_at: string | null
          created_by: string | null
          delivered_at: string | null
          delivery_address: string | null
          delivery_notes: string | null
          delivery_person_id: string | null
          id: string | null
          order_number: string | null
          product_id: string | null
          quantity: number | null
          report_reason: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          total_amount: number | null
          unit_price: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_delivery_person_id_fkey"
            columns: ["delivery_person_id"]
            isOneToOne: false
            referencedRelation: "delivery_persons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_set_user_role: {
        Args: {
          target_email: string
          target_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: undefined
      }
      approve_role_request: {
        Args: { p_request_id: string; p_reviewer_id: string }
        Returns: undefined
      }
      backfill_payments_received_by: { Args: never; Returns: number }
      can_chat: {
        Args: { receiver_id: string; sender_id: string }
        Returns: boolean
      }
      confirm_revenue_deposit: {
        Args: { p_deposit_id: string; p_supervisor_id: string }
        Returns: Json
      }
      current_tenant_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      get_caller_revenue_summary: {
        Args: { p_start_date?: string; p_user_id: string }
        Returns: {
          collected_count: number
          deposited_count: number
          total_collected: number
          total_deposited: number
          total_to_deposit: number
        }[]
      }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
      is_admin: { Args: never; Returns: boolean }
      is_admin_user: { Args: { p_user_id: string }; Returns: boolean }
      manual_withdrawal_from_delivery: {
        Args: {
          p_delivery_person_id: string
          p_product_id: string
          p_quantity: number
          p_reason: string
        }
        Returns: Json
      }
      process_revenue_deposit: {
        Args: { p_notes?: string; p_user_id: string }
        Returns: string
      }
      reject_revenue_deposit: {
        Args: {
          p_deposit_id: string
          p_reason?: string
          p_supervisor_id: string
        }
        Returns: Json
      }
      reject_role_request: {
        Args: { p_reason: string; p_request_id: string; p_reviewer_id: string }
        Returns: undefined
      }
      role_requests_view_secure: {
        Args: never
        Returns: {
          created_at: string | null
          email: string | null
          full_name: string | null
          phone: string | null
          reason: string | null
          request_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_email: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          status: string | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "role_requests_view"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      transfer_stock_from_delivery: {
        Args: {
          p_delivery_person_id: string
          p_performed_by?: string
          p_product_id: string
          p_quantity: number
        }
        Returns: Json
      }
      transfer_stock_to_delivery: {
        Args: {
          p_delivery_person_id: string
          p_performed_by?: string
          p_product_id: string
          p_quantity: number
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "appelant" | "livreur" | "superviseur" | "administrateur"
      client_segment: "new" | "regular" | "vip" | "inactive" | "problematic"
      delivery_status: "available" | "busy" | "offline"
      followup_status: "pending" | "completed" | "cancelled"
      followup_type:
        | "reminder"
        | "partial_payment"
        | "rescheduled"
        | "retargeting"
      order_status:
        | "pending"
        | "confirmed"
        | "in_transit"
        | "delivered"
        | "partial"
        | "cancelled"
        | "reported"
      payment_method: "cash" | "mobile_money" | "card" | "transfer"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      revenue_status: "collected" | "deposited"
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
      app_role: ["appelant", "livreur", "superviseur", "administrateur"],
      client_segment: ["new", "regular", "vip", "inactive", "problematic"],
      delivery_status: ["available", "busy", "offline"],
      followup_status: ["pending", "completed", "cancelled"],
      followup_type: [
        "reminder",
        "partial_payment",
        "rescheduled",
        "retargeting",
      ],
      order_status: [
        "pending",
        "confirmed",
        "in_transit",
        "delivered",
        "partial",
        "cancelled",
        "reported",
      ],
      payment_method: ["cash", "mobile_money", "card", "transfer"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      revenue_status: ["collected", "deposited"],
    },
  },
} as const
