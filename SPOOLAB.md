# Spoolab — Interface para impressoras Bambu Lab

O **Spoolab** é o frontend e a API que consomem a biblioteca [bambulabs_api](.) para gerenciar impressoras Bambu Lab pela interface.

## Arquitetura

- **Backend** (`cmd/spoolab/`): servidor HTTP em Go que usa a `bambulabs_api` para conectar às impressoras, persistir a lista em JSON e expor REST API.
- **Frontend** (`web/`): SPA em React + TypeScript + Tailwind que consome a API para adicionar impressoras, conectar/desconectar e ver dados em tempo quase real (temperaturas, estado, luzes, pause/resume/stop).

## Pré-requisitos

- **Go 1.23+** (para o backend)
- **Node.js 18+** e npm (para o frontend)

## Como rodar

### 1. Backend (API)

Na raiz do repositório:

```bash
go run ./cmd/spoolab
```

A API sobe em **http://localhost:8080**. A lista de impressoras é salva em:

- **Windows:** `%APPDATA%\spoolab\printers.json`
- **macOS/Linux:** `~/.config/spoolab/printers.json`

### 2. Frontend (UI)

Para exibir as fotos dos modelos nas impressoras, copie as imagens da pasta de assets para o frontend:

```bash
# Windows (PowerShell)
New-Item -ItemType Directory -Force -Path web\public\printers | Out-Null
Copy-Item assets\printers\* web\public\printers\ -Force
```

```bash
cd web
npm install
npm run dev
```

A interface sobe em **http://localhost:5173** e o Vite faz proxy de `/api` para o backend em `:8080`.

### 3. Uso

1. Preencha **IP**, **Código de acesso** e **Número de série** da impressora e clique em **Adicionar**.
2. Clique em **Conectar** na impressora desejada.
3. Clique no card da impressora para abrir o painel com temperaturas, progresso, luzes e controles de impressão (pausar, retomar, parar).

## Build para produção

- **Frontend:** `cd web && npm run build` → saída em `web/dist`.
- **Backend servindo o frontend:** defina `SPOOLAB_STATIC` com o caminho para `web/dist` e inicie o backend; ele passará a servir os arquivos estáticos e a API na mesma origem.

  Exemplo (Windows PowerShell):

  ```powershell
  $env:SPOOLAB_STATIC = "d:\Github\spoolab\web\dist"
  go run ./cmd/spoolab
  ```

  Acesse **http://localhost:8080** para a UI e **http://localhost:8080/api/...** para a API.

## API (resumo)

| Método   | Caminho                      | Descrição                |
|----------|------------------------------|--------------------------|
| GET      | `/api/printers`              | Lista impressoras        |
| POST     | `/api/printers`              | Adiciona impressora       |
| DELETE   | `/api/printers/{id}`         | Remove impressora        |
| POST     | `/api/printers/{id}/connect` | Conecta                  |
| POST     | `/api/printers/{id}/disconnect` | Desconecta            |
| GET      | `/api/printers/{id}/data`    | Dados ao vivo            |
| POST     | `/api/printers/{id}/light`   | Liga/desliga luz         |
| POST     | `/api/printers/{id}/pause`    | Pausa impressão          |
| POST     | `/api/printers/{id}/resume`  | Retoma impressão          |
| POST     | `/api/printers/{id}/stop`    | Para impressão            |

O `{id}` é o número de série da impressora.
