# nodejs-http-proxy

```powershell

Set-Item Env:HTTP_PROXY corporate.proxy.com:8080 # if you need a forward proxy

node index.js

@"
{
  "motd": "Eat more cookies!"
}`n
"@ |
Invoke-WebRequest http://localhost:8080/verbose-echo -ContentType "application/json" -Method Post -UseBasicParsing |
Select-Object -ExpandProperty RawContent

Invoke-WebRequest http://localhost:8080/proxy-rewrite -UseBasicParsing |
Select-Object -ExpandProperty RawContent

```
