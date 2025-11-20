import sys
import json
import os
from typing import Dict, Any

import joblib
import numpy as np

# ---------------------------------------------------------------------
# Configuración
# ---------------------------------------------------------------------

RISK_FEATURE_KEYS = [
    "committedEffort",
    "teamCapacity",
    "historicalVelocity",
    "missedStories",
    "teamChanges",
    "bugsOpen",
]


def get_model_path() -> str:
    """Ruta al modelo risk_model.joblib (mismo folder que este script)."""
    here = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(here, "risk_model.joblib")


MODEL = joblib.load(get_model_path())


# ---------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------
def build_feature_vector(features: Dict[str, Any]) -> np.ndarray:
    """
    Convierte el diccionario de features en un vector numpy 2D
    en el mismo orden definido en RISK_FEATURE_KEYS.
    """
    values = []
    for key in RISK_FEATURE_KEYS:
        if key not in features:
            raise ValueError(f"Falta la feature requerida: '{key}'")

        value = features[key]
        try:
            value = float(value)
        except (TypeError, ValueError):
            raise ValueError(f"Feature '{key}' debe ser numérica, valor recibido: {value!r}")

        values.append(value)

    return np.array([values], dtype=float)


def main() -> None:
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            raise ValueError("No se recibió entrada por stdin.")

        payload = json.loads(raw)
        if "features" not in payload:
            raise ValueError("JSON debe tener una propiedad 'features'.")

        features = payload["features"]
        if not isinstance(features, dict):
            raise ValueError("'features' debe ser un objeto JSON (dict).")

        X = build_feature_vector(features)

        # y son strings: "LOW", "MEDIUM", "HIGH" (como en tu reporte)
        y_pred = MODEL.predict(X)
        label = str(y_pred[0])

        if hasattr(MODEL, "predict_proba"):
            proba = MODEL.predict_proba(X)[0]
            classes = list(MODEL.classes_)
            # Buscar el índice de la clase predicha
            try:
                idx = classes.index(label)
            except ValueError:
                # fallback por si algo raro pasa
                idx = int(np.argmax(proba))
            confidence = float(proba[idx])
        else:
            confidence = 0.8  # valor fijo si no hay predict_proba

        result = {
            "label": label,          # "LOW" | "MEDIUM" | "HIGH"
            "confidence": confidence # probabilidad del label predicho
        }

        print(json.dumps(result))
    except Exception as e:
        error_obj = {"error": str(e)}
        print(json.dumps(error_obj))
        print(f"[predict_risk] ERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
