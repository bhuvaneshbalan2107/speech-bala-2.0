import json
import pickle
from http.server import BaseHTTPRequestHandler
from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parents[1] / "model.p"
with MODEL_PATH.open("rb") as model_file:
    model = pickle.load(model_file)["model"]

LABELS = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .")


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            body_length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(body_length))
            features = payload.get("features", [])
            if len(features) != 42:
                raise ValueError("Expected 42 hand features")
            prediction = int(model.predict([features])[0])
            self._send_json(200, {"label": LABELS[prediction]})
        except (ValueError, TypeError, KeyError, IndexError, json.JSONDecodeError) as error:
            self._send_json(400, {"error": str(error)})

    def do_OPTIONS(self):
        self._send_json(204, {})

    def _send_json(self, status, payload):
        response = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(response)