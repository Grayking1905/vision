# Vision Demo Datasets

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
