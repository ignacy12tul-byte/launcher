Unicode true
!include "MUI2.nsh"
Name "minverse.pl"
OutFile "../dist/Instalator.exe"
InstallDir "$LOCALAPPDATA\Programs\minverse.pl"
RequestExecutionLevel user
ShowInstDetails show
!define MUI_ABORTWARNING
!define MUI_WELCOMEPAGE_TITLE "Witaj w minverse.pl"
!define MUI_WELCOMEPAGE_TEXT "Instalator pobierze aktualny Launcher.exe z oficjalnych wydan GitHub i sprawdzi SHA256. Wymagane polaczenie z internetem. Minecraft wymaga odpowiedniej wersji Java 64-bit."
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\Launcher.exe"
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Polish"
Section "Launcher"
  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  File "download.ps1"
  DetailPrint "Pobieranie Launcher.exe z GitHub Releases..."
  nsExec::ExecToStack '"$SYSDIR\WindowsPowerShell\v1.0\powershell.exe" -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "$PLUGINSDIR\download.ps1" "$INSTDIR"'
  Pop $0
  Pop $1
  DetailPrint "$1"
  StrCmp $0 "0" success
  MessageBox MB_ICONSTOP "Nie udalo sie pobrac launchera. Sprawdz internet, dostepnosc wydania GitHub oraz czy launcher jest zamkniety.$\r$\n$1"
  SetErrorLevel 1
  Abort
success:
  SetOutPath "$INSTDIR"
  WriteUninstaller "$INSTDIR\Odinstaluj.exe"
  CreateShortcut "$DESKTOP\minverse.pl.lnk" "$INSTDIR\Launcher.exe"
  CreateDirectory "$SMPROGRAMS\minverse.pl"
  CreateShortcut "$SMPROGRAMS\minverse.pl\minverse.pl.lnk" "$INSTDIR\Launcher.exe"
  CreateShortcut "$SMPROGRAMS\minverse.pl\Odinstaluj.lnk" "$INSTDIR\Odinstaluj.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\minverse.pl" "DisplayName" "minverse.pl"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\minverse.pl" "UninstallString" '$\"$INSTDIR\Odinstaluj.exe$\"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\minverse.pl" "DisplayVersion" "1.0.0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\minverse.pl" "Publisher" "minverse.pl"
SectionEnd
Section "Uninstall"
  Delete "$INSTDIR\Launcher.exe"
  Delete "$INSTDIR\Odinstaluj.exe"
  Delete "$DESKTOP\minverse.pl.lnk"
  Delete "$SMPROGRAMS\minverse.pl\minverse.pl.lnk"
  Delete "$SMPROGRAMS\minverse.pl\Odinstaluj.lnk"
  RMDir "$SMPROGRAMS\minverse.pl"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\minverse.pl"
SectionEnd
