@echo off
rem ------------------------------------------------------------
rem OptiCut Pro environment setup script
rem ------------------------------------------------------------

:: Define the conda environment name
set "ENV_NAME=opticut_pro"

:: Locate the conda executable (fallback to typical locations)
if defined CONDA_EXE (
    set "CONDA_CMD=%CONDA_EXE%"
) else (
    if exist "%USERPROFILE%\anaconda3\Scripts\conda.exe" (
        set "CONDA_CMD=%USERPROFILE%\anaconda3\Scripts\conda.exe"
    ) else if exist "%USERPROFILE%\miniconda3\Scripts\conda.exe" (
        set "CONDA_CMD=%USERPROFILE%\miniconda3\Scripts\conda.exe"
    ) else (
        echo [ERROR] Conda executable not found. Please ensure Anaconda/Miniconda is installed and added to PATH.
        pause
        exit /b 1
    )
)

:: Check if the environment already exists
%CONDA_CMD% env list | findstr /I "%ENV_NAME%" >nul
if errorlevel 1 (
    echo Creating conda environment "%ENV_NAME%" with Python 3.11...
    %CONDA_CMD% create -y -n %ENV_NAME% python=3.11
) else (
    echo Conda environment "%ENV_NAME%" already exists.
)

:: Activate the environment and install Python dependencies
call %CONDA_CMD% activate %ENV_NAME%
if errorlevel 1 (
    echo [ERROR] Failed to activate conda environment "%ENV_NAME%".
    pause
    exit /b 1
)

rem Determine the project root (directory of this script's parent three levels up)
set "PROJECT_ROOT=%~dp0"

rem Install Python dependencies
if exist "%PROJECT_ROOT%Moteur\Backend\System\Bin\requirements.txt" (
    echo Installing Python dependencies from requirements.txt...
    pip install --upgrade pip
    pip install -r "%PROJECT_ROOT%Moteur\Backend\System\Bin\requirements.txt"
) else (
    echo [WARNING] requirements.txt not found at expected location.
)

rem Install Node (frontend) dependencies
if exist "%PROJECT_ROOT%Moteur\Frontend" (
    pushd "%PROJECT_ROOT%Moteur\Frontend"
    echo Installing Node dependencies (npm install)...
    npm install
    popd
) else (
    echo [WARNING] Frontend directory not found.
)

echo Setup completed successfully.
pause
