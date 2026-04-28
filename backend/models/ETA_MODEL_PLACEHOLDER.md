# ETA Model Placeholder (Not Used in Runtime)

Purpose:
- This folder is reserved for a trained ETA model artifact from Colab.
- Current backend runtime intentionally uses the classical heuristic in `backend/src/utils/geo.js`.

When you train in Colab:
1. Export your model (for example `eta_model.joblib`).
2. Place it in this folder, e.g. `backend/models/eta_model.joblib`.
3. Share training metrics (MAE/RMSE) and sample predictions.
4. We can then add a safe feature-flag to optionally enable model inference.

Status:
- Placeholder only.
- No runtime code reads this file yet.
