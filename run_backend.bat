@echo off 
title OptiCut Pro Server (Port 8000) 
cd /d "C:\Users\Mathe\Documents\Matheo\passion\logiciel\logiciel_V6\Moteur\Backend\System\Bin" 
echo ============================================================ 
echo   OPTICUT PRO - SERVEUR APPLICATION (Port 8000) 
echo ============================================================ 
"C:\Users\Mathe\anaconda3\envs\opticut_pro\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 
