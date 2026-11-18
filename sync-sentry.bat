
@echo off
setlocal EnableExtensions
title SENETRY V9.2 - GitHub Automatic Sync

REM ==========================================
REM SENETRY V9.2 SMART GITHUB SYNC
REM ==========================================

cd /d "%~dp0"

set "EXPECTED_REMOTE=https://github.com/aj233566/Project-Deployment.git"
set "BRANCH=main"

echo.
echo ==========================================
echo       SENETRY V9.2 GITHUB SYNC
echo ==========================================
echo.

REM Verify repository
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 goto NOT_REPO

for /f "delims=" %%R in ('git rev-parse --show-toplevel') do set "REPO_ROOT=%%R"

for %%I in ("%CD%") do set "CURRENT_DIR=%%~fI"
for %%I in ("%REPO_ROOT%") do set "REPO_ROOT=%%~fI"

if /I not "%CURRENT_DIR%"=="%REPO_ROOT%" goto WRONG_ROOT

REM Verify remote
for /f "delims=" %%R in ('git remote get-url origin 2^>nul') do set "REMOTE_URL=%%R"

if not defined REMOTE_URL goto NO_REMOTE
if /I not "%REMOTE_URL%"=="%EXPECTED_REMOTE%" goto WRONG_REMOTE

REM Verify branch
for /f "delims=" %%B in ('git branch --show-current') do set "CURRENT_BRANCH=%%B"

if /I not "%CURRENT_BRANCH%"=="%BRANCH%" goto WRONG_BRANCH

echo Project: SENETRY V9.2
echo Repository: %REMOTE_URL%
echo Branch: %BRANCH%
echo.

REM Check common environment files
for %%F in (".env" "backend\.env" "frontend\.env") do (
    if exist "%%~F" (
        git check-ignore -q "%%~F"
        if errorlevel 1 goto ENV_ERROR
    )
)

REM Stage changes
echo [1/5] Staging changes...

git add -A
if errorlevel 1 goto STAGE_ERROR

REM Commit only if there are staged changes
git diff --cached --quiet
if errorlevel 2 goto STAGE_ERROR
if errorlevel 1 goto MAKE_COMMIT

echo No new files to commit.
goto FETCH

:MAKE_COMMIT
echo.
echo Creating commit...

git commit -m "Update SENETRY V9.2"
if errorlevel 1 goto COMMIT_ERROR

:FETCH
REM Fetch latest GitHub history
echo.
echo [2/5] Fetching GitHub changes...

git fetch origin main
if errorlevel 1 goto FETCH_ERROR

git show-ref --verify --quiet refs/remotes/origin/main
if errorlevel 1 goto REMOTE_BRANCH_ERROR

REM Ensure histories share an ancestor
git merge-base HEAD origin/main >nul 2>&1
if errorlevel 1 goto UNRELATED_HISTORY

REM Backup local commits before rebasing, if any
for /f %%C in ('git rev-list --count origin/main..HEAD') do set "LOCAL_AHEAD=%%C"

if not "%LOCAL_AHEAD%"=="0" (
    set "BACKUP_BRANCH=backup-before-sync-%RANDOM%-%RANDOM%"
    call git branch %BACKUP_BRANCH%
    if errorlevel 1 goto BACKUP_ERROR
)

REM Rebase on the latest remote history
echo.
echo [3/5] Synchronizing changes...

git rebase origin/main
if errorlevel 1 goto REBASE_ERROR

REM First push attempt
echo.
echo [4/5] Uploading to GitHub...

git push -u origin main
if errorlevel 1 goto RETRY_PUSH

goto SUCCESS

:RETRY_PUSH
echo.
echo Remote changed during upload.
echo Fetching latest changes and retrying...

git fetch origin main
if errorlevel 1 goto FETCH_ERROR

git rebase origin/main
if errorlevel 1 goto REBASE_ERROR

git push -u origin main
if errorlevel 1 goto PUSH_ERROR

goto SUCCESS

:SUCCESS
echo.
echo [5/5] Verifying synchronization...
git status --short --branch

echo.
echo ==========================================
echo       SUCCESS - GITHUB UPDATED
echo ==========================================
echo.
echo GitHub Actions can now start your CI/CD.
goto END

:NOT_REPO
echo ERROR: This folder is not a Git repository.
goto END

:WRONG_ROOT
echo ERROR: BAT file is not in the Git root.
goto END

:NO_REMOTE
echo ERROR: GitHub remote origin is missing.
goto END

:WRONG_REMOTE
echo ERROR: Unexpected GitHub repository.
echo Found: %REMOTE_URL%
goto END

:WRONG_BRANCH
echo ERROR: Current branch is not main.
echo Found: %CURRENT_BRANCH%
goto END

:ENV_ERROR
echo ERROR: A local .env file is not ignored.
echo Check your .gitignore before uploading.
goto END

:STAGE_ERROR
echo ERROR: Could not stage project changes.
goto END

:COMMIT_ERROR
echo ERROR: Commit failed.
goto END

:FETCH_ERROR
echo ERROR: Could not fetch GitHub.
goto END

:REMOTE_BRANCH_ERROR
echo ERROR: Remote main branch does not exist.
goto END

:UNRELATED_HISTORY
echo ERROR: Local and remote histories are unrelated.
echo Do not force-push. Histories need reconciliation.
goto END

:BACKUP_ERROR
echo ERROR: Could not create backup branch.
goto END

:REBASE_ERROR
echo.
echo ERROR: Rebase conflict detected.
echo Aborting rebase to preserve your local commit.
git rebase --abort >nul 2>&1
echo Resolve the conflicts before trying again.
goto END

:PUSH_ERROR
echo ERROR: Push failed after retry.
echo Check GitHub permissions and branch protection.
goto END

:END
echo.
echo ==========================================
pause
endlocal
