# Transaction Anomaly Detector

This project is an **unsupervised machine learning solution** designed to detect fraudulent or anomalous transactions within a given dataset. By analyzing historical transaction data, it identifies patterns that deviate significantly from the norm, helping to flag potentially fraudulent activity.

---

## 🚀 Features

- **Unsupervised Learning**: Detects anomalies without needing labeled fraudulent data.
- **Data Preprocessing**: Scripts to clean and prepare raw transaction data.
- **Model Training**: Builds an anomaly detection model on historical data.
- **Anomaly Scoring**: Assigns scores to transactions; higher scores indicate higher likelihood of being anomalies.

---

## 🛠 Getting Started

Follow these steps to get the project up and running on your local machine.

### ✅ Prerequisites

Make sure you have the following installed:

- Python 3.x  
- pip (Python package installer)

### 📦 Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/VaishnaviMelagiri/transaction-anomaly-detector.git
   cd transaction-anomaly-detector

2. Install the required Python packages:

   ```bash
   pip install -r requirements.txt




---

## ⚙️ Usage

1. Place your transactional data in a CSV file named transactional_data.csv in the root directory.
The file should contain columns such as ID, timestamp, amount, and other relevant features.


2. Run the main script to train the model and detect anomalies:

   ```bash
   python main.py


3. The script will output the results to a file named anomalies.csv, containing a list of transactions identified as anomalies.




---

## 🤝 Contributing

We welcome contributions!
Feel free to open an issue or submit a pull request to suggest improvements or fix issues.
