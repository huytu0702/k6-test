/**
 * Alert Monitoring System for K6 Tests
 * Monitors test results and triggers alerts based on thresholds
 */

const fs = require('fs');
const path = require('path');

// Alert Configuration
const ALERT_THRESHOLDS = {
  responseTime: {
    warning: 500,      // ms
    critical: 1000,    // ms
  },
  errorRate: {
    warning: 5,        // %
    critical: 10,      // %
  },
  p95ResponseTime: {
    warning: 1000,     // ms
    critical: 2000,    // ms
  },
  checksPassRate: {
    warning: 90,       // %
    critical: 80,      // %
  },
  throughput: {
    warning: 10,       // req/s
    critical: 5,       // req/s
  },
};

// Alert levels
const AlertLevel = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL',
};

/**
 * Alert class
 */
class Alert {
  constructor(level, metric, message, currentValue, threshold, testName = null) {
    this.timestamp = new Date().toISOString();
    this.level = level;
    this.metric = metric;
    this.message = message;
    this.currentValue = currentValue;
    this.threshold = threshold;
    this.testName = testName;
  }

  toString() {
    const icon = this.level === AlertLevel.CRITICAL ? '🔴' :
                 this.level === AlertLevel.WARNING ? '⚠️' : 'ℹ️';
    return `${icon} [${this.level}] ${this.testName ? `[${this.testName}] ` : ''}${this.message} (Current: ${this.currentValue}, Threshold: ${this.threshold})`;
  }

  toJSON() {
    return {
      timestamp: this.timestamp,
      level: this.level,
      metric: this.metric,
      message: this.message,
      currentValue: this.currentValue,
      threshold: this.threshold,
      testName: this.testName,
    };
  }
}

/**
 * Monitor test results and generate alerts
 */
class AlertMonitor {
  constructor(config = ALERT_THRESHOLDS) {
    this.config = config;
    this.alerts = [];
  }

  /**
   * Check response time
   */
  checkResponseTime(avgResponseTime, testName = null) {
    if (avgResponseTime > this.config.responseTime.critical) {
      this.alerts.push(new Alert(
        AlertLevel.CRITICAL,
        'response_time',
        `Average response time is critically high`,
        `${avgResponseTime.toFixed(2)}ms`,
        `${this.config.responseTime.critical}ms`,
        testName
      ));
    } else if (avgResponseTime > this.config.responseTime.warning) {
      this.alerts.push(new Alert(
        AlertLevel.WARNING,
        'response_time',
        `Average response time exceeds warning threshold`,
        `${avgResponseTime.toFixed(2)}ms`,
        `${this.config.responseTime.warning}ms`,
        testName
      ));
    }
  }

  /**
   * Check error rate
   */
  checkErrorRate(errorRate, testName = null) {
    if (errorRate > this.config.errorRate.critical) {
      this.alerts.push(new Alert(
        AlertLevel.CRITICAL,
        'error_rate',
        `Error rate is critically high`,
        `${errorRate.toFixed(2)}%`,
        `${this.config.errorRate.critical}%`,
        testName
      ));
    } else if (errorRate > this.config.errorRate.warning) {
      this.alerts.push(new Alert(
        AlertLevel.WARNING,
        'error_rate',
        `Error rate exceeds warning threshold`,
        `${errorRate.toFixed(2)}%`,
        `${this.config.errorRate.warning}%`,
        testName
      ));
    }
  }

  /**
   * Check P95 response time
   */
  checkP95ResponseTime(p95, testName = null) {
    if (p95 > this.config.p95ResponseTime.critical) {
      this.alerts.push(new Alert(
        AlertLevel.CRITICAL,
        'p95_response_time',
        `P95 response time is critically high`,
        `${p95.toFixed(2)}ms`,
        `${this.config.p95ResponseTime.critical}ms`,
        testName
      ));
    } else if (p95 > this.config.p95ResponseTime.warning) {
      this.alerts.push(new Alert(
        AlertLevel.WARNING,
        'p95_response_time',
        `P95 response time exceeds warning threshold`,
        `${p95.toFixed(2)}ms`,
        `${this.config.p95ResponseTime.warning}ms`,
        testName
      ));
    }
  }

  /**
   * Check checks pass rate
   */
  checkChecksPassRate(passRate, testName = null) {
    if (passRate < this.config.checksPassRate.critical) {
      this.alerts.push(new Alert(
        AlertLevel.CRITICAL,
        'checks_pass_rate',
        `Checks pass rate is critically low`,
        `${passRate.toFixed(2)}%`,
        `${this.config.checksPassRate.critical}%`,
        testName
      ));
    } else if (passRate < this.config.checksPassRate.warning) {
      this.alerts.push(new Alert(
        AlertLevel.WARNING,
        'checks_pass_rate',
        `Checks pass rate is below warning threshold`,
        `${passRate.toFixed(2)}%`,
        `${this.config.checksPassRate.warning}%`,
        testName
      ));
    }
  }

  /**
   * Check throughput
   */
  checkThroughput(throughput, testName = null) {
    if (throughput < this.config.throughput.critical) {
      this.alerts.push(new Alert(
        AlertLevel.CRITICAL,
        'throughput',
        `Throughput is critically low`,
        `${throughput.toFixed(2)} req/s`,
        `${this.config.throughput.critical} req/s`,
        testName
      ));
    } else if (throughput < this.config.throughput.warning) {
      this.alerts.push(new Alert(
        AlertLevel.WARNING,
        'throughput',
        `Throughput is below warning threshold`,
        `${throughput.toFixed(2)} req/s`,
        `${this.config.throughput.warning} req/s`,
        testName
      ));
    }
  }

  /**
   * Monitor all metrics from a test result
   */
  monitorTestResult(testResult, testName) {
    this.checkResponseTime(testResult.responseTime.avg, testName);
    this.checkErrorRate(testResult.errorRate, testName);
    this.checkP95ResponseTime(testResult.responseTime.p95, testName);
    this.checkChecksPassRate(testResult.checksPassRate, testName);
    this.checkThroughput(testResult.requestRate, testName);
  }

  /**
   * Get all alerts
   */
  getAlerts() {
    return this.alerts;
  }

  /**
   * Get alerts by level
   */
  getAlertsByLevel(level) {
    return this.alerts.filter(a => a.level === level);
  }

  /**
   * Print alerts to console
   */
  printAlerts() {
    if (this.alerts.length === 0) {
      console.log('✅ No alerts - all metrics within acceptable ranges\n');
      return;
    }

    console.log('\n' + '='.repeat(70));
    console.log('ALERTS');
    console.log('='.repeat(70));

    const critical = this.getAlertsByLevel(AlertLevel.CRITICAL);
    const warnings = this.getAlertsByLevel(AlertLevel.WARNING);
    const info = this.getAlertsByLevel(AlertLevel.INFO);

    if (critical.length > 0) {
      console.log('\n🔴 CRITICAL ALERTS:');
      critical.forEach(alert => console.log('  ' + alert.toString()));
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  WARNING ALERTS:');
      warnings.forEach(alert => console.log('  ' + alert.toString()));
    }

    if (info.length > 0) {
      console.log('\nℹ️  INFO:');
      info.forEach(alert => console.log('  ' + alert.toString()));
    }

    console.log('\n' + '='.repeat(70));
    console.log(`Total Alerts: ${this.alerts.length} (Critical: ${critical.length}, Warning: ${warnings.length}, Info: ${info.length})`);
    console.log('='.repeat(70) + '\n');
  }

  /**
   * Save alerts to file
   */
  saveAlerts(filename) {
    const data = {
      generatedAt: new Date().toISOString(),
      totalAlerts: this.alerts.length,
      criticalCount: this.getAlertsByLevel(AlertLevel.CRITICAL).length,
      warningCount: this.getAlertsByLevel(AlertLevel.WARNING).length,
      infoCount: this.getAlertsByLevel(AlertLevel.INFO).length,
      alerts: this.alerts.map(a => a.toJSON()),
    };

    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`💾 Alerts saved to: ${filename}`);
  }

  /**
   * Generate HTML alert report
   */
  generateHTMLReport(filename) {
    const critical = this.getAlertsByLevel(AlertLevel.CRITICAL);
    const warnings = this.getAlertsByLevel(AlertLevel.WARNING);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>K6 Alert Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #333; border-bottom: 3px solid #667eea; padding-bottom: 10px; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 20px 0; }
    .summary-card { padding: 20px; border-radius: 8px; text-align: center; }
    .summary-card.critical { background: #fee; border: 2px solid #c33; }
    .summary-card.warning { background: #ffeaa7; border: 2px solid #d63031; }
    .summary-card.ok { background: #dfe6e9; border: 2px solid #00b894; }
    .summary-card .number { font-size: 3em; font-weight: bold; margin: 10px 0; }
    .summary-card .label { font-size: 0.9em; text-transform: uppercase; color: #666; }
    .alert-section { margin: 30px 0; }
    .alert-section h2 { color: #667eea; margin-bottom: 15px; }
    .alert { padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid; }
    .alert.critical { background: #fee; border-color: #c33; }
    .alert.warning { background: #ffeaa7; border-color: #d63031; }
    .alert-header { font-weight: bold; margin-bottom: 5px; }
    .alert-details { font-size: 0.9em; color: #666; }
    .no-alerts { text-align: center; padding: 40px; color: #00b894; font-size: 1.2em; }
    .timestamp { text-align: center; color: #999; margin-top: 20px; font-size: 0.9em; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚨 K6 Alert Report</h1>

    <div class="summary">
      <div class="summary-card ${critical.length > 0 ? 'critical' : 'ok'}">
        <div class="label">Critical Alerts</div>
        <div class="number">${critical.length}</div>
      </div>
      <div class="summary-card ${warnings.length > 0 ? 'warning' : 'ok'}">
        <div class="label">Warning Alerts</div>
        <div class="number">${warnings.length}</div>
      </div>
      <div class="summary-card ok">
        <div class="label">Total Alerts</div>
        <div class="number">${this.alerts.length}</div>
      </div>
    </div>

    ${this.alerts.length === 0 ?
      '<div class="no-alerts">✅ No alerts detected! All metrics are within acceptable thresholds.</div>' :
      `
        ${critical.length > 0 ? `
          <div class="alert-section">
            <h2>🔴 Critical Alerts</h2>
            ${critical.map(alert => `
              <div class="alert critical">
                <div class="alert-header">${alert.testName ? `[${alert.testName}] ` : ''}${alert.message}</div>
                <div class="alert-details">
                  Metric: ${alert.metric} | Current: ${alert.currentValue} | Threshold: ${alert.threshold}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${warnings.length > 0 ? `
          <div class="alert-section">
            <h2>⚠️ Warning Alerts</h2>
            ${warnings.map(alert => `
              <div class="alert warning">
                <div class="alert-header">${alert.testName ? `[${alert.testName}] ` : ''}${alert.message}</div>
                <div class="alert-details">
                  Metric: ${alert.metric} | Current: ${alert.currentValue} | Threshold: ${alert.threshold}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      `
    }

    <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
  </div>
</body>
</html>`;

    fs.writeFileSync(filename, html);
    console.log(`📊 HTML alert report saved to: ${filename}`);
  }
}

/**
 * Monitor aggregated results
 */
function monitorAggregatedResults() {
  const AGGREGATED_FILE = path.join(__dirname, '../results/aggregated-report.json');

  if (!fs.existsSync(AGGREGATED_FILE)) {
    console.error('❌ Aggregated report not found. Run aggregate-results.js first.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(AGGREGATED_FILE, 'utf-8'));
  const monitor = new AlertMonitor();

  console.log('🔍 Monitoring test results for alerts...\n');

  // Monitor each test
  Object.keys(data.rawData).forEach(testName => {
    const testResult = data.rawData[testName];
    monitor.monitorTestResult(testResult, testName);
  });

  // Print alerts
  monitor.printAlerts();

  // Save alerts
  const alertsFile = path.join(__dirname, '../results/alerts.json');
  monitor.saveAlerts(alertsFile);

  // Generate HTML report
  const htmlFile = path.join(__dirname, '../results/alert-report.html');
  monitor.generateHTMLReport(htmlFile);

  return monitor;
}

// Run if executed directly
if (require.main === module) {
  monitorAggregatedResults();
}

module.exports = {
  AlertMonitor,
  Alert,
  AlertLevel,
  ALERT_THRESHOLDS,
  monitorAggregatedResults,
};
