@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
title Gerenciador do App Financas Android
color 0B

:MENU
cls
echo ==============================================================================
echo                      GERENCIADOR DO APP FINANCAS ANDROID
echo ==============================================================================
echo.
echo  [1] Iniciar Servidor (Abrir no Celular via Expo Go)
echo  [2] Iniciar com Limpeza de Cache (Reset Metro Cache)
echo  [3] Checar Erros de Codigo (TypeScript Check)
echo  [4] Gerar APK Instalavel (EAS Build na Nuvem)
echo  [5] Enviar Alteracoes para o GitHub (Apenas quando voce quiser)
echo  [6] Reinstalar / Atualizar Dependencias (npm install)
echo  [7] Verificar Login no Expo (EAS Build)
echo  [8] Testar Conexao com Supabase (Banco de Dados)
echo  [0] Sair
echo.
echo ==============================================================================
set "OPCAO="
set /p OPCAO="Escolha uma opcao [0-8]: "

if "%OPCAO%"=="1" goto INICIAR_APP
if "%OPCAO%"=="2" goto INICIAR_CACHE
if "%OPCAO%"=="3" goto CHECAR_TYPESCRIPT
if "%OPCAO%"=="4" goto GERAR_APK
if "%OPCAO%"=="5" goto PUSH_GITHUB
if "%OPCAO%"=="6" goto INSTALAR_DEPS
if "%OPCAO%"=="7" goto EAS_STATUS
if "%OPCAO%"=="8" goto TESTAR_SUPABASE
if "%OPCAO%"=="0" goto SAIR

echo.
echo Opcao invalida! Pressione qualquer tecla para tentar novamente.
pause > nul
goto MENU

:INICIAR_APP
cls
echo [INFO] Iniciando servidor Expo...
echo [DICA] Aponte a camera do celular para o QR Code abaixo!
echo.
call npx expo start
goto MENU

:INICIAR_CACHE
cls
echo [INFO] Limpando cache do Metro e iniciando servidor...
echo.
call npx expo start --clear
goto MENU

:CHECAR_TYPESCRIPT
cls
echo [INFO] Verificando erros no TypeScript...
echo.
call npx tsc --noEmit
if %errorlevel% equ 0 (
    echo.
    echo [SUCESSO] Zero erros no codigo TypeScript!
) else (
    echo.
    echo [AVISO] Revise os erros acima.
)
echo.
pause
goto MENU

:GERAR_APK
cls
echo ==============================================================================
echo                       GERADOR DE APK (EAS BUILD NA NUVEM)
echo ==============================================================================
echo [INFO] O build sera feito na nuvem da Expo sem gastar memoria do seu PC.
echo.
set /p CONFIRMA="Deseja iniciar a geracao do APK agora? (S/N): "
if /i not "%CONFIRMA%"=="S" goto MENU

echo.
echo [INFO] Enviando projeto para a nuvem da Expo...
call npx eas build -p android --profile preview
echo.
pause
goto MENU

:PUSH_GITHUB
cls
echo ==============================================================================
echo                       ENVIAR PARA O GITHUB
echo ==============================================================================
echo.
set /p CONFIRMA_GIT="Deseja realmente enviar as alteracoes agora para o GitHub? (S/N): "
if /i not "%CONFIRMA_GIT%"=="S" goto MENU

set /p MSG_COMMIT="Digite a mensagem do commit (ou ENTER para padrao): "
if "%MSG_COMMIT%"=="" set MSG_COMMIT=update: melhorias no app

echo.
echo [1/3] Adicionando arquivos...
call git add .

echo [2/3] Criando commit...
call git commit -m "%MSG_COMMIT%"

echo [3/3] Enviando para o GitHub...
call git push origin main

echo.
echo [SUCESSO] Atualizacao enviada para o GitHub!
echo.
pause
goto MENU

:INSTALAR_DEPS
cls
echo [INFO] Instalando pacotes npm...
echo.
call npm install
echo.
echo [SUCESSO] Dependencias instaladas!
echo.
pause
goto MENU

:EAS_STATUS
cls
echo ==============================================================================
echo                       STATUS DA CONTA EXPO
echo ==============================================================================
echo.
call npx eas whoami
echo.
set /p RELOGIN="Deseja fazer login novamente? (S/N): "
if /i "%RELOGIN%"=="S" (
    call npx eas login
)
goto MENU

:TESTAR_SUPABASE
cls
echo [INFO] Testando conexao com Supabase...
echo.
node -e "const { createClient } = require('@supabase/supabase-js'); const c = createClient('https://uxflydckwwegjocrgbnl.supabase.co', 'sb_publishable_50BZoDF0Zswkz45RoMFKwg_AVORtMXE'); c.from('workspaces').select('id').limit(1).then(r => { if(r.error) { console.log('Erro:', r.error.message); } else { console.log('Conexao OK com Supabase! Status 200.'); } }).catch(e => console.log('Falha:', e));"
echo.
pause
goto MENU

:SAIR
cls
echo Ate logo!
timeout /t 1 > nul
exit
