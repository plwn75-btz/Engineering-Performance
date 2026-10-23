"""
ASK Document Intelligence Hub - Web Application Server
Production-ready Flask application for Render.com and local deployment.
Serves dashboards and provides automated Excel report upload and data processing endpoints.
"""

import os
import sys
import json
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory, redirect

# Import auto-update engine
import update_all

app = Flask(__name__, static_folder=".", static_url_path="")
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50 MB max file size

# Allowed extensions
ALLOWED_EXTENSIONS = {'.xlsx', '.xls'}

def allowed_file(filename):
    return os.path.splitext(filename)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/")
def index():
    return send_from_directory(".", "index.html")

@app.route("/vendor")
def vendor_page():
    return send_from_directory(".", "index_vendor.html")

@app.route("/mdr")
def mdr_page():
    return send_from_directory(".", "index_mdr.html")

@app.route("/analytics")
def analytics_page():
    return send_from_directory(".", "index_analytics.html")

@app.route("/api/status", methods=["GET"])
def get_status():
    """Returns the latest update timestamp and file dates."""
    meta_path = Path("latest_update.json")
    if meta_path.exists():
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return jsonify(data)
        except Exception:
            pass
    return jsonify({
        "status": "online",
        "message": "Dashboards active. No update history logged yet."
    })

@app.route("/api/upload", methods=["POST"])
def upload_file():
    """
    Receives uploaded weekly Excel files, saves them, runs the data processor,
    and regenerates the corresponding .js dataset.
    """
    if "file" not in request.files:
        return jsonify({"success": False, "error": "No file part in the request"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return jsonify({
            "success": False, 
            "error": "Invalid file format. Only Excel files (.xlsx, .xls) are supported."
        }), 400

    filename = file.filename
    save_path = os.path.join(".", filename)

    try:
        # Save file to working directory
        file.save(save_path)
        print(f"Uploaded file saved to {save_path}. Starting automatic processing...")

        # Process the uploaded file
        res = update_all.process_single_uploaded_file(save_path)

        # Also refresh latest_update.json
        meta_path = Path("latest_update.json")
        meta = {}
        if meta_path.exists():
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    meta = json.load(f)
            except Exception:
                pass
        
        meta[res["type"]] = {
            "file": res["file"],
            "date": res["date"],
            "status": "success",
            "uploaded_at": update_all.datetime.now().isoformat()
        }
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

        return jsonify({
            "success": True,
            "message": f"Successfully updated {res['type']} from '{filename}'!",
            "details": res
        })

    except Exception as e:
        print(f"Error processing uploaded file: {e}")
        return jsonify({
            "success": False,
            "error": f"Error processing Excel data: {str(e)}"
        }), 500

@app.route("/api/refresh-all", methods=["POST"])
def refresh_all():
    """Forces batch update of all existing Excel files in the directory."""
    try:
        results = update_all.update_all(".")
        return jsonify({"success": True, "results": results})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Serve static files (HTML, CSS, JS, datasets)
@app.route("/<path:path>")
def serve_static(path):
    return send_from_directory(".", path)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting ASK Document Intelligence Hub on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
