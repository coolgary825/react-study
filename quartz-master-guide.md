# 🎯 Quartz Scheduler 마스터 가이드

> Spring Boot + Quartz + PostgreSQL 환경 기준  
> 강의 제작 및 학습 정리용 문서

---

## 📚 목차

1. [Quartz 개요](#1-quartz-개요)
2. [핵심 아키텍처](#2-핵심-아키텍처)
3. [주요 클래스 & 인터페이스](#3-주요-클래스--인터페이스)
4. [데이터베이스 테이블 구조](#4-데이터베이스-테이블-구조)
5. [Spring Boot 환경 설정](#5-spring-boot-환경-설정)
6. [Job Group 활용 전략](#6-job-group-활용-전략)
7. [트러블슈팅 & 실무 팁](#7-트러블슈팅--실무-팁)
8. [강의 커리큘럼 제안](#8-강의-커리큘럼-제안)

---

## 1. Quartz 개요

### 1.1 Quartz란?

Java 기반의 오픈 소스 **작업 스케줄링 라이브러리**

**주요 활용 사례:**
- 정기 데이터 동기화/백업
- 정산 배치 처리
- 이메일/알림 발송
- 리포트 생성
- 데이터 정리(Clean-up)

### 1.2 JobStore 종류

| JobStore | 특징 | 사용 상황 |
|----------|------|----------|
| **RAMJobStore** | 메모리 저장, 빠름, 재시작 시 데이터 소실 | 개발/테스트, 임시 작업 |
| **JDBCJobStore** | DB 저장, 영속성 보장, 클러스터링 지원 | 운영 환경, 미션 크리티컬 |

### 1.3 JDBCJobStore 세부 타입

| 타입 | 설명 |
|------|------|
| **JobStoreTX** | Quartz가 직접 트랜잭션 관리 (일반적) |
| **JobStoreCMT** | 컨테이너(JTA) 트랜잭션 관리 (EJB 환경) |

---

## 2. 핵심 아키텍처

### 2.1 구성 요소 관계

```
┌─────────────────────────────────────────────────────────────┐
│                        Scheduler                             │
│  ┌─────────────────┐        ┌─────────────────┐             │
│  │   JobDetail     │◄──────►│    Trigger      │             │
│  │  (Job 메타정보)  │        │  (실행 시점)     │             │
│  └────────┬────────┘        └─────────────────┘             │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────┐                                        │
│  │      Job        │ ◄── 실제 작업 로직 (execute 메서드)     │
│  │  (구현 클래스)   │                                        │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 실행 흐름

```
1. Scheduler 시작
       ↓
2. Trigger 조건 확인 (NEXT_FIRE_TIME)
       ↓
3. 조건 충족 시 JobDetail 조회
       ↓
4. Job 인스턴스 생성 & execute() 호출
       ↓
5. JobListener 콜백 (전/후 처리)
       ↓
6. 다음 실행 시간 계산 & 업데이트
```

---

## 3. 주요 클래스 & 인터페이스

### 3.1 Job 관련

| 클래스/인터페이스 | 역할 |
|------------------|------|
| **Job** | 실행할 작업 정의 인터페이스 (`execute()` 메서드) |
| **JobDetail** | Job의 메타정보 (이름, 그룹, 클래스, 데이터) |
| **JobBuilder** | JobDetail 인스턴스 생성 빌더 |
| **JobDataMap** | Job 실행 시 필요한 데이터 저장 (Map 형태) |
| **JobListener** | Job 생명주기 이벤트 처리 |
| **JobKey** | Job 식별자 (name + group) |

### 3.2 Trigger 관련

| 클래스/인터페이스 | 역할 |
|------------------|------|
| **Trigger** | 작업 실행 시점 결정 인터페이스 |
| **SimpleTrigger** | 단순 반복 (N초마다, N회 반복) |
| **CronTrigger** | Cron 표현식 기반 복잡한 스케줄 |
| **TriggerBuilder** | Trigger 인스턴스 생성 빌더 |
| **SimpleScheduleBuilder** | SimpleTrigger 스케줄 정의 |
| **CronScheduleBuilder** | CronTrigger 스케줄 정의 |
| **TriggerKey** | Trigger 식별자 (name + group) |

### 3.3 Scheduler 관련

| 클래스/인터페이스 | 역할 |
|------------------|------|
| **Scheduler** | Job/Trigger 관리 및 실행 메인 인터페이스 |
| **StdSchedulerFactory** | Scheduler 인스턴스 생성 팩토리 |
| **SchedulerFactory** | 팩토리 인터페이스 |

### 3.4 코드 예시

```java
// Job 구현
public class MyJob implements Job {
    @Override
    public void execute(JobExecutionContext context) {
        JobDataMap dataMap = context.getJobDetail().getJobDataMap();
        String param = dataMap.getString("param");
        System.out.println("Job 실행: " + param);
    }
}

// JobDetail 생성
JobDetail job = JobBuilder.newJob(MyJob.class)
    .withIdentity("myJob", "ORDER")           // name, group
    .withDescription("주문 처리 배치")
    .usingJobData("param", "테스트값")
    .storeDurably(true)
    .build();

// SimpleTrigger 생성
Trigger simpleTrigger = TriggerBuilder.newTrigger()
    .withIdentity("myTrigger", "ORDER")
    .startNow()
    .withSchedule(SimpleScheduleBuilder.simpleSchedule()
        .withIntervalInSeconds(10)
        .repeatForever())
    .build();

// CronTrigger 생성 (매일 오전 9시)
CronTrigger cronTrigger = TriggerBuilder.newTrigger()
    .withIdentity("dailyTrigger", "ORDER")
    .withSchedule(CronScheduleBuilder.cronSchedule("0 0 9 * * ?"))
    .build();

// 스케줄러 등록 & 실행
Scheduler scheduler = new StdSchedulerFactory().getScheduler();
scheduler.start();
scheduler.scheduleJob(job, cronTrigger);
```

---

## 4. 데이터베이스 테이블 구조

### 4.1 테이블 개요 (총 11개)

공식 DDL 스크립트는 11개 테이블을 모두 생성하며, **필수/선택 구분은 공식 문서에 명시되어 있지 않음**.

실무적 관점에서 분류:

#### 핵심 테이블 (7개) - 기본 동작에 필수

| 테이블 | 설명 |
|--------|------|
| **QRTZ_JOB_DETAILS** | Job 기본 정보 (클래스명, 그룹, 실행 옵션) |
| **QRTZ_TRIGGERS** | Trigger 기본 정보 (다음 실행 시간, 상태, 우선순위) |
| **QRTZ_CRON_TRIGGERS** | Cron 표현식 트리거 정보 |
| **QRTZ_SIMPLE_TRIGGERS** | 단순 반복 트리거 정보 (횟수, 간격) |
| **QRTZ_FIRED_TRIGGERS** | 현재 실행 중인 트리거 정보 |
| **QRTZ_SCHEDULER_STATE** | 클러스터 환경 스케줄러 인스턴스 상태 |
| **QRTZ_LOCKS** | 트랜잭션 동기화 및 동시 실행 방지 |

#### 부가 테이블 (4개) - 특정 기능 사용 시 필요

| 테이블 | 설명 |
|--------|------|
| **QRTZ_BLOB_TRIGGERS** | Blob 데이터로 저장된 커스텀 트리거 |
| **QRTZ_SIMPROP_TRIGGERS** | 추가적인 심플 프로퍼티 트리거 |
| **QRTZ_PAUSED_TRIGGER_GRPS** | 일시정지된 트리거 그룹 목록 |
| **QRTZ_CALENDARS** | Quartz 캘린더 정보 (휴일 제외 등) |

### 4.2 주요 테이블 조회 쿼리

```sql
-- Job 상세 정보
SELECT * FROM qrtz_job_details qjd;

-- 트리거 정보
SELECT * FROM qrtz_triggers qt;

-- Cron 트리거
SELECT * FROM qrtz_cron_triggers qct;

-- 현재 실행 중인 트리거
SELECT * FROM qrtz_fired_triggers qft;

-- 스케줄러 상태 (클러스터링)
SELECT * FROM qrtz_scheduler_state qss;

-- Lock 정보
SELECT * FROM qrtz_locks ql;

-- Job + Trigger 조인 조회
SELECT 
    jd.job_name,
    jd.job_group,
    t.trigger_name,
    t.trigger_state,
    t.next_fire_time,
    t.prev_fire_time
FROM qrtz_job_details jd
JOIN qrtz_triggers t 
    ON jd.sched_name = t.sched_name 
    AND jd.job_name = t.job_name 
    AND jd.job_group = t.job_group;
```

### 4.3 테이블 Prefix 커스터마이징

```yaml
spring:
  quartz:
    properties:
      org:
        quartz:
          jobStore:
            tablePrefix: CUSTOM_PREFIX_  # 기본값: QRTZ_
```

---

## 5. Spring Boot 환경 설정

### 5.1 의존성 추가

```groovy
// build.gradle
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-quartz'
    implementation 'org.postgresql:postgresql'
}
```

### 5.2 application.yml 설정

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/mydb
    username: myuser
    password: mypass
    driver-class-name: org.postgresql.Driver

  quartz:
    job-store-type: jdbc                    # jdbc 또는 memory
    jdbc:
      initialize-schema: always             # always, never, embedded
    properties:
      org:
        quartz:
          scheduler:
            instanceName: MyScheduler
            instanceId: AUTO                # 클러스터링 시 자동 ID 생성
          jobStore:
            class: org.quartz.impl.jdbcjobstore.JobStoreTX
            driverDelegateClass: org.quartz.impl.jdbcjobstore.PostgreSQLDelegate
            tablePrefix: QRTZ_
            isClustered: true               # 클러스터링 활성화
            clusterCheckinInterval: 20000   # 클러스터 체크인 간격 (ms)
            useProperties: "true"           # ⭐ BYTEA 이슈 해결 핵심
          threadPool:
            class: org.quartz.simpl.SimpleThreadPool
            threadCount: 10
            threadPriority: 5
```

### 5.3 BYTEA 직렬화 이슈 해결

**문제 상황:**
```
PSQLException: Bad value for type long : \x
JobPersistenceException: Couldn't retrieve trigger
```

**원인:** PostgreSQL BYTEA 타입과 Java 객체 직렬화 충돌

**해결책:**

```yaml
# 방법 1: useProperties 설정 (권장)
spring:
  quartz:
    properties:
      org:
        quartz:
          jobStore:
            useProperties: "true"
```

```java
// 방법 2: JobDataMap에 primitive/String만 사용
jobDataMap.put("param", "테스트 파라미터");           // ✅ OK
jobDataMap.put("registeredAt", "2024-12-23T15:30:00"); // ✅ OK (String)
jobDataMap.put("config", objectMapper.writeValueAsString(obj)); // ✅ JSON 문자열

jobDataMap.put("dateTime", LocalDateTime.now());      // ❌ 직렬화 문제
jobDataMap.put("myObject", new MyComplexObject());    // ❌ 직렬화 문제
```

---

## 6. Job Group 활용 전략

### 6.1 그룹 단위 관리의 장점

- **논리적 분류**: 도메인/업무 단위로 Job 구분
- **일괄 제어**: 특정 그룹 전체 일시정지/재개
- **모니터링**: 그룹별 실행 현황 조회

### 6.2 실무 그룹 네이밍 예시

| 그룹명 | 용도 |
|--------|------|
| `ORDER` | 주문 처리 배치 |
| `SETTLEMENT` | 정산 배치 |
| `NOTIFICATION` | 알림/메일 발송 |
| `SYNC` | 외부 시스템 동기화 |
| `CLEANUP` | 데이터 정리/삭제 |
| `REPORT` | 리포트 생성 |
| `BATCH_DAILY` | 일간 배치 |
| `BATCH_MONTHLY` | 월간 배치 |

### 6.3 그룹 제어 API

```java
// 그룹 단위 일시정지
scheduler.pauseJobs(GroupMatcher.jobGroupEquals("SETTLEMENT"));

// 그룹 단위 재개
scheduler.resumeJobs(GroupMatcher.jobGroupEquals("SETTLEMENT"));

// 특정 그룹 Job 목록 조회
Set<JobKey> orderJobs = scheduler.getJobKeys(
    GroupMatcher.jobGroupEquals("ORDER")
);

// 특정 그룹 Job 전체 삭제
for (JobKey jobKey : orderJobs) {
    scheduler.deleteJob(jobKey);
}
```

---

## 7. 트러블슈팅 & 실무 팁

### 7.1 자주 발생하는 문제

| 문제 | 원인 | 해결책 |
|------|------|--------|
| `Bad value for type long` | BYTEA 직렬화 | `useProperties: true` 설정 |
| Job 중복 실행 | 클러스터 설정 미흡 | `isClustered: true` 확인 |
| Misfire 발생 | 실행 시간 놓침 | misfire 정책 설정 |
| 테이블 없음 오류 | 스키마 미생성 | `initialize-schema: always` |

### 7.2 Misfire 처리 전략

```java
// SimpleTrigger Misfire 정책
SimpleScheduleBuilder.simpleSchedule()
    .withMisfireHandlingInstructionFireNow()           // 즉시 실행
    .withMisfireHandlingInstructionIgnoreMisfires()    // 무시하고 계속
    .withMisfireHandlingInstructionNextWithExistingCount() // 다음 스케줄

// CronTrigger Misfire 정책
CronScheduleBuilder.cronSchedule("0 0 9 * * ?")
    .withMisfireHandlingInstructionFireAndProceed()    // 한 번 실행 후 계속
    .withMisfireHandlingInstructionDoNothing()         // 아무것도 안 함
    .withMisfireHandlingInstructionIgnoreMisfires()    // 무시
```

### 7.3 모니터링 쿼리

```sql
-- 실행 대기 중인 트리거
SELECT trigger_name, trigger_group, next_fire_time,
       to_timestamp(next_fire_time/1000) as next_fire_datetime
FROM qrtz_triggers
WHERE trigger_state = 'WAITING'
ORDER BY next_fire_time;

-- 현재 실행 중인 Job
SELECT job_name, job_group, fired_time,
       to_timestamp(fired_time/1000) as fired_datetime
FROM qrtz_fired_triggers;

-- 에러 상태 트리거
SELECT * FROM qrtz_triggers WHERE trigger_state = 'ERROR';

-- 스케줄러 인스턴스 상태 (클러스터링)
SELECT instance_name, last_checkin_time,
       to_timestamp(last_checkin_time/1000) as last_checkin
FROM qrtz_scheduler_state;
```

### 7.4 동시 실행 방지

```java
@DisallowConcurrentExecution  // 동일 JobDetail의 동시 실행 방지
@PersistJobDataAfterExecution // 실행 후 JobDataMap 변경 저장
public class MyJob implements Job {
    @Override
    public void execute(JobExecutionContext context) {
        // 작업 로직
    }
}
```

---

## 8. 강의 커리큘럼 제안

### 📘 입문편 (2시간)

| 순서 | 주제 | 시간 |
|------|------|------|
| 1 | Quartz 개요 & 스케줄링 개념 | 20분 |
| 2 | Job, Trigger, Scheduler 핵심 개념 | 30분 |
| 3 | Spring Boot + Quartz 기본 설정 | 30분 |
| 4 | 첫 번째 배치 Job 만들기 (실습) | 40분 |

### 📗 중급편 (3시간)

| 순서 | 주제 | 시간 |
|------|------|------|
| 1 | JDBCJobStore & PostgreSQL 연동 | 30분 |
| 2 | 테이블 구조 & 데이터 흐름 이해 | 30분 |
| 3 | Cron 표현식 마스터 | 30분 |
| 4 | JobDataMap & 파라미터 전달 | 30분 |
| 5 | Job Group 전략 & 운영 | 30분 |
| 6 | 실무 배치 Job 구현 (실습) | 30분 |

### 📕 고급편 (3시간)

| 순서 | 주제 | 시간 |
|------|------|------|
| 1 | 클러스터링 환경 구성 | 40분 |
| 2 | Misfire 처리 전략 | 30분 |
| 3 | JobListener & 생명주기 관리 | 30분 |
| 4 | 동적 Job 등록/수정/삭제 API | 40분 |
| 5 | 모니터링 & 트러블슈팅 | 30분 |
| 6 | 운영 환경 베스트 프랙티스 | 10분 |

### 📙 실전 프로젝트 (4시간)

| 순서 | 주제 | 시간 |
|------|------|------|
| 1 | 요구사항 분석 & 설계 | 30분 |
| 2 | 정산 배치 시스템 구현 | 90분 |
| 3 | 알림 발송 배치 구현 | 60분 |
| 4 | 관리자 대시보드 구현 | 60분 |

---

## 📎 참고 자료

### 공식 문서
- [Quartz Scheduler 공식 문서](https://www.quartz-scheduler.org/documentation/)
- [Quartz API Documentation](https://www.quartz-scheduler.org/api/2.3.0/)
- [Spring Boot Quartz 가이드](https://docs.spring.io/spring-boot/docs/current/reference/html/io.html#io.quartz)

### GitHub
- [Quartz Scheduler GitHub](https://github.com/quartz-scheduler/quartz)
- [PostgreSQL DDL 스크립트](https://github.com/quartz-scheduler/quartz/tree/main/quartz/src/main/resources/org/quartz/impl/jdbcjobstore)

### 참고 블로그
- https://adjh54.tistory.com/437
- https://123okk2.tistory.com/534

---

## ✅ 핵심 체크리스트

- [ ] RAMJobStore vs JDBCJobStore 차이 이해
- [ ] Job, JobDetail, Trigger, Scheduler 관계 이해
- [ ] 11개 테이블 역할 파악
- [ ] `useProperties: true` 설정으로 BYTEA 이슈 해결
- [ ] Job Group 활용 전략 수립
- [ ] Cron 표현식 작성 능력
- [ ] 클러스터링 환경 설정
- [ ] Misfire 정책 선택
- [ ] 모니터링 쿼리 활용

---

> 📅 마지막 업데이트: 2024-12-23  
> 🔧 버전: Quartz 2.5.x / Spring Boot 3.x / PostgreSQL
