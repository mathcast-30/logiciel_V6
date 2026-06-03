' Script de creation de raccourci pour OptiCut Pro V4

Set objFSO = CreateObject("Scripting.FileSystemObject")
Set WshShell = CreateObject("WScript.Shell")

' Recuperer le dossier courant du script VBS (là où il se trouve)
strScriptPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
strBatPath = strScriptPath & "\START_OPTICUT.bat"

' Recuperer le chemin du Bureau de l'utilisateur
strDesktop = WshShell.SpecialFolders("Desktop")
strShortcutPath = strDesktop & "\OptiCut Pro V4.lnk"

' Verification de la presence du script .bat
If Not objFSO.FileExists(strBatPath) Then
    MsgBox "Le fichier cible " & strBatPath & " est introuvable." & vbCrLf & "Assurez-vous que ce script se trouve dans le même dossier que START_OPTICUT.bat.", vbCritical, "Erreur"
    WScript.Quit
End If

' Creation du raccourci
Set oShellLink = WshShell.CreateShortcut(strShortcutPath)
oShellLink.TargetPath = strBatPath
oShellLink.WorkingDirectory = strScriptPath
oShellLink.WindowStyle = 7 ' 7 correspond au lancement reduit (minimized)
oShellLink.IconLocation = "shell32.dll,22"
oShellLink.Description = "Lancer OptiCut Pro V4"
oShellLink.Save

' Message de confirmation en francais
MsgBox "Le raccourci 'OptiCut Pro V4' a été créé avec succès sur votre Bureau !" & vbCrLf & vbCrLf & "Vous pouvez maintenant lancer le logiciel en double-cliquant sur cette nouvelle icône.", vbInformation, "Installation terminée"
