"""
Comprehensive test suite for the Oil Spill Detection FastAPI backend.
Validates all routes and checks detection-to-incident auto-generation.
"""

from fastapi.testclient import TestClient
from backend.main import app

def run_tests():
    with TestClient(app) as client:
        print("--- 1. Testing Root & Health ---")
        res = client.get("/")
        assert res.status_code == 200, f"Root failed: {res.status_code}"
        print(" Root OK:", res.json())

        res = client.get("/api/v1/health")
        assert res.status_code == 200, f"Health failed: {res.status_code}"
        data = res.json()
        assert data["model_loaded"] is True, "Model should be loaded"
        print(f" Health OK: model_loaded={data['model_loaded']}, device={data['device']}")

        print("\n--- 2. Testing Samples ---")
        res = client.get("/api/v1/samples")
        assert res.status_code == 200
        samples = res.json()["samples"]
        print(f" Samples OK: {len(samples)} sample SAR images found")
        sample_name = "sample_crop_512.tif"

        print("\n--- 3. Testing Incidents ---")
        res = client.get("/api/v1/incidents")
        assert res.status_code == 200
        incidents = res.json()
        assert len(incidents) > 0, "Should have seeded incidents"
        print(f" Incidents OK: {len(incidents)} incidents loaded")

        res = client.get(f"/api/v1/incidents/{incidents[0]['id']}")
        assert res.status_code == 200
        print(f" Single Incident OK: {incidents[0]['id']} -> {incidents[0]['title']}")

        res = client.get("/api/v1/incidents/stats")
        assert res.status_code == 200
        print(" Incident Stats OK:", res.json())

        print("\n--- 4. Testing AIS Vessels ---")
        res = client.get("/api/v1/ais/vessels")
        assert res.status_code == 200
        vessels = res.json()
        assert len(vessels) > 0
        print(f" AIS Vessels OK: {len(vessels)} vessels tracked")

        mmsi = vessels[0]["mmsi"]
        res = client.get(f"/api/v1/ais/vessels/{mmsi}/track")
        assert res.status_code == 200
        print(f" Vessel Track OK: {mmsi} points={len(res.json().get('points', []))}")

        print("\n--- 5. Testing Alerts ---")
        res = client.get("/api/v1/alerts")
        assert res.status_code == 200
        alerts = res.json()
        assert len(alerts) > 0
        print(f" Alerts OK: {len(alerts)} alerts retrieved")

        first_alert = alerts[0]["id"]
        res = client.post(f"/api/v1/alerts/{first_alert}/acknowledge")
        assert res.status_code == 200
        assert res.json()["acknowledged"] is True
        print(f" Acknowledge Alert OK: {first_alert}")

        print("\n--- 6. Testing Satellite Scenes ---")
        res = client.get("/api/v1/satellite/scenes")
        assert res.status_code == 200
        scenes = res.json()
        print(f" Satellite Scenes OK: {len(scenes)} scenes")

        res = client.get("/api/v1/satellite/coverage")
        assert res.status_code == 200
        print(" Satellite Coverage OK:", res.json())

        print("\n--- 7. Testing Weather & Ocean ---")
        res = client.get("/api/v1/weather/current?region=Arabian%20Sea")
        assert res.status_code == 200
        print(" Weather Current OK:", res.json()["weather"])

        res = client.get("/api/v1/weather/wind-field")
        assert res.status_code == 200
        assert len(res.json()) > 0
        print(f" Wind Field OK: {len(res.json())} vectors")

        res = client.get("/api/v1/ocean/current-field")
        assert res.status_code == 200
        assert len(res.json()) > 0
        print(f" Ocean Current Field OK: {len(res.json())} vectors")

        print("\n--- 8. Testing System & Models ---")
        res = client.get("/api/v1/system/models")
        assert res.status_code == 200
        models = res.json()
        print(f" System Models OK: {len(models)} models listed")

        print("\n--- 9. Testing Auth ---")
        res = client.post("/api/v1/auth/login", json={"email": "a.nair@oceanx.gov.in", "password": "oceanx-demo"})
        assert res.status_code == 200
        assert "token" in res.json()
        print(" Auth Login OK: Session token generated for", res.json()["user"]["name"])

        if sample_name:
            print(f"\n--- 10. Testing SAR Model Detection on Sample: {sample_name} ---")
            res = client.post(f"/api/v1/detect/sample?filename={sample_name}")
            assert res.status_code == 200, f"Sample detection failed: {res.text}"
            det_data = res.json()
            print(f" Detection Run Completed: detected={det_data['detected']}, confidence={det_data['confidence']}, area_km2={det_data['area_km2']}")
            if det_data["detected"]:
                print(f" Spill detected! Scan ID: {det_data['scan_id']}, Polygon vertices: {len(det_data['polygon'])}")
                # Verify incident was created
                res = client.get("/api/v1/incidents")
                matching = [i for i in res.json() if sample_name in i.get("title", "")]
                assert len(matching) > 0, "Incident should be auto-created for detected spill"
                print(f" Verified Auto-Created Incident: {matching[0]['id']} -> {matching[0]['title']}")

        print("\n=======================================================")
        print(" ALL 10 TEST SUITES PASSED PERFECTLY!")
        print("=======================================================")

if __name__ == "__main__":
    run_tests()
