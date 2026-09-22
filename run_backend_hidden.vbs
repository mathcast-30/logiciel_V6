Set sh = CreateObject("WScript.Shell")
sh.Run "cmd /c cd /d ""C:\Users\Mathe\Documents\Matheo\passion\logiciel\logiciel_V6\Moteur\Backend\System\Bin"" && ""C:\Users\Mathe\anaconda3\envs\opticut_pro\python.exe"" -m uvicorn app.main:app --host 0.0.0.0 --port 8000", 0, False
