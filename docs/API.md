# API Documentation

## Authentication
Provide details on how to authenticate requests, including the required headers, authentication method, and any relevant tokens.

## Endpoints

### Sessions
- **GET /api/sessions**
  - Description: Retrieve active sessions.
  - Request Example:
    ```json
    {
      "token": "your_auth_token"
    }
    ```
  - Response Example:
    ```json
    [
      {
        "id": "123",
        "user": "example_user",
        "status": "active"
      }
    ]
    ```

### Observations
- **POST /api/observations**
  - Description: Create a new observation.
  - Request Example:
    ```json
    {
      "session_id": "123",
      "data": "example_data"
    }
    ```
  - Response Example:
    ```json
    {
      "status": "success",
      "id": "456"
    }
    ```

### Shorts
- **GET /api/shorts**
  - Description: Fetch short items.
  - Response Example:
    ```json
    [
      {
        "id": "789",
        "title": "Example Short"
      }
    ]
    ```

### Reports
- **GET /api/reports**
  - Description: Generate reports based on observations.
  - Response Example:
    ```json
    {
      "status": "success",
      "report": {
        "id": "101112",
        "summary": "Report summary"
      }
    }
    ```

### GOV.BR Signature
- **POST /api/govbr/signature**
  - Description: Verify GOV.BR signatures.
  - Request Example:
    ```json
    {
      "data": "example_signature_data"
    }
    ```
  - Response Example:
    ```json
    {
      "status": "verified"
    }
    ```

## Error Codes
List common error codes that can be returned by the API, along with their meanings.

## Rate Limiting
Explain any rate limits imposed by the API and how they can impact users.

## Webhook Documentation
Describe the setup and example payloads for webhooks.
