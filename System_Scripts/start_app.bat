@echo off
echo Starting OptiCut Pro V4 with C++ Engine
echo.

REM Optional Conda Init (if conda is needed)
call conda activate base 2>nul
REM Make sure we have pybind11
python -m pip install pybind11 --quiet

cd Moteur\Backend

echo Compiling C++ Raw Wood Engine (requires a C++ compiler in your PATH)...
python setup.py build_ext --inplace

echo.
echo Starting Backend Server...
set PYTHONPATH=%cd%;%PYTHONPATH%
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

pause
