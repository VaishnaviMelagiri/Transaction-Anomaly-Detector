class TransactionAnomalyDetector {
    constructor() {
        this.transactions = [];
        this.userStats = new Map();
        this.merchantTrie = new TrieNode();
        this.transactionGraph = new Map();
        this.anomalies = [];
        this.initializeKnownMerchants();
    }

    initializeKnownMerchants() {
        const knownMerchants = [
            'Amazon', 'Walmart', 'Target', 'Apple', 'Google', 'Microsoft',
            'Netflix', 'Spotify', 'Uber', 'Lyft', 'McDonald', 'Starbucks',
            'PayPal', 'Venmo', 'CashApp', 'Zelle', 'Steam', 'PlayStation'
        ];

        knownMerchants.forEach(merchant => {
            this.insertMerchant(merchant.toLowerCase());
        });
    }

    insertMerchant(merchant) {
        let node = this.merchantTrie;
        for (let char of merchant) {
            if (!node.children[char]) {
                node.children[char] = new TrieNode();
            }
            node = node.children[char];
        }
        node.isEnd = true;
    }

    searchMerchant(merchant) {
        let node = this.merchantTrie;
        for (let char of merchant.toLowerCase()) {
            if (!node.children[char]) {
                return false;
            }
            node = node.children[char];
        }
        return node.isEnd;
    }

    parseTransactions(data) {
        const lines = data.trim().split('\n');
        this.transactions = [];

        lines.forEach(line => {
            const [userID, amount, merchant, timestamp, toAccount] = line.split(',');
            if (userID && amount && merchant && timestamp) {
                this.transactions.push({
                    userID: userID.trim(),
                    amount: parseFloat(amount.trim()),
                    merchant: merchant.trim(),
                    timestamp: new Date(timestamp.trim()),
                    toAccount: toAccount ? toAccount.trim() : null
                });
            }
        });

        this.transactions.sort((a, b) => a.timestamp - b.timestamp);
    }

    buildTransactionGraph() {
        this.transactionGraph.clear();

        this.transactions.forEach(tx => {
            if (tx.toAccount) {
                if (!this.transactionGraph.has(tx.userID)) {
                    this.transactionGraph.set(tx.userID, []);
                }
                this.transactionGraph.get(tx.userID).push({
                    to: tx.toAccount,
                    amount: tx.amount,
                    timestamp: tx.timestamp
                });
            }
        });
    }

    detectCycles() {
        const visited = new Set();
        const recStack = new Set();
        const cycles = [];

        const dfs = (node, path) => {
            if (recStack.has(node)) {
                const cycleStart = path.indexOf(node);
                cycles.push(path.slice(cycleStart).concat(node));
                return;
            }

            if (visited.has(node)) return;

            visited.add(node);
            recStack.add(node);
            path.push(node);

            if (this.transactionGraph.has(node)) {
                this.transactionGraph.get(node).forEach(edge => {
                    dfs(edge.to, [...path]);
                });
            }

            recStack.delete(node);
        };

        this.transactionGraph.forEach((_, node) => {
            if (!visited.has(node)) {
                dfs(node, []);
            }
        });

        return cycles;
    }

    analyzeSlidingWindow(windowMinutes, frequencyThreshold) {
        const windowMs = windowMinutes * 60 * 1000;
        const userFrequencies = new Map();

        this.transactions.forEach((tx, index) => {
            const windowStart = new Date(tx.timestamp.getTime() - windowMs);
            let count = 0;

            for (let i = index; i >= 0; i--) {
                if (this.transactions[i].timestamp >= windowStart &&
                    this.transactions[i].userID === tx.userID) {
                    count++;
                }
                if (this.transactions[i].timestamp < windowStart) break;
            }

            if (count >= frequencyThreshold) {
                this.anomalies.push({
                    type: 'HIGH_FREQUENCY',
                    severity: 'HIGH',
                    transaction: tx,
                    details: `${count} transactions in ${windowMinutes} minutes`,
                    algorithm: 'Sliding Window'
                });
            }
        });
    }

    analyzeAmountAnomalies(threshold) {
        const userAmounts = new Map();

        this.transactions.forEach(tx => {
            if (!userAmounts.has(tx.userID)) {
                userAmounts.set(tx.userID, []);
            }
            userAmounts.get(tx.userID).push(tx.amount);
        });

        this.transactions.forEach(tx => {
            const userTxs = userAmounts.get(tx.userID);
            const avg = userTxs.reduce((a, b) => a + b, 0) / userTxs.length;
            const std = Math.sqrt(userTxs.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / userTxs.length);

            if (tx.amount > threshold) {
                this.anomalies.push({
                    type: 'LARGE_AMOUNT',
                    severity: 'HIGH',
                    transaction: tx,
                    details: `Amount $${tx.amount.toFixed(2)} exceeds threshold $${threshold}`,
                    algorithm: 'Threshold Analysis'
                });
            }

            if (userTxs.length > 3 && tx.amount > avg + 3 * std) {
                this.anomalies.push({
                    type: 'STATISTICAL_ANOMALY',
                    severity: 'MEDIUM',
                    transaction: tx,
                    details: `Amount $${tx.amount.toFixed(2)} is ${(tx.amount - avg / std).toFixed(1)} standard deviations above user average`,
                    algorithm: 'Statistical Analysis'
                });
            }
        });
    }

    analyzeMerchantAnomalies() {
        this.transactions.forEach(tx => {
            if (!this.searchMerchant(tx.merchant)) {
                this.anomalies.push({
                    type: 'UNKNOWN_MERCHANT',
                    severity: 'MEDIUM',
                    transaction: tx,
                    details: `Merchant "${tx.merchant}" not in validated merchant list`,
                    algorithm: 'Trie Validation'
                });
            }
        });
    }

    analyzeGraphAnomalies() {
        this.buildTransactionGraph();
        const cycles = this.detectCycles();

        cycles.forEach(cycle => {
            if (cycle.length > 2) {
                this.anomalies.push({
                    type: 'TRANSACTION_CYCLE',
                    severity: 'HIGH',
                    transaction: null,
                    details: `Circular transaction pattern detected: ${cycle.join(' → ')}`,
                    algorithm: 'Graph Cycle Detection'
                });
            }
        });

        this.transactionGraph.forEach((edges, node) => {
            if (edges.length > 10) {
                this.anomalies.push({
                    type: 'HIGH_DEGREE_NODE',
                    severity: 'MEDIUM',
                    transaction: null,
                    details: `Account ${node} has ${edges.length} outgoing transactions (potential hub)` ,
                    algorithm: 'Graph Degree Analysis'
                });
            }
        });
    }

    analyzeAll(windowMinutes, frequencyThreshold, amountThreshold) {
        this.anomalies = [];
        this.analyzeSlidingWindow(windowMinutes, frequencyThreshold);
        this.analyzeAmountAnomalies(amountThreshold);
        this.analyzeMerchantAnomalies();
        this.analyzeGraphAnomalies();
        return this.anomalies;
    }

    getStatistics() {
        const stats = {
            totalTransactions: this.transactions.length,
            totalAnomalies: this.anomalies.length,
            uniqueUsers: new Set(this.transactions.map(tx => tx.userID)).size,
            uniqueMerchants: new Set(this.transactions.map(tx => tx.merchant)).size,
            totalAmount: this.transactions.reduce((sum, tx) => sum + tx.amount, 0),
            anomalyRate: this.anomalies.length / this.transactions.length * 100,
            severityBreakdown: {
                HIGH: this.anomalies.filter(a => a.severity === 'HIGH').length,
                MEDIUM: this.anomalies.filter(a => a.severity === 'MEDIUM').length,
                LOW: this.anomalies.filter(a => a.severity === 'LOW').length
            }
        };
        return stats;
    }
}

class TrieNode {
    constructor() {
        this.children = {};
        this.isEnd = false;
    }
}

let detector = new TransactionAnomalyDetector();

function analyzeTransactions() {
    const data = document.getElementById("transactionData").value;
    const windowSize = parseInt(document.getElementById("windowSize").value);
    const frequencyThreshold = parseInt(document.getElementById("frequencyThreshold").value);
    const amountThreshold = parseFloat(document.getElementById("amountThreshold").value);

    detector.parseTransactions(data);
    const anomalies = detector.analyzeAll(windowSize, frequencyThreshold, amountThreshold);
    const stats = detector.getStatistics();

    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = '';

    if (anomalies.length === 0) {
        resultsDiv.innerHTML = `<p style="text-align:center; color:green;">✅ No anomalies detected in the data.</p>`;
    } else {
        anomalies.forEach((a, i) => {
            const div = document.createElement("div");
            div.className = "anomaly-card";
            div.innerHTML = `
                <h3>${i + 1}. ${a.type}</h3>
                <p><strong>Severity:</strong> ${a.severity}</p>
                <p><strong>Algorithm:</strong> ${a.algorithm}</p>
                <p><strong>Details:</strong> ${a.details}</p>
                ${a.transaction ? `<p><strong>User:</strong> ${a.transaction.userID}, <strong>Amount:</strong> $${a.transaction.amount}, <strong>Merchant:</strong> ${a.transaction.merchant}</p>` : ''}
            `;
            resultsDiv.appendChild(div);
        });
    }

    const summary = document.createElement("div");
    summary.className = "anomaly-summary";
    summary.innerHTML = `
        <h3>📊 Summary</h3>
        <p><strong>Total Transactions:</strong> ${stats.totalTransactions}</p>
        <p><strong>Total Anomalies:</strong> ${stats.totalAnomalies}</p>
        <p><strongAnomaly Rate:</strong> ${stats.anomalyRate.toFixed(2)}%</p>
        <p><strong>Users:</strong> ${stats.uniqueUsers}, <strong>Merchants:</strong> ${stats.uniqueMerchants}</p>
    `;
    resultsDiv.appendChild(summary);
}

function loadSampleData() {
    document.getElementById("transactionData").value = `U001,500.00,Amazon,2024-01-01T10:00:00,ACC123
U001,600.00,Amazon,2024-01-01T10:05:00,ACC124
U001,700.00,Amazon,2024-01-01T10:10:00,ACC125
U001,800.00,Amazon,2024-01-01T10:15:00,ACC126
U001,495.00,Amazon,2024-01-01T10:20:00,ACC127
U001,15000.00,Walmart,2024-01-01T10:25:00,ACC128
U002,300.00,Zara,2024-01-01T11:00:00,ACC129
U002,400.00,UnknownShop,2024-01-01T11:10:00,ACC130
U003,1000.00,Spotify,2024-01-01T12:00:00,U004
U004,1000.00,Spotify,2024-01-01T12:05:00,U003
U004,11000.00,Google,2024-01-01T12:10:00,ACC131`;
}

function clearResults() {
    document.getElementById("results").innerHTML = `<p style="color: #666; text-align: center; margin-top: 50px;">
        No analysis performed yet. Load sample data and click "Analyze Transactions" to begin.
    </p>`;
    document.getElementById("transactionData").value = '';
}
