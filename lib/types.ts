export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type PortfolioType = "music" | "video" | "photo" | "text" | "other";
export type OpportunityCategory =
  | "radio"
  | "podcast"
  | "event"
  | "contest"
  | "residency"
  | "other";
export type MatchingStatus = "pending" | "applied" | "accepted" | "rejected";
export type PartnerType =
  | "radio"
  | "podcast"
  | "venue"
  | "festival"
  | "institution"
  | "other";
export type PlaceType =
  | "radio"
  | "cultural_center"
  | "concert_bar"
  | "venue"
  | "gallery"
  | "festival"
  | "studio"
  | "other";
export type PressPhotoOrientation = "horizontal" | "vertical" | "logo";
export type AvailabilityStatus = "available" | "unavailable" | "tentative";

export type PressQuote = {
  quote: string;
  source: string;
  year: string;
};
export type ProfileRole = "artist" | "operator" | "admin";

export type SpotifyTopTrack = {
  id: string;
  name: string;
  external_url: string | null;
  preview_url?: string | null;
};

export type Profile = {
  id: string;
  full_name: string | null;
  stage_name: string | null;
  bio: string | null;
  city: string | null;
  artistic_disciplines: string[] | null;
  avatar_url: string | null;
  website_url: string | null;
  spotify_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  instagram_url: string | null;
  linktree_url: string | null;
  spotify_followers: number | null;
  youtube_subscribers: number | null;
  instagram_followers: number | null;
  tiktok_followers: number | null;
  monthly_listeners: number | null;
  stats_updated_at: string | null;
  notifications_opt_out: boolean;
  is_featured: boolean;
  featured_month: string | null;
  fee_min: number | null;
  fee_max: number | null;
  fee_currency: string | null;
  avg_rating: number | null;
  review_count: number;
  bio_pitch: string | null;
  bio_short: string | null;
  bio_long: string | null;
  contact_email: string | null;
  slug: string | null;
  press_quotes: PressQuote[] | null;
  role: ProfileRole;
  is_member: boolean;
  created_at: string;
  updated_at: string;
};

export type PublicProfile = Pick<
  Profile,
  | "id"
  | "full_name"
  | "stage_name"
  | "bio"
  | "bio_pitch"
  | "bio_short"
  | "bio_long"
  | "city"
  | "artistic_disciplines"
  | "avatar_url"
  | "website_url"
  | "spotify_url"
  | "youtube_url"
  | "tiktok_url"
  | "instagram_url"
  | "linktree_url"
  | "spotify_followers"
  | "youtube_subscribers"
  | "instagram_followers"
  | "tiktok_followers"
  | "monthly_listeners"
  | "fee_min"
  | "fee_max"
  | "fee_currency"
  | "avg_rating"
  | "review_count"
  | "is_member"
  | "is_featured"
  | "featured_month"
  | "slug"
  | "created_at"
>;

export type ProfileInsert = { id: string } & Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;
export type ProfileUpdate = Partial<Omit<Profile, "id" | "created_at" | "updated_at">>;

export type SpotifyData = {
  id: string;
  profile_id: string;
  spotify_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  top_tracks: SpotifyTopTrack[] | null;
  synced_at: string | null;
};

export type SpotifyDataPublic = Pick<SpotifyData, "profile_id" | "spotify_id" | "synced_at" | "top_tracks">;
export type SpotifyDataInsert = Omit<SpotifyData, "id" | "synced_at"> & {
  id?: string;
  synced_at?: string | null;
};
export type SpotifyDataUpdate = Partial<Omit<SpotifyData, "id" | "profile_id">>;

export type PushSubscription = {
  id: string;
  profile_id: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};

export type PushSubscriptionInsert = Omit<PushSubscription, "id" | "created_at"> & {
  created_at?: string;
  id?: string;
};

export type PushSubscriptionUpdate = Partial<Omit<PushSubscription, "id" | "created_at">>;

export type PortfolioItem = {
  id: string;
  profile_id: string;
  title: string;
  type: PortfolioType;
  url: string | null;
  description: string | null;
  created_at: string;
};

export type PortfolioItemInsert = Omit<PortfolioItem, "id" | "created_at">;
export type PortfolioItemUpdate = Partial<Omit<PortfolioItem, "id" | "profile_id" | "created_at">>;

export type Opportunity = {
  id: string;
  title: string;
  category: OpportunityCategory;
  description: string | null;
  location: string | null;
  organizer: string | null;
  operator_id: string | null;
  contact_email: string | null;
  external_url: string | null;
  deadline: string | null;
  is_active: boolean;
  created_at: string;
};

export type OpportunityInsert = Omit<Opportunity, "id" | "created_at" | "operator_id"> & {
  operator_id?: string | null;
};
export type OpportunityUpdate = Partial<Omit<Opportunity, "id" | "created_at">>;

export type Matching = {
  id: string;
  profile_id: string;
  opportunity_id: string;
  status: MatchingStatus;
  message: string | null;
  applied_at: string;
};

export type MatchingInsert = Omit<Matching, "id" | "applied_at">;
export type MatchingUpdate = Partial<Omit<Matching, "id" | "profile_id" | "opportunity_id" | "applied_at">>;

export type Partner = {
  id: string;
  name: string;
  type: PartnerType;
  website: string | null;
  contact_email: string | null;
  description: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
};

export type PartnerInsert = Omit<Partner, "id" | "created_at">;
export type PartnerUpdate = Partial<Omit<Partner, "id" | "created_at">>;

export type Place = {
  id: string;
  name: string;
  type: PlaceType;
  address: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  website: string | null;
  description: string | null;
  is_active: boolean;
};

export type PlaceInsert = Omit<Place, "id">;
export type PlaceUpdate = Partial<Omit<Place, "id">>;

export type TechRider = {
  id: string;
  profile_id: string;
  stage_plan_url: string | null;
  patch_list_url: string | null;
  notes: string | null;
  created_at: string;
};

export type TechRiderInsert = Omit<TechRider, "id" | "created_at">;
export type TechRiderUpdate = Partial<Omit<TechRider, "id" | "profile_id" | "created_at">>;

export type PressPhoto = {
  id: string;
  profile_id: string;
  url: string;
  filename: string | null;
  caption: string | null;
  photographer: string | null;
  orientation: PressPhotoOrientation | null;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
};

export type PressPhotoInsert = Omit<PressPhoto, "id" | "created_at">;
export type PressPhotoUpdate = Partial<Omit<PressPhoto, "id" | "profile_id" | "created_at">>;

export type Conversation = {
  id: string;
  artist_id: string;
  operator_id: string;
  opportunity_id: string | null;
  last_message_at: string;
  created_at: string;
};

export type ConversationInsert = Omit<Conversation, "id" | "created_at" | "last_message_at"> & {
  created_at?: string;
  last_message_at?: string;
};
export type ConversationUpdate = Partial<Omit<Conversation, "id" | "artist_id" | "operator_id" | "created_at">>;

export type DirectMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type DirectMessageInsert = Omit<DirectMessage, "id" | "created_at" | "read_at"> & {
  created_at?: string;
  read_at?: string | null;
};
export type DirectMessageUpdate = Partial<Omit<DirectMessage, "id" | "conversation_id" | "sender_id" | "created_at">>;

export type ArtistAvailability = {
  id: string;
  profile_id: string;
  date: string;
  status: AvailabilityStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type ArtistAvailabilityInsert = Omit<ArtistAvailability, "id" | "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};
export type ArtistAvailabilityUpdate = Partial<Omit<ArtistAvailability, "id" | "profile_id" | "created_at" | "updated_at">>;

export type ArtistReview = {
  id: string;
  profile_id: string;
  reviewer_id: string;
  opportunity_id: string | null;
  rating: number;
  comment: string | null;
  is_public: boolean;
  created_at: string;
};

export type ArtistReviewInsert = Omit<ArtistReview, "id" | "created_at"> & {
  created_at?: string;
};
export type ArtistReviewUpdate = Partial<Omit<ArtistReview, "id" | "profile_id" | "reviewer_id" | "created_at">>;

export type PerformanceAudienceSize = "< 50" | "50-200" | "200-500" | "500-1000" | "1000-5000" | "5000+";
export type PerformanceEventType =
  | "concert"
  | "festival"
  | "showcase"
  | "residency"
  | "private"
  | "radio"
  | "podcast"
  | "other";

export type Performance = {
  id: string;
  profile_id: string;
  event_name: string;
  venue_name: string | null;
  city: string | null;
  country: string | null;
  performance_date: string;
  audience_size: PerformanceAudienceSize | null;
  event_type: PerformanceEventType | null;
  description: string | null;
  media_url: string | null;
  is_public: boolean;
  created_at: string;
};

export type PerformanceInsert = Omit<Performance, "id" | "created_at"> & {
  created_at?: string;
};
export type PerformanceUpdate = Partial<Omit<Performance, "id" | "profile_id" | "created_at">>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      portfolio_items: {
        Row: PortfolioItem;
        Insert: PortfolioItemInsert;
        Update: PortfolioItemUpdate;
        Relationships: [
          {
            foreignKeyName: "portfolio_items_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      spotify_data: {
        Row: SpotifyData;
        Insert: SpotifyDataInsert;
        Update: SpotifyDataUpdate;
        Relationships: [
          {
            foreignKeyName: "spotify_data_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: PushSubscription;
        Insert: PushSubscriptionInsert;
        Update: PushSubscriptionUpdate;
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      opportunities: {
        Row: Opportunity;
        Insert: OpportunityInsert;
        Update: OpportunityUpdate;
        Relationships: [
          {
            foreignKeyName: "opportunities_operator_id_fkey";
            columns: ["operator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      matchings: {
        Row: Matching;
        Insert: MatchingInsert;
        Update: MatchingUpdate;
        Relationships: [
          {
            foreignKeyName: "matchings_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matchings_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      partners: {
        Row: Partner;
        Insert: PartnerInsert;
        Update: PartnerUpdate;
        Relationships: [];
      };
      places: {
        Row: Place;
        Insert: PlaceInsert;
        Update: PlaceUpdate;
        Relationships: [];
      };
      tech_riders: {
        Row: TechRider;
        Insert: TechRiderInsert;
        Update: TechRiderUpdate;
        Relationships: [
          {
            foreignKeyName: "tech_riders_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      press_photos: {
        Row: PressPhoto;
        Insert: PressPhotoInsert;
        Update: PressPhotoUpdate;
        Relationships: [
          {
            foreignKeyName: "press_photos_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      conversations: {
        Row: Conversation;
        Insert: ConversationInsert;
        Update: ConversationUpdate;
        Relationships: [
          {
            foreignKeyName: "conversations_artist_id_fkey";
            columns: ["artist_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_operator_id_fkey";
            columns: ["operator_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "conversations_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: DirectMessage;
        Insert: DirectMessageInsert;
        Update: DirectMessageUpdate;
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      artist_availability: {
        Row: ArtistAvailability;
        Insert: ArtistAvailabilityInsert;
        Update: ArtistAvailabilityUpdate;
        Relationships: [
          {
            foreignKeyName: "artist_availability_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      artist_reviews: {
        Row: ArtistReview;
        Insert: ArtistReviewInsert;
        Update: ArtistReviewUpdate;
        Relationships: [
          {
            foreignKeyName: "artist_reviews_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artist_reviews_reviewer_id_fkey";
            columns: ["reviewer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "artist_reviews_opportunity_id_fkey";
            columns: ["opportunity_id"];
            isOneToOne: false;
            referencedRelation: "opportunities";
            referencedColumns: ["id"];
          },
        ];
      };
      performances: {
        Row: Performance;
        Insert: PerformanceInsert;
        Update: PerformanceUpdate;
        Relationships: [
          {
            foreignKeyName: "performances_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      public_profiles: {
        Row: PublicProfile;
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
