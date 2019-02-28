# nodejs-http-proxy

```powershell

Set-Item Env:HTTP_PROXY proxy.example.com:8080

node index.js

Invoke-WebRequest http://localhost:8080/echo -Body "Hello, World!" -Method Post -UseBasicParsing
Invoke-WebRequest http://localhost:8080/simple-proxy -UseBasicParsing
Invoke-WebRequest http://localhost:8080/rewrite-proxy -UseBasicParsing

```
