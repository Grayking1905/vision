"""
Script to seed demo datasets directly into the Vision database and upload folder.
Usage:
    python scripts/seed_demo_data.py [--project-id PROJECT_ID] [--all]
"""

import argparse
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import engine, create_db_and_tables
from app.services.data_upload import add_file_service
from sqlmodel import Session

def seed_demo_datasets(project_id: str | None = None):
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    demo_dir = os.path.join(base_dir, "demo_datasets")
    
    if not os.path.exists(demo_dir):
        print(f"[ERROR] Demo datasets directory not found at: {demo_dir}")
        print("Please run `python scripts/generate_demo_datasets.py` first.")
        return
        
    create_db_and_tables()
    
    files_to_seed = [
        "iris_classification.csv",
        "heart_disease.csv",
        "customer_churn.csv",
        "california_housing.csv",
        "wine_quality.csv",
        "mnist_digits_mini.csv",
        "sample_images.zip",
    ]
    
    with Session(engine) as db:
        print(f"Seeding demo datasets into Vision database (project_id={project_id or 'Global'})...")
        for filename in files_to_seed:
            file_path = os.path.join(demo_dir, filename)
            if not os.path.exists(file_path):
                print(f"  [SKIP] File not found: {filename}")
                continue
                
            with open(file_path, "rb") as f:
                content = f.read()
                
            body, code = add_file_service(
                db=db,
                filename=filename,
                file_content=content,
                project_id=project_id,
            )
            
            if code == 201:
                file_id = body.get("data", {}).get("file_id")
                print(f"  [OK] Seeded {filename} -> file_id: {file_id}")
            else:
                print(f"  [WARN] Failed to seed {filename}: {body.get('message')}")
                
    print("\nSeeding completed successfully!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed Vision demo datasets")
    parser.add_argument("--project-id", type=str, default=None, help="Target Project ID (optional)")
    parser.add_argument("--all", action="store_true", help="Seed all datasets")
    args = parser.parse_args()
    
    seed_demo_datasets(project_id=args.project_id)
