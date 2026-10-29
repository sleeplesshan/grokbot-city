# 모니터링 업데이트 요청 / Monitoring update requests

모니터링 화면의 **업데이트 요청**은 메인봇에게 전체 업무의 실제 상태를 확인하라는 변경함 요청을 보냅니다. 검색·상태 필터와 관계없이 전체 모니터링을 대상으로 하며, 봇 자동 기동이나 업무 실행 허가는 아닙니다. 대기 요청은 하나만 유지됩니다. 정상적인 시작·단계 전환·완료 보고는 계속 자발적으로 수행하세요.

메인봇은 `node scripts/bot.mjs sync --bot bot-0` 또는 `inbox`에서 `kind:"monitor"`를 확인합니다. 실제 진행 중인 업무와 모니터링 요약을 대조하고, 필요한 항목만 `task.get`으로 읽습니다. 원격 담당자에게 확인할 수 있는 경로로 현황을 받아 기존 `node.update` / `subtask.upsert` / `task.report` 규약에 따라 반영합니다. 완료율을 추정하거나 새 업무 실행·루틴 재개로 해석하지 마세요.

저장 결과까지 확인한 후 아래 JSON을 파일로 저장하고 완료 처리합니다. 확인 결과 변경이 없으면 그 사실을 summary에 적습니다. 확인·저장에 실패한 업무가 있으면 요청을 완료하지 말고 장애를 보고하며 요청을 대기로 유지합니다.

```json
{"id":"INBOX_EVENT_ID","requestId":"unique-monitor-ack","summary":"담당자 확인 및 2개 업무 상태 반영 완료. 나머지 업무는 변경 없음."}
```

```sh
node scripts/bot.mjs monitor.ack --file monitor-ack.json --bot bot-0 --workspace live
```

`monitor.request`는 화면 사용자 전용이며 `{requestId}`를 받습니다. `monitor.ack`는 메인봇 전용이며 `{id,requestId,summary}`를 받습니다. summary는 1–2000자입니다. 같은 requestId와 payload의 재시도는 같은 결과를 반환합니다. 오류: 400 필수 입력 누락/길이 초과, 403 권한 없음, 404 요청 없음, 409 이미 처리한 요청/요청 ID 재사용 충돌. 완료 이력에는 요청 시각·처리 시각·summary가 보존됩니다. 화면은 기존 SSE로 대기 표시를 갱신합니다.

## English

**Request update** queues a main-bot inbox request to reconcile all monitoring tasks, regardless of the current search or status filter. It neither launches a bot nor authorizes new work. Only one request remains pending. Continue normal voluntary start, milestone and completion reporting.

The main bot reads `kind:"monitor"` through `sync` or `inbox`, compares actual work with task summaries, and fetches only relevant tasks. Obtain evidence from remote owners through an available communication path. Apply changes using existing node/subtask/task reporting commands, then verify successful writes. Do not invent percentages, start new work or restart routines.

After completing the review, use `monitor.ack` with the inbox event ID, a unique requestId and a summary (1–2000 characters). If no changes were needed, state that in the summary. If any required review or write remains blocked, report the blocker and leave the request pending. See the JSON and CLI examples above.

`monitor.request` accepts `{requestId}` from browser users only; `monitor.ack` accepts `{id,requestId,summary}` from the main bot only. Identical retries are idempotent. Errors: 400 invalid input, 403 forbidden, 404 missing request, 409 closed request or conflicting requestId. Requests retain timestamps and completion summaries; existing SSE updates the pending button state.
