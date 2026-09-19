// 手動撰寫,對應 /database/schema.sql。
// 之後接上真正的 Supabase 專案後,建議改用:
//   supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
// 取代這份手寫版本,確保跟遠端 schema 100% 同步。

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SiteRole = "site_admin" | "user";
export type WorldRole = "admin" | "editor" | "member";
export type MembershipStatus = "active" | "banned";
export type NodeType =
  | "location"
  | "item"
  | "character"
  | "faction"
  | "concept"
  | "event"
  | "article"
  | "unspecified";
export type NodeStatus = "pending" | "approved" | "rejected";
export type EditMode = "owner_only" | "collaborative";
export type CharacterType = "pc" | "npc";
export type RelationshipStatus = "active" | "revoked";
export type NoteVisibility = "private" | "world";
export type ReportTargetType = "relationship" | "node";
export type ReportStatus = "open" | "resolved" | "dismissed";
export type StoryScope = "official" | "character";
export type AttachmentKind = "image" | "file";
export type NotificationType =
  | "new_follower"
  | "followed_node"
  | "followed_world_join";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          username: string | null;
          display_name: string | null;
          bio: string | null;
          avatar_path: string | null;
          banner_path: string | null;
          site_role: SiteRole;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & {
          id: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Relationships: [];
      };
      invite_codes: {
        Row: {
          id: string;
          code: string;
          created_by: string;
          max_uses: number;
          use_count: number;
          expires_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["invite_codes"]["Row"]> & {
          code: string;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["invite_codes"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "invite_codes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      invite_code_redemptions: {
        Row: {
          id: string;
          invite_code_id: string;
          user_id: string;
          redeemed_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["invite_code_redemptions"]["Row"]
        > & { invite_code_id: string; user_id: string };
        Update: Partial<
          Database["public"]["Tables"]["invite_code_redemptions"]["Row"]
        >;
        Relationships: [
          {
            foreignKeyName: "invite_code_redemptions_invite_code_id_fkey";
            columns: ["invite_code_id"];
            isOneToOne: false;
            referencedRelation: "invite_codes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invite_code_redemptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      follows: {
        Row: {
          follower_id: string;
          followee_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["follows"]["Row"]> & {
          follower_id: string;
          followee_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["follows"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey";
            columns: ["follower_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follows_followee_id_fkey";
            columns: ["followee_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      worlds: {
        Row: {
          id: string;
          slug: string;
          name: string;
          tagline: string | null;
          description: string | null;
          cover_image_url: string | null;
          banner_path: string | null;
          icon_path: string | null;
          owner_id: string;
          default_pc_quota: number;
          is_public: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["worlds"]["Row"]> & {
          slug: string;
          name: string;
          owner_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["worlds"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "worlds_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      world_memberships: {
        Row: {
          id: string;
          world_id: string;
          user_id: string;
          role: WorldRole;
          status: MembershipStatus;
          joined_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["world_memberships"]["Row"]
        > & { world_id: string; user_id: string };
        Update: Partial<Database["public"]["Tables"]["world_memberships"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "world_memberships_world_id_fkey";
            columns: ["world_id"];
            isOneToOne: false;
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "world_memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      nodes: {
        Row: {
          id: string;
          world_id: string;
          node_type: NodeType;
          title: string;
          slug: string;
          content: string;
          status: NodeStatus;
          edit_mode: EditMode;
          is_placeholder: boolean;
          creator_id: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          map_layer_id: string | null;
          map_x: number | null;
          map_y: number | null;
          category_id: string | null;
          image_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["nodes"]["Row"]> & {
          world_id: string;
          node_type: NodeType;
          title: string;
          slug: string;
          creator_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["nodes"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "nodes_world_id_fkey";
            columns: ["world_id"];
            isOneToOne: false;
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nodes_map_layer_id_fkey";
            columns: ["map_layer_id"];
            isOneToOne: false;
            referencedRelation: "world_map_layers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "nodes_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "world_content_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      world_content_categories: {
        Row: {
          id: string;
          world_id: string;
          name: string;
          description: string | null;
          accepts_submissions: boolean;
          order_index: number;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["world_content_categories"]["Row"]
        > & { world_id: string; name: string };
        Update: Partial<
          Database["public"]["Tables"]["world_content_categories"]["Row"]
        >;
        Relationships: [
          {
            foreignKeyName: "world_content_categories_world_id_fkey";
            columns: ["world_id"];
            isOneToOne: false;
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          },
        ];
      };
      world_map_layers: {
        Row: {
          id: string;
          world_id: string;
          name: string;
          image_path: string | null;
          order_index: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["world_map_layers"]["Row"]> & {
          world_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["world_map_layers"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "world_map_layers_world_id_fkey";
            columns: ["world_id"];
            isOneToOne: false;
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          },
        ];
      };
      node_revisions: {
        Row: {
          id: string;
          node_id: string;
          editor_id: string;
          title: string;
          content: string;
          change_summary: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["node_revisions"]["Row"]> & {
          node_id: string;
          editor_id: string;
          title: string;
          content: string;
        };
        Update: Partial<Database["public"]["Tables"]["node_revisions"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "node_revisions_node_id_fkey";
            columns: ["node_id"];
            isOneToOne: false;
            referencedRelation: "nodes";
            referencedColumns: ["id"];
          },
        ];
      };
      node_attachments: {
        Row: {
          id: string;
          node_id: string;
          world_id: string;
          storage_path: string;
          file_name: string;
          content_type: string;
          file_size: number;
          kind: AttachmentKind;
          uploader_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["node_attachments"]["Row"]> & {
          node_id: string;
          world_id: string;
          storage_path: string;
          file_name: string;
          content_type: string;
          file_size: number;
          kind: AttachmentKind;
          uploader_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["node_attachments"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "node_attachments_node_id_fkey";
            columns: ["node_id"];
            isOneToOne: false;
            referencedRelation: "nodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "node_attachments_world_id_fkey";
            columns: ["world_id"];
            isOneToOne: false;
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "node_attachments_uploader_id_fkey";
            columns: ["uploader_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      characters: {
        Row: {
          node_id: string;
          character_type: CharacterType;
          owner_id: string | null;
          persona_id: string | null;
          avatar_path: string | null;
          illustration_path: string | null;
        };
        Insert: Database["public"]["Tables"]["characters"]["Row"];
        Update: Partial<Database["public"]["Tables"]["characters"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "characters_node_id_fkey";
            columns: ["node_id"];
            isOneToOne: true;
            referencedRelation: "nodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "characters_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "characters_persona_id_fkey";
            columns: ["persona_id"];
            isOneToOne: false;
            referencedRelation: "character_personas";
            referencedColumns: ["id"];
          },
        ];
      };
      character_personas: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          tagline: string | null;
          bio: string | null;
          fields: Json;
          avatar_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["character_personas"]["Row"]
        > & { owner_id: string; name: string };
        Update: Partial<Database["public"]["Tables"]["character_personas"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "character_personas_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      node_sections: {
        Row: {
          id: string;
          node_id: string;
          title: string;
          content: string;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["node_sections"]["Row"]> & {
          node_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["node_sections"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "node_sections_node_id_fkey";
            columns: ["node_id"];
            isOneToOne: false;
            referencedRelation: "nodes";
            referencedColumns: ["id"];
          },
        ];
      };
      character_timeline_events: {
        Row: {
          id: string;
          node_id: string;
          label: string;
          description: string;
          content: string;
          image_path: string | null;
          order_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["character_timeline_events"]["Row"]
        > & { node_id: string; label: string };
        Update: Partial<
          Database["public"]["Tables"]["character_timeline_events"]["Row"]
        >;
        Relationships: [
          {
            foreignKeyName: "character_timeline_events_node_id_fkey";
            columns: ["node_id"];
            isOneToOne: false;
            referencedRelation: "nodes";
            referencedColumns: ["id"];
          },
        ];
      };
      world_character_fields: {
        Row: {
          id: string;
          world_id: string;
          label: string;
          order_index: number;
          created_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["world_character_fields"]["Row"]
        > & { world_id: string; label: string };
        Update: Partial<
          Database["public"]["Tables"]["world_character_fields"]["Row"]
        >;
        Relationships: [
          {
            foreignKeyName: "world_character_fields_world_id_fkey";
            columns: ["world_id"];
            isOneToOne: false;
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          },
        ];
      };
      character_field_values: {
        Row: {
          node_id: string;
          field_id: string;
          value: string;
          updated_at: string;
        };
        Insert: Partial<
          Database["public"]["Tables"]["character_field_values"]["Row"]
        > & { node_id: string; field_id: string };
        Update: Partial<
          Database["public"]["Tables"]["character_field_values"]["Row"]
        >;
        Relationships: [
          {
            foreignKeyName: "character_field_values_node_id_fkey";
            columns: ["node_id"];
            isOneToOne: false;
            referencedRelation: "nodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "character_field_values_field_id_fkey";
            columns: ["field_id"];
            isOneToOne: false;
            referencedRelation: "world_character_fields";
            referencedColumns: ["id"];
          },
        ];
      };
      relationships: {
        Row: {
          id: string;
          world_id: string;
          node_a_id: string;
          node_b_id: string;
          label: string | null;
          label_reverse: string | null;
          description: string | null;
          status: RelationshipStatus;
          creator_id: string;
          created_at: string;
          revoked_by: string | null;
          revoked_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["relationships"]["Row"]> & {
          world_id: string;
          node_a_id: string;
          node_b_id: string;
          creator_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["relationships"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "relationships_world_id_fkey";
            columns: ["world_id"];
            isOneToOne: false;
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "relationships_node_a_id_fkey";
            columns: ["node_a_id"];
            isOneToOne: false;
            referencedRelation: "nodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "relationships_node_b_id_fkey";
            columns: ["node_b_id"];
            isOneToOne: false;
            referencedRelation: "nodes";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          target_type: ReportTargetType;
          target_id: string;
          reporter_id: string;
          reason: string;
          status: ReportStatus;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reports"]["Row"]> & {
          target_type: ReportTargetType;
          target_id: string;
          reporter_id: string;
          reason: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey";
            columns: ["reporter_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      wikilinks: {
        Row: {
          id: string;
          source_node_id: string;
          target_node_id: string;
          raw_text: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["wikilinks"]["Row"]> & {
          source_node_id: string;
          target_node_id: string;
          raw_text: string;
        };
        Update: Partial<Database["public"]["Tables"]["wikilinks"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "wikilinks_source_node_id_fkey";
            columns: ["source_node_id"];
            isOneToOne: false;
            referencedRelation: "nodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "wikilinks_target_node_id_fkey";
            columns: ["target_node_id"];
            isOneToOne: false;
            referencedRelation: "nodes";
            referencedColumns: ["id"];
          },
        ];
      };
      story_chapters: {
        Row: {
          id: string;
          world_id: string;
          scope: StoryScope;
          character_id: string | null;
          title: string;
          order_index: number;
          description: string | null;
          creator_id: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["story_chapters"]["Row"]> & {
          world_id: string;
          title: string;
          order_index: number;
          creator_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["story_chapters"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "story_chapters_world_id_fkey";
            columns: ["world_id"];
            isOneToOne: false;
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_chapters_character_id_fkey";
            columns: ["character_id"];
            isOneToOne: false;
            referencedRelation: "nodes";
            referencedColumns: ["id"];
          },
        ];
      };
      story_steps: {
        Row: {
          id: string;
          chapter_id: string;
          node_id: string;
          order_index: number;
          custom_text: string | null;
          pov_character_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["story_steps"]["Row"]> & {
          chapter_id: string;
          node_id: string;
          order_index: number;
        };
        Update: Partial<Database["public"]["Tables"]["story_steps"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "story_steps_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "story_chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "story_steps_node_id_fkey";
            columns: ["node_id"];
            isOneToOne: false;
            referencedRelation: "nodes";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          id: string;
          world_id: string;
          author_id: string;
          title: string | null;
          content: string;
          visibility: NoteVisibility;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notes"]["Row"]> & {
          world_id: string;
          author_id: string;
          content: string;
        };
        Update: Partial<Database["public"]["Tables"]["notes"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "notes_world_id_fkey";
            columns: ["world_id"];
            isOneToOne: false;
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          type: NotificationType;
          actor_id: string | null;
          node_id: string | null;
          world_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["notifications"]["Row"]> & {
          recipient_id: string;
          type: NotificationType;
        };
        Update: Partial<Database["public"]["Tables"]["notifications"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_node_id_fkey";
            columns: ["node_id"];
            isOneToOne: false;
            referencedRelation: "nodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_world_id_fkey";
            columns: ["world_id"];
            isOneToOne: false;
            referencedRelation: "worlds";
            referencedColumns: ["id"];
          },
        ];
      };
      direct_messages: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          content: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: Partial<
          Database["public"]["Tables"]["direct_messages"]["Row"]
        > & {
          sender_id: string;
          recipient_id: string;
          content: string;
        };
        Update: Partial<Database["public"]["Tables"]["direct_messages"]["Row"]>;
        Relationships: [
          {
            foreignKeyName: "direct_messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "direct_messages_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_site_admin: { Args: Record<string, never>; Returns: boolean };
      world_role: { Args: { p_world_id: string }; Returns: WorldRole | null };
      is_world_member: { Args: { p_world_id: string }; Returns: boolean };
      is_world_staff: { Args: { p_world_id: string }; Returns: boolean };
      is_world_admin: { Args: { p_world_id: string }; Returns: boolean };
      world_is_public: { Args: { p_world_id: string }; Returns: boolean };
      can_view_world_content: {
        Args: { p_world_id: string };
        Returns: boolean;
      };
      owns_character: {
        Args: { p_character_node_id: string };
        Returns: boolean;
      };
      can_edit_node: {
        Args: { p_node_id: string };
        Returns: boolean;
      };
      redeem_invite_code: { Args: { p_code: string }; Returns: undefined };
      create_character: {
        Args: {
          p_world_id: string;
          p_title: string;
          p_slug: string;
          p_content: string;
          p_character_type: CharacterType;
          p_owner_id?: string | null;
        };
        Returns: string;
      };
      public_world_memberships: {
        Args: { p_user_id: string };
        Returns: {
          world_id: string;
          slug: string;
          name: string;
          tagline: string | null;
          role: WorldRole;
        }[];
      };
      staff_review_summary: {
        Args: Record<string, never>;
        Returns: {
          pending_nodes_count: number;
          open_reports_count: number;
        }[];
      };
    };
    Enums: {
      site_role: SiteRole;
      world_role: WorldRole;
      membership_status: MembershipStatus;
      node_type: NodeType;
      node_status: NodeStatus;
      edit_mode: EditMode;
      character_type: CharacterType;
      relationship_status: RelationshipStatus;
      note_visibility: NoteVisibility;
      report_target_type: ReportTargetType;
      report_status: ReportStatus;
      story_scope: StoryScope;
      notification_type: NotificationType;
    };
  };
};
