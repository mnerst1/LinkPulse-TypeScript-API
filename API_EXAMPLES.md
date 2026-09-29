# LinkPulse API examples

## PowerShell: create a link

```powershell
$body = @{
    url = "https://example.com/article"
    customCode = "my-article"
    expiresInDays = 30
} | ConvertTo-Json

Invoke-RestMethod `
    -Method Post `
    -Uri "http://localhost:3000/api/links" `
    -ContentType "application/json" `
    -Body $body
```

## PowerShell: statistics

```powershell
Invoke-RestMethod "http://localhost:3000/api/links/my-article/stats"
```

## PowerShell: delete

```powershell
Invoke-RestMethod `
    -Method Delete `
    -Uri "http://localhost:3000/api/links/my-article" `
    -Headers @{ "X-Admin-Key" = "replace-with-a-long-secret" }
```

## curl: create

```bash
curl -X POST http://localhost:3000/api/links \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","customCode":"example"}'
```
