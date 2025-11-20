import sys
import json
import os
import joblib
import numpy as np

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

def get_model_path():
    return os.path.join(BASE_DIR, "assignment_model.joblib")

MODEL = joblib.load(get_model_path())

FEATURE_ORDER = [
    "storyPriority",
    "storyBusinessValue",
    "taskEffort",
    "sprintNumber",
    "isBug",
    "developerPastTasksCompleted",
    "developerPastDefectsFixed",
]

def features_to_row(f):
    return [
        float(f.get("storyPriority", 0)),
        float(f.get("storyBusinessValue", 0)),
        float(f.get("taskEffort", 0)),
        float(f.get("sprintNumber", 0)),
        1.0 if f.get("isBug", False) else 0.0,
        float(f.get("developerPastTasksCompleted", 0)),
        float(f.get("developerPastDefectsFixed", 0)),
    ]

def main():
    raw = sys.stdin.read().strip()
    if not raw:
        json.dump({"error": "Empty stdin"}, sys.stdout)
        return

    payload = json.loads(raw)

    if "featuresList" in payload:
        features_list = payload["featuresList"]
        rows = [features_to_row(f) for f in features_list]
        X = np.array(rows)
        proba = MODEL.predict_proba(X)[:, 1]
        labels = (proba >= 0.5).astype(int)

        results = [
            {"label": int(l), "probability": float(p)}
            for l, p in zip(labels, proba)
        ]

        json.dump({"results": results}, sys.stdout)
    else:
        f = payload["features"]
        row = features_to_row(f)
        X = np.array([row])
        proba = MODEL.predict_proba(X)[0, 1]
        label = int(proba >= 0.5)
        json.dump({"label": label, "probability": float(proba)}, sys.stdout)

if __name__ == "__main__":
    main()
