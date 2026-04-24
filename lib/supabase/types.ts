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
          profile_completion_score: number;
          updated_at: string;
        },
        {
          profile_id?: string;
          user_id: string;
          bio?: string | null;
          contact_email?: string | null;
          portfolio_links?: string[] | null;
          profile_completion_score?: number;
          updated_at?: string;
        },
        {
          profile_id?: string;
          user_id?: string;
          bio?: string | null;
          contact_email?: string | null;
          portfolio_links?: string[] | null;
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
