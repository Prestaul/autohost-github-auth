## GitHub auth provider for Autohost

### config

```javascript
{
  "auth": {
    "sessionMessages": false, // true to add login failure messages to session
    "loginEndpoint": "/auth/login", // this is the public endpoint for your login page
    "authEndpoint": "/auth/github", // this is the route that will kickoff the authentication against GitHub
    "github": {
        "organization": "ORG-NAME", // optionally add to require org membership
        "clientId": "YOUR_CLIENT_ID_HERE",
        "clientSecret": "YOUR_CLIENT_SECRET_HERE",
        "callbackUrl": "http://localhost:3000/auth/github/callback" // this is the route the GitHub will request after authentication
    }
  }
}
```
