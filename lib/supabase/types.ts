type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      users: Table<
        {
          user_id: string;
          name: string | null;
          email: string;
          headline: string | null;
          role_type: "candidate" | "recruiter" | null;
          target_roles: string[] | null;
          created_at: string;
        },
        {
          user_id: string;
          name?: string | null;
          email: string;
          headline?: string | null;
          role_type?: "candidate" | "recruiter" | null;
          target_roles?: string[] | null;
          created_at?: string;
        },
        {
          user_id?: string;
          name?: string | null;
          email?: string;
          headline?: string | null;
          role_type?: "candidate" | "recruiter" | null;
          target_roles?: string[] | null;
          created_at?: string;
        }
      >;
      candidate_profiles: Table<
        {
          profile_id: string;
          user_id: string;
          bio: string | null;
          contact_email: string | null;
          portfolio_links: string[] | null;
          passport_slug: string | null;
          profile_completion_score: number;
          updated_at: string;
        },
        {
          profile_id?: string;
          user_id: string;
          bio?: string | null;
          contact_email?: string | null;
          portfolio_links?: string[] | null;
          passport_slug?: string | null;
          profile_completion_score?: number;
          updated_at?: string;
        },
        {
          profile_id?: string;
          user_id?: string;
          bio?: string | null;
          contact_email?: string | null;
          portfolio_links?: string[] | null;
          passport_slug?: string | null;
          profile_completion_score?: number;
          updated_at?: string;
        }
      >;
      projects: Table<
        {
          project_id: string;
          user_id: string;
          title: string;
          problem_solved: string;
          what_was_built: string;
          category: string;
          impact: string | null;
          hook: string | null;
          project_type: "web" | "design" | "document" | "other" | null;
          cover_image_url: string | null;
          is_featured: boolean;
          created_at: string;
        },
        {
          project_id?: string;
          user_id: string;
          title: string;
          problem_solved: string;
          what_was_built: string;
          category: string;
          impact?: string | null;
          hook?: string | null;
          project_type?: "web" | "design" | "document" | "other" | null;
          cover_image_url?: string | null;
          is_featured?: boolean;
          created_at?: string;
        },
        {
          project_id?: string;
          user_id?: string;
          title?: string;
          problem_solved?: string;
          what_was_built?: string;
          category?: string;
          impact?: string | null;
          hook?: string | null;
          project_type?: "web" | "design" | "document" | "other" | null;
          cover_image_url?: string | null;
          is_featured?: boolean;
          created_at?: string;
        }
      >;
      skill_tags: Table<
        {
          skill_id: string;
          skill_name: string;
        },
        {
          skill_id?: string;
          skill_name: string;
        },
        {
          skill_id?: string;
          skill_name?: string;
        }
      >;
      project_skills: Table<
        {
          project_id: string;
          skill_id: string;
        },
        {
          project_id: string;
          skill_id: string;
        },
        {
          project_id?: string;
          skill_id?: string;
        }
      >;
      artifacts: Table<
        {
          artifact_id: string;
          project_id: string;
          artifact_type: string;
          artifact_url: string;
          preview_url: string | null;
        },
        {
          artifact_id?: string;
          project_id: string;
          artifact_type: string;
          artifact_url: string;
          preview_url?: string | null;
        },
        {
          artifact_id?: string;
          project_id?: string;
          artifact_type?: string;
          artifact_url?: string;
          preview_url?: string | null;
        }
      >;
      saved_projects: Table<
        {
          user_id: string;
          project_id: string;
          created_at: string;
        },
        {
          user_id: string;
          project_id: string;
          created_at?: string;
        },
        {
          user_id?: string;
          project_id?: string;
          created_at?: string;
        }
      >;
      inspired_projects: Table<
        {
          user_id: string;
          project_id: string;
          created_at: string;
        },
        {
          user_id: string;
          project_id: string;
          created_at?: string;
        },
        {
          user_id?: string;
          project_id?: string;
          created_at?: string;
        }
      >;
      project_reports: Table<
        {
          report_id: number;
          project_id: string;
          reporter_user_id: string;
          reason: string;
          details: string | null;
          status: string;
          created_at: string;
        },
        {
          report_id?: number;
          project_id: string;
          reporter_user_id: string;
          reason: string;
          details?: string | null;
          status?: string;
          created_at?: string;
        },
        {
          report_id?: number;
          project_id?: string;
          reporter_user_id?: string;
          reason?: string;
          details?: string | null;
          status?: string;
          created_at?: string;
        }
      >;
      hidden_projects: Table<
        {
          project_id: string;
          hidden_by: string;
          reason: string;
          created_at: string;
        },
        {
          project_id: string;
          hidden_by: string;
          reason?: string;
          created_at?: string;
        },
        {
          project_id?: string;
          hidden_by?: string;
          reason?: string;
          created_at?: string;
        }
      >;
      unclaimed_passports: Table<
        {
          passport_id: string;
          owner_user_id: string | null;
          created_by_admin_id: string | null;
          full_name: string;
          headline: string | null;
          bio: string | null;
          email: string | null;
          school: string | null;
          skills: string[];
          projects: Json;
          featured_work: Json | null;
          resume_url: string | null;
          portfolio_url: string | null;
          linkedin_url: string | null;
          github_url: string | null;
          passport_slug: string | null;
          claim_token_hash: string | null;
          claim_expires_at: string;
          claimed_at: string | null;
          status: "unclaimed" | "claimed" | "expired";
          created_at: string;
          updated_at: string;
        },
        {
          passport_id?: string;
          owner_user_id?: string | null;
          created_by_admin_id?: string | null;
          full_name: string;
          headline?: string | null;
          bio?: string | null;
          email?: string | null;
          school?: string | null;
          skills?: string[];
          projects?: Json;
          featured_work?: Json | null;
          resume_url?: string | null;
          portfolio_url?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          passport_slug?: string | null;
          claim_token_hash?: string | null;
          claim_expires_at?: string;
          claimed_at?: string | null;
          status?: "unclaimed" | "claimed" | "expired";
          created_at?: string;
          updated_at?: string;
        },
        {
          passport_id?: string;
          owner_user_id?: string | null;
          created_by_admin_id?: string | null;
          full_name?: string;
          headline?: string | null;
          bio?: string | null;
          email?: string | null;
          school?: string | null;
          skills?: string[];
          projects?: Json;
          featured_work?: Json | null;
          resume_url?: string | null;
          portfolio_url?: string | null;
          linkedin_url?: string | null;
          github_url?: string | null;
          passport_slug?: string | null;
          claim_token_hash?: string | null;
          claim_expires_at?: string;
          claimed_at?: string | null;
          status?: "unclaimed" | "claimed" | "expired";
          created_at?: string;
          updated_at?: string;
        }
      >;
      project_views: Table<
        {
          project_id: string;
          viewer_user_id: string;
          created_at: string;
        },
        {
          project_id: string;
          viewer_user_id: string;
          created_at?: string;
        },
        {
          project_id?: string;
          viewer_user_id?: string;
          created_at?: string;
        }
      >;
      opportunities: Table<
        {
          opportunity_id: string;
          recruiter_id: string;
          title: string;
          company: string;
          description: string;
          skills_sought: string[] | null;
          created_at: string;
        },
        {
          opportunity_id?: string;
          recruiter_id: string;
          title: string;
          company: string;
          description: string;
          skills_sought?: string[] | null;
          created_at?: string;
        },
        {
          opportunity_id?: string;
          recruiter_id?: string;
          title?: string;
          company?: string;
          description?: string;
          skills_sought?: string[] | null;
          created_at?: string;
        }
      >;
      matches: Table<
        {
          match_id: string;
          user_id: string;
          opportunity_id: string;
          match_score: number;
          match_rationale: string[] | null;
          created_at: string;
        },
        {
          match_id?: string;
          user_id: string;
          opportunity_id: string;
          match_score: number;
          match_rationale?: string[] | null;
          created_at?: string;
        },
        {
          match_id?: string;
          user_id?: string;
          opportunity_id?: string;
          match_score?: number;
          match_rationale?: string[] | null;
          created_at?: string;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
