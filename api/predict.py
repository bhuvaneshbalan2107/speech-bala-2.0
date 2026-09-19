import json
import pickle
from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parents[1] / "model.p"
with MODEL_PATH.open("rb") as model_file:
    model = pickle.load(model_file)["model"]

LABELS = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .")


def handler(request):
    if request.method != "POST":
        return {"statusCode": 405, "headers": {"Allow": "POST"}, "body": "Method Not Allowed"}

    try:
        payload = request.body
        if isinstance(payload, bytes):
            payload = payload.decode("utf-8")
        features = json.loads(payload).get("features", [])
        if len(features) != 42:
            raise ValueError("Expected 42 hand features")
        prediction = int(model.predict([features])[0])
        return {"statusCode": 200, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"label": LABELS[prediction]})}
    except (ValueError, TypeError, KeyError, IndexError) as error:
        return {"statusCode": 400, "headers": {"Content-Type": "application/json"}, "body": json.dumps({"error": str(error)})}