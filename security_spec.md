# Security Specification: SecureVault

## Data Invariants
1. A **User** can only read and write their own profile.
2. A **SecureFile** must have an `ownerId` that matches the authenticated user ID.
3. A **PasswordEntry** must have an `ownerId` that matches the authenticated user ID.
4. **LoginActivity** records are system-generated (or user-submitted during login) and must be immutable once written. A user can only read their own activity logs.
5. **SecurityAlerts** are system-generated and read-only for the user. They must belong to the logged-in user.
6. Sensitive fields like `role` or `isAdmin` (if added) must not be editable by the user.

## The "Dirty Dozen" Payloads (Rejection Targets)

1. **Identity Spoofing**: Creating a file with `ownerId: "someone_elses_uid"`.
2. **Shadow Field Injection**: Adding `isVerified: true` to a user profile update.
3. **Ghost File Entry**: Creating a file without `encryptedData`.
4. **Unauthenticated Access**: Reading a user's activity logs without a valid JWT.
5. **Unauthorized Mutation**: Updating someone else's password entry title.
6. **Bypassing Immutability**: Changing the `timestamp` of a login activity record.
7. **Resource Poisoning**: Using a 2MB string as a file name.
8. **Privilege Escalation**: Attempting to set `securityScore: 100` manually.
9. **Orphaned Writes**: Creating a file for a non-existent user.
10. **Terminal State Break**: (Not applicable yet, but potentially resolved alerts).
11. **Query Scraping**: Attempting to list all files across the platform.
12. **ID Poisoning**: Using a document ID like `../../../etc/passwd`.

## Test Plan
- Verify that `request.auth.uid` matches `ownerId` for all create/update operations.
- Verify exact key counts on creation.
- Verify immutable fields on update.
- Verify size constraints on strings.
