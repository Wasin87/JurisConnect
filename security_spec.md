# Security Specification — JurisConnect (An AI-powered Legal Aid Intelligence & Case Management Platform)

## 1. Data Invariants
1. **Identity Integrity**: A user document in `/users/{userId}` can only be created by `request.auth.uid == userId` with an operational role (`citizen`, `dlao_officer`, `panel_lawyer`, `mediator`, `supervisor`). The `admin` role and `isBootstrappedAdmin()` / `isAdmin()` privileges strictly require `email_verified == true` and cannot be self-assigned.
2. **PII Isolation**: Sensitive user PII (`email`, `phone`, `nidLast4`, `address`) is stored exclusively in `/users/{userId}/private/info` and is readable/writable only by `userId` or `isAdmin()`.
3. **Unified Case Ownership & Atomicity**: A `/cases/{caseId}` document cannot be created without a matching `/casePublicStatus/{caseNumber}` document in the same atomic batch, and `citizenUid` must equal `request.auth.uid` (unless created by an Admin/DLAO).
4. **Master Gate on Subcollections**: `/cases/{caseId}/timeline/{eventId}` and `/cases/{caseId}/messages/{messageId}` validate parent `/cases/{caseId}` access via `get()`/`existsAfter()`.
5. **Temporal Integrity**: `createdAt` and `updatedAt` must strictly equal `request.time` on creation/update; `createdAt`, `caseId`, `caseNumber`, and `citizenUid` are immutable after creation.
6. **Terminal State Locking**: Once a case reaches `status == 'closed'`, non-admin updates are blocked.
7. **Zero Unbounded Arrays & Size Caps**: Every string field has strict `.size()` bounds; `requiredDocs` and `submittedDocs` arrays are capped at `<= 10` items with element type validation.
8. **Secure List Queries**: Every `allow list` rule evaluates `resource.data` directly against `request.auth.uid` or bootstrapped admin email without any `get()`/`exists()` lookups.

## 2. "Dirty Dozen" Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Privilege Escalation on Registration**: Citizen attempts `POST /users/{uid}` with `role: 'admin'`.
2. **Shadow Field Injection**: User creates `/cases/{caseId}` with an undeclared field `bypassEligibility: true`.
3. **Identity Spoofing**: User A creates `/cases/{caseId}` with `citizenUid: 'user_B'`.
4. **Path ID Poisoning**: User attempts `POST /cases/invalid$id!with*spaces` or a 500-char ID.
5. **Client Timestamp Forgery**: User creates `/cases/{caseId}` with `createdAt: '2020-01-01T00:00:00Z'` instead of `request.time`.
6. **Direct PII Scrape**: User A attempts `GET /users/{userB}/private/info`.
7. **Orphaned Timeline Event**: User creates `/cases/nonexistent_case/timeline/ev1`.
8. **Blanket List Query**: Non-admin user attempts `LIST /cases` without filtering by their own `citizenUid`, `assignedLawyerUid`, or `assignedMediatorUid`.
9. **Terminal State Mutation**: Non-admin user attempts to reopen a case where `existing().status == 'closed'`.
10. **Denial of Wallet Payload**: User submits a `description` string exceeding 2,500 characters or `requiredDocs` with 25 elements.
11. **Unverified Email Write**: User with `email_verified: false` attempts to write to `/cases/{caseId}`.
12. **Immutable Owner Tampering**: Lawyer updates a case and attempts to alter `citizenUid` or `caseNumber`.
