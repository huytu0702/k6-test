# Test Results Summary - Petstore API Performance Testing

**Test Date**: November 24, 2025
**API Base URL**: https://petstore.swagger.io/v2
**K6 Version**: v0.52.0

---

## Executive Summary

Đã thực hiện 3 loại kiểm thử hiệu năng chính cho Petstore API:
1. **Load Testing** - Kiểm thử với tải thông thường
2. **Stress Testing** - Kiểm thử với tải vượt ngưỡng
3. **Spike Testing** - Kiểm thử với tải đột biến

### Key Findings

- API hoạt động ổn định với tải thông thường
- Response time trung bình: ~255ms
- Throughput: 5-20 requests/second
- Error rate cao (~50-60%) do nhiều pet ID random không tồn tại (404 responses)

---

## 1. Load Test Results

**Duration**: 3 minutes 30 seconds
**Max Virtual Users**: 10
**Total Requests**: 1,069

### Metrics

| Metric | Value |
|--------|-------|
| Total Requests | 1,069 |
| Failed Requests | 48.17% |
| Avg Response Time | 255.06ms |
| P95 Response Time | 275.84ms |
| P99 Response Time | 275.84ms |
| Throughput | 5.07 req/s |

### Endpoints Distribution

- **GET /pet/{petId}**: 50% traffic
- **POST /pet**: 30% traffic
- **GET /store/inventory**: 20% traffic

### Analysis

**Strengths**:
- Response time nhất quán (~255ms average)
- P95 và P99 nằm trong ngưỡng chấp nhận được (<500ms target)
- Không có timeout

**Weaknesses**:
- Error rate cao (48%) do pet ID random không tồn tại
- Throughput thấp hơn mục tiêu (target: 10 req/s, actual: 5 req/s)

**Recommendations**:
- Sử dụng danh sách pet ID đã biết để giảm 404 errors
- Tối ưu hóa test data để tăng success rate

---

## 2. Stress Test Results

**Duration**: 3 minutes 30 seconds
**Max Virtual Users**: 20
**Total Requests**: 3,539

### Metrics

| Metric | Value |
|--------|-------|
| Total Requests | 3,539 |
| Failed Requests | 54.11% |
| Avg Response Time | 253.70ms |
| P95 Response Time | 278.04ms |
| P99 Response Time | 278.04ms |
| Throughput | 16.84 req/s |
| Timeouts | 0 |
| Server Errors (5xx) | 0 |

### Load Pattern

- Stage 1: Ramp to 10 users (30s + 1m)
- Stage 2: Ramp to 20 users (30s + 1m)
- Ramp down: 30s

### Analysis

**Strengths**:
- API scale tốt khi tăng tải lên 20 concurrent users
- Không có server errors (5xx)
- Không có timeouts
- Response time ổn định (~254ms) ngay cả khi tăng tải

**Breaking Point**:
- Chưa đạt breaking point ở mức 20 users
- Hệ thống vẫn stable với error rate chủ yếu từ 404 (not found)

**Recommendations**:
- Test với load cao hơn (50-100 users) để tìm breaking point thực sự
- Monitor server resources (CPU, memory) trong production

---

## 3. Spike Test Results

**Duration**: 2 minutes 45 seconds
**Max Virtual Users**: 30
**Total Requests**: 3,191

### Metrics

| Metric | Value |
|--------|-------|
| Total Requests | 3,191 |
| Failed Requests | 63.92% |
| Avg Response Time | 257.23ms |
| P95 Response Time | 278.28ms |
| P99 Response Time | 278.28ms |
| Throughput | 19.34 req/s |

### Spike Pattern

- Normal load: 5 users (30s)
- **SPIKE**: 5 → 30 users (15s)
- High load: 30 users (1m)
- Recovery: 30 → 5 users (30s)
- Ramp down: 30s

### Analysis

**Spike Handling**:
- API xử lý tốt spike đột ngột từ 5 lên 30 users
- Response time vẫn nhất quán (~257ms)
- Không có degradation nghiêm trọng

**Recovery**:
- Recovery time tốt khi giảm load
- Không có "hung" state sau spike

**Recommendations**:
- API có thể handle traffic spikes tốt
- Cân nhắc implement rate limiting để bảo vệ khỏi abuse

---

## Overall Performance Assessment

### Response Time

| Percentile | Target | Actual | Status |
|------------|--------|--------|--------|
| Average | <300ms | ~255ms | ✓ PASS |
| P95 | <500ms | ~276ms | ✓ PASS |
| P99 | <1000ms | ~278ms | ✓ PASS |

### Throughput

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Requests/sec | >10 | 5-19 | ⚠ VARIES |

### Error Rate

| Test Type | Error Rate | Note |
|-----------|------------|------|
| Load Test | 48% | Mostly 404 errors |
| Stress Test | 54% | Mostly 404 errors |
| Spike Test | 64% | Mostly 404 errors |

**Note**: Error rate cao chủ yếu do test methodology (random pet IDs). Actual API availability và stability tốt.

---

## Recommendations

### Short-term
1. **Improve test data**: Sử dụng pet IDs đã biết tồn tại
2. **Add monitoring**: Setup real-time monitoring dashboard
3. **Document baselines**: Establish performance baselines

### Long-term
1. **Auto-scaling**: Implement auto-scaling dựa trên load
2. **Caching**: Consider caching for frequently accessed pets
3. **Rate limiting**: Protect API from abuse
4. **Performance budget**: Set and enforce performance budgets

---

## Test Coverage

### Completed ✓
- [x] Load Testing
- [x] Stress Testing
- [x] Spike Testing
- [x] Custom Metrics
- [x] Thresholds & Checks
- [x] HTML Reports
- [x] JSON Results

### Advanced Tests ✓
- [x] Workflow Testing (lifecycle tests)
- [x] Data-driven Testing (JSON data files)

### Future Tests
- [ ] Soak Testing (extended duration)
- [ ] Concurrent API workflows
- [ ] Geographic distribution testing
- [ ] CI/CD integration

---

## Files Generated

### Test Scripts
- `scripts/load-test.js` (full version)
- `scripts/stress-test.js` (full version)
- `scripts/spike-test.js` (full version)
- `scripts/*-short.js` (demo versions)
- `scripts/advanced/workflow-test.js`
- `scripts/advanced/data-driven.js`

### Test Results
- `results/load-test-result.json` (4.4 MB)
- `results/stress-test-result.json` (13 MB)
- `results/spike-test-result.json` (12 MB)

### Reports
- `results/load-test-report.html`
- `results/stress-test-report.html`
- `results/spike-test-report.html`

### Utilities
- `utils/config.js` (configuration)
- `utils/helpers.js` (helper functions)
- `utils/generate-report.js` (HTML report generator)

---

## Conclusion

Petstore API cho thấy hiệu năng ổn định và khả năng scale tốt trong các điều kiện kiểm thử:

**Pros**:
- Response time nhất quán và nhanh (~255ms)
- Không có timeouts hay server errors
- Scale tốt với increased load
- Handle traffic spikes hiệu quả

**Cons**:
- Error rate cao do test methodology (có thể cải thiện)
- Throughput thấp hơn mong đợi ở load tests

**Overall Rating**: **7.5/10**

API sẵn sàng cho production với monitoring và tuning thích hợp.
