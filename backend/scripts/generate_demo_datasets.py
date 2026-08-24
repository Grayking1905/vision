"""
Script to generate demo datasets for the Vision ML platform.
Generates:
  1. iris_classification.csv (Multi-class Classification)
  2. heart_disease.csv (Binary Classification)
  3. customer_churn.csv (Binary Classification)
  4. california_housing.csv (Regression)
  5. wine_quality.csv (Multi-class Classification)
  6. mnist_digits_mini.csv (Tabular / Image Classification)
  7. sample_images.zip (Image archive for Computer Vision)
  8. README.md (Comprehensive dataset guide)
"""

import os
import io
import zipfile
import numpy as np
import pandas as pd
from sklearn.datasets import load_iris, load_wine, load_digits, fetch_california_housing

def ensure_dirs(output_dir: str):
    os.makedirs(output_dir, exist_ok=True)

def generate_iris(output_dir: str):
    iris = load_iris(as_frame=True)
    df = iris.frame.copy()
    # Clean column names
    df.columns = [
        col.replace(" (cm)", "").replace(" ", "_") for col in df.columns
    ]
    df.rename(columns={"target": "species_id"}, inplace=True)
    # Also add species name for readability
    species_map = {0: "setosa", 1: "versicolor", 2: "virginica"}
    df["species_name"] = df["species_id"].map(species_map)
    
    file_path = os.path.join(output_dir, "iris_classification.csv")
    df.to_csv(file_path, index=False)
    print(f"[OK] Created {file_path} ({len(df)} rows, {len(df.columns)} cols)")

def generate_heart_disease(output_dir: str):
    np.random.seed(42)
    n_samples = 300
    
    age = np.random.randint(29, 78, size=n_samples)
    sex = np.random.choice([0, 1], size=n_samples, p=[0.32, 0.68]) # 0 = female, 1 = male
    chest_pain_type = np.random.choice([0, 1, 2, 3], size=n_samples, p=[0.48, 0.17, 0.28, 0.07])
    resting_bp = np.random.normal(130, 17, size=n_samples).clip(94, 200).astype(int)
    cholesterol = np.random.normal(245, 50, size=n_samples).clip(126, 564).astype(int)
    fasting_bs = (np.random.rand(n_samples) > 0.85).astype(int)
    resting_ecg = np.random.choice([0, 1, 2], size=n_samples, p=[0.49, 0.49, 0.02])
    max_hr = (220 - age - np.random.normal(20, 15, size=n_samples)).clip(71, 202).astype(int)
    exercise_angina = np.random.choice([0, 1], size=n_samples, p=[0.67, 0.33])
    oldpeak = np.round(np.random.exponential(1.0, size=n_samples).clip(0, 6.2), 2)
    st_slope = np.random.choice([0, 1, 2], size=n_samples, p=[0.07, 0.46, 0.47])
    
    # Calculate realistic probability of heart disease
    logit = (
        0.03 * (age - 54) +
        0.5 * sex +
        0.8 * chest_pain_type -
        0.02 * (max_hr - 150) +
        0.6 * exercise_angina +
        0.4 * oldpeak +
        0.01 * (resting_bp - 130) +
        0.005 * (cholesterol - 240) - 0.5
    )
    prob = 1 / (1 + np.exp(-logit))
    target = (np.random.rand(n_samples) < prob).astype(int)
    
    df = pd.DataFrame({
        "age": age,
        "sex": sex,
        "chest_pain_type": chest_pain_type,
        "resting_bp": resting_bp,
        "cholesterol": cholesterol,
        "fasting_bs": fasting_bs,
        "resting_ecg": resting_ecg,
        "max_hr": max_hr,
        "exercise_angina": exercise_angina,
        "oldpeak": oldpeak,
        "st_slope": st_slope,
        "heart_disease": target,
    })
    
    file_path = os.path.join(output_dir, "heart_disease.csv")
    df.to_csv(file_path, index=False)
    print(f"[OK] Created {file_path} ({len(df)} rows, {len(df.columns)} cols)")

def generate_customer_churn(output_dir: str):
    np.random.seed(101)
    n_samples = 1000
    
    credit_score = np.random.normal(650, 96, size=n_samples).clip(350, 850).astype(int)
    age = np.random.normal(38, 10, size=n_samples).clip(18, 75).astype(int)
    tenure = np.random.randint(0, 11, size=n_samples)
    balance = np.where(np.random.rand(n_samples) > 0.35, np.random.normal(110000, 30000, size=n_samples).clip(10000, 250000), 0.0).round(2)
    num_products = np.random.choice([1, 2, 3, 4], size=n_samples, p=[0.5, 0.45, 0.04, 0.01])
    has_cr_card = np.random.choice([0, 1], size=n_samples, p=[0.3, 0.7])
    is_active_member = np.random.choice([0, 1], size=n_samples, p=[0.48, 0.52])
    estimated_salary = np.random.uniform(15000, 180000, size=n_samples).round(2)
    
    prod_effect = np.where(num_products == 1, 0.6, np.where(num_products == 2, -0.5, 1.2))
    z = (
        0.05 * (age - 35) -
        0.003 * (credit_score - 600) +
        0.00001 * balance -
        0.8 * is_active_member +
        prod_effect - 1.2
    )
    prob = 1 / (1 + np.exp(-z))
    churn = (np.random.rand(n_samples) < prob).astype(int)
    
    df = pd.DataFrame({
        "credit_score": credit_score,
        "age": age,
        "tenure": tenure,
        "balance": balance,
        "num_products": num_products,
        "has_cr_card": has_cr_card,
        "is_active_member": is_active_member,
        "estimated_salary": estimated_salary,
        "churn": churn,
    })
    
    file_path = os.path.join(output_dir, "customer_churn.csv")
    df.to_csv(file_path, index=False)
    print(f"[OK] Created {file_path} ({len(df)} rows, {len(df.columns)} cols)")

def generate_california_housing(output_dir: str):
    housing = fetch_california_housing(as_frame=True)
    df = housing.frame.sample(n=1000, random_state=42).copy()
    # Clean column names
    df.columns = [col.lower() for col in df.columns]
    # Rename MedHouseVal to median_house_value
    df.rename(columns={"medhouseval": "median_house_value"}, inplace=True)
    # Round values for cleaner presentation
    for col in df.columns:
        df[col] = df[col].round(4)
        
    file_path = os.path.join(output_dir, "california_housing.csv")
    df.to_csv(file_path, index=False)
    print(f"[OK] Created {file_path} ({len(df)} rows, {len(df.columns)} cols)")

def generate_wine_quality(output_dir: str):
    wine = load_wine(as_frame=True)
    df = wine.frame.copy()
    df.columns = [col.replace("/", "_").replace(" ", "_") for col in df.columns]
    df.rename(columns={"target": "cultivar_class"}, inplace=True)
    for col in df.select_dtypes(include="float").columns:
        df[col] = df[col].round(3)
        
    file_path = os.path.join(output_dir, "wine_quality.csv")
    df.to_csv(file_path, index=False)
    print(f"[OK] Created {file_path} ({len(df)} rows, {len(df.columns)} cols)")

def generate_mnist_digits_mini(output_dir: str):
    digits = load_digits(as_frame=True)
    df = digits.frame.sample(n=500, random_state=42).copy()
    df.rename(columns={"target": "digit_label"}, inplace=True)
    
    file_path = os.path.join(output_dir, "mnist_digits_mini.csv")
    df.to_csv(file_path, index=False)
    print(f"[OK] Created {file_path} ({len(df)} rows, {len(df.columns)} cols)")

def generate_sample_images_zip(output_dir: str):
    """Generate a lightweight sample image dataset zip for testing image workflows."""
    try:
        from PIL import Image, ImageDraw
        zip_path = os.path.join(output_dir, "sample_images.zip")
        
        classes = ["class_circle", "class_square", "class_triangle"]
        colors = {
            "class_circle": [(220, 50, 50), (240, 100, 100), (180, 20, 20)],
            "class_square": [(50, 120, 220), (80, 160, 240), (20, 70, 180)],
            "class_triangle": [(40, 180, 80), (70, 210, 110), (10, 130, 50)],
        }
        
        with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
            for cls in classes:
                for i in range(10):
                    img = Image.new("RGB", (64, 64), color=(245, 245, 250))
                    draw = ImageDraw.Draw(img)
                    col = colors[cls][i % 3]
                    
                    if cls == "class_circle":
                        draw.ellipse([12, 12, 52, 52], fill=col, outline=(30, 30, 30))
                    elif cls == "class_square":
                        draw.rectangle([12, 12, 52, 52], fill=col, outline=(30, 30, 30))
                    elif cls == "class_triangle":
                        draw.polygon([(32, 10), (10, 54), (54, 54)], fill=col, outline=(30, 30, 30))
                    
                    buf = io.BytesIO()
                    img.save(buf, format="JPEG", quality=85)
                    zf.writestr(f"dataset/{cls}/sample_{i+1:02d}.jpg", buf.getvalue())
                    
        print(f"[OK] Created {zip_path} (3 classes, 30 sample images)")
    except Exception as e:
        print(f"[WARN] Skipping image zip generation ({e})")

def generate_readme(output_dir: str):
    content = """# Vision Demo Datasets

This directory contains clean, curated, benchmark datasets specifically prepared for the **Vision Low-Code ML Platform**.

---

## 📂 Dataset Catalog

| Dataset File | Rows | Features | Task Type | Target Column | Recommended Input Shape |
| :--- | :--- | :--- | :--- | :--- | :--- |
| [`iris_classification.csv`](./iris_classification.csv) | 150 | 4 | Multi-class (3 classes) | `species_id` (0, 1, 2) | `(4,)` |
| [`heart_disease.csv`](./heart_disease.csv) | 300 | 11 | Binary Classification | `heart_disease` (0, 1) | `(11,)` |
| [`customer_churn.csv`](./customer_churn.csv) | 1,000 | 8 | Binary Classification | `churn` (0, 1) | `(8,)` |
| [`california_housing.csv`](./california_housing.csv) | 1,000 | 8 | Regression | `median_house_value` | `(8,)` |
| [`wine_quality.csv`](./wine_quality.csv) | 178 | 13 | Multi-class (3 classes) | `cultivar_class` (0, 1, 2) | `(13,)` |
| [`mnist_digits_mini.csv`](./mnist_digits_mini.csv) | 500 | 64 | Multi-class (10 digits) | `digit_label` (0–9) | `(64,)` |
| [`sample_images.zip`](./sample_images.zip) | 30 imgs | 3 classes | Image Classification | Folder labels | `(64, 64, 3)` |

---

## 🎯 Dataset Details & Recommended Model Architectures

### 1. Iris Flower Classification (`iris_classification.csv`)
- **Use Case**: The classic benchmark for learning neural network classification.
- **Features**: `sepal_length`, `sepal_width`, `petal_length`, `petal_width`
- **Target**: `species_id` (0 = Setosa, 1 = Versicolor, 2 = Virginica)
- **Recommended Canvas Architecture**:
  - **Input Node**: `dim-1 = 4`
  - **Dense Node**: `units = 16`, `activation = relu`
  - **Dense Node**: `units = 3`, `activation = softmax` (or linear logits)
- **Training Config**:
  - Problem Type: `Classification (Integer Labels)`
  - Loss: `sparse_categorical_crossentropy`
  - Metric: `accuracy`
  - Epochs: `15–30`

---

### 2. Heart Disease Prediction (`heart_disease.csv`)
- **Use Case**: Healthcare risk modeling and medical decision support. Great for exploring correlation heatmaps and feature distributions in Vision's Data Analysis page.
- **Features**: `age`, `sex`, `chest_pain_type`, `resting_bp`, `cholesterol`, `fasting_bs`, `resting_ecg`, `max_hr`, `exercise_angina`, `oldpeak`, `st_slope`
- **Target**: `heart_disease` (0 = Healthy, 1 = Heart Disease)
- **Recommended Canvas Architecture**:
  - **Input Node**: `dim-1 = 11`
  - **Dense Node**: `units = 32`, `activation = relu`
  - **Dropout Node**: `rate = 0.2`
  - **Dense Node**: `units = 16`, `activation = relu`
  - **Dense Node**: `units = 2`, `activation = softmax`
- **Training Config**:
  - Problem Type: `Classification (Integer Labels)`
  - Loss: `sparse_categorical_crossentropy`
  - Metric: `accuracy`
  - Epochs: `20`

---

### 3. Customer Churn Prediction (`customer_churn.csv`)
- **Use Case**: Business analytics and customer retention prediction.
- **Features**: `credit_score`, `age`, `tenure`, `balance`, `num_products`, `has_cr_card`, `is_active_member`, `estimated_salary`
- **Target**: `churn` (0 = Retained, 1 = Churned)
- **Recommended Canvas Architecture**:
  - **Input Node**: `dim-1 = 8`
  - **BatchNorm Node**
  - **Dense Node**: `units = 64`, `activation = relu`
  - **Dropout Node**: `rate = 0.3`
  - **Dense Node**: `units = 16`, `activation = relu`
  - **Dense Node**: `units = 2`, `activation = softmax`
- **Training Config**:
  - Problem Type: `Classification (Integer Labels)`
  - Loss: `sparse_categorical_crossentropy`
  - Metric: `accuracy`

---

### 4. California Housing Prices (`california_housing.csv`)
- **Use Case**: Real estate valuation and regression modeling.
- **Features**: `medinc`, `houseage`, `averooms`, `avebedrms`, `population`, `aveoccup`, `latitude`, `longitude`
- **Target**: `median_house_value` (Continuous numeric value)
- **Recommended Canvas Architecture**:
  - **Input Node**: `dim-1 = 8`
  - **Dense Node**: `units = 64`, `activation = relu`
  - **Dense Node**: `units = 32`, `activation = relu`
  - **Dense Node**: `units = 1`, `activation = linear`
- **Training Config**:
  - Problem Type: `Regression`
  - Loss: `mean_squared_error`
  - Metric: `mae` or `mse`
  - Epochs: `25`

---

### 5. Wine Recognition (`wine_quality.csv`)
- **Use Case**: Chemical analysis to classify wine cultivars.
- **Features**: `alcohol`, `malic_acid`, `ash`, `alcalinity_of_ash`, `magnesium`, `total_phenols`, `flavanoids`, `nonflavanoid_phenols`, `proanthocyanins`, `color_intensity`, `hue`, `od280_od315_of_diluted_wines`, `proline`
- **Target**: `cultivar_class` (0, 1, 2)
- **Recommended Canvas Architecture**:
  - **Input Node**: `dim-1 = 13`
  - **BatchNorm Node**
  - **Dense Node**: `units = 32`, `activation = relu`
  - **Dense Node**: `units = 3`, `activation = softmax`

---

### 6. MNIST Mini Digits (`mnist_digits_mini.csv`)
- **Use Case**: Computer Vision & Optical Character Recognition using flattened 8x8 pixel grids.
- **Features**: `pixel_0_0` through `pixel_7_7` (64 grayscale pixel intensities)
- **Target**: `digit_label` (0 through 9)
- **Recommended Canvas Architecture**:
  - **Input Node**: `dim-1 = 64`
  - **Dense Node**: `units = 128`, `activation = relu`
  - **Dropout Node**: `rate = 0.25`
  - **Dense Node**: `units = 64`, `activation = relu`
  - **Dense Node**: `units = 10`, `activation = softmax`
- **Training Config**:
  - Problem Type: `Classification (Integer Labels)`
  - Loss: `sparse_categorical_crossentropy`
  - Metric: `accuracy`
  - Epochs: `20`

---

## 🚀 How to Use in Vision

### Method 1: 1-Click UI Import (Easiest)
1. Open Vision at `http://localhost:5173`.
2. Open any project workspace, and go to **Dataset**.
3. Under **Demo Datasets**, click **Load Dataset** on any card to import it directly into your project!

### Method 2: Drag and Drop Upload
1. Navigate to the `demo_datasets/` folder on your computer.
2. Drag and drop any `.csv` or `.zip` file into the Vision **Dataset** dropzone.

### Method 3: Command-Line Seeding
Run the seed script from the `backend/` directory:
```bash
python scripts/seed_demo_data.py --all
```
"""
    readme_path = os.path.join(output_dir, "README.md")
    with open(readme_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"[OK] Created {readme_path}")

def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    demo_dir = os.path.join(base_dir, "demo_datasets")
    ensure_dirs(demo_dir)
    
    print("Generating demo datasets in:", demo_dir)
    generate_iris(demo_dir)
    generate_heart_disease(demo_dir)
    generate_customer_churn(demo_dir)
    generate_california_housing(demo_dir)
    generate_wine_quality(demo_dir)
    generate_mnist_digits_mini(demo_dir)
    generate_sample_images_zip(demo_dir)
    generate_readme(demo_dir)
    print("\nAll demo datasets generated successfully!")

if __name__ == "__main__":
    main()
