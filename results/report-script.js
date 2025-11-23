// Function to parse newline-delimited JSON (NDJSON) from k6 output
function parseNDJSON(text) {
    const lines = text.trim().split('\n');
    const data = [];

    for (const line of lines) {
        try {
            data.push(JSON.parse(line));
        } catch (e) {
            console.error('Error parsing line:', line);
        }
    }

    return data;
}

// Function to calculate statistics from metric values
function calculateStats(values) {
    if (values.length === 0) return { avg: 0, min: 0, max: 0, p50: 0, p90: 0, p95: 0, median: 0 };

    // Sort values for percentile calculations
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    return {
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        p50: sorted[Math.floor(n * 0.5)],
        p90: sorted[Math.floor(n * 0.9)],
        p95: sorted[Math.floor(n * 0.95)],
        median: sorted[Math.floor(n / 2)]
    };
}

// Function to aggregate metrics from raw k6 data
function aggregateMetrics(data) {
    const metrics = {};
    const timestamps = new Set();

    for (const item of data) {
        if (item.type === 'Point') {
            const name = item.metric;
            if (!metrics[name]) {
                metrics[name] = [];
            }
            metrics[name].push(item.data.value);
            timestamps.add(new Date(item.data.time).getTime());
        }
    }

    // Calculate overall test duration in seconds
    const timestampArray = Array.from(timestamps).sort();
    const testDuration = timestampArray.length > 1 
        ? (timestampArray[timestampArray.length - 1] - timestampArray[0]) / 1000 
        : 0;

    return { metrics, testDuration };
}

// Function to populate the HTML report with metrics
function populateReport(metrics, testDuration) {
    // Calculate total requests and failed requests
    const totalRequests = metrics['http_reqs'] ? metrics['http_reqs'].length : 0;
    const failedRequests = metrics['http_req_failed'] ? metrics['http_req_failed'].reduce((sum, val) => sum + val, 0) : 0;
    const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;

    // Calculate average response time
    const responseTimes = metrics['http_req_duration'] || [];
    const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((sum, val) => sum + val, 0) / responseTimes.length
        : 0;

    // Calculate throughput (requests/second)
    const throughput = testDuration > 0 ? totalRequests / testDuration : 0;

    // Update summary cards
    document.querySelector('.card.info:nth-child(1) .card-value').textContent = totalRequests;
    document.querySelector('.card.success:nth-child(2) .card-value').textContent = errorRate.toFixed(2) + '%';
    document.querySelector('.card.success:nth-child(3) .card-value').textContent = Math.round(avgResponseTime);
    document.querySelector('.card:nth-child(4) .card-value').textContent = throughput.toFixed(2);

    // Update response time metrics table
    if (metrics['http_req_duration'] && metrics['http_req_duration'].length > 0) {
        const stats = calculateStats(metrics['http_req_duration']);
        document.querySelector('td.metric-value:nth-child(2)').textContent = Math.round(stats.avg) + 'ms';  // Average
        document.querySelector('td.metric-value:nth-child(3)').textContent = Math.round(stats.min) + 'ms';  // Minimum
        document.querySelector('td.metric-value:nth-child(4)').textContent = Math.round(stats.median) + 'ms';  // Median
        document.querySelector('td.metric-value:nth-child(5)').textContent = Math.round(stats.p90) + 'ms';  // P90
        document.querySelector('td.metric-value:nth-child(6)').textContent = Math.round(stats.p95) + 'ms';  // P95
        document.querySelector('td.metric-value:nth-child(7)').textContent = Math.round(stats.max) + 'ms';  // Maximum
    }

    // Update Request Waiting
    if (metrics['http_req_waiting'] && metrics['http_req_waiting'].length > 0) {
        const stats = calculateStats(metrics['http_req_waiting']);
        const waitingRows = document.querySelectorAll('tr');
        for (let i = 0; i < waitingRows.length; i++) {
            if (waitingRows[i].textContent.includes('Request Waiting')) {
                const tds = waitingRows[i].querySelectorAll('td.metric-value');
                tds[0].textContent = Math.round(stats.avg) + 'ms';  // Average
                tds[1].textContent = Math.round(stats.min) + 'ms';  // Minimum
                tds[2].textContent = Math.round(stats.median) + 'ms';  // Median
                tds[3].textContent = Math.round(stats.p90) + 'ms';  // P90
                tds[4].textContent = Math.round(stats.p95) + 'ms';  // P95
                tds[5].textContent = Math.round(stats.max) + 'ms';  // Maximum
                break;
            }
        }
    }

    // Update Request Blocked
    if (metrics['http_req_blocked'] && metrics['http_req_blocked'].length > 0) {
        const stats = calculateStats(metrics['http_req_blocked']);
        const blockedRows = document.querySelectorAll('tr');
        for (let i = 0; i < blockedRows.length; i++) {
            if (blockedRows[i].textContent.includes('Request Blocked')) {
                const tds = blockedRows[i].querySelectorAll('td.metric-value');
                tds[0].textContent = Math.round(stats.avg) + 'ms';  // Average
                tds[1].textContent = Math.round(stats.min) + 'ms';  // Minimum
                tds[2].textContent = Math.round(stats.median) + 'ms';  // Median
                tds[3].textContent = Math.round(stats.p90) + 'ms';  // P90
                tds[4].textContent = Math.round(stats.p95) + 'ms';  // P95
                tds[5].textContent = Math.round(stats.max) + 'ms';  // Maximum
                break;
            }
        }
    }

    // Update Request Connecting
    if (metrics['http_req_connecting'] && metrics['http_req_connecting'].length > 0) {
        const stats = calculateStats(metrics['http_req_connecting']);
        const connectingRows = document.querySelectorAll('tr');
        for (let i = 0; i < connectingRows.length; i++) {
            if (connectingRows[i].textContent.includes('Request Connecting')) {
                const tds = connectingRows[i].querySelectorAll('td.metric-value');
                tds[0].textContent = Math.round(stats.avg) + 'ms';  // Average
                tds[1].textContent = Math.round(stats.min) + 'ms';  // Minimum
                tds[2].textContent = Math.round(stats.median) + 'ms';  // Median
                tds[3].textContent = Math.round(stats.p90) + 'ms';  // P90
                tds[4].textContent = Math.round(stats.p95) + 'ms';  // P95
                tds[5].textContent = Math.round(stats.max) + 'ms';  // Maximum
                break;
            }
        }
    }

    // Update all metrics table
    const allMetricsTable = document.querySelector('.card:nth-child(4)').parentElement.nextElementSibling.querySelector('tbody');
    const metricRows = allMetricsTable.querySelectorAll('tr');

    for (let i = 0; i < metricRows.length; i++) {
        const metricNameCell = metricRows[i].querySelector('.metric-name');
        const metricValueCell = metricRows[i].querySelector('.metric-value');

        if (metricNameCell && metricValueCell) {
            const metricName = metricNameCell.textContent;

            if (metrics[metricName] && metrics[metricName].length > 0) {
                const metricData = metrics[metricName];
                if (Array.isArray(metricData)) {
                    // For metrics that are counters or rates, show the sum or last value
                    if (['http_reqs', 'vus', 'vus_max', 'checks', 'http_req_failed'].includes(metricName)) {
                        // Use the last value for gauge-like metrics or sum for counter metrics
                        if (['http_reqs', 'http_req_failed'].includes(metricName)) {
                            metricValueCell.textContent = metricData.reduce((sum, val) => sum + val, 0);
                        } else {
                            metricValueCell.textContent = metricData[metricData.length - 1];
                        }
                    } else {
                        // For trend metrics, show the average
                        const avgValue = metricData.reduce((sum, val) => sum + val, 0) / metricData.length;
                        if (['http_req_duration', 'http_req_blocked', 'http_req_connecting', 'http_req_waiting',
                             'http_req_receiving', 'http_req_sending', 'http_req_tls_handshaking'].includes(metricName)) {
                            metricValueCell.textContent = Math.round(avgValue) + 'ms';
                        } else {
                            metricValueCell.textContent = Math.round(avgValue);
                        }
                    }
                } else {
                    metricValueCell.textContent = metricData;
                }
            }
        }
    }

    // Now that data is loaded, hide loading indicator and show content
    const loadingIndicator = document.getElementById('loading-indicator');
    const summarySection = document.querySelector('.summary');
    const responseTimeHeader = document.getElementById('response-time-metrics-header');
    const responseTimeTable = document.getElementById('response-time-metrics-table');
    const allMetricsHeader = document.getElementById('all-metrics-header');
    const allMetricsTable = document.getElementById('all-metrics-table');

    if (loadingIndicator) loadingIndicator.style.display = 'none';
    if (summarySection) summarySection.style.display = 'grid';
    if (responseTimeHeader) responseTimeHeader.style.display = 'block';
    if (responseTimeTable) responseTimeTable.style.display = 'table';
    if (allMetricsHeader) allMetricsHeader.style.display = 'block';
    if (allMetricsTable) allMetricsTable.style.display = 'table';
}

// Function to load and process JSON data
async function loadReportData() {
    try {
        // Determine the JSON file to load based on the HTML filename
        const urlParams = new URLSearchParams(window.location.search);
        let jsonFile = 'auth-test-result.json';  // Default
        
        // Try to determine the JSON file based on the current HTML file name
        const path = window.location.pathname;
        const fileName = path.substring(path.lastIndexOf('/') + 1);
        
        if (fileName.includes('auth-test-report.html')) {
            jsonFile = 'auth-test-result.json';
        } else if (fileName.includes('data-driven-report.html')) {
            jsonFile = 'data-driven-result.json';
        } else if (fileName.includes('load-test-report.html')) {
            jsonFile = 'load-test-result.json';
        } else if (fileName.includes('spike-test-report.html')) {
            jsonFile = 'spike-test-result.json';
        } else if (fileName.includes('stress-test-report.html')) {
            jsonFile = 'stress-test-result.json';
        } else if (fileName.includes('workflow-test-report.html')) {
            jsonFile = 'workflow-test-result.json';
        }
        
        // Load JSON data
        const response = await fetch(jsonFile);
        const text = await response.text();
        
        // Parse the newline-delimited JSON
        const data = parseNDJSON(text);
        
        // Aggregate metrics
        const { metrics, testDuration } = aggregateMetrics(data);
        
        // Populate the HTML report
        populateReport(metrics, testDuration);
        
    } catch (error) {
        console.error('Error loading report data:', error);
        document.body.innerHTML += '<div style="color: red; padding: 20px; text-align: center;">Error loading report data: ' + error.message + '</div>';
    }
}

// Load data when the page loads
document.addEventListener('DOMContentLoaded', loadReportData);