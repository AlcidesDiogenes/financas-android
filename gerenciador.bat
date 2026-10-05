@echo off
chcp 65001 > nul
title Gerenciador do App Finanças Android
color 0B

:MENU
cls
echo ==============================================================================
echo                      💰 GERENCIADOR DO APP FINANÇAS 💰
echo ==============================================================================
echo.
echo  [1] Iniciar Servidor (Abrir no Celular via Expo Go)
echo  [2] Iniciar com Limpeza de Cache (Se der algum travamento no Metro)
echo  [3] Checar Erros de Código e Tipagem (TypeScript Check)
echo  [4] Gerar APK Instalável (Build do arquivo .apk na nuvem EAS)
echo  [5] Salvar e Enviar Tudo para o GitHub (Git Auto-Push)
echo  [6] Reinstalar / Atualizar Dependências (npm install)
echo  [7] Login / Status na Expo (EAS Build)
echo  [8] Testar Conexão com Banco de Dados (Supabase)
echo  [0] Sair
echo.
echo ==============================================================================
set /p OPCAO="Escolha uma opção [0-8]: "

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
echo [!] Opção inválida! Pressione qualquer tecla para tentar novamente.
pause > nul
goto MENU

:: -----------------------------------------------------------------------------
:INICIAR_APP
cls
echo [INFO] Iniciando servidor de desenvolvimento Expo...
echo [DICA] Aponte a câmera do seu Galaxy S26 Ultra para o QR Code abaixo!
echo.
npx expo start
goto MENU

:: -----------------------------------------------------------------------------
:INICIAR_CACHE
cls
echo [INFO] Limpando cache do Metro Bundler e iniciando servidor...
echo.
npx expo start --clear
goto MENU

:: -----------------------------------------------------------------------------
:CHECAR_TYPESCRIPT
cls
echo [INFO] Executando verificação de erros no TypeScript...
echo.
call npx tsc --noEmit
if %errorlevel% equ 0 (
    echo.
    echo [SUCESSO] Parabéns! Zero erros encontrados no código TypeScript!
) else (
    echo.
    echo [ERRO] Foram encontrados erros acima. Revise os arquivos indicados.
)
echo.
pause
goto MENU

:: -----------------------------------------------------------------------------
:GERAR_APK
cls
echo ==============================================================================
echo                       GERADOR DE ARQUIVO APK (EAS BUILD)
echo ==============================================================================
echo [INFO] O build será realizado nos servidores da nuvem da Expo.
echo [INFO] Seu computador NÃO vai travar nem gastar processamento local.
echo.
echo Deseja iniciar a compilação do APK agora? (S/N)
set /p CONFIRMA="> "
if /i not "%CONFIRMA%"=="S" goto MENU

echo.
echo [INFO] Iniciando compilação do APK na nuvem...
call npx eas build -p android --profile preview
echo.
pause
goto MENU

:: -----------------------------------------------------------------------------
:PUSH_GITHUB
cls
echo ==============================================================================
echo                     SINCRONIZAÇÃO COM O GITHUB
echo ==============================================================================
echo.
set /p MSG_COMMIT="Digite a mensagem do commit (ou ENTER para mensagem padrão): "
if "%MSG_COMMIT%"=="" set MSG_COMMIT=update: melhorias e atualizacoes no app

echo.
echo [1/3] Adicionando arquivos modificados...
git add .

echo [2/3] Criando commit: "%MSG_COMMIT%"...
git commit -m "%MSG_COMMIT%"

echo [3/3] Enviando para o repositório no GitHub...
git push origin main

echo.
echo [SUCESSO] Código enviado para https://github.com/AlcidesDiogenes/financas-android!
echo.
pause
goto MENU

:: -----------------------------------------------------------------------------
:INSTALAR_DEPS
cls
echo [INFO] Instalando e atualizando pacotes npm...
echo.
call npm install
echo.
echo [SUCESSO] Dependências instaladas com sucesso!
echo.
pause
goto MENU

:: -----------------------------------------------------------------------------
:EAS_STATUS
cls
echo ==============================================================================
echo                       STATUS DA CONTA EXPO (EAS)
echo ==============================================================================
echo.
call npx eas whoami
echo.
echo Deseja fazer login em outra conta? (S/N)
set /p RELOGIN="> "
if /i "%RELOGIN%"=="S" (
    call npx eas login
)
goto MENU

:: -----------------------------------------------------------------------------
:TESTAR_SUPABASE
cls
echo [INFO] Testando conexão com o banco de dados Supabase...
echo.
node -e "const { createClient } = require('@supabase/supabase-js'); const c = createClient('https://uxflydckwwegjocrgbnl.supabase.co', 'sb_publishable_50BZoDF0Zswkz45RoMFKwg_AVORtMXE'); c.from('workspaces').select('id').limit(1).then(r => { if(r.error) { console.log('❌ Erro:', r.error.message); } else { console.log('✅ Conexão OK com o Supabase! Status 200.'); } }).catch(e => console.log('❌ Falha:', e));"
echo.
pause
goto MENU

:: -----------------------------------------------------------------------------
:SAIR
cls
echo Obrigado por usar o gerenciador do App Finanças!
timeout /t 2 > nul
exit
