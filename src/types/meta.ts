export interface MetaActionValue {
  action_type: string;
  value: string;
}

/** Registro bruto retornado pelo endpoint /insights da Graph API */
export interface MetaInsightBruto {
  date_start: string;
  date_stop: string;
  account_id?: string;
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  inline_link_clicks?: string;
  cpm?: string;
  ctr?: string;
  cpc?: string;
  cpp?: string;
  frequency?: string;
  unique_clicks?: string;
  unique_ctr?: string;
  landing_page_views?: string;
  outbound_clicks?: MetaActionValue[];
  outbound_ctr?: MetaActionValue[];
  actions?: MetaActionValue[];
  cost_per_action_type?: MetaActionValue[];
  purchase_roas?: MetaActionValue[];
  video_thruplay_watched_actions?: MetaActionValue[];
  video_p25_watched_actions?: MetaActionValue[];
  video_p50_watched_actions?: MetaActionValue[];
  video_p75_watched_actions?: MetaActionValue[];
  video_p95_watched_actions?: MetaActionValue[];
  video_p100_watched_actions?: MetaActionValue[];
  video_avg_time_watched_actions?: MetaActionValue[];
  video_play_actions?: MetaActionValue[];
}

export interface MetaPaginadoResponse<T> {
  data: T[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
  };
  error?: MetaErro;
}

export interface MetaErro {
  message: string;
  type: string;
  code: number;
  fbtrace_id?: string;
}

export interface MetaCampanha {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
  objective?: string;
}

export interface MetaConjunto {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
  campaign_id: string;
}

export interface MetaAnuncio {
  id: string;
  name: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
  adset_id: string;
}
