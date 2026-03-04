# API Documentation

## Overview
This document provides complete API documentation for the Neuroverso platform, covering all key areas:
- Sessions
- Observations
- Shorts
- Reports
- Signature
- Webhooks
- Authentication

### Table of Contents
1. [Sessions](#sessions)
2. [Observations](#observations)
3. [Shorts](#shorts)
4. [Reports](#reports)
5. [Signature](#signature)
6. [Webhooks](#webhooks)
7. [Authentication](#authentication)
8. [Error Codes](#error-codes)
9. [Rate Limiting](#rate-limiting)

## Sessions
### Endpoint
```
POST /api/sessions
```
### Request Example
```json
{
  "username": "string",
  "password": "string"
}
```
### Response Example
```json
{
  "sessionId": "abc123",
  "expires": "2026-03-05T20:19:00Z"
}
```

## Observations
### Endpoint
```
GET /api/observations
```
### Response Example
```json
[
  { "id": 1, "value": "string", "timestamp": "2026-03-04T20:19:00Z" },
  { "id": 2, "value": "string", "timestamp": "2026-03-04T20:19:00Z" }
]
```

## Shorts
### Endpoint
```
POST /api/shorts
```
### Request Example
```json
{
  "title": "string",
  "description": "string"
}
```
### Response Example
```json
{
  "shortId": "xyz456",
  "createdAt": "2026-03-04T20:19:00Z"
}
```

## Reports
### Endpoint
```
GET /api/reports
```
### Response Example
```json
[
  { "reportId": 1, "status": "completed" },
  { "reportId": 2, "status": "pending" }
]
```

## Signature
### Endpoint
```
POST /api/signature
```
### Request Example
```json
{
  "documentId": "string",
  "signature": "base64string"
}
```
### Response Example
```json
{
  "signatureId": "sig789",
  "status": "successful"
}
```

## Webhooks
### Endpoint
```
POST /api/webhooks
```
### Request Example
```json
{
  "event": "string",
  "data": {}  
}
```
### Response Example
```json
{
  "status": "received"
}
```

## Authentication
### Endpoint
```
POST /api/auth
```
### Request Example
```json
{
  "apiKey": "string"
}
```
### Response Example
```json
{
  "userId": "user123",
  "accessToken": "tokenABC"
}
```

## Error Codes
### Common Error Codes
| Code | Message               |
|------|-----------------------|
| 400  | Bad Request            |
| 401  | Unauthorized          |
| 404  | Not Found             |
| 500  | Internal Server Error  |

## Rate Limiting
- Maximum requests per minute: 100
- Exceeded requests will receive HTTP 429 status code.