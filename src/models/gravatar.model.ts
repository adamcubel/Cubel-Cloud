export interface GravatarProfile {
  hash: string;
  display_name: string;
  profile_url: string;
  avatar_url: string;
  avatar_alt_text: string;
  location: string;
  description: string;
  job_title: string;
  company: string;
  verified_accounts: GravatarVerifiedAccount[];
  pronunciation: string;
  pronouns: string;
  timezone: string;
  languages: string[];
}

export interface GravatarVerifiedAccount {
  service_type: string;
  service_label: string;
  service_icon: string;
  url: string;
}

export interface GravatarConfig {
  apiKey: string;
  enableLogging?: boolean;
}
