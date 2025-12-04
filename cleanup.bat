@echo off
echo ========================================
echo PPE Compliance System - Cleanup Script
echo ========================================
echo.
echo This will delete unused files from the project.
echo Press Ctrl+C to cancel, or
pause

echo.
echo Starting cleanup...
echo.

REM Backend - Root Directory Scripts
echo Deleting backend test/migration scripts...
del /f "backend\add_deletion_pin.py" 2>nul
del /f "backend\add_worker_id_fields.py" 2>nul
del /f "backend\check_database.py" 2>nul
del /f "backend\delete_all_alerts.py" 2>nul
del /f "backend\migrate_add_archived_fields.py" 2>nul
del /f "backend\migrate_add_logo_url.py" 2>nul
del /f "backend\reset_database.py" 2>nul
del /f "backend\reset_database_v2.py" 2>nul
del /f "backend\run.py" 2>nul
del /f "backend\test_camera_simple.py" 2>nul
del /f "backend\test_camera_stream.py" 2>nul
del /f "backend\test_email.py" 2>nul
del /f "backend\test_gpu.py" 2>nul

REM Backend - Unused API Routes
echo Deleting unused API routes...
del /f "backend\app\api\routes\incidents.py" 2>nul
del /f "backend\app\api\routes\near_miss.py" 2>nul
del /f "backend\app\api\routes\notifications.py" 2>nul
del /f "backend\app\api\routes\recordings.py" 2>nul
del /f "backend\app\api\routes\reports.py" 2>nul

REM Backend - Unused Models
echo Deleting unused models...
del /f "backend\app\models\incident.py" 2>nul
del /f "backend\app\models\near_miss.py" 2>nul
del /f "backend\app\models\push_notification.py" 2>nul
del /f "backend\app\models\recording.py" 2>nul
del /f "backend\app\models\report.py" 2>nul

REM Backend - Unused Services
echo Deleting unused services...
del /f "backend\app\services\detector.py" 2>nul
del /f "backend\app\services\push_notification_service.py" 2>nul

REM Backend - Unused Core Files
echo Deleting unused core files...
del /f "backend\app\core\exceptions.py" 2>nul
del /f "backend\app\core\validation.py" 2>nul

REM Documentation - Keep only README.md and DEPLOYMENT.md
echo Deleting outdated documentation...
del /f "documentation\ALL_FIXES_COMPLETE.md" 2>nul
del /f "documentation\CPU_GPU_FALLBACK_GUIDE.md" 2>nul
del /f "documentation\CRITICAL_FIXES_SUMMARY.md" 2>nul
del /f "documentation\CURRENT_STATUS.md" 2>nul
del /f "documentation\DEPLOYMENT_GUIDE.md" 2>nul
del /f "documentation\FEATURE_RECOMMENDATIONS.md" 2>nul
del /f "documentation\FIXES_COMPLETE_SUMMARY.md" 2>nul
del /f "documentation\GPU_SETUP_SUMMARY.md" 2>nul
del /f "documentation\HIGH_PRIORITY_FIXES_SUMMARY.md" 2>nul
del /f "documentation\INSTALLATION_CHECKLIST.md" 2>nul
del /f "documentation\MIGRATION_GUIDE.md" 2>nul
del /f "documentation\MODEL_SETUP_INSTRUCTIONS.md" 2>nul
del /f "documentation\MODEL_SUCCESS_REPORT.md" 2>nul
del /f "documentation\PHASE1_COMPLETION_GUIDE.md" 2>nul
del /f "documentation\PHASE1_PROGRESS.md" 2>nul
del /f "documentation\PROJECT_DOCUMENTATION.md" 2>nul
del /f "documentation\PROJECT_SUMMARY.md" 2>nul
del /f "documentation\QUICK_START.md" 2>nul
del /f "documentation\QUICKSTART.md" 2>nul
del /f "documentation\SETUP_CHECKLIST.md" 2>nul
del /f "documentation\START_HERE.md" 2>nul
del /f "documentation\STATUS_AND_NEXT_STEPS.md" 2>nul
del /f "documentation\STEP_7_SYSTEM_TEST_REPORT.md" 2>nul
del /f "documentation\SYSTEM_AUDIT_REPORT.md" 2>nul
del /f "documentation\WEBCAM_STUCK_FIX.md" 2>nul
del /f "documentation\WEBSOCKET_FIX_APPLIED.md" 2>nul

REM Remove empty documentation folder if all files deleted
rmdir "documentation" 2>nul

REM Frontend - Unused Pages
echo Deleting unused frontend pages...
del /f "frontend\src\app\safety-manager\incidents\page.tsx" 2>nul
rmdir "frontend\src\app\safety-manager\incidents" 2>nul
del /f "frontend\src\app\safety-manager\reports\page.tsx" 2>nul
rmdir "frontend\src\app\safety-manager\reports" 2>nul

echo.
echo ========================================
echo Cleanup Complete!
echo ========================================
echo.
echo Deleted:
echo - 13 backend test/migration scripts
echo - 5 unused API routes
echo - 5 unused models
echo - 2 unused services
echo - 2 unused core files
echo - 27 documentation files
echo - 2 unused frontend pages
echo.
echo Next steps:
echo 1. Review changes with: git status
echo 2. Test the application
echo 3. Commit changes if everything works
echo.
pause
