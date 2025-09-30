export interface OidcConfig {
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  responseType: string;
  scope: string;
  requireHttps: boolean;
  showDebugInformation: boolean;
  strictDiscoveryDocumentValidation: boolean;
  skipIssuerCheck: boolean;
  disablePKCE: boolean;
  clearHashAfterLogin: boolean;
  postLogoutRedirectUri?: string;
  customQueryParams?: Record<string, string>;
}

export interface OidcPublicConfig {
  issuer: string;
  clientId: string;
  redirectUri: string;
  responseType: string;
  scope: string;
  requireHttps: boolean;
  showDebugInformation: boolean;
  strictDiscoveryDocumentValidation: boolean;
  skipIssuerCheck: boolean;
  disablePKCE: boolean;
  clearHashAfterLogin: boolean;
  postLogoutRedirectUri?: string;
  customQueryParams?: Record<string, string>;
}