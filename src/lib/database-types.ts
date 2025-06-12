export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          is_pro: boolean
          created_at: string
          updated_at: string
          preferences: Json
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          is_pro?: boolean
          created_at?: string
          updated_at?: string
          preferences?: Json
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          is_pro?: boolean
          created_at?: string
          updated_at?: string
          preferences?: Json
        }
        Relationships: []
      }
      furniture_designs: {
        Row: {
          id: string
          name: string
          description: string | null
          furniture_type: string
          design_data: Json
          thumbnail_url: string | null
          is_public: boolean
          created_at: string
          updated_at: string
          user_id: string
          version: number
          tags: string[] | null
          likes_count: number
          views_count: number
          fork_count: number
          parent_design_id: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          furniture_type: string
          design_data: Json
          thumbnail_url?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
          user_id: string
          version?: number
          tags?: string[] | null
          likes_count?: number
          views_count?: number
          fork_count?: number
          parent_design_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          furniture_type?: string
          design_data?: Json
          thumbnail_url?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
          user_id?: string
          version?: number
          tags?: string[] | null
          likes_count?: number
          views_count?: number
          fork_count?: number
          parent_design_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "furniture_designs_parent_design_id_fkey"
            columns: ["parent_design_id"]
            referencedRelation: "furniture_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "furniture_designs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      design_likes: {
        Row: {
          id: string
          design_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          design_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          design_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_likes_design_id_fkey"
            columns: ["design_id"]
            referencedRelation: "furniture_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_likes_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      design_comments: {
        Row: {
          id: string
          design_id: string
          user_id: string
          comment: string
          created_at: string
          updated_at: string
          parent_comment_id: string | null
        }
        Insert: {
          id?: string
          design_id: string
          user_id: string
          comment: string
          created_at?: string
          updated_at?: string
          parent_comment_id?: string | null
        }
        Update: {
          id?: string
          design_id?: string
          user_id?: string
          comment?: string
          created_at?: string
          updated_at?: string
          parent_comment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_comments_design_id_fkey"
            columns: ["design_id"]
            referencedRelation: "furniture_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            referencedRelation: "design_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_comments_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      design_shares: {
        Row: {
          id: string
          design_id: string
          shared_with_user_id: string | null
          shared_via_link: boolean
          permissions: 'view' | 'edit' | 'fork'
          expires_at: string | null
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          design_id: string
          shared_with_user_id?: string | null
          shared_via_link?: boolean
          permissions?: 'view' | 'edit' | 'fork'
          expires_at?: string | null
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          design_id?: string
          shared_with_user_id?: string | null
          shared_via_link?: boolean
          permissions?: 'view' | 'edit' | 'fork'
          expires_at?: string | null
          created_at?: string
          created_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_shares_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_shares_design_id_fkey"
            columns: ["design_id"]
            referencedRelation: "furniture_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      build_sessions: {
        Row: {
          id: string
          design_id: string
          user_id: string
          session_data: Json
          status: 'planning' | 'in_progress' | 'completed' | 'paused'
          progress_percentage: number
          estimated_completion: string | null
          actual_completion: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          design_id: string
          user_id: string
          session_data?: Json
          status?: 'planning' | 'in_progress' | 'completed' | 'paused'
          progress_percentage?: number
          estimated_completion?: string | null
          actual_completion?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          design_id?: string
          user_id?: string
          session_data?: Json
          status?: 'planning' | 'in_progress' | 'completed' | 'paused'
          progress_percentage?: number
          estimated_completion?: string | null
          actual_completion?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "build_sessions_design_id_fkey"
            columns: ["design_id"]
            referencedRelation: "furniture_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "build_sessions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_like_count: {
        Args: {
          design_id: string
        }
        Returns: undefined
      }
      decrement_like_count: {
        Args: {
          design_id: string
        }
        Returns: undefined
      }
      increment_view_count: {
        Args: {
          design_id: string
        }
        Returns: undefined
      }
      increment_fork_count: {
        Args: {
          design_id: string
        }
        Returns: undefined
      }
      search_designs: {
        Args: {
          search_query: string
          limit_count?: number
          offset_count?: number
        }
        Returns: {
          id: string
          name: string
          description: string | null
          furniture_type: string
          thumbnail_url: string | null
          is_public: boolean
          created_at: string
          updated_at: string
          user_id: string
          likes_count: number
          views_count: number
          fork_count: number
          tags: string[] | null
          rank: number
        }[]
      }
      get_trending_designs: {
        Args: {
          days?: number
          limit_count?: number
        }
        Returns: {
          id: string
          name: string
          description: string | null
          furniture_type: string
          thumbnail_url: string | null
          created_at: string
          user_id: string
          likes_count: number
          views_count: number
          fork_count: number
          trending_score: number
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