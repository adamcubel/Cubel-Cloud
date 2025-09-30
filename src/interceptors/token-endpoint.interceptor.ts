import { HttpInterceptorFn } from '@angular/common/http';

/**
 * HTTP Interceptor to redirect OIDC token endpoint requests to our backend
 * This keeps the client secret secure by handling token exchange on the server
 */
export const tokenEndpointInterceptor: HttpInterceptorFn = (req, next) => {
  // Check if this is a request to the Keycloak token endpoint
  if (req.url.includes('/protocol/openid-connect/token')) {
    console.log('[TokenInterceptor] Intercepting token request to:', req.url);

    // Redirect to our backend token endpoint
    const backendTokenUrl = `${window.location.origin}/api/oidc/token`;

    const modifiedReq = req.clone({
      url: backendTokenUrl
    });

    console.log('[TokenInterceptor] Redirected to:', backendTokenUrl);

    return next(modifiedReq);
  }

  // Pass through all other requests
  return next(req);
};