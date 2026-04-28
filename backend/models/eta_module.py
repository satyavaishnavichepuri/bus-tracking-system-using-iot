import json
from dataclasses import dataclass
from typing import Iterable, Dict, Any, Optional


@dataclass
class ETAModel:
  stop_delay_min: float = 0.6
  min_speed_kmh: float = 6.0
  traffic_bias_min: float = 0.0

  def predict(self, dist_km: float, speed_kmh: float, stops_remaining: int = 0, traffic_factor: float = 1.0) -> int:
    speed = max(float(speed_kmh), self.min_speed_kmh)
    base_min = (float(dist_km) / speed) * 60.0
    stop_delay = max(0, int(stops_remaining)) * self.stop_delay_min
    traffic = max(0.7, float(traffic_factor))
    eta = (base_min + stop_delay + self.traffic_bias_min) * traffic
    return max(1, int(round(eta)))


def train_from_samples(samples: Iterable[Dict[str, Any]]) -> "ETAModel":
  total_extra = 0.0
  total_stops = 0
  traffic_bias = []

  for row in samples:
    dist_km = float(row.get("dist_km", 0))
    speed_kmh = float(row.get("speed_kmh", 0))
    stops_remaining = int(row.get("stops_remaining", 0))
    eta_min = float(row.get("eta_min", 0))
    traffic_factor = float(row.get("traffic_factor", 1.0))

    if speed_kmh <= 0 or dist_km < 0 or eta_min <= 0:
      continue

    base_min = (dist_km / max(speed_kmh, 6.0)) * 60.0
    extra = max(0.0, eta_min - (base_min * traffic_factor))

    if stops_remaining > 0:
      total_extra += extra
      total_stops += stops_remaining
    else:
      traffic_bias.append(extra)

  stop_delay = (total_extra / total_stops) if total_stops else 0.6
  bias = (sum(traffic_bias) / len(traffic_bias)) if traffic_bias else 0.0

  return ETAModel(stop_delay_min=max(0.2, stop_delay), traffic_bias_min=bias)


def save_model(model: ETAModel, path: str) -> None:
  payload = {
    "stop_delay_min": model.stop_delay_min,
    "min_speed_kmh": model.min_speed_kmh,
    "traffic_bias_min": model.traffic_bias_min,
  }
  with open(path, "w", encoding="utf-8") as f:
    json.dump(payload, f, indent=2)


def load_model(path: str) -> ETAModel:
  with open(path, "r", encoding="utf-8") as f:
    data = json.load(f)
  return ETAModel(
    stop_delay_min=float(data.get("stop_delay_min", 0.6)),
    min_speed_kmh=float(data.get("min_speed_kmh", 6.0)),
    traffic_bias_min=float(data.get("traffic_bias_min", 0.0)),
  )


def get_model(path: Optional[str] = None) -> ETAModel:
  if not path:
    return ETAModel()
  try:
    return load_model(path)
  except (OSError, ValueError, json.JSONDecodeError):
    return ETAModel()


if __name__ == "__main__":
  pass
