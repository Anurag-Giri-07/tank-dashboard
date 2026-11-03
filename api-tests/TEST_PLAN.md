# Device API test plan

Use mocked `fetch` responses when automated tests are added. Each status response should be tested through `getStatus(deviceId, token)`.

| ID     | Scenario                                                                   | Type     | Expected result                                                                             |
| ------ | -------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------- |
| API-01 | Login succeeds and a valid device status is returned.                      | positive | `login()` returns the token; `getStatus()` returns the status and `last_seen_stale: false`. |
| API-02 | A request uses an invalid token.                                           | negative | `getStatus()` throws `Unauthorised: the token is invalid or expired.` for HTTP 401.         |
| API-03 | A request uses an expired token.                                           | negative | `getStatus()` throws the same clear unauthorised error for HTTP 401.                        |
| API-04 | The requested device ID does not exist.                                    | negative | `getStatus()` throws `Device not found: <id>.` for HTTP 404.                                |
| API-05 | The device is offline, returns 503/504, or the request exceeds 10 seconds. | negative | `getStatus()` throws a clear offline or timeout error.                                      |
| API-06 | The status endpoint returns invalid JSON.                                  | negative | `getStatus()` throws a malformed-JSON error.                                                |
| API-07 | The status JSON is missing `level_percent`, `pump_state`, or `last_seen`.  | negative | `getStatus()` throws an error naming the missing required field(s).                         |
| API-08 | `level_percent` is below 0, above 100, or not a number.                    | edge     | `getStatus()` throws a range-validation error.                                              |
| API-09 | `pump_state` has a value other than `on` or `off`.                         | negative | `getStatus()` throws a pump-state validation error.                                         |
| API-10 | `last_seen` is more than 10 minutes old.                                   | edge     | `getStatus()` returns the valid status with `last_seen_stale: true`; it does not throw.     |
