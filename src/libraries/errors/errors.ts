export class CapturedError extends Error {}
export class SpotifyApiCapturedError extends Error {}
// status: 429
export class SpotifyApiTooManyRequestsError extends SpotifyApiCapturedError {}
// status: 400 error: invalid_grant
export class SpotifyApiRefreshTokenRevokedError extends SpotifyApiCapturedError {}
// status: 401
export class SpotifyApiAccessTokenExpiredError extends SpotifyApiCapturedError {}
// status: 500
export class SpotifyApiInternalServerErrorError extends SpotifyApiCapturedError {}
// status: 502
export class SpotifyApiBadGatewayError extends SpotifyApiCapturedError {}
// status: 503
export class SpotifyApiServiceUnavailableError extends SpotifyApiCapturedError {}
// status: 504
export class SpotifyApiGatewayTimeoutError extends SpotifyApiCapturedError {}
