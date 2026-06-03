@echo off 
title OptiCut API Backend 
call conda activate opticut_pro 
echo Backend en cours d'execution... 
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload 
