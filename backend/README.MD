to use cmd instead of sh in windows

CMD
```
set comspec=cmd.exe

```
or
```
$env:COMSPEC = "C:\Windows\System32\cmd.exe"
```

if you are using powershell

# Deploy

```
pm2 deploy ecosystem.config.js production

```

setup (already done)
```
pm2 deploy ecosystem.config.js production setup
```

output from successful setup
```
--> Deploying to production environment
--> on host 91.228.198.103
  ○ hook pre-setup
  ○ running setup
  ○ cloning git@github.com:iwoplaza/uni-web-gpu-racing-game.git
  ○ full fetch
Cloning into '/home/tmp1/web-gpu-project/source'...
  ○ hook post-setup
  ○ setup complete
--> Success
```