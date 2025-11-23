# K6 Performance Testing for Petstore API

Dự án kiểm thử hiệu năng cho Petstore API sử dụng K6.

## Tổng quan

API được test: **Petstore API** (https://petstore.swagger.io/)

Mục tiêu: Thực hiện đầy đủ các loại kiểm thử hiệu năng bao gồm Load Testing, Stress Testing, và Spike Testing.

## Cấu trúc thư mục

```
k6-test/
├── scripts/              # Test scripts
│   ├── load-test.js      # Load testing
│   ├── stress-test.js    # Stress testing
│   ├── spike-test.js     # Spike testing
│   └── advanced/         # Advanced test scenarios
├── data/                 # Test data files
│   └── pets.json         # Sample pet data
├── utils/                # Utilities and helpers
│   ├── config.js         # Configuration
│   └── helpers.js        # Helper functions
├── results/              # Test results (gitignored)
└── docs/                 # Documentation
```

## Cài đặt K6

### Windows (Chocolatey)
```powershell
choco install k6
```

### Windows (Scoop)
```powershell
scoop install k6
```

### Windows (Download binary)
Download từ: https://github.com/grafana/k6/releases

## API Endpoints được test

Base URL: `https://petstore.swagger.io/v2`

- **GET** `/pet/{petId}` - Lấy thông tin pet
- **POST** `/pet` - Tạo pet mới
- **PUT** `/pet` - Cập nhật pet
- **DELETE** `/pet/{petId}` - Xóa pet
- **GET** `/store/inventory` - Lấy inventory
- **POST** `/store/order` - Tạo order
- **GET** `/user/{username}` - Lấy thông tin user

API Key: `special-key`

## Chạy tests

### Basic Tests

#### Load Test (Short version - 3.5 minutes)
```bash
k6 run scripts/load-test-short.js
```

#### Stress Test (Short version - 3.5 minutes)
```bash
k6 run scripts/stress-test-short.js
```

#### Spike Test (Short version - 2.75 minutes)
```bash
k6 run scripts/spike-test-short.js
```

### Full Duration Tests

#### Load Test (Full - 16 minutes)
```bash
k6 run scripts/load-test.js
```

#### Stress Test (Full - 24 minutes)
```bash
k6 run scripts/stress-test.js
```

#### Spike Test (Full - 7.5 minutes)
```bash
k6 run scripts/spike-test.js
```

### Advanced Tests

#### Workflow Test - Complete pet lifecycle
```bash
k6 run scripts/advanced/workflow-test.js
```

#### Data-Driven Test - Using JSON data
```bash
k6 run scripts/advanced/data-driven.js
```

### Export kết quả

#### JSON Output
```bash
k6 run --out json=results/load-test.json scripts/load-test-short.js
```

#### Generate HTML Report
```bash
# Run test with JSON output first
k6 run --out json=results/test.json scripts/load-test-short.js

# Generate HTML report from JSON
node utils/generate-report.js results/test.json results/test-report.html
```

#### Multiple outputs
```bash
k6 run --out json=results/test.json scripts/load-test-short.js
node utils/generate-report.js results/test.json results/report.html
```

## Mục tiêu hiệu năng

- **Response Time**: p95 < 500ms, p99 < 1000ms
- **Error Rate**: < 5%
- **Throughput**: > 10 requests/second
- **Success Rate**: > 95%

## Kết quả Tests

Xem kết quả chi tiết tại:
- [Test Results Summary](docs/test-results-summary.md) - Tóm tắt kết quả các tests đã chạy
- [API Endpoints Documentation](docs/api-endpoints.md) - Chi tiết về các endpoints được test

HTML Reports được generate tại thư mục `results/`:
- `results/load-test-report.html`
- `results/stress-test-report.html`
- `results/spike-test-report.html`

## Scripts có sẵn

### Basic Test Scripts
- `scripts/load-test.js` - Load test (full duration)
- `scripts/load-test-short.js` - Load test (demo version)
- `scripts/stress-test.js` - Stress test (full duration)
- `scripts/stress-test-short.js` - Stress test (demo version)
- `scripts/spike-test.js` - Spike test (full duration)
- `scripts/spike-test-short.js` - Spike test (demo version)

### Advanced Test Scripts
- `scripts/advanced/workflow-test.js` - Test complete API workflows
- `scripts/advanced/data-driven.js` - Data-driven tests with JSON data

### Utilities
- `utils/config.js` - Configuration constants
- `utils/helpers.js` - Helper functions
- `utils/generate-report.js` - HTML report generator

## Quick Start

1. **Cài đặt K6** (nếu chưa có):
   ```bash
   choco install k6
   ```

2. **Clone/Download dự án này**

3. **Chạy test nhanh**:
   ```bash
   # Windows - nếu K6 đã cài đặt globally
   k6 run scripts/load-test-short.js

   # Hoặc sử dụng binary có sẵn
   ./k6-v0.52.0-windows-amd64/k6.exe run scripts/load-test-short.js
   ```

4. **Generate HTML report**:
   ```bash
   # Run test với JSON output
   k6 run --out json=results/my-test.json scripts/load-test-short.js

   # Generate HTML
   node utils/generate-report.js results/my-test.json results/my-report.html
   ```

5. **Mở HTML report trong browser** để xem kết quả

## Features Đã Implement

### Phase 1: Chuẩn bị & Thiết lập
- [x] K6 installation và verification
- [x] Project structure
- [x] Configuration files
- [x] Helper utilities
- [x] Test data files
- [x] Documentation

### Phase 2: Test Scenarios Cơ Bản
- [x] Load Testing scripts
- [x] Stress Testing scripts
- [x] Spike Testing scripts
- [x] Đã chạy và thu thập kết quả
- [x] JSON results generated

### Phase 3: Metrics & Analysis
- [x] Checks implementation
- [x] Thresholds configuration
- [x] Custom metrics (Rate, Trend, Counter)
- [x] Tags for categorization
- [x] HTML report generation
- [x] Test results summary

### Phase 4: Advanced Tests
- [x] Workflow testing (CRUD lifecycle)
- [x] Data-driven testing with JSON
- [x] Authentication testing
- [x] Multiple test scenarios

### Phase 5: Monitoring & Automation
- [x] Custom monitoring utilities
- [x] Results aggregation system
- [x] Automated alerting system
- [x] HTML dashboards
- [x] K6 Cloud integration guide
- [x] Monitored test examples

## Monitoring & Alerts

### Generate Monitoring Dashboard

Tổng hợp tất cả kết quả tests và tạo dashboard:

```bash
# Aggregate all test results
node utils/aggregate-results.js

# Output:
# - results/aggregated-report.json
# - results/monitoring-dashboard.html
```

### Check Alerts

Kiểm tra alerts dựa trên thresholds:

```bash
# Monitor and generate alerts
node utils/alert-monitor.js

# Output:
# - results/alerts.json
# - results/alert-report.html
```

### Run Monitored Test

Test với monitoring features tích hợp:

```bash
./k6-v0.52.0-windows-amd64/k6.exe run scripts/monitored-load-test.js
```

## Tài liệu tham khảo

### Official Documentation
- [K6 Documentation](https://k6.io/docs/)
- [Petstore API Documentation](https://petstore.swagger.io/)

### Project Documentation
- [Test Results Summary](docs/test-results-summary.md) - Tóm tắt kết quả Phase 2 & 3
- [API Endpoints Guide](docs/api-endpoints.md) - Chi tiết endpoints
- [Phase 4 Advanced Testing Report](docs/phase4-advanced-testing-report.md) - Báo cáo kiểm thử nâng cao
- [Phase 5 Monitoring & Automation Report](docs/phase5-monitoring-automation-report.md) - Báo cáo monitoring
- [K6 Cloud Integration Guide](docs/k6-cloud-integration.md) - Hướng dẫn K6 Cloud

## License

MIT License - Dự án học tập và demo
