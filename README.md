# Laya playground

Interfaz web mínima para probar [Laya](https://github.com/NandhaKishorM/laya), un motor de decisiones tipadas (`noul`, `choice`, `score`) que responde en un único forward pass. Corre en CPU.

- **Izquierda:** el estado a evaluar (texto libre o JSON) y los resultados.
- **Derecha:** las normas y restricciones como preguntas tipadas en JSON.
- Ejemplos precargados: filtro de spam (por defecto), triaje de soporte, moderación.

## Requisitos

- Python 3.10 o superior (probado con 3.14).
- ~2 GB de disco (torch CPU + checkpoint) y ~3 GB de RAM libres.
- Sin GPU. Se instala torch en versión CPU.

## Instalación

```bash
./setup.sh
```

Equivale a:

```bash
python3 -m venv .venv
.venv/bin/pip install --index-url https://download.pytorch.org/whl/cpu torch==2.14.0
.venv/bin/pip install -r requirements.txt
```

## Uso

```bash
./run.sh            # http://localhost:8000
PORT=9000 ./run.sh  # otro puerto
```

La primera vez descarga el checkpoint `convaiinnovations/laya` (subcarpeta `multilingual`, ~650 MB) a la caché de Hugging Face. La carga en CPU tarda alrededor de un minuto; la web muestra el estado en la cabecera.

Variables de entorno:

| Variable | Valor por defecto | Descripción |
|---|---|---|
| `LAYA_MODEL` | `convaiinnovations/laya` | Repo de Hugging Face |
| `LAYA_SUBFOLDER` | `multilingual` | Checkpoint. Vacío = inglés (ModernBERT-large, 421M). |
| `PORT` | `8000` | Puerto HTTP |

## API

- `GET /api/status` → estado de carga del modelo.
- `POST /api/predict` con `{"state": ..., "questions": {...}}` → respuesta de Laya más `latency_ms`.

Formato de las preguntas:

```json
{
  "es_spam":  {"type": "noul",   "instructions": "¿Es spam?"},
  "categoria": {"type": "choice", "instructions": "¿Qué tipo es?", "criteria": {"a": "…", "b": "…"}},
  "urgencia": {"type": "score",  "instructions": "¿Cuánta urgencia?", "criteria": ["ninguna", "algo", "mucha"]}
}
```

## Estructura

```
server.py        FastAPI: carga el modelo y expone /api/predict
static/          index.html + app.js (interfaz)
setup.sh         crea .venv e instala dependencias
run.sh           arranca uvicorn
requirements.txt
```
