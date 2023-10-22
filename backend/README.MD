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