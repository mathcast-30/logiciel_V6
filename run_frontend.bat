@echo off 
title OptiCut Pro Frontend (Dev) 
cd /d "C:\Users\Mathe\Documents\Matheo\passion\logiciel\logiciel_V6\Moteur\\Frontend" 
if not exist "node_modules" ( npm install ) 
start "" /B npm run dev 
