export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_kind: string
          actor_user_id: string | null
          after: Json | null
          before: Json | null
          changed_columns: string[] | null
          detail: Json | null
          entity_id: string | null
          entity_type: string | null
          id: number
          occurred_at: string
          organisation_id: string | null
          support_session_id: string | null
        }
        Insert: {
          action: string
          actor_kind: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          changed_columns?: string[] | null
          detail?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: never
          occurred_at?: string
          organisation_id?: string | null
          support_session_id?: string | null
        }
        Update: {
          action?: string
          actor_kind?: string
          actor_user_id?: string | null
          after?: Json | null
          before?: Json | null
          changed_columns?: string[] | null
          detail?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: never
          occurred_at?: string
          organisation_id?: string | null
          support_session_id?: string | null
        }
        Relationships: []
      }
      business_units: {
        Row: {
          created_at: string
          id: string
          name: string
          organisation_id: string
          parent_unit_id: string | null
          retired_on: string | null
          status: string
          unit_code: string
          unit_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organisation_id: string
          parent_unit_id?: string | null
          retired_on?: string | null
          status?: string
          unit_code: string
          unit_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organisation_id?: string
          parent_unit_id?: string | null
          retired_on?: string | null
          status?: string
          unit_code?: string
          unit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_units_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_units_organisation_id_parent_unit_id_fkey"
            columns: ["organisation_id", "parent_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      campaign_units: {
        Row: {
          campaign_id: string
          id: string
          organisation_id: string
          unit_id: string
        }
        Insert: {
          campaign_id: string
          id?: string
          organisation_id: string
          unit_id: string
        }
        Update: {
          campaign_id?: string
          id?: string
          organisation_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_units_organisation_id_campaign_id_fkey"
            columns: ["organisation_id", "campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "campaign_units_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_units_organisation_id_unit_id_fkey"
            columns: ["organisation_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      campaigns: {
        Row: {
          cadence: string
          closed_at: string | null
          closes_at: string | null
          created_at: string
          id: string
          launched_at: string | null
          launched_by: string | null
          opens_at: string | null
          organisation_id: string
          status: string
        }
        Insert: {
          cadence: string
          closed_at?: string | null
          closes_at?: string | null
          created_at?: string
          id?: string
          launched_at?: string | null
          launched_by?: string | null
          opens_at?: string | null
          organisation_id: string
          status?: string
        }
        Update: {
          cadence?: string
          closed_at?: string | null
          closes_at?: string | null
          created_at?: string
          id?: string
          launched_at?: string | null
          launched_by?: string | null
          opens_at?: string | null
          organisation_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_snapshots: {
        Row: {
          campaign_id: string
          id: string
          member_count: number
          organisation_id: string
          taken_at: string
          taken_by: string | null
        }
        Insert: {
          campaign_id: string
          id?: string
          member_count?: number
          organisation_id: string
          taken_at?: string
          taken_by?: string | null
        }
        Update: {
          campaign_id?: string
          id?: string
          member_count?: number
          organisation_id?: string
          taken_at?: string
          taken_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directory_snapshots_organisation_id_campaign_id_fkey"
            columns: ["organisation_id", "campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "directory_snapshots_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_upload_rows: {
        Row: {
          employee_ref: string
          employment_status: string | null
          first_name: string
          formal_rating_date: string | null
          formal_rating_label: string | null
          fte: number
          id: string
          is_leadership_team: boolean
          is_team_leader: boolean
          last_name: string
          manager_ref: string | null
          organisation_id: string
          role_family_name: string | null
          role_title: string | null
          row_number: number
          start_date: string | null
          team_name: string | null
          unit_code: string
          unit_name: string
          upload_id: string
          work_email: string | null
        }
        Insert: {
          employee_ref: string
          employment_status?: string | null
          first_name: string
          formal_rating_date?: string | null
          formal_rating_label?: string | null
          fte: number
          id?: string
          is_leadership_team?: boolean
          is_team_leader?: boolean
          last_name: string
          manager_ref?: string | null
          organisation_id: string
          role_family_name?: string | null
          role_title?: string | null
          row_number: number
          start_date?: string | null
          team_name?: string | null
          unit_code: string
          unit_name: string
          upload_id: string
          work_email?: string | null
        }
        Update: {
          employee_ref?: string
          employment_status?: string | null
          first_name?: string
          formal_rating_date?: string | null
          formal_rating_label?: string | null
          fte?: number
          id?: string
          is_leadership_team?: boolean
          is_team_leader?: boolean
          last_name?: string
          manager_ref?: string | null
          organisation_id?: string
          role_family_name?: string | null
          role_title?: string | null
          row_number?: number
          start_date?: string | null
          team_name?: string | null
          unit_code?: string
          unit_name?: string
          upload_id?: string
          work_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "directory_upload_rows_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "directory_upload_rows_organisation_id_upload_id_fkey"
            columns: ["organisation_id", "upload_id"]
            isOneToOne: false
            referencedRelation: "directory_uploads"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      directory_uploads: {
        Row: {
          byte_size: number
          decided_at: string | null
          decided_by: string | null
          diff_summary: Json | null
          errors: Json
          file_name: string
          file_removed_at: string | null
          id: string
          organisation_id: string
          row_count: number
          sha256: string
          status: string
          storage_path: string
          template_version: string | null
          uploaded_at: string
          uploaded_by: string
        }
        Insert: {
          byte_size: number
          decided_at?: string | null
          decided_by?: string | null
          diff_summary?: Json | null
          errors?: Json
          file_name: string
          file_removed_at?: string | null
          id: string
          organisation_id: string
          row_count?: number
          sha256: string
          status: string
          storage_path: string
          template_version?: string | null
          uploaded_at?: string
          uploaded_by: string
        }
        Update: {
          byte_size?: number
          decided_at?: string | null
          decided_by?: string | null
          diff_summary?: Json | null
          errors?: Json
          file_name?: string
          file_removed_at?: string | null
          id?: string
          organisation_id?: string
          row_count?: number
          sha256?: string
          status?: string
          storage_path?: string
          template_version?: string | null
          uploaded_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "directory_uploads_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          deactivated_at: string | null
          employee_ref: string
          employment_status: string | null
          first_name: string
          fte: number
          id: string
          is_leadership_team: boolean
          is_team_leader: boolean
          last_name: string
          manager_employee_id: string | null
          organisation_id: string
          role_family_id: string | null
          role_title: string | null
          start_date: string | null
          status: string
          team_id: string | null
          unit_id: string
          updated_at: string
          work_email: string | null
        }
        Insert: {
          created_at?: string
          deactivated_at?: string | null
          employee_ref: string
          employment_status?: string | null
          first_name: string
          fte: number
          id?: string
          is_leadership_team?: boolean
          is_team_leader?: boolean
          last_name: string
          manager_employee_id?: string | null
          organisation_id: string
          role_family_id?: string | null
          role_title?: string | null
          start_date?: string | null
          status?: string
          team_id?: string | null
          unit_id: string
          updated_at?: string
          work_email?: string | null
        }
        Update: {
          created_at?: string
          deactivated_at?: string | null
          employee_ref?: string
          employment_status?: string | null
          first_name?: string
          fte?: number
          id?: string
          is_leadership_team?: boolean
          is_team_leader?: boolean
          last_name?: string
          manager_employee_id?: string | null
          organisation_id?: string
          role_family_id?: string | null
          role_title?: string | null
          start_date?: string | null
          status?: string
          team_id?: string | null
          unit_id?: string
          updated_at?: string
          work_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_organisation_id_manager_employee_id_fkey"
            columns: ["organisation_id", "manager_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "employees_organisation_id_role_family_id_fkey"
            columns: ["organisation_id", "role_family_id"]
            isOneToOne: false
            referencedRelation: "role_families"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "employees_organisation_id_unit_id_fkey"
            columns: ["organisation_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "employees_organisation_id_unit_id_team_id_fkey"
            columns: ["organisation_id", "unit_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organisation_id", "unit_id", "id"]
          },
        ]
      }
      formal_ratings: {
        Row: {
          employee_id: string
          id: string
          organisation_id: string
          rating_date: string
          rating_label: string
          recorded_at: string
          recorded_by: string | null
          source_upload_id: string | null
        }
        Insert: {
          employee_id: string
          id?: string
          organisation_id: string
          rating_date: string
          rating_label: string
          recorded_at?: string
          recorded_by?: string | null
          source_upload_id?: string | null
        }
        Update: {
          employee_id?: string
          id?: string
          organisation_id?: string
          rating_date?: string
          rating_label?: string
          recorded_at?: string
          recorded_by?: string | null
          source_upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formal_ratings_organisation_id_employee_id_fkey"
            columns: ["organisation_id", "employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "formal_ratings_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formal_ratings_organisation_id_source_upload_id_fkey"
            columns: ["organisation_id", "source_upload_id"]
            isOneToOne: false
            referencedRelation: "directory_uploads"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      invitations: {
        Row: {
          audience: string
          campaign_unit_id: string
          email: string | null
          id: string
          last_reminded_at: string | null
          organisation_id: string
          reminder_count: number
          sent_at: string | null
          snapshot_member_id: string
          status: string
          token_hash: string | null
        }
        Insert: {
          audience: string
          campaign_unit_id: string
          email?: string | null
          id?: string
          last_reminded_at?: string | null
          organisation_id: string
          reminder_count?: number
          sent_at?: string | null
          snapshot_member_id: string
          status?: string
          token_hash?: string | null
        }
        Update: {
          audience?: string
          campaign_unit_id?: string
          email?: string | null
          id?: string
          last_reminded_at?: string | null
          organisation_id?: string
          reminder_count?: number
          sent_at?: string | null
          snapshot_member_id?: string
          status?: string
          token_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_organisation_id_campaign_unit_id_fkey"
            columns: ["organisation_id", "campaign_unit_id"]
            isOneToOne: false
            referencedRelation: "campaign_units"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "invitations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_organisation_id_snapshot_member_id_fkey"
            columns: ["organisation_id", "snapshot_member_id"]
            isOneToOne: false
            referencedRelation: "snapshot_members"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      knowledge_domains: {
        Row: {
          created_at: string
          criticality: number
          id: string
          name: string
          organisation_id: string
          status: string
          unit_id: string
        }
        Insert: {
          created_at?: string
          criticality: number
          id?: string
          name: string
          organisation_id: string
          status?: string
          unit_id: string
        }
        Update: {
          created_at?: string
          criticality?: number
          id?: string
          name?: string
          organisation_id?: string
          status?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_domains_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_domains_organisation_id_unit_id_fkey"
            columns: ["organisation_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      knowledge_ratings: {
        Row: {
          created_at: string
          employee_id: string | null
          evidence_note: string | null
          id: string
          knowledge_domain_id: string
          organisation_id: string
          rating: number
          rating_session_id: string
          subject_snapshot_member_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          evidence_note?: string | null
          id?: string
          knowledge_domain_id: string
          organisation_id: string
          rating: number
          rating_session_id: string
          subject_snapshot_member_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          evidence_note?: string | null
          id?: string
          knowledge_domain_id?: string
          organisation_id?: string
          rating?: number
          rating_session_id?: string
          subject_snapshot_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_ratings_organisation_id_employee_id_fkey"
            columns: ["organisation_id", "employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "knowledge_ratings_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_ratings_organisation_id_knowledge_domain_id_fkey"
            columns: ["organisation_id", "knowledge_domain_id"]
            isOneToOne: false
            referencedRelation: "knowledge_domains"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "knowledge_ratings_organisation_id_rating_session_id_fkey"
            columns: ["organisation_id", "rating_session_id"]
            isOneToOne: false
            referencedRelation: "rating_sessions"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "knowledge_ratings_organisation_id_subject_snapshot_member__fkey"
            columns: ["organisation_id", "subject_snapshot_member_id"]
            isOneToOne: false
            referencedRelation: "snapshot_members"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      membership_invitations: {
        Row: {
          claimed_at: string | null
          claimed_by: string | null
          email: string
          expires_at: string
          id: string
          invited_at: string
          invited_by: string | null
          organisation_id: string
          role: string
          unit_ids: string[]
        }
        Insert: {
          claimed_at?: string | null
          claimed_by?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          organisation_id: string
          role: string
          unit_ids?: string[]
        }
        Update: {
          claimed_at?: string | null
          claimed_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          organisation_id?: string
          role?: string
          unit_ids?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "membership_invitations_claimed_by_fkey"
            columns: ["claimed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "membership_invitations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_memberships: {
        Row: {
          employee_id: string | null
          granted_at: string
          granted_by: string | null
          id: string
          organisation_id: string
          revoked_at: string | null
          revoked_by: string | null
          role: string
          user_id: string
        }
        Insert: {
          employee_id?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          organisation_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          role: string
          user_id: string
        }
        Update: {
          employee_id?: string | null
          granted_at?: string
          granted_by?: string | null
          id?: string
          organisation_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_memberships_organisation_id_employee_id_fkey"
            columns: ["organisation_id", "employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "org_memberships_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organisations: {
        Row: {
          anzsic_class: string | null
          anzsic_division: string | null
          created_at: string
          created_by: string | null
          data_contribution_opt_out: boolean
          id: string
          name: string
          size_band: string | null
        }
        Insert: {
          anzsic_class?: string | null
          anzsic_division?: string | null
          created_at?: string
          created_by?: string | null
          data_contribution_opt_out?: boolean
          id?: string
          name: string
          size_band?: string | null
        }
        Update: {
          anzsic_class?: string | null
          anzsic_division?: string | null
          created_at?: string
          created_by?: string | null
          data_contribution_opt_out?: boolean
          id?: string
          name?: string
          size_band?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_owner: boolean
          is_support_staff: boolean
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_owner?: boolean
          is_support_staff?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_owner?: boolean
          is_support_staff?: boolean
        }
        Relationships: []
      }
      rating_sessions: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          manager_employee_id: string | null
          manager_snapshot_member_id: string
          organisation_id: string
          status: string
          submitted_at: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          manager_employee_id?: string | null
          manager_snapshot_member_id: string
          organisation_id: string
          status?: string
          submitted_at?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          manager_employee_id?: string | null
          manager_snapshot_member_id?: string
          organisation_id?: string
          status?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rating_sessions_organisation_id_campaign_id_fkey"
            columns: ["organisation_id", "campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "rating_sessions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rating_sessions_organisation_id_manager_employee_id_fkey"
            columns: ["organisation_id", "manager_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "rating_sessions_organisation_id_manager_snapshot_member_id_fkey"
            columns: ["organisation_id", "manager_snapshot_member_id"]
            isOneToOne: false
            referencedRelation: "snapshot_members"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      ref_employee_bands: {
        Row: {
          code: string
          label: string
          max_employees: number
          sort_order: number
        }
        Insert: {
          code: string
          label: string
          max_employees: number
          sort_order: number
        }
        Update: {
          code?: string
          label?: string
          max_employees?: number
          sort_order?: number
        }
        Relationships: []
      }
      role_families: {
        Row: {
          created_at: string
          id: string
          is_people_leader: boolean
          name: string
          organisation_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_people_leader?: boolean
          name: string
          organisation_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_people_leader?: boolean
          name?: string
          organisation_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_families_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_ratings: {
        Row: {
          created_at: string
          employee_id: string | null
          evidence_note: string | null
          id: string
          organisation_id: string
          rating: number
          rating_session_id: string
          skill_id: string
          subject_snapshot_member_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          evidence_note?: string | null
          id?: string
          organisation_id: string
          rating: number
          rating_session_id: string
          skill_id: string
          subject_snapshot_member_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          evidence_note?: string | null
          id?: string
          organisation_id?: string
          rating?: number
          rating_session_id?: string
          skill_id?: string
          subject_snapshot_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_ratings_organisation_id_employee_id_fkey"
            columns: ["organisation_id", "employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "skill_ratings_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_ratings_organisation_id_rating_session_id_fkey"
            columns: ["organisation_id", "rating_session_id"]
            isOneToOne: false
            referencedRelation: "rating_sessions"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "skill_ratings_organisation_id_skill_id_fkey"
            columns: ["organisation_id", "skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "skill_ratings_organisation_id_subject_snapshot_member_id_fkey"
            columns: ["organisation_id", "subject_snapshot_member_id"]
            isOneToOne: false
            referencedRelation: "snapshot_members"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          id: string
          is_critical: boolean
          kind: string
          name: string
          organisation_id: string
          role_family_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_critical?: boolean
          kind: string
          name: string
          organisation_id: string
          role_family_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_critical?: boolean
          kind?: string
          name?: string
          organisation_id?: string
          role_family_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skills_organisation_id_role_family_id_fkey"
            columns: ["organisation_id", "role_family_id"]
            isOneToOne: false
            referencedRelation: "role_families"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      snapshot_formal_ratings: {
        Row: {
          id: string
          organisation_id: string
          rating_date: string
          rating_label: string
          snapshot_member_id: string
        }
        Insert: {
          id?: string
          organisation_id: string
          rating_date: string
          rating_label: string
          snapshot_member_id: string
        }
        Update: {
          id?: string
          organisation_id?: string
          rating_date?: string
          rating_label?: string
          snapshot_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snapshot_formal_ratings_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snapshot_formal_ratings_organisation_id_snapshot_member_id_fkey"
            columns: ["organisation_id", "snapshot_member_id"]
            isOneToOne: true
            referencedRelation: "snapshot_members"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      snapshot_members: {
        Row: {
          employee_id: string | null
          employee_ref: string
          first_name: string | null
          fte: number
          id: string
          is_leadership_team: boolean
          is_team_leader: boolean
          last_name: string | null
          manager_employee_id: string | null
          manager_snapshot_member_id: string | null
          organisation_id: string
          redacted_at: string | null
          role_family_id: string | null
          role_title: string | null
          snapshot_id: string
          start_date: string | null
          team_id: string | null
          unit_id: string
        }
        Insert: {
          employee_id?: string | null
          employee_ref: string
          first_name?: string | null
          fte: number
          id?: string
          is_leadership_team: boolean
          is_team_leader: boolean
          last_name?: string | null
          manager_employee_id?: string | null
          manager_snapshot_member_id?: string | null
          organisation_id: string
          redacted_at?: string | null
          role_family_id?: string | null
          role_title?: string | null
          snapshot_id: string
          start_date?: string | null
          team_id?: string | null
          unit_id: string
        }
        Update: {
          employee_id?: string | null
          employee_ref?: string
          first_name?: string | null
          fte?: number
          id?: string
          is_leadership_team?: boolean
          is_team_leader?: boolean
          last_name?: string | null
          manager_employee_id?: string | null
          manager_snapshot_member_id?: string | null
          organisation_id?: string
          redacted_at?: string | null
          role_family_id?: string | null
          role_title?: string | null
          snapshot_id?: string
          start_date?: string | null
          team_id?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snapshot_members_organisation_id_employee_id_fkey"
            columns: ["organisation_id", "employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "snapshot_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snapshot_members_organisation_id_manager_employee_id_fkey"
            columns: ["organisation_id", "manager_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "snapshot_members_organisation_id_manager_snapshot_member_i_fkey"
            columns: ["organisation_id", "manager_snapshot_member_id"]
            isOneToOne: false
            referencedRelation: "snapshot_members"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "snapshot_members_organisation_id_role_family_id_fkey"
            columns: ["organisation_id", "role_family_id"]
            isOneToOne: false
            referencedRelation: "role_families"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "snapshot_members_organisation_id_snapshot_id_fkey"
            columns: ["organisation_id", "snapshot_id"]
            isOneToOne: false
            referencedRelation: "directory_snapshots"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "snapshot_members_organisation_id_unit_id_fkey"
            columns: ["organisation_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "snapshot_members_organisation_id_unit_id_team_id_fkey"
            columns: ["organisation_id", "unit_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organisation_id", "unit_id", "id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          agreement_date: string
          created_at: string
          employee_band: string
          id: string
          invoice_reference: string
          organisation_id: string
          override_reason: string | null
          period_end: string
          period_start: string
          provisioned_by: string
          state_override: string | null
        }
        Insert: {
          agreement_date: string
          created_at?: string
          employee_band: string
          id?: string
          invoice_reference: string
          organisation_id: string
          override_reason?: string | null
          period_end: string
          period_start: string
          provisioned_by: string
          state_override?: string | null
        }
        Update: {
          agreement_date?: string
          created_at?: string
          employee_band?: string
          id?: string
          invoice_reference?: string
          organisation_id?: string
          override_reason?: string | null
          period_end?: string
          period_start?: string
          provisioned_by?: string
          state_override?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_employee_band_fkey"
            columns: ["employee_band"]
            isOneToOne: false
            referencedRelation: "ref_employee_bands"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "subscriptions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_sessions: {
        Row: {
          ended_at: string | null
          ended_by: string | null
          expires_at: string
          id: string
          kind: string
          organisation_id: string
          reason: string
          staff_email: string
          staff_name: string
          staff_user_id: string | null
          started_at: string
        }
        Insert: {
          ended_at?: string | null
          ended_by?: string | null
          expires_at: string
          id?: string
          kind: string
          organisation_id: string
          reason: string
          staff_email: string
          staff_name: string
          staff_user_id?: string | null
          started_at?: string
        }
        Update: {
          ended_at?: string | null
          ended_by?: string | null
          expires_at?: string
          id?: string
          kind?: string
          organisation_id?: string
          reason?: string
          staff_email?: string
          staff_name?: string
          staff_user_id?: string | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_sessions_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_sessions_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_item_responses: {
        Row: {
          id: string
          item_code: string
          organisation_id: string
          process_id: string | null
          response_id: string
          value: number
        }
        Insert: {
          id?: string
          item_code: string
          organisation_id: string
          process_id?: string | null
          response_id: string
          value: number
        }
        Update: {
          id?: string
          item_code?: string
          organisation_id?: string
          process_id?: string | null
          response_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "survey_item_responses_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_item_responses_organisation_id_response_id_fkey"
            columns: ["organisation_id", "response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          audience: string
          campaign_unit_id: string
          completion_seconds: number | null
          id: string
          organisation_id: string
          team_id: string | null
        }
        Insert: {
          audience: string
          campaign_unit_id: string
          completion_seconds?: number | null
          id?: string
          organisation_id: string
          team_id?: string | null
        }
        Update: {
          audience?: string
          campaign_unit_id?: string
          completion_seconds?: number | null
          id?: string
          organisation_id?: string
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_organisation_id_campaign_unit_id_fkey"
            columns: ["organisation_id", "campaign_unit_id"]
            isOneToOne: false
            referencedRelation: "campaign_units"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "survey_responses_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_organisation_id_team_id_fkey"
            columns: ["organisation_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      talent_bands: {
        Row: {
          band: number
          created_at: string
          employee_id: string | null
          evidence_note: string | null
          id: string
          organisation_id: string
          rating_session_id: string
          subject_snapshot_member_id: string
          updated_at: string
        }
        Insert: {
          band: number
          created_at?: string
          employee_id?: string | null
          evidence_note?: string | null
          id?: string
          organisation_id: string
          rating_session_id: string
          subject_snapshot_member_id: string
          updated_at?: string
        }
        Update: {
          band?: number
          created_at?: string
          employee_id?: string | null
          evidence_note?: string | null
          id?: string
          organisation_id?: string
          rating_session_id?: string
          subject_snapshot_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_bands_organisation_id_employee_id_fkey"
            columns: ["organisation_id", "employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "talent_bands_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_bands_organisation_id_rating_session_id_fkey"
            columns: ["organisation_id", "rating_session_id"]
            isOneToOne: false
            referencedRelation: "rating_sessions"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "talent_bands_organisation_id_subject_snapshot_member_id_fkey"
            columns: ["organisation_id", "subject_snapshot_member_id"]
            isOneToOne: false
            referencedRelation: "snapshot_members"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          name: string
          organisation_id: string
          status: string
          unit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organisation_id: string
          status?: string
          unit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organisation_id?: string
          status?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_organisation_id_unit_id_fkey"
            columns: ["organisation_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      unit_access: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          membership_id: string
          organisation_id: string
          unit_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          membership_id: string
          organisation_id: string
          unit_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          membership_id?: string
          organisation_id?: string
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_access_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_access_organisation_id_membership_id_fkey"
            columns: ["organisation_id", "membership_id"]
            isOneToOne: false
            referencedRelation: "org_memberships"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "unit_access_organisation_id_unit_id_fkey"
            columns: ["organisation_id", "unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      unit_lineage: {
        Row: {
          effective_date: string
          id: string
          kind: string
          organisation_id: string
          predecessor_unit_id: string
          recorded_at: string
          recorded_by: string | null
          successor_unit_id: string
        }
        Insert: {
          effective_date: string
          id?: string
          kind: string
          organisation_id: string
          predecessor_unit_id: string
          recorded_at?: string
          recorded_by?: string | null
          successor_unit_id: string
        }
        Update: {
          effective_date?: string
          id?: string
          kind?: string
          organisation_id?: string
          predecessor_unit_id?: string
          recorded_at?: string
          recorded_by?: string | null
          successor_unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_lineage_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unit_lineage_organisation_id_predecessor_unit_id_fkey"
            columns: ["organisation_id", "predecessor_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "unit_lineage_organisation_id_successor_unit_id_fkey"
            columns: ["organisation_id", "successor_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_directory_upload: {
        Args: {
          p_confirm_leavers?: boolean
          p_preview_hash: string
          p_upload_id: string
        }
        Returns: Json
      }
      close_support_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      directory_upload_preview: { Args: { p_upload_id: string }; Returns: Json }
      discard_directory_upload: {
        Args: { p_upload_id: string }
        Returns: undefined
      }
      expire_directory_uploads: { Args: never; Returns: number }
      invitation_status_counts: {
        Args: { p_campaign_id: string }
        Returns: {
          audience: string
          bounced: number
          campaign_unit_id: string
          expired: number
          issued: number
          responded: number
          sent: number
          unit_id: string
        }[]
      }
      invite_member: {
        Args: {
          p_email: string
          p_organisation_id: string
          p_role: string
          p_unit_ids?: string[]
        }
        Returns: boolean
      }
      mark_upload_file_removed: {
        Args: { p_upload_id: string }
        Returns: undefined
      }
      my_access: { Args: never; Returns: Json }
      open_support_session: {
        Args: { p_organisation_id: string; p_reason: string }
        Returns: string
      }
      provision_organisation: {
        Args: {
          p_account_owner_email: string
          p_agreement_date: string
          p_employee_band: string
          p_invoice_reference: string
          p_name: string
          p_period_end: string
          p_period_start: string
        }
        Returns: {
          needs_account: boolean
          organisation_id: string
        }[]
      }
      purge_deactivated_employees: { Args: { p_as_of?: string }; Returns: Json }
      read_formal_ratings: {
        Args: {
          p_organisation_id: string
          p_purpose?: string
          p_unit_id?: string
        }
        Returns: {
          employee_id: string
          employee_ref: string
          first_name: string
          last_name: string
          rating_date: string
          rating_label: string
          unit_id: string
        }[]
      }
      read_knowledge_ratings: {
        Args: {
          p_campaign_id?: string
          p_manager_employee_id?: string
          p_organisation_id: string
          p_purpose?: string
          p_unit_id?: string
        }
        Returns: {
          campaign_id: string
          employee_id: string
          evidence_note: string
          knowledge_domain_id: string
          knowledge_domain_name: string
          manager_employee_id: string
          manager_snapshot_member_id: string
          rating: number
          rating_id: string
          subject_employee_ref: string
          subject_first_name: string
          subject_last_name: string
          subject_snapshot_member_id: string
          unit_id: string
          updated_at: string
        }[]
      }
      read_skill_ratings: {
        Args: {
          p_campaign_id?: string
          p_manager_employee_id?: string
          p_organisation_id: string
          p_purpose?: string
          p_unit_id?: string
        }
        Returns: {
          campaign_id: string
          employee_id: string
          evidence_note: string
          manager_employee_id: string
          manager_snapshot_member_id: string
          rating: number
          rating_id: string
          skill_id: string
          skill_name: string
          subject_employee_ref: string
          subject_first_name: string
          subject_last_name: string
          subject_snapshot_member_id: string
          unit_id: string
          updated_at: string
        }[]
      }
      read_talent_bands: {
        Args: {
          p_campaign_id?: string
          p_manager_employee_id?: string
          p_organisation_id: string
          p_purpose?: string
          p_unit_id?: string
        }
        Returns: {
          band: number
          campaign_id: string
          employee_id: string
          evidence_note: string
          manager_employee_id: string
          manager_snapshot_member_id: string
          rating_id: string
          subject_employee_ref: string
          subject_first_name: string
          subject_last_name: string
          subject_snapshot_member_id: string
          unit_id: string
          updated_at: string
        }[]
      }
      record_subscription_term: {
        Args: {
          p_agreement_date: string
          p_employee_band: string
          p_invoice_reference: string
          p_organisation_id: string
          p_period_end: string
          p_period_start: string
        }
        Returns: string
      }
      record_unit_lineage: {
        Args: {
          p_effective_date: string
          p_kind: string
          p_organisation_id: string
          p_predecessor_ids: string[]
          p_successor_ids: string[]
        }
        Returns: undefined
      }
      replace_account_owner: {
        Args: { p_email: string; p_organisation_id: string }
        Returns: boolean
      }
      reset_factors: { Args: { p_user_id: string }; Returns: undefined }
      revoke_membership: {
        Args: { p_membership_id: string }
        Returns: undefined
      }
      set_data_contribution_opt_out: {
        Args: { p_opt_out: boolean; p_organisation_id: string }
        Returns: undefined
      }
      set_formal_rating: {
        Args: { p_employee_id: string; p_label: string; p_rating_date: string }
        Returns: undefined
      }
      set_subscription_override: {
        Args: {
          p_override: string
          p_reason: string
          p_subscription_id: string
        }
        Returns: undefined
      }
      set_support_staff: {
        Args: { p_is_support_staff: boolean; p_user_id: string }
        Returns: undefined
      }
      set_unit_access: {
        Args: { p_membership_id: string; p_unit_ids: string[] }
        Returns: undefined
      }
      stage_directory_upload: {
        Args: {
          p_actor_user_id: string
          p_byte_size: number
          p_errors: Json
          p_file_name: string
          p_organisation_id: string
          p_rows: Json
          p_sha256: string
          p_storage_path: string
          p_template_version: string
          p_upload_id: string
        }
        Returns: Json
      }
      uploads_awaiting_file_removal: {
        Args: never
        Returns: {
          storage_path: string
          upload_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

