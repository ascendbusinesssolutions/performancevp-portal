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
          unit_leader_employee_id: string | null
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
          unit_leader_employee_id?: string | null
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
          unit_leader_employee_id?: string | null
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
          {
            foreignKeyName: "business_units_organisation_id_unit_leader_employee_id_fkey"
            columns: ["organisation_id", "unit_leader_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      calculation_run_details: {
        Row: {
          engine_result: Json
          id: string
          organisation_id: string
          run_id: string
        }
        Insert: {
          engine_result: Json
          id?: string
          organisation_id: string
          run_id: string
        }
        Update: {
          engine_result?: Json
          id?: string
          organisation_id?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculation_run_details_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculation_run_details_organisation_id_run_id_fkey"
            columns: ["organisation_id", "run_id"]
            isOneToOne: true
            referencedRelation: "calculation_runs"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      calculation_runs: {
        Row: {
          cycle_id: string
          engine_version: string
          id: string
          intake_input_sha256: string
          intake_version: string
          methodology: Json
          organisation_id: string
          recommendations_version: string | null
          run_at: string
        }
        Insert: {
          cycle_id: string
          engine_version: string
          id?: string
          intake_input_sha256: string
          intake_version: string
          methodology: Json
          organisation_id: string
          recommendations_version?: string | null
          run_at?: string
        }
        Update: {
          cycle_id?: string
          engine_version?: string
          id?: string
          intake_input_sha256?: string
          intake_version?: string
          methodology?: Json
          organisation_id?: string
          recommendations_version?: string | null
          run_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculation_runs_organisation_id_cycle_id_fkey"
            columns: ["organisation_id", "cycle_id"]
            isOneToOne: true
            referencedRelation: "measurement_cycles"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "calculation_runs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_audience_members: {
        Row: {
          audience: string
          campaign_team_id: string | null
          campaign_unit_id: string
          id: string
          organisation_id: string
          snapshot_member_id: string
        }
        Insert: {
          audience: string
          campaign_team_id?: string | null
          campaign_unit_id: string
          id?: string
          organisation_id: string
          snapshot_member_id: string
        }
        Update: {
          audience?: string
          campaign_team_id?: string | null
          campaign_unit_id?: string
          id?: string
          organisation_id?: string
          snapshot_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_audience_members_organisation_id_campaign_team_id_fkey"
            columns: ["organisation_id", "campaign_team_id"]
            isOneToOne: false
            referencedRelation: "campaign_teams"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "campaign_audience_members_organisation_id_campaign_unit_id_fkey"
            columns: ["organisation_id", "campaign_unit_id"]
            isOneToOne: false
            referencedRelation: "campaign_units"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "campaign_audience_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_audience_members_organisation_id_snapshot_member__fkey"
            columns: ["organisation_id", "snapshot_member_id"]
            isOneToOne: false
            referencedRelation: "snapshot_members"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      campaign_audiences: {
        Row: {
          audience: string
          campaign_unit_id: string
          id: string
          issued: number | null
          items: string[]
          organisation_id: string
          process_ids: string[]
          responded: number | null
        }
        Insert: {
          audience: string
          campaign_unit_id: string
          id?: string
          issued?: number | null
          items?: string[]
          organisation_id: string
          process_ids?: string[]
          responded?: number | null
        }
        Update: {
          audience?: string
          campaign_unit_id?: string
          id?: string
          issued?: number | null
          items?: string[]
          organisation_id?: string
          process_ids?: string[]
          responded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_audiences_organisation_id_campaign_unit_id_fkey"
            columns: ["organisation_id", "campaign_unit_id"]
            isOneToOne: false
            referencedRelation: "campaign_units"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "campaign_audiences_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_schedule: {
        Row: {
          anchor_campaign_id: string
          cadence: string
          campaign_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          due_on: string
          id: string
          noticed_at: string | null
          organisation_id: string
          status: string
        }
        Insert: {
          anchor_campaign_id: string
          cadence: string
          campaign_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          due_on: string
          id?: string
          noticed_at?: string | null
          organisation_id: string
          status?: string
        }
        Update: {
          anchor_campaign_id?: string
          cadence?: string
          campaign_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          due_on?: string
          id?: string
          noticed_at?: string | null
          organisation_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_schedule_organisation_id_anchor_campaign_id_fkey"
            columns: ["organisation_id", "anchor_campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "campaign_schedule_organisation_id_campaign_id_fkey"
            columns: ["organisation_id", "campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "campaign_schedule_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_teams: {
        Row: {
          business_unit_id: string
          campaign_unit_id: string
          fte: number
          headcount: number
          id: string
          kind: string
          name: string
          organisation_id: string
          position: number
          team_id: string | null
        }
        Insert: {
          business_unit_id: string
          campaign_unit_id: string
          fte: number
          headcount: number
          id?: string
          kind: string
          name: string
          organisation_id: string
          position: number
          team_id?: string | null
        }
        Update: {
          business_unit_id?: string
          campaign_unit_id?: string
          fte?: number
          headcount?: number
          id?: string
          kind?: string
          name?: string
          organisation_id?: string
          position?: number
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_teams_organisation_id_business_unit_id_fkey"
            columns: ["organisation_id", "business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "campaign_teams_organisation_id_campaign_unit_id_fkey"
            columns: ["organisation_id", "campaign_unit_id"]
            isOneToOne: false
            referencedRelation: "campaign_units"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "campaign_teams_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_teams_organisation_id_team_id_fkey"
            columns: ["organisation_id", "team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      campaign_unit_contexts: {
        Row: {
          campaign_unit_id: string
          context: Json
          id: string
          organisation_id: string
          positions: Json
        }
        Insert: {
          campaign_unit_id: string
          context: Json
          id?: string
          organisation_id: string
          positions: Json
        }
        Update: {
          campaign_unit_id?: string
          context?: Json
          id?: string
          organisation_id?: string
          positions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "campaign_unit_contexts_organisation_id_campaign_unit_id_fkey"
            columns: ["organisation_id", "campaign_unit_id"]
            isOneToOne: true
            referencedRelation: "campaign_units"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "campaign_unit_contexts_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_units: {
        Row: {
          c3_route: string | null
          campaign_id: string
          fte: number | null
          headcount: number | null
          id: string
          measurement_unit_id: string
          organisation_id: string
          scoring_attempts: number
          scoring_error: string | null
        }
        Insert: {
          c3_route?: string | null
          campaign_id: string
          fte?: number | null
          headcount?: number | null
          id?: string
          measurement_unit_id: string
          organisation_id: string
          scoring_attempts?: number
          scoring_error?: string | null
        }
        Update: {
          c3_route?: string | null
          campaign_id?: string
          fte?: number | null
          headcount?: number | null
          id?: string
          measurement_unit_id?: string
          organisation_id?: string
          scoring_attempts?: number
          scoring_error?: string | null
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
            foreignKeyName: "campaign_units_organisation_id_measurement_unit_id_fkey"
            columns: ["organisation_id", "measurement_unit_id"]
            isOneToOne: false
            referencedRelation: "measurement_units"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      campaigns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cadence: string
          closed_at: string | null
          closes_at: string | null
          created_at: string
          created_by: string | null
          event_trigger: string | null
          id: string
          launch_blockers: Json | null
          launched_at: string | null
          launched_by: string | null
          name: string | null
          opens_at: string | null
          organisation_id: string
          pulse_rotation: number | null
          responses_rewritten_at: string | null
          settled_at: string | null
          setup_version: number | null
          status: string
          tokens_issued_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cadence: string
          closed_at?: string | null
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          event_trigger?: string | null
          id?: string
          launch_blockers?: Json | null
          launched_at?: string | null
          launched_by?: string | null
          name?: string | null
          opens_at?: string | null
          organisation_id: string
          pulse_rotation?: number | null
          responses_rewritten_at?: string | null
          settled_at?: string | null
          setup_version?: number | null
          status?: string
          tokens_issued_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cadence?: string
          closed_at?: string | null
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          event_trigger?: string | null
          id?: string
          launch_blockers?: Json | null
          launched_at?: string | null
          launched_by?: string | null
          name?: string | null
          opens_at?: string | null
          organisation_id?: string
          pulse_rotation?: number | null
          responses_rewritten_at?: string | null
          settled_at?: string | null
          setup_version?: number | null
          status?: string
          tokens_issued_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_event_trigger_fkey"
            columns: ["event_trigger"]
            isOneToOne: false
            referencedRelation: "ref_event_triggers"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "campaigns_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_responses: {
        Row: {
          answers: Json
          campaign_unit_id: string
          checklist_code: string
          entered_at: string
          entered_by: string | null
          id: string
          organisation_id: string
          version: number
        }
        Insert: {
          answers: Json
          campaign_unit_id: string
          checklist_code: string
          entered_at?: string
          entered_by?: string | null
          id?: string
          organisation_id: string
          version: number
        }
        Update: {
          answers?: Json
          campaign_unit_id?: string
          checklist_code?: string
          entered_at?: string
          entered_by?: string | null
          id?: string
          organisation_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "checklist_responses_checklist_code_fkey"
            columns: ["checklist_code"]
            isOneToOne: false
            referencedRelation: "ref_admin_checklists"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "checklist_responses_organisation_id_campaign_unit_id_fkey"
            columns: ["organisation_id", "campaign_unit_id"]
            isOneToOne: false
            referencedRelation: "campaign_units"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "checklist_responses_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      composite_scores: {
        Row: {
          binding_component: string | null
          c: number | null
          id: string
          m: number | null
          o: number | null
          organisation_id: string
          p: number | null
          p_confidence: string | null
          ranking: Json
          run_id: string
          s: number
          s_internal: number
          statement: string
          top_six: Json
          trip_wire_override: string | null
          weight_sums: Json
        }
        Insert: {
          binding_component?: string | null
          c?: number | null
          id?: string
          m?: number | null
          o?: number | null
          organisation_id: string
          p?: number | null
          p_confidence?: string | null
          ranking: Json
          run_id: string
          s: number
          s_internal: number
          statement: string
          top_six: Json
          trip_wire_override?: string | null
          weight_sums: Json
        }
        Update: {
          binding_component?: string | null
          c?: number | null
          id?: string
          m?: number | null
          o?: number | null
          organisation_id?: string
          p?: number | null
          p_confidence?: string | null
          ranking?: Json
          run_id?: string
          s?: number
          s_internal?: number
          statement?: string
          top_six?: Json
          trip_wire_override?: string | null
          weight_sums?: Json
        }
        Relationships: [
          {
            foreignKeyName: "composite_scores_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "composite_scores_organisation_id_run_id_fkey"
            columns: ["organisation_id", "run_id"]
            isOneToOne: true
            referencedRelation: "calculation_runs"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      critical_processes: {
        Row: {
          created_at: string
          id: string
          measurement_unit_id: string
          name: string
          organisation_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          measurement_unit_id: string
          name: string
          organisation_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          measurement_unit_id?: string
          name?: string
          organisation_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "critical_processes_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "critical_processes_organisation_id_measurement_unit_id_fkey"
            columns: ["organisation_id", "measurement_unit_id"]
            isOneToOne: false
            referencedRelation: "measurement_units"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      decision_types: {
        Row: {
          created_at: string
          from_starter_list: boolean
          id: string
          measurement_unit_id: string
          name: string
          organisation_id: string
          status: string
        }
        Insert: {
          created_at?: string
          from_starter_list?: boolean
          id?: string
          measurement_unit_id: string
          name: string
          organisation_id: string
          status?: string
        }
        Update: {
          created_at?: string
          from_starter_list?: boolean
          id?: string
          measurement_unit_id?: string
          name?: string
          organisation_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_types_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_types_organisation_id_measurement_unit_id_fkey"
            columns: ["organisation_id", "measurement_unit_id"]
            isOneToOne: false
            referencedRelation: "measurement_units"
            referencedColumns: ["organisation_id", "id"]
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
      engine_inputs: {
        Row: {
          created_at: string
          cycle_id: string
          id: string
          input: Json
          intake_version: string
          organisation_id: string
        }
        Insert: {
          created_at?: string
          cycle_id: string
          id?: string
          input: Json
          intake_version: string
          organisation_id: string
        }
        Update: {
          created_at?: string
          cycle_id?: string
          id?: string
          input?: Json
          intake_version?: string
          organisation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engine_inputs_organisation_id_cycle_id_fkey"
            columns: ["organisation_id", "cycle_id"]
            isOneToOne: true
            referencedRelation: "measurement_cycles"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "engine_inputs_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
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
          token_salt: string
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
          token_salt?: string
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
          token_salt?: string
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
          measurement_unit_id: string
          name: string
          organisation_id: string
          status: string
        }
        Insert: {
          created_at?: string
          criticality: number
          id?: string
          measurement_unit_id: string
          name: string
          organisation_id: string
          status?: string
        }
        Update: {
          created_at?: string
          criticality?: number
          id?: string
          measurement_unit_id?: string
          name?: string
          organisation_id?: string
          status?: string
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
            foreignKeyName: "knowledge_domains_organisation_id_measurement_unit_id_fkey"
            columns: ["organisation_id", "measurement_unit_id"]
            isOneToOne: false
            referencedRelation: "measurement_units"
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
      measurement_cycles: {
        Row: {
          c3_source: string | null
          campaign_unit_id: string
          created_at: string
          id: string
          kind: string
          measured_on: string
          measurement_unit_id: string
          organisation_id: string
          released_at: string | null
          released_by: string | null
          status: string
        }
        Insert: {
          c3_source?: string | null
          campaign_unit_id: string
          created_at?: string
          id?: string
          kind: string
          measured_on: string
          measurement_unit_id: string
          organisation_id: string
          released_at?: string | null
          released_by?: string | null
          status?: string
        }
        Update: {
          c3_source?: string | null
          campaign_unit_id?: string
          created_at?: string
          id?: string
          kind?: string
          measured_on?: string
          measurement_unit_id?: string
          organisation_id?: string
          released_at?: string | null
          released_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_cycles_organisation_id_campaign_unit_id_fkey"
            columns: ["organisation_id", "campaign_unit_id"]
            isOneToOne: true
            referencedRelation: "campaign_units"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "measurement_cycles_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_cycles_organisation_id_measurement_unit_id_fkey"
            columns: ["organisation_id", "measurement_unit_id"]
            isOneToOne: false
            referencedRelation: "measurement_units"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      measurement_unit_lineage: {
        Row: {
          effective_date: string
          id: string
          kind: string
          organisation_id: string
          predecessor_id: string
          recorded_at: string
          recorded_by: string | null
          successor_id: string
        }
        Insert: {
          effective_date: string
          id?: string
          kind: string
          organisation_id: string
          predecessor_id: string
          recorded_at?: string
          recorded_by?: string | null
          successor_id: string
        }
        Update: {
          effective_date?: string
          id?: string
          kind?: string
          organisation_id?: string
          predecessor_id?: string
          recorded_at?: string
          recorded_by?: string | null
          successor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_unit_lineage_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_unit_lineage_organisation_id_predecessor_id_fkey"
            columns: ["organisation_id", "predecessor_id"]
            isOneToOne: false
            referencedRelation: "measurement_units"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "measurement_unit_lineage_organisation_id_successor_id_fkey"
            columns: ["organisation_id", "successor_id"]
            isOneToOne: false
            referencedRelation: "measurement_units"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      measurement_unit_members: {
        Row: {
          business_unit_id: string
          ended_at: string | null
          id: string
          measurement_unit_id: string
          organisation_id: string
          started_at: string
        }
        Insert: {
          business_unit_id: string
          ended_at?: string | null
          id?: string
          measurement_unit_id: string
          organisation_id: string
          started_at?: string
        }
        Update: {
          business_unit_id?: string
          ended_at?: string | null
          id?: string
          measurement_unit_id?: string
          organisation_id?: string
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_unit_members_organisation_id_business_unit_id_fkey"
            columns: ["organisation_id", "business_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "measurement_unit_members_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_unit_members_organisation_id_measurement_unit__fkey"
            columns: ["organisation_id", "measurement_unit_id"]
            isOneToOne: false
            referencedRelation: "measurement_units"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      measurement_units: {
        Row: {
          code: string
          created_at: string
          grouping_kept_at: string | null
          grouping_kept_by: string | null
          id: string
          kind: string
          name: string
          organisation_id: string
          retired_on: string | null
          single_unit_id: string | null
          status: string
          unit_leader_employee_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          grouping_kept_at?: string | null
          grouping_kept_by?: string | null
          id?: string
          kind: string
          name: string
          organisation_id: string
          retired_on?: string | null
          single_unit_id?: string | null
          status?: string
          unit_leader_employee_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          grouping_kept_at?: string | null
          grouping_kept_by?: string | null
          id?: string
          kind?: string
          name?: string
          organisation_id?: string
          retired_on?: string | null
          single_unit_id?: string | null
          status?: string
          unit_leader_employee_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "measurement_units_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_units_organisation_id_single_unit_id_fkey"
            columns: ["organisation_id", "single_unit_id"]
            isOneToOne: false
            referencedRelation: "business_units"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "measurement_units_organisation_id_unit_leader_employee_id_fkey"
            columns: ["organisation_id", "unit_leader_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
        Relationships: [
          {
            foreignKeyName: "organisations_anzsic_division_fkey"
            columns: ["anzsic_division"]
            isOneToOne: false
            referencedRelation: "ref_anzsic_divisions"
            referencedColumns: ["code"]
          },
        ]
      }
      primary_systems: {
        Row: {
          created_at: string
          id: string
          measurement_unit_id: string
          name: string
          organisation_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          measurement_unit_id: string
          name: string
          organisation_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          measurement_unit_id?: string
          name?: string
          organisation_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "primary_systems_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "primary_systems_organisation_id_measurement_unit_id_fkey"
            columns: ["organisation_id", "measurement_unit_id"]
            isOneToOne: false
            referencedRelation: "measurement_units"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
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
      rating_scale_map_entries: {
        Row: {
          band: number
          id: string
          label: string
          organisation_id: string
        }
        Insert: {
          band: number
          id?: string
          label: string
          organisation_id: string
        }
        Update: {
          band?: number
          id?: string
          label?: string
          organisation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rating_scale_map_entries_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
      }
      rating_scale_maps: {
        Row: {
          calibrated: boolean | null
          decided_at: string
          decided_by: string | null
          decision: string
          id: string
          organisation_id: string
        }
        Insert: {
          calibrated?: boolean | null
          decided_at?: string
          decided_by?: string | null
          decision: string
          id?: string
          organisation_id: string
        }
        Update: {
          calibrated?: boolean | null
          decided_at?: string
          decided_by?: string | null
          decision?: string
          id?: string
          organisation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rating_scale_maps_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: true
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
        ]
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
      ref_admin_checklist_bands: {
        Row: {
          fact_code: string
          lower: number | null
          lower_inclusive: boolean
          position: number
          score: number
          upper: number | null
          upper_inclusive: boolean
        }
        Insert: {
          fact_code: string
          lower?: number | null
          lower_inclusive: boolean
          position: number
          score: number
          upper?: number | null
          upper_inclusive: boolean
        }
        Update: {
          fact_code?: string
          lower?: number | null
          lower_inclusive?: boolean
          position?: number
          score?: number
          upper?: number | null
          upper_inclusive?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ref_admin_checklist_bands_fact_code_fkey"
            columns: ["fact_code"]
            isOneToOne: false
            referencedRelation: "ref_admin_checklist_facts"
            referencedColumns: ["code"]
          },
        ]
      }
      ref_admin_checklist_facts: {
        Row: {
          checklist_code: string
          code: string
          position: number
          response_kind: string
          source_response: string | null
          wording: string
        }
        Insert: {
          checklist_code: string
          code: string
          position: number
          response_kind: string
          source_response?: string | null
          wording: string
        }
        Update: {
          checklist_code?: string
          code?: string
          position?: number
          response_kind?: string
          source_response?: string | null
          wording?: string
        }
        Relationships: [
          {
            foreignKeyName: "ref_admin_checklist_facts_checklist_code_fkey"
            columns: ["checklist_code"]
            isOneToOne: false
            referencedRelation: "ref_admin_checklists"
            referencedColumns: ["code"]
          },
        ]
      }
      ref_admin_checklist_values: {
        Row: {
          fact_code: string
          label: string
          option: string
          position: number
          value: number | null
        }
        Insert: {
          fact_code: string
          label: string
          option: string
          position: number
          value?: number | null
        }
        Update: {
          fact_code?: string
          label?: string
          option?: string
          position?: number
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ref_admin_checklist_values_fact_code_fkey"
            columns: ["fact_code"]
            isOneToOne: false
            referencedRelation: "ref_admin_checklist_facts"
            referencedColumns: ["code"]
          },
        ]
      }
      ref_admin_checklists: {
        Row: {
          code: string
          minimum_facts: number | null
          position: number
          repeats_over: string
          source: string
        }
        Insert: {
          code: string
          minimum_facts?: number | null
          position: number
          repeats_over: string
          source: string
        }
        Update: {
          code?: string
          minimum_facts?: number | null
          position?: number
          repeats_over?: string
          source?: string
        }
        Relationships: []
      }
      ref_anzsic_divisions: {
        Row: {
          code: string
          name: string
          sort_order: number
        }
        Insert: {
          code: string
          name: string
          sort_order: number
        }
        Update: {
          code?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
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
      ref_event_triggers: {
        Row: {
          affects: string[]
          code: string
          deploys: string
          detection: string
          position: number
          source: string
          source_trigger: string
        }
        Insert: {
          affects: string[]
          code: string
          deploys: string
          detection: string
          position: number
          source: string
          source_trigger: string
        }
        Update: {
          affects?: string[]
          code?: string
          deploys?: string
          detection?: string
          position?: number
          source?: string
          source_trigger?: string
        }
        Relationships: []
      }
      ref_module_items: {
        Row: {
          anchors: Json | null
          code: string
          is_reverse: boolean
          module_code: string
          online: boolean
          portal_code: boolean
          position: number
          response_kind: string
          wording: string
        }
        Insert: {
          anchors?: Json | null
          code: string
          is_reverse: boolean
          module_code: string
          online: boolean
          portal_code: boolean
          position: number
          response_kind: string
          wording: string
        }
        Update: {
          anchors?: Json | null
          code?: string
          is_reverse?: boolean
          module_code?: string
          online?: boolean
          portal_code?: boolean
          position?: number
          response_kind?: string
          wording?: string
        }
        Relationships: [
          {
            foreignKeyName: "ref_module_items_module_code_fkey"
            columns: ["module_code"]
            isOneToOne: false
            referencedRelation: "ref_modules"
            referencedColumns: ["code"]
          },
        ]
      }
      ref_modules: {
        Row: {
          audience: string
          code: string
          disclosure: string
          position: number
          repeats_over: string
          source: string
          sub_dimension: string
        }
        Insert: {
          audience: string
          code: string
          disclosure: string
          position: number
          repeats_over: string
          source: string
          sub_dimension: string
        }
        Update: {
          audience?: string
          code?: string
          disclosure?: string
          position?: number
          repeats_over?: string
          source?: string
          sub_dimension?: string
        }
        Relationships: []
      }
      ref_pulse_rotation: {
        Row: {
          item_code: string
          rotation: number
        }
        Insert: {
          item_code: string
          rotation: number
        }
        Update: {
          item_code?: string
          rotation?: number
        }
        Relationships: [
          {
            foreignKeyName: "ref_pulse_rotation_item_code_fkey"
            columns: ["item_code"]
            isOneToOne: false
            referencedRelation: "ref_survey_items"
            referencedColumns: ["code"]
          },
        ]
      }
      ref_survey_items: {
        Row: {
          block: string
          code: string
          in_annual: boolean
          in_baseline: boolean
          in_half_yearly: boolean
          in_pulse: boolean
          is_reverse: boolean
          position: number
          pulse_rotates: boolean
          section: string
          sub_construct: string | null
          wording: string
        }
        Insert: {
          block: string
          code: string
          in_annual: boolean
          in_baseline: boolean
          in_half_yearly: boolean
          in_pulse: boolean
          is_reverse: boolean
          position: number
          pulse_rotates: boolean
          section: string
          sub_construct?: string | null
          wording: string
        }
        Update: {
          block?: string
          code?: string
          in_annual?: boolean
          in_baseline?: boolean
          in_half_yearly?: boolean
          in_pulse?: boolean
          is_reverse?: boolean
          position?: number
          pulse_rotates?: boolean
          section?: string
          sub_construct?: string | null
          wording?: string
        }
        Relationships: [
          {
            foreignKeyName: "ref_survey_items_section_fkey"
            columns: ["section"]
            isOneToOne: false
            referencedRelation: "ref_survey_sections"
            referencedColumns: ["code"]
          },
        ]
      }
      ref_survey_sections: {
        Row: {
          code: string
          heading: string
          position: number
        }
        Insert: {
          code: string
          heading: string
          position: number
        }
        Update: {
          code?: string
          heading?: string
          position?: number
        }
        Relationships: []
      }
      ref_template_items: {
        Row: {
          is_critical: boolean | null
          name: string
          position: number
          skill_kind: string | null
          template_code: string
        }
        Insert: {
          is_critical?: boolean | null
          name: string
          position: number
          skill_kind?: string | null
          template_code: string
        }
        Update: {
          is_critical?: boolean | null
          name?: string
          position?: number
          skill_kind?: string | null
          template_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "ref_template_items_template_code_fkey"
            columns: ["template_code"]
            isOneToOne: false
            referencedRelation: "ref_templates"
            referencedColumns: ["code"]
          },
        ]
      }
      ref_templates: {
        Row: {
          code: string
          is_people_leader: boolean
          is_placeholder: boolean
          kind: string
          name: string
          sort_order: number
          unit_type: string | null
          version: number
        }
        Insert: {
          code: string
          is_people_leader?: boolean
          is_placeholder: boolean
          kind: string
          name: string
          sort_order: number
          unit_type?: string | null
          version?: number
        }
        Update: {
          code?: string
          is_people_leader?: boolean
          is_placeholder?: boolean
          kind?: string
          name?: string
          sort_order?: number
          unit_type?: string | null
          version?: number
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
          template_code: string | null
          template_version: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_people_leader?: boolean
          name: string
          organisation_id: string
          status?: string
          template_code?: string | null
          template_version?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_people_leader?: boolean
          name?: string
          organisation_id?: string
          status?: string
          template_code?: string | null
          template_version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "role_families_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_families_template_code_fkey"
            columns: ["template_code"]
            isOneToOne: false
            referencedRelation: "ref_templates"
            referencedColumns: ["code"]
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
      snapshot_scale_map_entries: {
        Row: {
          band: number
          id: string
          label: string
          organisation_id: string
          snapshot_scale_map_id: string
        }
        Insert: {
          band: number
          id?: string
          label: string
          organisation_id: string
          snapshot_scale_map_id: string
        }
        Update: {
          band?: number
          id?: string
          label?: string
          organisation_id?: string
          snapshot_scale_map_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snapshot_scale_map_entries_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snapshot_scale_map_entries_organisation_id_snapshot_scale__fkey"
            columns: ["organisation_id", "snapshot_scale_map_id"]
            isOneToOne: false
            referencedRelation: "snapshot_scale_maps"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      snapshot_scale_maps: {
        Row: {
          calibrated: boolean | null
          decision: string
          id: string
          organisation_id: string
          snapshot_id: string
        }
        Insert: {
          calibrated?: boolean | null
          decision: string
          id?: string
          organisation_id: string
          snapshot_id: string
        }
        Update: {
          calibrated?: boolean | null
          decision?: string
          id?: string
          organisation_id?: string
          snapshot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snapshot_scale_maps_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "snapshot_scale_maps_organisation_id_snapshot_id_fkey"
            columns: ["organisation_id", "snapshot_id"]
            isOneToOne: true
            referencedRelation: "directory_snapshots"
            referencedColumns: ["organisation_id", "id"]
          },
        ]
      }
      sub_dimension_scores: {
        Row: {
          band: string | null
          code: string
          confidence: string | null
          gap: number | null
          gap_flag: string | null
          id: string
          normalised_weight: number | null
          organisation_id: string
          perception: number | null
          reason: string | null
          run_id: string
          score: number | null
          source: string | null
          status: string
          structural: number | null
          tier: string | null
          vintage: string | null
          weight: number | null
        }
        Insert: {
          band?: string | null
          code: string
          confidence?: string | null
          gap?: number | null
          gap_flag?: string | null
          id?: string
          normalised_weight?: number | null
          organisation_id: string
          perception?: number | null
          reason?: string | null
          run_id: string
          score?: number | null
          source?: string | null
          status: string
          structural?: number | null
          tier?: string | null
          vintage?: string | null
          weight?: number | null
        }
        Update: {
          band?: string | null
          code?: string
          confidence?: string | null
          gap?: number | null
          gap_flag?: string | null
          id?: string
          normalised_weight?: number | null
          organisation_id?: string
          perception?: number | null
          reason?: string | null
          run_id?: string
          score?: number | null
          source?: string | null
          status?: string
          structural?: number | null
          tier?: string | null
          vintage?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sub_dimension_scores_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_dimension_scores_organisation_id_run_id_fkey"
            columns: ["organisation_id", "run_id"]
            isOneToOne: false
            referencedRelation: "calculation_runs"
            referencedColumns: ["organisation_id", "id"]
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
          decision_type_id: string | null
          id: string
          item_code: string
          organisation_id: string
          process_id: string | null
          response_id: string
          value: number
        }
        Insert: {
          decision_type_id?: string | null
          id?: string
          item_code: string
          organisation_id: string
          process_id?: string | null
          response_id: string
          value: number
        }
        Update: {
          decision_type_id?: string | null
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
          campaign_team_id: string | null
          campaign_unit_id: string
          completion_seconds: number | null
          id: string
          organisation_id: string
        }
        Insert: {
          audience: string
          campaign_team_id?: string | null
          campaign_unit_id: string
          completion_seconds?: number | null
          id?: string
          organisation_id: string
        }
        Update: {
          audience?: string
          campaign_team_id?: string | null
          campaign_unit_id?: string
          completion_seconds?: number | null
          id?: string
          organisation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_organisation_id_campaign_team_id_fkey"
            columns: ["organisation_id", "campaign_team_id"]
            isOneToOne: false
            referencedRelation: "campaign_teams"
            referencedColumns: ["organisation_id", "id"]
          },
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
        ]
      }
      survey_role_answers: {
        Row: {
          decision_type_id: string
          id: string
          organisation_id: string
          position_id: string | null
          response_id: string
          role: string
        }
        Insert: {
          decision_type_id: string
          id?: string
          organisation_id: string
          position_id?: string | null
          response_id: string
          role: string
        }
        Update: {
          decision_type_id?: string
          id?: string
          organisation_id?: string
          position_id?: string | null
          response_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_role_answers_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_role_answers_organisation_id_response_id_fkey"
            columns: ["organisation_id", "response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
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
      trip_wire_results: {
        Row: {
          code: string
          critical: boolean
          id: string
          mean: number | null
          measured: boolean
          organisation_id: string
          run_id: string
          score: number | null
        }
        Insert: {
          code: string
          critical: boolean
          id?: string
          mean?: number | null
          measured: boolean
          organisation_id: string
          run_id: string
          score?: number | null
        }
        Update: {
          code?: string
          critical?: boolean
          id?: string
          mean?: number | null
          measured?: boolean
          organisation_id?: string
          run_id?: string
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_wire_results_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_wire_results_organisation_id_run_id_fkey"
            columns: ["organisation_id", "run_id"]
            isOneToOne: false
            referencedRelation: "calculation_runs"
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
      unit_aggregates: {
        Row: {
          adjustments: Json
          aggregates: Json | null
          c3_route: Json | null
          cycle_id: string
          id: string
          instruments: Json
          organisation_id: string
          pulse: Json | null
          screening: Json
          teams: Json
        }
        Insert: {
          adjustments: Json
          aggregates?: Json | null
          c3_route?: Json | null
          cycle_id: string
          id?: string
          instruments: Json
          organisation_id: string
          pulse?: Json | null
          screening: Json
          teams: Json
        }
        Update: {
          adjustments?: Json
          aggregates?: Json | null
          c3_route?: Json | null
          cycle_id?: string
          id?: string
          instruments?: Json
          organisation_id?: string
          pulse?: Json | null
          screening?: Json
          teams?: Json
        }
        Relationships: [
          {
            foreignKeyName: "unit_aggregates_organisation_id_cycle_id_fkey"
            columns: ["organisation_id", "cycle_id"]
            isOneToOne: true
            referencedRelation: "measurement_cycles"
            referencedColumns: ["organisation_id", "id"]
          },
          {
            foreignKeyName: "unit_aggregates_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
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
      campaign_monitoring: { Args: { p_campaign_id: string }; Returns: Json }
      campaigns_awaiting_tokens: { Args: never; Returns: string[] }
      can_manage_directory: {
        Args: { p_organisation_id: string }
        Returns: boolean
      }
      cancel_campaign: { Args: { p_campaign_id: string }; Returns: undefined }
      claim_outbox: {
        Args: { p_campaign_id?: string; p_limit: number }
        Returns: Json
      }
      close_campaign_now: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      close_campaign_responses: {
        Args: { p_campaign_unit_id: string }
        Returns: Json
      }
      close_due_campaigns: { Args: never; Returns: string[] }
      close_support_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      combine_measurement_units: {
        Args: {
          p_measurement_unit_ids: string[]
          p_name: string
          p_organisation_id: string
        }
        Returns: string
      }
      create_campaign: {
        Args: {
          p_cadence: string
          p_closes_at: string
          p_event_trigger?: string
          p_measurement_unit_ids: string[]
          p_name: string
          p_opens_at: string
          p_organisation_id: string
        }
        Returns: string
      }
      decide_schedule_proposal: {
        Args: {
          p_approve: boolean
          p_closes_at?: string
          p_opens_at?: string
          p_proposal_id: string
        }
        Returns: string
      }
      designate_support_staff: { Args: { p_email: string }; Returns: string }
      directory_upload_preview: { Args: { p_upload_id: string }; Returns: Json }
      discard_directory_upload: {
        Args: { p_upload_id: string }
        Returns: undefined
      }
      due_scheduled_campaigns: {
        Args: never
        Returns: {
          campaign_id: string
          organisation_id: string
        }[]
      }
      expire_directory_uploads: { Args: never; Returns: number }
      extend_campaign: {
        Args: { p_campaign_id: string; p_closes_at: string }
        Returns: undefined
      }
      grant_manager_memberships: {
        Args: { p_campaign_id: string }
        Returns: Json
      }
      ingest_survey_response: {
        Args: {
          p_completion_seconds: number
          p_payload: Json
          p_token_hash: string
        }
        Returns: undefined
      }
      invitations_for_tokens: {
        Args: { p_campaign_id: string }
        Returns: {
          audience: string
          campaign_unit_id: string
          invitation_id: string
          token_salt: string
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
      issue_survey_tokens: {
        Args: { p_campaign_id: string; p_tokens: Json }
        Returns: number
      }
      keep_grouping_unit: {
        Args: {
          p_keep: boolean
          p_measurement_unit_id: string
          p_organisation_id: string
        }
        Returns: undefined
      }
      launch_campaign: {
        Args: {
          p_actor_user_id: string
          p_campaign_id: string
          p_plan: Json
          p_setup_version: number
        }
        Returns: Json
      }
      launch_dataset: { Args: { p_campaign_id: string }; Returns: Json }
      mark_upload_file_removed: {
        Args: { p_upload_id: string }
        Returns: undefined
      }
      my_access: { Args: never; Returns: Json }
      new_link_kind: { Args: { p_email: string }; Returns: string }
      open_support_session: {
        Args: { p_organisation_id: string; p_reason: string }
        Returns: string
      }
      outbox_failed: {
        Args: { p_error: string; p_outbox_id: string; p_permanent: boolean }
        Returns: undefined
      }
      outbox_sent: {
        Args: { p_outbox_id: string; p_provider_message_id: string }
        Returns: undefined
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
          p_employee_id?: string
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
      record_job_run: {
        Args: { p_detail: Json; p_job: string }
        Returns: undefined
      }
      record_launch_refusal: {
        Args: { p_blockers: Json; p_campaign_id: string }
        Returns: undefined
      }
      record_scoring_error: {
        Args: { p_campaign_unit_id: string; p_code: string }
        Returns: number
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
      release_cycles: {
        Args: { p_campaign_id: string; p_measurement_unit_ids?: string[] }
        Returns: number
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
      save_checklist: {
        Args: {
          p_answers: Json
          p_campaign_unit_id: string
          p_checklist: string
        }
        Returns: number
      }
      schedule_campaign: { Args: { p_campaign_id: string }; Returns: undefined }
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
      settle_campaign: { Args: { p_campaign_id: string }; Returns: undefined }
      setup_version: { Args: { p_organisation_id: string }; Returns: number }
      split_out_measurement_unit: {
        Args: {
          p_measurement_unit_id: string
          p_organisation_id: string
          p_rest_name: string
          p_unit_id: string
        }
        Returns: undefined
      }
      staff_organisations: {
        Args: never
        Returns: {
          employee_band: string
          name: string
          open_session_id: string
          organisation_id: string
          period_end: string
          period_start: string
          state: string
        }[]
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
      store_calculation_run: {
        Args: { p_campaign_unit_id: string; p_payload: Json }
        Returns: string
      }
      store_pulse_result: {
        Args: { p_campaign_unit_id: string; p_payload: Json }
        Returns: string
      }
      survey_for_token: { Args: { p_token_hash: string }; Returns: Json }
      survey_tokens_live: {
        Args: { p_campaign_id: string; p_hashes: string[] }
        Returns: string[]
      }
      undo_measurement_unit: {
        Args: { p_measurement_unit_id: string; p_organisation_id: string }
        Returns: undefined
      }
      unschedule_campaign: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      update_campaign: {
        Args: {
          p_campaign_id: string
          p_closes_at: string
          p_measurement_unit_ids: string[]
          p_name: string
          p_opens_at: string
        }
        Returns: undefined
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

